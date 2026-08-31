const mongoose = require("mongoose");

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: "" },
    changedBy: { type: String, default: "system" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const clusterSchema = new mongoose.Schema(
  {
    rootCauseLabel: { type: String, required: true }, // e.g. "Drainage blockage near Block A"
    keywords: [{ type: String }], // top TF-IDF terms across cluster
    representativeLocation: { type: String, required: true },

    // centroid TF-IDF vector used to compare new complaints against this cluster
    centroidVector: { type: mongoose.Schema.Types.Mixed, default: {} },

    complaints: [{ type: mongoose.Schema.Types.ObjectId, ref: "Complaint" }],

    // sub-symptom breakdown -> e.g. { "Water Leak": 23, "Bad Smell": 17, "Flooding": 41 }
    symptomBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },

    category: { type: String, default: "Other" },

    // scoring
    severity: { type: Number, min: 1, max: 10, default: 3 },
    affectedUsers: { type: Number, default: 0 },
    recurrenceScore: { type: Number, default: 1 }, // grows if new complaints keep arriving
    urgencyFactor: { type: Number, default: 1 },
    impactScore: { type: Number, default: 0 },
    priority: { type: String, enum: ["Critical", "High", "Medium", "Low"], default: "Low" },

    // AI-generated (or heuristic) narrative
    rootCauseExplanation: { type: String, default: "" },
    recommendedAction: { type: String, default: "" },
    insightSource: { type: String, enum: ["ai", "heuristic"], default: "heuristic" },

    // workflow
    status: {
      type: String,
      enum: ["Open", "Assigned", "In Progress", "Resolved"],
      default: "Open",
    },
    assignedStaff: {
      name: { type: String, default: "" },
      contact: { type: String, default: "" },
    },
    dueDate: { type: Date, default: null },
    assignedByOfficer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolutionNote: { type: String, default: "" },
    resolvedAt: { type: Date, default: null },

    statusHistory: [statusHistorySchema],

    firstComplaintAt: { type: Date, default: Date.now },
    lastComplaintAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

clusterSchema.methods.pushStatus = function (status, note, changedBy) {
  this.status = status;
  this.statusHistory.push({ status, note: note || "", changedBy: changedBy || "system", at: new Date() });
};

module.exports = mongoose.model("Cluster", clusterSchema);
