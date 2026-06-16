const express = require("express");
const { listUsers, approveUser, deleteUser } = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/", listUsers);
router.put("/:id/approve", approveUser);
router.delete("/:id", deleteUser);

module.exports = router;
