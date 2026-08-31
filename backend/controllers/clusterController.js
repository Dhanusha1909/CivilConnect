const Cluster = require("../models/Cluster");
const Complaint = require("../models/Complaint");
const { recomputeClusterStats } = require("../services/clusteringService");

// GET /api/clusters  (officer) - the prioritized dashboard list
async function listClusters(req, res) {
  try {
    const { status, priority, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const clusters = await Cluster.find(filter)
      .sort({ impactScore: -1 })
      .populate({ path: "complaints", select: "title citizen createdAt status", populate: { path: "citizen", select: "name" } });

    res.json({ clusters });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch clusters", error: err.message });
  }
}

// GET /api/clusters/:id  (officer) - detail + graph data
async function getCluster(req, res) {
  try {
    const cluster = await Cluster.findById(req.params.id).populate({
      path: "complaints",
      populate: { path: "citizen", select: "name email phone" },
    });
    if (!cluster) return res.status(404).json({ message: "Cluster not found" });

    // build graph payload: root cause node + one node per symptom tag
    const graph = {
      root: { id: "root", label: cluster.rootCauseLabel, priority: cluster.priority },
      nodes: Object.entries(cluster.symptomBreakdown || {}).map(([label, count]) => ({
        id: label,
        label,
        count,
      })),
    };

    res.json({ cluster, graph });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch cluster", error: err.message });
  }
}

// GET /api/clusters/stats/summary (officer dashboard stat cards)
async function summary(req, res) {
  try {
    const [total, open, assigned, inProgress, resolved] = await Promise.all([
      Cluster.countDocuments({}),
      Cluster.countDocuments({ status: "Open" }),
      Cluster.countDocuments({ status: "Assigned" }),
      Cluster.countDocuments({ status: "In Progress" }),
      Cluster.countDocuments({ status: "Resolved" }),
    ]);
    const totalComplaints = await Complaint.countDocuments({});
    const priorityCounts = await Cluster.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]);

    const resolvedClusters = await Cluster.find({ status: "Resolved", resolvedAt: { $ne: null } }).select(
      "firstComplaintAt resolvedAt"
    );
    let avgResolutionHours = null;
    if (resolvedClusters.length) {
      const totalHours = resolvedClusters.reduce((sum, c) => {
        return sum + (new Date(c.resolvedAt) - new Date(c.firstComplaintAt)) / 36e5;
      }, 0);
      avgResolutionHours = Number((totalHours / resolvedClusters.length).toFixed(1));
    }

    res.json({
      totalClusters: total,
      open,
      assigned,
      inProgress,
      resolved,
      totalComplaints,
      priorityCounts,
      avgResolutionHours,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch summary", error: err.message });
  }
}

// POST /api/clusters/:id/assign  (officer) - appoint staff + due date
async function assignStaff(req, res) {
  try {
    const { staffName, staffContact, dueDate, note } = req.body;
    if (!staffName || !dueDate) return res.status(400).json({ message: "staffName and dueDate are required" });

    const cluster = await Cluster.findById(req.params.id).populate("complaints");
    if (!cluster) return res.status(404).json({ message: "Cluster not found" });

    cluster.assignedStaff = { name: staffName, contact: staffContact || "" };
    cluster.dueDate = new Date(dueDate);
    cluster.assignedByOfficer = req.user._id;
    cluster.pushStatus("Assigned", note || `Staff ${staffName} appointed, due ${new Date(dueDate).toDateString()}`, "officer");
    await cluster.save();

    // Propagate status to EVERY complaint linked to this cluster
    await Promise.all(
      cluster.complaints.map(async (c) => {
        c.pushStatus(
          "Assigned",
          `Assigned to staff "${staffName}" (due ${new Date(dueDate).toDateString()})`,
          "officer"
        );
        await c.save();
      })
    );

    res.json({ cluster, message: "Staff appointed and all linked complaints updated." });
  } catch (err) {
    res.status(500).json({ message: "Failed to assign staff", error: err.message });
  }
}

// PUT /api/clusters/:id/status  (officer) - update status, propagate to all complaints
async function updateStatus(req, res) {
  try {
    const { status, note } = req.body;
    const allowed = ["Open", "Assigned", "In Progress", "Resolved"];
    if (!allowed.includes(status)) return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });

    const cluster = await Cluster.findById(req.params.id).populate("complaints");
    if (!cluster) return res.status(404).json({ message: "Cluster not found" });

    cluster.pushStatus(status, note || "", "officer");
    if (status === "Resolved") {
      cluster.resolvedAt = new Date();
      cluster.resolutionNote = note || cluster.resolutionNote;
    }
    await cluster.save();

    // map cluster-level status to the equivalent complaint-level status enum
    const complaintStatus = status === "Open" ? "Clustered" : status;
    await Promise.all(
      cluster.complaints.map(async (c) => {
        c.pushStatus(complaintStatus, note || `Root cause issue status updated to "${status}"`, "officer");
        await c.save();
      })
    );

    res.json({ cluster, message: `Status updated to "${status}" for the root cause and all linked complaints.` });
  } catch (err) {
    res.status(500).json({ message: "Failed to update status", error: err.message });
  }
}

// POST /api/clusters/:id/regenerate-insight (officer) - re-run AI narrative
async function regenerateInsight(req, res) {
  try {
    const cluster = await recomputeClusterStats(req.params.id, { regenerateInsight: true });
    if (!cluster) return res.status(404).json({ message: "Cluster not found" });
    res.json({ cluster });
  } catch (err) {
    res.status(500).json({ message: "Failed to regenerate insight", error: err.message });
  }
}

module.exports = { listClusters, getCluster, summary, assignStaff, updateStatus, regenerateInsight };
