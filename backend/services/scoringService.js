/**
 * scoringService.js
 * ---------------------------------------------------------------------------
 * Implements: Severity Assessment -> Impact Prediction -> Priority Ranking
 *
 *   Impact Score = Severity x log(1 + AffectedUsers) x Recurrence x Urgency
 *
 * We use log(1+affectedUsers) rather than a raw linear count so that a
 * cluster doesn't dominate purely by volume - this is what allows a
 * dangerous but less-reported issue (Complaint B: 15 people, dangerous
 * infrastructure fault) to outrank a large but low-severity one
 * (Complaint A: 100 people, minor inconvenience), matching the project's
 * core "decision support" requirement.
 * ---------------------------------------------------------------------------
 */

const DANGER_KEYWORDS = [
  "fire", "explosion", "gas leak", "electrocution", "electric shock", "collapse",
  "collapsed", "short circuit", "live wire", "exposed wire", "flood", "flooding",
  "landslide", "structural", "crack", "sinking", "contaminated", "contamination",
  "sewage", "toxic", "injury", "injured", "accident", "unsafe", "hazard",
  "hazardous", "poison", "outbreak", "disease", "child safety", "stampede",
];

const CATEGORY_BASE_SEVERITY = {
  "Safety & Security": 7,
  "Health": 7,
  "Water & Drainage": 5,
  "Electricity": 6,
  "Infrastructure": 5,
  "Sanitation": 4,
  "Noise": 2,
  "Other": 3,
};

const CATEGORY_URGENCY = {
  "Safety & Security": 1.8,
  "Health": 1.7,
  "Electricity": 1.5,
  "Water & Drainage": 1.3,
  "Infrastructure": 1.2,
  "Sanitation": 1.1,
  "Noise": 0.8,
  "Other": 1.0,
};

/** Assess severity (1-10) for a single complaint from its text + category */
function assessComplaintSeverity(text, category) {
  const lower = (text || "").toLowerCase();
  let severity = CATEGORY_BASE_SEVERITY[category] ?? 3;
  const matched = [];

  DANGER_KEYWORDS.forEach((kw) => {
    if (lower.includes(kw)) {
      matched.push(kw);
      severity += 1.2;
    }
  });

  severity = Math.max(1, Math.min(10, Math.round(severity)));
  return { severity, matched };
}

/** Cluster-level severity = max of member severities, softly averaged upward */
function assessClusterSeverity(memberSeverities) {
  if (!memberSeverities.length) return 3;
  const max = Math.max(...memberSeverities);
  const avg = memberSeverities.reduce((a, b) => a + b, 0) / memberSeverities.length;
  const combined = max * 0.7 + avg * 0.3;
  return Math.max(1, Math.min(10, Math.round(combined)));
}

/**
 * Recurrence score grows with how many complaints have landed in the
 * cluster and how recently. A cluster that keeps receiving new complaints
 * over time is treated as an escalating / recurring root cause.
 */
function computeRecurrenceScore(complaintTimestamps) {
  if (!complaintTimestamps.length) return 1;
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const recentCount = complaintTimestamps.filter((t) => now - new Date(t).getTime() <= THIRTY_DAYS).length;
  // base recurrence from total volume (log-scaled) + boost for recent activity
  const base = Math.log2(2 + complaintTimestamps.length);
  const recentBoost = 1 + recentCount / Math.max(1, complaintTimestamps.length);
  return Number((base * recentBoost).toFixed(2));
}

function urgencyForCategory(category) {
  return CATEGORY_URGENCY[category] ?? 1.0;
}

/** Master formula: Impact Score = Severity x log(1+Affected) x Recurrence x Urgency */
function computeImpactScore({ severity, affectedUsers, recurrenceScore, urgencyFactor }) {
  const score = severity * Math.log(1 + Math.max(0, affectedUsers)) * Math.max(0.1, recurrenceScore) * Math.max(0.1, urgencyFactor);
  return Number(score.toFixed(2));
}

/** Map a raw impact score into a human priority label. Thresholds are
 * intentionally simple/tunable constants so they're easy to explain/defend
 * in a project viva. */
function priorityFromImpactScore(score) {
  if (score >= 25) return "Critical";
  if (score >= 12) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

module.exports = {
  DANGER_KEYWORDS,
  assessComplaintSeverity,
  assessClusterSeverity,
  computeRecurrenceScore,
  urgencyForCategory,
  computeImpactScore,
  priorityFromImpactScore,
};
