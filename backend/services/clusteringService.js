/**
 * clusteringService.js
 * ---------------------------------------------------------------------------
 * Orchestrates the full RootCauseAI pipeline described in the project spec:
 *
 *   User Complaints -> NLP Processing -> Semantic Similarity ->
 *   Complaint Clustering -> Duplicate Detection -> Temporal + Location
 *   Context -> Root Cause Inference -> Severity Assessment ->
 *   Impact Prediction -> Priority Ranking -> Recommended Action
 *
 * This is called once per newly-submitted complaint (`processNewComplaint`)
 * and can also be called to fully recompute a cluster's derived stats after
 * any change (`recomputeClusterStats`).
 * ---------------------------------------------------------------------------
 */

const Complaint = require("../models/Complaint");
const Cluster = require("../models/Cluster");
const CorpusStats = require("../models/CorpusStats");
const nlp = require("./nlpService");
const scoring = require("./scoringService");
const { generateClusterInsight } = require("./aiService");

const SIMILARITY_THRESHOLD = 0.22; // minimum cosine similarity to join an existing cluster
const DUPLICATE_THRESHOLD = 0.6; // very high similarity + same location => likely duplicate
const RECENT_WINDOW_DAYS = 120; // only compare against clusters active within this window

/** Update global corpus doc-frequency stats with the tokens of a new complaint */
async function updateCorpusStats(tokens) {
  const stats = await CorpusStats.getOrCreate();
  const uniqueTerms = new Set(tokens);
  uniqueTerms.forEach((term) => {
    stats.docFreq[term] = (stats.docFreq[term] || 0) + 1;
  });
  stats.totalDocs += 1;
  stats.markModified("docFreq");
  await stats.save();
  return stats;
}

