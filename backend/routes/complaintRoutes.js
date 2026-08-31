const express = require("express");
const router = express.Router();
const { protect, requireRole } = require("../middleware/auth");
const {
  createComplaint,
  myComplaints,
  getComplaint,
  listCategories,
} = require("../controllers/complaintController");

router.get("/categories", listCategories);
router.post("/", protect, requireRole("citizen"), createComplaint);
router.get("/my", protect, requireRole("citizen"), myComplaints);
router.get("/:id", protect, getComplaint); // citizen (own) or officer

module.exports = router;
