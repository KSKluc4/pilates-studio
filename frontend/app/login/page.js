"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const msg = sessionStorage.getItem("sessionMessage");
    if (msg) {
      setSessionMessage(msg);
      sessionStorage.removeItem("sessionMessage");
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
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
        <p>Entre com sua conta para continuar.</p>

        {sessionMessage && (
          <p
            style={{
              background: "var(--highlight)",
              color: "var(--primary-dark)",
              borderRadius: "8px",
              padding: "0.6rem 0.9rem",
              fontSize: "0.88rem",
              fontWeight: 600,
              marginTop: "0.75rem",
            }}
          >
            {sessionMessage}
          </p>
        )}

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <div style={{ textAlign: "right", marginTop: "-0.25rem" }}>
            <Link href="/forgot-password" style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Esqueci minha senha
            </Link>
          </div>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p style={{ marginTop: "1.5rem", fontSize: "0.9rem" }}>
          Não tem conta? <Link href="/signup">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
