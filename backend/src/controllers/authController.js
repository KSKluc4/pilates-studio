const crypto = require("crypto");
const { Resend } = require("resend");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { PRIMARY_ADMIN_EMAIL } = require("../utils/protectedAccounts");

const SAFE_RESET_MESSAGE =
  "Se o email estiver cadastrado, você receberá um link de recuperação em breve.";

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Email e senha são obrigatórios.");
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      res.status(401);
      throw new Error("Email ou senha incorretos.");
    }

    if (user.status !== "active") {
      res.status(403);
      throw new Error("Sua conta ainda está pendente de aprovação por um administrador.");
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
      throw new Error("Nome, email e senha são obrigatórios.");
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409);
      throw new Error("Já existe um usuário com este email.");
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
      throw new Error("Nome, email e senha são obrigatórios.");
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409);
      throw new Error("Já existe um usuário com este email.");
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
      throw new Error("Nome e email são obrigatórios.");
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
        message: "Sua conta ainda está pendente de aprovação por um administrador.",
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

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error("Email é obrigatório.");
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond with the safe message — never reveal whether email exists.
    // We also skip Google-only accounts (they have no local password to reset).
    if (!user || user.provider === "google") {
      return res.json({ message: SAFE_RESET_MESSAGE });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: user.email,
        subject: "Recuperação de senha — Estúdio Vit",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#2d6a4f">Estúdio Vit</h2>
            <p>Olá, <strong>${user.name}</strong>!</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
            <p style="margin:1.5rem 0">
              <a href="${resetUrl}"
                 style="background:#2d6a4f;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600">
                Redefinir senha
              </a>
            </p>
            <p style="color:#555;font-size:0.9rem">Este link expira em <strong>1 hora</strong>.</p>
            <p style="color:#555;font-size:0.9rem">Se você não solicitou isso, ignore este email — sua senha não será alterada.</p>
            <hr style="border:none;border-top:1px solid #d8eee1;margin:1.5rem 0"/>
            <p style="color:#aaa;font-size:0.8rem">Estúdio Vit · Sistema de gestão</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Erro ao enviar email de recuperação:", emailError.message);
      // Don't block the response — log the failure but still return the safe message
    }

    res.json({ message: SAFE_RESET_MESSAGE });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400);
      throw new Error("Token e nova senha são obrigatórios.");
    }

    if (password.length < 6) {
      res.status(400);
      throw new Error("A senha deve ter pelo menos 6 caracteres.");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+password +resetPasswordToken +resetPasswordExpires");

    if (!user) {
      res.status(400);
      throw new Error("Link de recuperação inválido ou expirado. Solicite um novo.");
    }

    user.password = password; // pre-save hook handles bcrypt hashing
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Senha atualizada com sucesso. Faça login com a nova senha." });
  } catch (error) {
    next(error);
  }
}

module.exports = { login, register, signup, googleAuth, getMe, forgotPassword, resetPassword };
