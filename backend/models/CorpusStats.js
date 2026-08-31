const mongoose = require("mongoose");

/**
 * A single singleton document that tracks, across ALL complaints ever
 * submitted, how many documents each term appeared in (docFreq) and the
 * total document count. This lets us compute proper IDF weights
 * incrementally as new complaints arrive, without re-scanning the whole
 * complaints collection every time.
 */
const corpusStatsSchema = new mongoose.Schema({
  singleton: { type: String, default: "GLOBAL", unique: true },
  totalDocs: { type: Number, default: 0 },
  docFreq: { type: mongoose.Schema.Types.Mixed, default: {} }, // term -> count of docs containing it
});

corpusStatsSchema.statics.getOrCreate = async function () {
  let stats = await this.findOne({ singleton: "GLOBAL" });
  if (!stats) stats = await this.create({ singleton: "GLOBAL", totalDocs: 0, docFreq: {} });
  return stats;
};

module.exports = mongoose.model("CorpusStats", corpusStatsSchema);
