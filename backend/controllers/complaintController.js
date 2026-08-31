const Complaint = require("../models/Complaint");
const { CATEGORIES } = require("../models/Complaint");
const { processNewComplaint } = require("../services/clusteringService");

// POST /api/complaints  (citizen)
async function createComplaint(req, res) {
  try {
    const { title, description, category, locationText, lat, lng } = req.body;
    if (!title || !description || !locationText) {
      return res.status(400).json({ message: "title, description and locationText are required" });
    }

    const complaint = new Complaint({
      citizen: req.user._id,
      title,
      description,
      category: CATEGORIES.includes(category) ? category : "Other",
      locationText,
      lat: lat ?? null,
      lng: lng ?? null,
    });
    complaint.pushStatus("Pending", "Complaint submitted", "citizen");
    await complaint.save();

    // Run the full AI pipeline: NLP -> similarity -> clustering -> dedup ->
    // root cause -> severity -> impact -> priority -> recommended action
    const { complaint: updated, cluster, isDuplicate, similarity } = await processNewComplaint(complaint);

    res.status(201).json({
      complaint: updated,
      cluster,
      isDuplicate,
      similarity,
      message: isDuplicate
        ? "This looks like a duplicate of an existing report - it has been linked to that issue."
        : "Complaint submitted and analyzed successfully.",
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit complaint", error: err.message });
  }
}

// GET /api/complaints/my  (citizen)
async function myComplaints(req, res) {
  try {
    const complaints = await Complaint.find({ citizen: req.user._id })
      .populate("cluster", "rootCauseLabel priority impactScore status affectedUsers assignedStaff dueDate")
      .sort({ createdAt: -1 });
    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch complaints", error: err.message });
  }
}

// GET /api/complaints/:id  (citizen owner or officer)
async function getComplaint(req, res) {
  try {
    const complaint = await Complaint.findById(req.params.id).populate("cluster");
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    if (req.user.role === "citizen" && String(complaint.citizen) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only view your own complaints" });
    }
    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch complaint", error: err.message });
  }
}

// GET /api/complaints/categories
async function listCategories(req, res) {
  res.json({ categories: CATEGORIES });
}

module.exports = { createComplaint, myComplaints, getComplaint, listCategories };
