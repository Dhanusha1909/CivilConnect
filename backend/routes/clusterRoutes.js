const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/auth");
const {
  listClusters,
  getCluster,
  summary,
  assignStaff,
  updateStatus,
  regenerateInsight,
} = require("../controllers/clusterController");

router.use(protect, requireRole("officer"));

router.get("/stats/summary", summary);
router.get("/", listClusters);
router.get("/:id", getCluster);
router.post("/:id/assign", assignStaff);
router.put("/:id/status", updateStatus);
router.post("/:id/regenerate-insight", regenerateInsight);

module.exports = router;
