"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

function PatientsContent() {
  const { token } = useAuth();
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", medicalNotes: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadPatients() {
    try {
      const data = await api.get("/patients", token);
      setPatients(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (token) loadPatients();
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/patients", form, token);
      setForm({ name: "", email: "", phone: "", medicalNotes: "" });
      await loadPatients();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remover este paciente?")) return;
    try {
      await api.delete(`/patients/${id}`, token);
      await loadPatients();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Pacientes</h1>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card" style={{ marginBottom: "2rem" }}>
        <h3>Novo paciente</h3>
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
            Telefone
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Observações médicas
            <textarea
              value={form.medicalNotes}
              onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })}
            />
          </label>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Salvando..." : "Adicionar paciente"}
          </button>
        </form>
      </div>

      {/* Tabela — visível em telas médias e grandes */}
      <div className="desktop-table">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Email</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{p.phone}</td>
                <td>{p.email || "-"}</td>
                <td>{p.active ? "Ativo" : "Inativo"}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "nowrap" }}>
                    <Link
                      href={`/patients/${p._id}/history`}
                      className="btn btn--ghost"
                      style={{ fontSize: "0.8rem", padding: "0.4rem 0.9rem" }}
                    >
                      Histórico
                    </Link>
                    <button className="btn btn--danger" onClick={() => handleDelete(p._id)}>
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards — visíveis apenas no mobile */}
      <div className="mobile-cards">
        {patients.map((p) => (
          <div key={p._id} className="mobile-card">
            <div className="mobile-card__title">{p.name}</div>
            <div className="mobile-card__field">
              <span className="mobile-card__label">Telefone:</span>
              <span>{p.phone}</span>
            </div>
            <div className="mobile-card__field">
              <span className="mobile-card__label">Email:</span>
              <span>{p.email || "-"}</span>
            </div>
            <div className="mobile-card__field">
              <span className="mobile-card__label">Status:</span>
              <span>{p.active ? "Ativo" : "Inativo"}</span>
            </div>
            <div className="mobile-card__actions">
              <Link href={`/patients/${p._id}/history`} className="btn btn--ghost">
                Histórico
              </Link>
              <button className="btn btn--danger" onClick={() => handleDelete(p._id)}>
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PatientsPage() {
  return (
    <ProtectedRoute>
      <PatientsContent />
    </ProtectedRoute>
  );
}
