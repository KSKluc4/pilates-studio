"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

const METHOD_LABELS = {
  cash: "Dinheiro",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  pix: "Pix",
  bank_transfer: "Transferência bancária",
};

const STATUS_LABELS = {
  pending: "Pendente",
  paid: "Pago",
  refunded: "Estornado",
};

function PaymentsContent() {
  const { user, token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [filters, setFilters] = useState({ patientId: "", month: "" });
  const [form, setForm] = useState({
    patient: "",
    amount: "",
    method: "pix",
    status: "paid",
    referenceMonth: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData(patientId = "") {
    try {
      const query = patientId ? `?patientId=${patientId}` : "";
      const [pmts, pats] = await Promise.all([
        api.get(`/payments${query}`, token),
        api.get("/patients", token),
      ]);
      setPayments(pmts);
      setPatients(pats);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  function applyFilters() {
    loadData(filters.patientId);
  }

  function clearFilters() {
    setFilters({ patientId: "", month: "" });
    loadData("");
  }

  const visiblePayments = filters.month
    ? payments.filter((p) => (p.referenceMonth || p.createdAt.slice(0, 7)) === filters.month)
    : payments;

  const total = visiblePayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/payments", { ...form, amount: Number(form.amount) }, token);
      setForm({ patient: "", amount: "", method: "pix", status: "paid", referenceMonth: "", notes: "" });
      await loadData(filters.patientId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remover este pagamento?")) return;
    try {
      await api.delete(`/payments/${id}`, token);
      await loadData(filters.patientId);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Pagamentos</h1>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card" style={{ marginBottom: "2rem" }}>
        <h3>Filtros</h3>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.9rem", fontWeight: 600 }}>
            Paciente
            <select
              value={filters.patientId}
              onChange={(e) => setFilters({ ...filters, patientId: e.target.value })}
              style={{ padding: "0.6rem 0.9rem", borderRadius: 10, border: "1px solid var(--border)", fontSize: "0.95rem" }}
            >
              <option value="">Todos</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.9rem", fontWeight: 600 }}>
            Mês de referência
            <input
              type="month"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              style={{ padding: "0.6rem 0.9rem", borderRadius: 10, border: "1px solid var(--border)", fontSize: "0.95rem" }}
            />
          </label>
          <button className="btn btn--primary" onClick={applyFilters}>Filtrar</button>
          <button className="btn" onClick={clearFilters}>Limpar</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "2rem" }}>
        <h3>Novo pagamento</h3>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Paciente
            <select
              value={form.patient}
              onChange={(e) => setForm({ ...form, patient: e.target.value })}
              required
            >
              <option value="">Selecione um paciente</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label>
            Valor (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </label>
          <label>
            Forma de pagamento
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              {Object.entries(METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Mês de referência
            <input
              type="month"
              value={form.referenceMonth}
              onChange={(e) => setForm({ ...form, referenceMonth: e.target.value })}
            />
          </label>
          <label>
            Observações
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Salvando..." : "Registrar pagamento"}
          </button>
        </form>
      </div>

      {visiblePayments.length > 0 && (
        <p style={{ textAlign: "right", fontWeight: 700, color: "var(--primary)", marginBottom: "0.5rem" }}>
          Total recebido: R$ {total.toFixed(2)}
        </p>
      )}

      <table>
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Mês ref.</th>
            <th>Valor</th>
            <th>Forma</th>
            <th>Status</th>
            <th>Data</th>
            {user?.role === "admin" && <th></th>}
          </tr>
        </thead>
        <tbody>
          {visiblePayments.length === 0 ? (
            <tr>
              <td colSpan={user?.role === "admin" ? 7 : 6} style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                Nenhum pagamento encontrado.
              </td>
            </tr>
          ) : (
            visiblePayments.map((p) => (
              <tr key={p._id}>
                <td>{p.patient?.name || "-"}</td>
                <td>{p.referenceMonth || p.createdAt.slice(0, 7)}</td>
                <td>R$ {p.amount.toFixed(2)}</td>
                <td>{METHOD_LABELS[p.method] || p.method}</td>
                <td>{STATUS_LABELS[p.status] || p.status}</td>
                <td>{new Date(p.createdAt).toLocaleDateString("pt-BR")}</td>
                {user?.role === "admin" && (
                  <td>
                    <button className="btn btn--danger" onClick={() => handleDelete(p._id)}>
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <ProtectedRoute>
      <PaymentsContent />
    </ProtectedRoute>
  );
}
