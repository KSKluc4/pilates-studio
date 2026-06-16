"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const res = await api.post("/auth/signup", form);
      setMessage(res.message);
      setForm({ name: "", email: "", password: "" });
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
        <h1>Criar conta</h1>
        <p>Cadastre-se para solicitar acesso ao sistema.</p>

        {message ? (
          <p>
            {message} <Link href="/login">Voltar ao login</Link>
          </p>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <label>
              Nome
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={6}
                required
              />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Enviando..." : "Cadastrar"}
            </button>
          </form>
        )}

        <p style={{ marginTop: "1.5rem", fontSize: "0.9rem" }}>
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