/** Build a human-friendly root cause label from top shared keywords + location */
function buildRootCauseLabel(keywords, locationText, category) {
  const meaningful = keywords.filter((k) => !nlp.tokenize(locationText).includes(k)).slice(0, 3);
  if (meaningful.length === 0) return `${category} issue near ${locationText}`;
  const phrase = meaningful.join(" / ");
  return `${capitalize(phrase)} near ${locationText}`;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Derive a short "symptom" tag for a single complaint (used in the graph breakdown) */
function deriveSymptomTag(complaint) {
  const kws = nlp.topTerms(complaint.tfidfVector || {}, 2);
  if (kws.length === 0) return complaint.category;
  return kws.map(capitalize).join(" ");
}

/**
 * Recompute all derived statistics (severity, affected users, recurrence,
 * impact score, priority, symptom breakdown, root cause label/keywords) for
 * a cluster from its current member complaints. Call after any membership
 * or status change.
 */
async function recomputeClusterStats(clusterId, { regenerateInsight = false } = {}) {
  const cluster = await Cluster.findById(clusterId).populate("complaints");
  if (!cluster) return null;

  const members = cluster.complaints;
  if (members.length === 0) return cluster;

  // --- Severity ---
  const severities = members.map((c) => c.severity);
  cluster.severity = scoring.assessClusterSeverity(severities);

  // --- Affected users (unique citizens) ---
  const uniqueCitizens = new Set(members.map((c) => String(c.citizen)));
  cluster.affectedUsers = uniqueCitizens.size;

  // --- Recurrence (temporal context) ---
  const timestamps = members.map((c) => c.createdAt);
  cluster.recurrenceScore = scoring.computeRecurrenceScore(timestamps);
  cluster.lastComplaintAt = new Date(Math.max(...timestamps.map((t) => new Date(t).getTime())));
  cluster.firstComplaintAt = new Date(Math.min(...timestamps.map((t) => new Date(t).getTime())));

  // --- Urgency (category-based) ---
  cluster.urgencyFactor = scoring.urgencyForCategory(cluster.category);

  // --- Impact score + priority ranking ---
  cluster.impactScore = scoring.computeImpactScore({
    severity: cluster.severity,
    affectedUsers: cluster.affectedUsers,
    recurrenceScore: cluster.recurrenceScore,
    urgencyFactor: cluster.urgencyFactor,
  });
  cluster.priority = scoring.priorityFromImpactScore(cluster.impactScore);

  // --- Symptom breakdown for the complaint-to-cause graph ---
  const breakdown = {};
  members.forEach((c) => {
    const tag = deriveSymptomTag(c);
    breakdown[tag] = (breakdown[tag] || 0) + 1;
  });
  cluster.symptomBreakdown = breakdown;

  // --- Root cause keywords (aggregate centroid top terms) ---
  cluster.keywords = nlp.topTerms(cluster.centroidVector || {}, 8);
  cluster.rootCauseLabel = buildRootCauseLabel(cluster.keywords, cluster.representativeLocation, cluster.category);

  if (regenerateInsight || !cluster.rootCauseExplanation) {
    const insight = await generateClusterInsight(cluster, members.map((m) => m.title));
    cluster.rootCauseExplanation = insight.rootCauseExplanation;
    cluster.recommendedAction = insight.recommendedAction;
    cluster.insightSource = insight.insightSource;
  }

  await cluster.save();
  return cluster;
}

/**
 * Main entry point: run the full pipeline for one newly created complaint.
 * Returns { complaint, cluster, isDuplicate, similarity }.
 */
async function processNewComplaint(complaint) {
  // 1) NLP Processing: tokenize + vectorize using current global corpus stats
  const tokens = nlp.tokenize(`${complaint.title} ${complaint.description}`);
  const stats = await CorpusStats.getOrCreate();
  const vector = nlp.vectorize(`${complaint.title} ${complaint.description}`, stats.docFreq, stats.totalDocs);

  complaint.tfidfVector = vector;
  complaint.keywords = nlp.topTerms(vector, 6);

  // Update global corpus stats AFTER vectorizing this doc against the old stats
  await updateCorpusStats(tokens);

  // Severity assessment for this individual complaint
  const { severity, matched } = scoring.assessComplaintSeverity(
    `${complaint.title} ${complaint.description}`,
    complaint.category
  );
  complaint.severity = severity;
  complaint.urgencyKeywordsMatched = matched;

  // 2) Semantic Similarity + 3) Complaint Clustering + Temporal/Location context
  const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const candidateClusters = await Cluster.find({
    category: complaint.category,
    lastComplaintAt: { $gte: since },
    status: { $ne: "Resolved" },
  });

  let bestCluster = null;
  let bestScore = 0;

  for (const cand of candidateClusters) {
    if (!nlp.locationsMatch(cand.representativeLocation, complaint.locationText)) continue;
    const sim = nlp.cosineSimilarity(vector, cand.centroidVector || {});
    if (sim > bestScore) {
      bestScore = sim;
      bestCluster = cand;
    }
  }

  let cluster;
  let isDuplicate = false;

  if (bestCluster && bestScore >= SIMILARITY_THRESHOLD) {
    // 4) Duplicate Detection: extremely high similarity + same area => flag as duplicate
    if (bestScore >= DUPLICATE_THRESHOLD) {
      isDuplicate = true;
      // find the closest existing member to link as the "original"
      const populated = await Cluster.findById(bestCluster._id).populate("complaints");
      let closest = null;
      let closestSim = -1;
      populated.complaints.forEach((m) => {
        const s = nlp.cosineSimilarity(vector, m.tfidfVector || {});
        if (s > closestSim) {
          closestSim = s;
          closest = m;
        }
      });
      if (closest) complaint.isDuplicateOf = closest._id;
    }

    // join existing cluster: update centroid
    bestCluster.centroidVector = nlp.updateCentroid(
      bestCluster.centroidVector || {},
      vector,
      bestCluster.complaints.length
    );
    bestCluster.complaints.push(complaint._id);
    complaint.cluster = bestCluster._id;
    complaint.similarityToCluster = Number(bestScore.toFixed(3));
    complaint.pushStatus("Clustered", `Linked to existing issue: "${bestCluster.rootCauseLabel}"`, "system");
    await bestCluster.save();
    cluster = bestCluster;
  } else {
    // 5) Root Cause Inference (new cluster seed)
    const keywords = nlp.topTerms(vector, 8);
    const label = buildRootCauseLabel(keywords, complaint.locationText, complaint.category);

    cluster = await Cluster.create({
      rootCauseLabel: label,
      keywords,
      representativeLocation: complaint.locationText,
      centroidVector: vector,
      complaints: [complaint._id],
      category: complaint.category,
      firstComplaintAt: new Date(),
      lastComplaintAt: new Date(),
      statusHistory: [{ status: "Open", note: "Cluster auto-created by RootCauseAI", changedBy: "system" }],
    });
    complaint.cluster = cluster._id;
    complaint.similarityToCluster = 1;
    complaint.pushStatus("Clustered", `New issue detected: "${label}"`, "system");
  }

  await complaint.save();

  // 6) Severity -> 7) Impact -> 8) Priority Ranking -> 9) Recommended Action
  cluster = await recomputeClusterStats(cluster._id, { regenerateInsight: true });

  return { complaint, cluster, isDuplicate, similarity: bestScore };
}

module.exports = {
  processNewComplaint,
  recomputeClusterStats,
};
