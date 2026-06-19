function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Rota não encontrada: ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  // Mongoose CastError: invalid ObjectId or type mismatch → 400 instead of 500
  if (err.name === "CastError") {
    return res.status(400).json({ message: "ID inválido." });
  }

  // Mongoose ValidationError: schema-level constraints
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(" ");
    return res.status(400).json({ message });
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message || "Erro interno do servidor.",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };
