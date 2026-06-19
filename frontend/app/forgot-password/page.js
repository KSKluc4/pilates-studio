"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-card__logo">P</div>
        <h1>Estúdio Vit</h1>

        {submitted ? (
          <>
            <p
              style={{
                background: "var(--highlight)",
                color: "var(--primary-dark)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                fontSize: "0.9rem",
                fontWeight: 600,
                marginTop: "1rem",
                lineHeight: 1.5,
              }}
            >
              Se o email estiver cadastrado, você receberá um link de recuperação em breve.
              Verifique também a caixa de spam.
            </p>
            <p style={{ marginTop: "1.5rem", fontSize: "0.9rem" }}>
              <Link href="/login">← Voltar para o login</Link>
            </p>
          </>
        ) : (
          <>
            <p>Digite seu email para receber o link de recuperação de senha.</p>
            <form className="form" onSubmit={handleSubmit}>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoFocus
                />
              </label>
              {error && <p className="error-text">{error}</p>}
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </form>
            <p style={{ marginTop: "1.5rem", fontSize: "0.9rem" }}>
              <Link href="/login">← Voltar para o login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
