const express = require("express");
const rateLimit = require("express-rate-limit");
const { login, register, signup, googleAuth, getMe } = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: "Too many signup attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Only requests from our own frontend server (NextAuth callback) carry this secret.
function internalOnly(req, res, next) {
  const secret = req.headers["x-internal-secret"];
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    res.status(401);
    return next(new Error("Unauthorized"));
  }
  next();
}

router.post("/login", loginLimiter, login);
router.post("/signup", signupLimiter, signup);
router.post("/register", protect, authorize("admin"), register);
router.post("/google", internalOnly, googleAuth);
router.get("/me", protect, getMe);

module.exports = router;
