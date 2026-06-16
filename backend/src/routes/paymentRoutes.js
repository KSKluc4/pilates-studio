const express = require("express");
const {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
} = require("../controllers/paymentController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin", "recepcionista"));

router.get("/", listPayments);
router.get("/:id", getPayment);
router.post("/", createPayment);

// Editing and deleting financial records is restricted to admins
router.put("/:id", authorize("admin"), updatePayment);
router.delete("/:id", authorize("admin"), deletePayment);

module.exports = router;
