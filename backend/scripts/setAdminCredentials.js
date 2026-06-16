// Updates an existing user's email/password (hashed via the model's pre-save hook) and
// guarantees they remain active. Also backfills status/provider on any older records that
// predate those fields, so the rest of the auth system keeps working for them.
// Usage: node scripts/setAdminCredentials.js <currentEmail> <newEmail> <newPassword>
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");

async function run() {
  const [currentEmail, newEmail, newPassword] = process.argv.slice(2);

  if (!currentEmail || !newEmail || !newPassword) {
    console.error("Usage: node scripts/setAdminCredentials.js <currentEmail> <newEmail> <newPassword>");
    process.exit(1);
  }

  await connectDB();

  await User.updateMany(
    { status: { $exists: false } },
    { $set: { status: "active", provider: "local" } }
  );

  const user = await User.findOne({ email: currentEmail.toLowerCase() });
  if (!user) {
    console.error(`No user found with email ${currentEmail}`);
    process.exit(1);
  }

  user.email = newEmail.toLowerCase();
  user.password = newPassword;
  user.status = "active";
  await user.save();

  console.log(`Updated user ${user._id}: email=${user.email}, status=${user.status}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
