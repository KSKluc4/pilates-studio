// One-off script to create the first admin user.
// Usage: node scripts/seedAdmin.js "Admin Name" admin@example.com "StrongPassword123"
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");

async function seed() {
  const [name, email, password] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.error("Usage: node scripts/seedAdmin.js <name> <email> <password>");
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error("A user with this email already exists");
    process.exit(1);
  }

  const admin = await User.create({ name, email, password, role: "admin" });
  console.log(`Admin user created: ${admin.email}`);

  await mongoose.disconnect();
}

seed();
