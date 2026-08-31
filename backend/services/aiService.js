/**
 * aiService.js
 * ---------------------------------------------------------------------------
 * Generates a human-readable root-cause explanation + recommended action for
 * a cluster of related complaints using Google Gemini API.
 *
 * If GEMINI_API_KEY is configured, we call Google Gemini (using the official
 * @google/genai SDK) to produce a genuinely intelligent, well-written narrative.
 * If not, we fall back to a deterministic heuristic built from the cluster's
 * keywords/category/stats, so the whole project still works end-to-end with
 * zero external dependencies or API keys - important for offline demos/evaluation.
 * ---------------------------------------------------------------------------
 */

const { GoogleGenAI, Type } = require("@google/genai");

const HAS_KEY = !!process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash";

function heuristicInsight(cluster, sampleTitles) {
  const kw = (cluster.keywords || []).slice(0, 4).join(", ");
  const label = cluster.rootCauseLabel;
  const explanation =
    `${cluster.complaints?.length || 0} complaint(s) from the ${cluster.representativeLocation} area ` +
    `share overlapping language (${kw || "similar terms"}) and were grouped together. ` +
    `The recurring pattern points to a common underlying issue: "${label}", rather than ${cluster.complaints?.length || 0} unrelated problems.`;

  const priority = cluster.priority;
  let action;
  if (priority === "Critical") {
    action = `Dispatch a field team within 24 hours to inspect ${cluster.representativeLocation}. This cluster has a high impact score (severity x affected residents x recurrence) - treat as top priority over lower-impact but higher-volume complaints.`;
  } else if (priority === "High") {
    action = `Schedule an inspection within 3-5 days at ${cluster.representativeLocation} and assign responsible staff with a due date. Monitor for new related complaints, which would further raise priority.`;
  } else if (priority === "Medium") {
    action = `Add to the routine maintenance queue for ${cluster.representativeLocation}. Re-evaluate if additional similar complaints arrive.`;
  } else {
    action = `Low urgency - log for periodic review. No immediate field action required unless new complaints raise the impact score.`;
  }

  return { rootCauseExplanation: explanation, recommendedAction: action, insightSource: "heuristic" };
}

async function generateClusterInsight(cluster, sampleTitles = []) {
  if (!HAS_KEY) {
    return heuristicInsight(cluster, sampleTitles);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are an assistant for a municipal/college complaint-management system called RootCauseAI.
A cluster of related complaints has been detected automatically. Write:
1. A 2-3 sentence plain-English explanation of the likely underlying ROOT CAUSE (not just a restatement of symptoms).
2. A 1-2 sentence RECOMMENDED ACTION for the responsible officer.

Cluster data:
- Root cause label (auto-generated): ${cluster.rootCauseLabel}
- Location: ${cluster.representativeLocation}
- Category: ${cluster.category}
- Number of linked complaints: ${cluster.complaints?.length || 0}
- Top keywords: ${(cluster.keywords || []).join(", ")}
- Severity (1-10): ${cluster.severity}
- Priority: ${cluster.priority}
- Sample complaint titles: ${sampleTitles.slice(0, 6).join(" | ")}

Respond with a JSON object containing "rootCauseExplanation" and "recommendedAction".`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rootCauseExplanation: { type: Type.STRING },
            recommendedAction: { type: Type.STRING },
          },
          required: ["rootCauseExplanation", "recommendedAction"],
        },
      },
    });

    const text = response.text ? response.text.trim() : "";
    const parsed = JSON.parse(text);

    return {
      rootCauseExplanation: parsed.rootCauseExplanation || heuristicInsight(cluster).rootCauseExplanation,
      recommendedAction: parsed.recommendedAction || heuristicInsight(cluster).recommendedAction,
      insightSource: "ai",
    };
  } catch (err) {
    console.warn("[aiService] Falling back to heuristic insight:", err.message);
    return heuristicInsight(cluster, sampleTitles);
  }
}

module.exports = { generateClusterInsight };
