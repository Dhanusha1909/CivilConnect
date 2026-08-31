/**
 * nlpService.js
 * ---------------------------------------------------------------------------
 * A small, dependency-free NLP engine used to turn free-text complaints into
 * numeric vectors that can be compared for semantic similarity. This is the
 * heart of the "NLP Processing -> Semantic Similarity" stage of the pipeline.
 *
 * Approach: classic TF-IDF (Term Frequency - Inverse Document Frequency)
 * with cosine similarity. This is intentionally implemented from scratch
 * (no external ML library) so the whole system is transparent, explainable,
 * and runs anywhere without model downloads / GPUs - appropriate for a
 * final-year project and easy to explain in a viva.
 * ---------------------------------------------------------------------------
 */

const STOPWORDS = new Set(
  `a an the this that these those is are was were be been being have has had
  do does did will would shall should can could may might must
  i you he she it we they me him her us them my your his its our their
  and or but if then else when while for to from of in on at by with without
  as about into over under again further once here there all any both each
  few more most other some such no nor not only own same so than too very
  s t just don now near around behind beside besides between within also
  please kindly getting get got issue issues problem problems complaint complaints
  since due because still like happening happened please`
    .split(/\s+/)
    .filter(Boolean)
);

/** Basic tokenizer: lowercase, strip punctuation, split on whitespace */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((tok) => tok.length > 2 && !STOPWORDS.has(tok) && isNaN(Number(tok)));
}

/** Term-frequency map for a single document */
function termFrequency(tokens) {
  const tf = {};
  tokens.forEach((tok) => {
    tf[tok] = (tf[tok] || 0) + 1;
  });
  const total = tokens.length || 1;
  Object.keys(tf).forEach((k) => (tf[k] = tf[k] / total));
  return tf;
}

/**
 * Build a TF-IDF vector for `text`, given a `corpusDocFreq` map of
 * { term: numberOfDocsContainingTerm } and `corpusSize` (total docs seen so
 * far). This lets us vectorize incrementally as new complaints arrive,
 * rather than needing the whole corpus up front.
 */
function vectorize(text, corpusDocFreq, corpusSize) {
  const tokens = tokenize(text);
  const tf = termFrequency(tokens);
  const vector = {};
  Object.keys(tf).forEach((term) => {
    const df = corpusDocFreq[term] || 1;
    const idf = Math.log((corpusSize + 1) / (df + 1)) + 1; // smoothed idf
    vector[term] = tf[term] * idf;
  });
  return vector;
}

/** Cosine similarity between two sparse term:weight vectors */
function cosineSimilarity(vecA, vecB) {
  const keysA = Object.keys(vecA);
  const keysB = Object.keys(vecB);
  if (keysA.length === 0 || keysB.length === 0) return 0;

  let dot = 0;
  keysA.forEach((k) => {
    if (vecB[k]) dot += vecA[k] * vecB[k];
  });

  const magA = Math.sqrt(keysA.reduce((sum, k) => sum + vecA[k] * vecA[k], 0));
  const magB = Math.sqrt(keysB.reduce((sum, k) => sum + vecB[k] * vecB[k], 0));
  if (magA === 0 || magB === 0) return 0;

  return dot / (magA * magB);
}

/** Merge a new document's vector into a running centroid (simple online average) */
function updateCentroid(centroid, newVector, existingCount) {
  const merged = { ...centroid };
  const n = existingCount + 1;
  const allKeys = new Set([...Object.keys(centroid), ...Object.keys(newVector)]);
  allKeys.forEach((k) => {
    const old = centroid[k] || 0;
    const val = newVector[k] || 0;
    merged[k] = old + (val - old) / n;
  });
  return merged;
}

/** Extract the top-N highest-weighted terms from a vector, useful as "keywords" */
function topTerms(vector, n = 6) {
  return Object.entries(vector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([term]) => term);
}

/**
 * Very small keyword-based location matcher. Two location strings are
 * considered "the same area" if they share a significant token
 * (e.g. "Block A", "North Campus"). This keeps clustering geography-aware
 * without needing a full geocoding service.
 */
function locationsMatch(locA, locB) {
  if (!locA || !locB) return false;
  const a = new Set(tokenize(locA));
  const b = new Set(tokenize(locB));
  if (a.size === 0 || b.size === 0) return locA.trim().toLowerCase() === locB.trim().toLowerCase();
  let shared = 0;
  a.forEach((tok) => {
    if (b.has(tok)) shared += 1;
  });
  return shared > 0;
}

module.exports = {
  tokenize,
  termFrequency,
  vectorize,
  cosineSimilarity,
  updateCentroid,
  topTerms,
  locationsMatch,
};
