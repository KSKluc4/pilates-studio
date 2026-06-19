"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <>
        <p className="error-text">Link de recuperação inválido.</p>
        <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
          <Link href="/forgot-password">Solicitar novo link</Link>
        </p>
      </>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      sessionStorage.setItem("sessionMessage", "Senha atualizada com sucesso. Faça login com a nova senha.");
      router.push("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        Nova senha
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
          autoFocus
        />
      </label>
      <label>
        Confirmar nova senha
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </label>
      {error && <p className="error-text">{error}</p>}
      <button type="submit" className="btn btn--primary" disabled={submitting}>
        {submitting ? "Salvando..." : "Redefinir senha"}
      </button>
      <p style={{ fontSize: "0.9rem", textAlign: "center" }}>
        <Link href="/login">← Voltar para o login</Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-card__logo">P</div>
        <h1>Estúdio Vit</h1>
        <p>Crie uma nova senha para sua conta.</p>
        <Suspense fallback={<p style={{ color: "var(--text-secondary)" }}>Carregando...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
