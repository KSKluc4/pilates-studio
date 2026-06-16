"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

function AppointmentsContent() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [form, setForm] = useState({ patient: "", date: "", durationMinutes: 60, notes: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    try {
      const [appts, pats, today] = await Promise.all([
        api.get("/appointments", token),
        api.get("/patients", token),
        api.get("/schedule/today", token),
      ]);
      setAppointments(appts);
      setPatients(pats);
      setTodaySchedule(today);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/appointments", form, token);
      setForm({ patient: "", date: "", durationMinutes: 60, notes: "" });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await api.put(`/appointments/${id}`, { status }, token);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remover este agendamento?")) return;
    try {
      await api.delete(`/appointments/${id}`, token);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Agendamentos</h1>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card" style={{ marginBottom: "2rem" }}>
        <h3>Hoje — {new Date().toLocaleDateString("pt-BR")}</h3>
        {todaySchedule.length === 0 ? (
          <p>Nenhuma aula agendada para hoje.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Horário</th>
                <th>Paciente</th>
                <th>Equipamento</th>
              </tr>
            </thead>
            <tbody>
              {todaySchedule.map((item) => (
                <tr key={item.appointmentId}>
                  <td>
                    {new Date(item.date).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>{item.patientName}</td>
                  <td>{item.equipment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginBottom: "2rem" }}>
        <h3>Novo agendamento</h3>
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
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data e hora
            <input
              type="datetime-local"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </label>
          <label>
            Duração (minutos)
            <input
              type="number"
              min="15"
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
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
            {submitting ? "Salvando..." : "Agendar"}
          </button>
        </form>
      </div>

      <table>
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Data</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr key={a._id}>
              <td>{a.patient?.name || "-"}</td>
              <td>{new Date(a.date).toLocaleString("pt-BR")}</td>
              <td>
                <select
                  value={a.status}
                  onChange={(e) => handleStatusChange(a._id, e.target.value)}
                >
                  <option value="scheduled">Agendado</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="no-show">Não compareceu</option>
                </select>
              </td>
              <td>
                <button className="btn btn--danger" onClick={() => handleDelete(a._id)}>
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <ProtectedRoute>
      <AppointmentsContent />
    </ProtectedRoute>
  );
}
