const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
      // Google-authenticated accounts have no local password
      required: function isPasswordRequired() {
        return this.provider !== "google";
      },
    },
    role: {
      type: String,
      enum: ["admin", "recepcionista"],
      default: "recepcionista",
    },
    // New self-service signups (local or Google) start pending until an admin approves them.
    // Existing/admin-created accounts default to active so this field never blocks prior data.
    status: {
      type: String,
      enum: ["pending", "active"],
      default: "active",
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.password || !this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
