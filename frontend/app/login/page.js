"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleMessage, setGoogleMessage] = useState("");
  const { login, loginWithToken } = useAuth();
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  useEffect(() => {
    const msg = sessionStorage.getItem("sessionMessage");
    if (msg) {
      setSessionMessage(msg);
      sessionStorage.removeItem("sessionMessage");
    }
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session) return;

    if (session.backendToken) {
      loginWithToken(session.backendToken, session.backendUser);
      router.push("/dashboard");
    } else if (session.pending) {
      setGoogleMessage("Sua conta está pendente de aprovação por um administrador.");
      signOut({ redirect: false });
    }
  }, [session, sessionStatus]);

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
        <h1>Pilates Studio</h1>
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
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div style={{ margin: "1.25rem 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          ou
        </div>

        <button
          type="button"
          className="btn btn--ghost"
          style={{ width: "100%" }}
          onClick={() => signIn("google")}
        >
          Entrar com Google
        </button>

        {googleMessage && <p className="error-text" style={{ marginTop: "1rem" }}>{googleMessage}</p>}

        <p style={{ marginTop: "1.5rem", fontSize: "0.9rem" }}>
          Não tem conta? <Link href="/signup">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
