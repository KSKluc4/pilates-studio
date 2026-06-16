const User = require("../models/User");

async function listUsers(req, res, next) {
  try {
    const users = await User.find()
      .select("name email role status provider createdAt")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
}

// Approves a pending user (or re-confirms an active one) and sets their role.
async function approveUser(req, res, next) {
  try {
    const { role } = req.body;

    if (!["admin", "recepcionista"].includes(role)) {
      res.status(400);
      throw new Error("Role must be 'admin' or 'recepcionista'");
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    user.status = "active";
    user.role = role;
    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (req.params.id === String(req.user._id)) {
      res.status(400);
      throw new Error("You cannot remove your own account");
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    await user.deleteOne();
    res.json({ message: "User removed" });
  } catch (error) {
    next(error);
  }
}

module.exports = { listUsers, approveUser, deleteUser };
