const mongoose = require("mongoose");

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: "" },
    changedBy: { type: String, default: "system" }, // "system" | "officer" | "citizen"
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CATEGORIES = [
  "Infrastructure",
  "Water & Drainage",
  "Sanitation",
  "Electricity",
  "Safety & Security",
  "Health",
  "Noise",
  "Other",
];

const complaintSchema = new mongoose.Schema(
  {
    citizen: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, default: "Other" },
    locationText: { type: String, required: true, trim: true }, // e.g. "Block A, North Campus"
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },

    // NLP derived fields
    keywords: [{ type: String }],
    tfidfVector: { type: mongoose.Schema.Types.Mixed, default: {} }, // sparse term:weight map

    // Root cause linkage
    cluster: { type: mongoose.Schema.Types.ObjectId, ref: "Cluster", default: null },
    similarityToCluster: { type: Number, default: null },
    isDuplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", default: null },

    // Assessment
    severity: { type: Number, min: 1, max: 10, default: 3 }, // individual complaint severity
    urgencyKeywordsMatched: [{ type: String }],

    status: {
      type: String,
      enum: ["Pending", "Clustered", "Assigned", "In Progress", "Resolved", "Rejected"],
      default: "Pending",
    },
    statusHistory: [statusHistorySchema],
  },
  { timestamps: true }
);

complaintSchema.index({ locationText: "text", title: "text", description: "text" });

complaintSchema.methods.pushStatus = function (status, note, changedBy) {
  this.status = status;
  this.statusHistory.push({ status, note: note || "", changedBy: changedBy || "system", at: new Date() });
};

module.exports = mongoose.model("Complaint", complaintSchema);
module.exports.CATEGORIES = CATEGORIES;
