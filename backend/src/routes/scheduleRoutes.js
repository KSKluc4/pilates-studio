const express = require("express");
const { getTodaySchedule } = require("../controllers/scheduleController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin", "recepcionista"));

router.get("/today", getTodaySchedule);

module.exports = router;
