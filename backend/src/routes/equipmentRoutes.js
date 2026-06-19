const express = require("express");
const { listEquipment, createEquipment, deleteEquipment } = require("../controllers/equipmentController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/", listEquipment);
router.post("/", createEquipment);
router.delete("/:id", deleteEquipment);

module.exports = router;
