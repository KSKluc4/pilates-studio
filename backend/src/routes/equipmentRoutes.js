const express = require("express");
const { listEquipment, createEquipment, deleteEquipment } = require("../controllers/equipmentController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, authorize("admin", "recepcionista"), listEquipment);
router.post("/", protect, authorize("admin"), createEquipment);
router.delete("/:id", protect, authorize("admin"), deleteEquipment);

module.exports = router;
