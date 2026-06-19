const express = require("express");
const {
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  getEquipmentHistory,
} = require("../controllers/patientController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin", "recepcionista"));

router.get("/", listPatients);
router.get("/:id/equipment-history", getEquipmentHistory); // must be before /:id
router.get("/:id", getPatient);
router.post("/", createPatient);
router.put("/:id", updatePatient);
router.delete("/:id", deletePatient);

module.exports = router;
