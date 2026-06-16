const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { PRIMARY_ADMIN_EMAIL } = require("../utils/protectedAccounts");

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Email and password are required");
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    if (user.status !== "active") {
      res.status(403);
      throw new Error("Sua conta ainda está pendente de aprovação por um administrador");
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Only an existing admin can create new accounts directly; they're active immediately.
async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email and password are required");
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409);
      throw new Error("A user with this email already exists");
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role === "admin" ? "admin" : "recepcionista",
      status: "active",
      provider: "local",
    });

    res.status(201).json({
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

// Public self-service signup: always created as recepcionista and pending until an admin approves.
async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Name, email and password are required");
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409);
      throw new Error("A user with this email already exists");
    }

    await User.create({
      name,
      email,
      password,
      role: "recepcionista",
      status: "pending",
      provider: "local",
    });

    res.status(201).json({
      message: "Cadastro enviado. Aguarde a aprovação de um administrador.",
    });
  } catch (error) {
    next(error);
  }
}

// Called server-side by the frontend's NextAuth callback after Google has verified the user.
// Protected by a shared secret known only to our own servers (see the `internalOnly` middleware).
async function googleAuth(req, res, next) {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      res.status(400);
      throw new Error("Name and email are required");
    }

    const normalizedEmail = email.toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const isPrimaryAdmin = normalizedEmail === PRIMARY_ADMIN_EMAIL;
      user = await User.create({
        name,
        email,
        role: isPrimaryAdmin ? "admin" : "recepcionista",
        status: isPrimaryAdmin ? "active" : "pending",
        provider: "google",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        message: "Sua conta ainda está pendente de aprovação por um administrador",
        pending: true,
      });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res) {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  });
}

module.exports = { login, register, signup, googleAuth, getMe };
