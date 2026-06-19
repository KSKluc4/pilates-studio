const express = require("express");
const { getTodaySchedule, getScheduleByDate, getWeekSchedule } = require("../controllers/scheduleController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin", "recepcionista"));

router.get("/today", getTodaySchedule);
router.get("/week", getWeekSchedule);   // must be before /:date
router.get("/:date", getScheduleByDate);

module.exports = router;
