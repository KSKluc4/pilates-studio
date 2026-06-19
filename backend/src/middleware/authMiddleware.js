const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401);
    return next(new Error("Não autorizado. Token não fornecido."));
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401);
      return next(new Error("Não autorizado. Usuário não encontrado."));
    }

    req.user = user;
    next();
  } catch {
    res.status(401);
    next(new Error("Não autorizado. Token inválido ou expirado."));
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403);
      return next(new Error("Acesso negado. Permissões insuficientes."));
    }
    next();
  };
}

module.exports = { protect, authorize };
