"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

// ── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatFullDate(date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getMondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return d;
}

function getWeekLabel(monday) {
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return `${monday.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}`;
}

function statusLabel(s) {
  return (
    { scheduled: "Agendado", completed: "Concluído", cancelled: "Cancelado", "no-show": "Não compareceu" }[s] ?? s
  );
}

// ── equipment badge ───────────────────────────────────────────────────────────

const EQ_COLORS = {
  Cadillac: { bg: "#2d6a4f", text: "#fff" },
  Reformer: { bg: "#52b788", text: "#fff" },
  "Chair 1": { bg: "#e9c46a", text: "#1b1b1b" },
  "Chair 2": { bg: "#f4a261", text: "#1b1b1b" },
  Barrel: { bg: "#457b9d", text: "#fff" },
};

function EquipmentSelect({ current, slotTaken, equipmentList, onChange, selectStyle }) {
  const available = equipmentList.filter((eq) => eq === current || !slotTaken.includes(eq));
  return (
    <select
      value={current || ""}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontSize: "0.82rem",
        padding: "0.2rem 0.5rem",
        borderRadius: "6px",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        cursor: "pointer",
        color: "var(--text-primary)",
        minWidth: "8rem",
        ...selectStyle,
      }}
    >
      {!current && (
        <option value="" disabled>
          — selecionar —
        </option>
      )}
      {available.map((eq) => (
        <option key={eq} value={eq}>
          {eq}
        </option>
      ))}
    </select>
  );
}

function EquipmentBadge({ name }) {
  const c = EQ_COLORS[name] || { bg: "#d8eee1", text: "#1b1b1b" };
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        borderRadius: "999px",
        padding: "0.2rem 0.75rem",
        fontSize: "0.78rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
        letterSpacing: "0.02em",
      }}
    >
      {name || "—"}
    </span>
  );
}

// ── main component ────────────────────────────────────────────────────────────

function AppointmentsContent() {
  const { token } = useAuth();

  // crud
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [form, setForm] = useState({ patient: "", date: "", durationMinutes: 60, notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // schedule section
  const [scheduleView, setScheduleView] = useState("day");
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [weekMonday, setWeekMonday] = useState(() => getMondayOf(new Date()));
  const [daySchedule, setDaySchedule] = useState([]);
  const [weekSchedule, setWeekSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleKey, setScheduleKey] = useState(0);

  // ── data loading ────────────────────────────────────────────────────────────

  async function loadCrud() {
    try {
      const [appts, pats, eqs] = await Promise.all([
        api.get("/appointments", token),
        api.get("/patients", token),
        api.get("/equipment", token),
      ]);
      setAppointments(appts);
      setPatients(pats);
      setEquipmentList(eqs.map((e) => e.name));
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadDaySchedule() {
    setScheduleLoading(true);
    try {
      const data = await api.get(`/schedule/${toDateStr(scheduleDate)}`, token);
      setDaySchedule(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setScheduleLoading(false);
    }
  }

  async function loadWeekSchedule() {
    setScheduleLoading(true);
    try {
      const data = await api.get(`/schedule/week?date=${toDateStr(weekMonday)}`, token);
      setWeekSchedule(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setScheduleLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadCrud();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (scheduleView === "day") loadDaySchedule();
    else loadWeekSchedule();
  }, [token, scheduleView, scheduleDate, weekMonday, scheduleKey]);

  // ── crud handlers ───────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/appointments", form, token);
      setForm({ patient: "", date: "", durationMinutes: 60, notes: "" });
      await loadCrud();
      setScheduleKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await api.put(`/appointments/${id}`, { status }, token);
      await loadCrud();
      setScheduleKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleEquipmentChange(appointmentId, newEquipment) {
    try {
      await api.put(`/appointments/${appointmentId}`, { equipment: newEquipment }, token);
      setDaySchedule((prev) =>
        prev.map((item) =>
          item.appointmentId === appointmentId
            ? { ...item, equipment: newEquipment, manualEquipment: true }
            : item
        )
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remover este agendamento?")) return;
    try {
      await api.delete(`/appointments/${id}`, token);
      await loadCrud();
      setScheduleKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  // ── navigation ──────────────────────────────────────────────────────────────

  function navigateDay(delta) {
    setScheduleDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta));
  }

  function navigateWeek(delta) {
    setWeekMonday((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta * 7));
  }

  const todayStr = toDateStr(new Date());
  const isViewingToday = toDateStr(scheduleDate) === todayStr;

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="container">
      <div className="page-header">
        <h1>Agendamentos</h1>
      </div>

      {error && <p className="error-text">{error}</p>}

      {/* ── Rodízio de Equipamentos ── */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          <h3 style={{ margin: 0, fontFamily: "var(--font-heading)" }}>
            Rodízio de Equipamentos
          </h3>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              className={`btn ${scheduleView === "day" ? "btn--primary" : "btn--ghost"}`}
              style={{ padding: "0.45rem 1.1rem", fontSize: "0.85rem" }}
              onClick={() => setScheduleView("day")}
            >
              Dia
            </button>
            <button
              className={`btn ${scheduleView === "week" ? "btn--primary" : "btn--ghost"}`}
              style={{ padding: "0.45rem 1.1rem", fontSize: "0.85rem" }}
              onClick={() => setScheduleView("week")}
            >
              Semana
            </button>
          </div>
        </div>

        {/* ── DAY VIEW ── */}
        {scheduleView === "day" && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1rem",
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn btn--ghost"
                style={{ padding: "0.4rem 1rem", fontSize: "0.82rem" }}
                onClick={() => navigateDay(-1)}
              >
                ← Anterior
              </button>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                  flex: 1,
                  textAlign: "center",
                  textTransform: "capitalize",
                }}
              >
                {isViewingToday && "Hoje — "}
                {formatFullDate(scheduleDate)}
              </span>
              <button
                className="btn btn--ghost"
                style={{ padding: "0.4rem 1rem", fontSize: "0.82rem" }}
                onClick={() => navigateDay(1)}
              >
                Próximo →
              </button>
            </div>

            {scheduleLoading ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Carregando...</p>
            ) : daySchedule.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Nenhuma aula agendada para este dia.
              </p>
            ) : (
              <>
              {/* Tabela — desktop */}
              <div className="desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th>Horário</th>
                      <th>Paciente</th>
                      <th>Equipamento</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daySchedule.map((item) => {
                      const slotTaken = daySchedule
                        .filter((o) => o.appointmentId !== item.appointmentId && o.date === item.date && o.equipment)
                        .map((o) => o.equipment);
                      return (
                        <tr key={item.appointmentId}>
                          <td style={{ whiteSpace: "nowrap" }}>{formatTime(item.date)}</td>
                          <td>{item.patientName}</td>
                          <td>
                            <EquipmentSelect
                              current={item.equipment}
                              slotTaken={slotTaken}
                              equipmentList={equipmentList}
                              onChange={(eq) => handleEquipmentChange(item.appointmentId, eq)}
                            />
                          </td>
                          <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                            {statusLabel(item.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards — mobile */}
              <div className="mobile-cards">
                {daySchedule.map((item) => {
                  const slotTaken = daySchedule
                    .filter((o) => o.appointmentId !== item.appointmentId && o.date === item.date && o.equipment)
                    .map((o) => o.equipment);
                  return (
                    <div key={item.appointmentId} className="mobile-card">
                      <div className="mobile-card__title" style={{ fontSize: "1.4rem" }}>
                        {formatTime(item.date)}
                      </div>
                      <div className="mobile-card__field">
                        <span className="mobile-card__label">Paciente:</span>
                        <span>{item.patientName}</span>
                      </div>
                      <div className="mobile-card__field">
                        <span className="mobile-card__label">Status:</span>
                        <span style={{ color: "var(--text-secondary)" }}>{statusLabel(item.status)}</span>
                      </div>
                      <div className="mobile-card__actions">
                        <EquipmentSelect
                          current={item.equipment}
                          slotTaken={slotTaken}
                          equipmentList={equipmentList}
                          onChange={(eq) => handleEquipmentChange(item.appointmentId, eq)}
                          selectStyle={{
                            width: "100%",
                            minWidth: "unset",
                            minHeight: "44px",
                            padding: "0.65rem 0.9rem",
                            borderRadius: "10px",
                            fontSize: "0.9rem",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </>
        )}

        {/* ── WEEK VIEW ── */}
        {scheduleView === "week" && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.25rem",
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn btn--ghost"
                style={{ padding: "0.4rem 1rem", fontSize: "0.82rem" }}
                onClick={() => navigateWeek(-1)}
              >
                ← Anterior
              </button>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                  flex: 1,
                  textAlign: "center",
                }}
              >
                {getWeekLabel(weekMonday)}
              </span>
              <button
                className="btn btn--ghost"
                style={{ padding: "0.4rem 1rem", fontSize: "0.82rem" }}
                onClick={() => navigateWeek(1)}
              >
                Próxima →
              </button>
            </div>

            {scheduleLoading ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Carregando...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {weekSchedule.map((day) => {
                  const isToday = day.date === todayStr;
                  return (
                    <div
                      key={day.date}
                      style={{
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: isToday
                          ? "2px solid var(--accent)"
                          : "1px solid var(--border)",
                      }}
                    >
                      <div
                        style={{
                          background: isToday ? "var(--accent)" : "var(--highlight)",
                          padding: "0.55rem 1rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <strong
                          style={{
                            fontFamily: "var(--font-heading)",
                            color: isToday ? "#fff" : "var(--primary-dark)",
                            fontSize: "0.92rem",
                            textTransform: "capitalize",
                          }}
                        >
                          {formatShortDate(day.date)}
                          {isToday && (
                            <span
                              style={{
                                marginLeft: "0.5rem",
                                fontSize: "0.7rem",
                                background: "rgba(255,255,255,0.3)",
                                borderRadius: "999px",
                                padding: "0.1rem 0.5rem",
                              }}
                            >
                              hoje
                            </span>
                          )}
                        </strong>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: isToday ? "rgba(255,255,255,0.85)" : "var(--text-secondary)",
                          }}
                        >
                          {day.appointments.length}{" "}
                          {day.appointments.length === 1 ? "aula" : "aulas"}
                        </span>
                      </div>

                      {day.appointments.length === 0 ? (
                        <p
                          style={{
                            margin: 0,
                            padding: "0.6rem 1rem",
                            fontSize: "0.82rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Sem aulas
                        </p>
                      ) : (
                        <>
                        {/* Tabela — desktop */}
                        <div className="desktop-table">
                          <table style={{ margin: 0 }}>
                            <thead>
                              <tr>
                                <th style={{ fontSize: "0.78rem" }}>Horário</th>
                                <th style={{ fontSize: "0.78rem" }}>Paciente</th>
                                <th style={{ fontSize: "0.78rem" }}>Equipamento</th>
                              </tr>
                            </thead>
                            <tbody>
                              {day.appointments.map((item) => (
                                <tr key={item.appointmentId}>
                                  <td style={{ fontSize: "0.83rem", whiteSpace: "nowrap" }}>
                                    {formatTime(item.date)}
                                  </td>
                                  <td style={{ fontSize: "0.83rem" }}>{item.patientName}</td>
                                  <td>
                                    {item.noEquipmentAvailable ? (
                                      <span style={{ color: "var(--danger)", fontSize: "0.75rem", fontWeight: 700 }}>
                                        Sem equipamento
                                      </span>
                                    ) : (
                                      <EquipmentBadge name={item.equipment} />
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Lista compacta — mobile */}
                        <div className="mobile-cards" style={{ margin: 0, gap: 0 }}>
                          {day.appointments.map((item) => (
                            <div
                              key={item.appointmentId}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "0.65rem 1rem",
                                borderTop: "1px solid var(--border)",
                                gap: "0.5rem",
                              }}
                            >
                              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", flexShrink: 0 }}>
                                {formatTime(item.date)}
                              </span>
                              <span style={{ fontSize: "0.85rem", flex: 1 }}>{item.patientName}</span>
                              <div style={{ flexShrink: 0 }}>
                                {item.noEquipmentAvailable ? (
                                  <span style={{ color: "var(--danger)", fontSize: "0.75rem", fontWeight: 700 }}>
                                    Sem equip.
                                  </span>
                                ) : (
                                  <EquipmentBadge name={item.equipment} />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Novo agendamento ── */}
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

      {/* ── Lista completa ── */}

      {/* Tabela — desktop */}
      <div className="desktop-table">
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
                    style={{ fontSize: "0.85rem" }}
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

      {/* Cards — mobile */}
      <div className="mobile-cards">
        {appointments.map((a) => (
          <div key={a._id} className="mobile-card">
            <div className="mobile-card__title">
              {new Date(a.date).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="mobile-card__field">
              <span className="mobile-card__label">Paciente:</span>
              <span>{a.patient?.name || "-"}</span>
            </div>
            <div className="mobile-card__actions">
              <select
                value={a.status}
                onChange={(e) => handleStatusChange(a._id, e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "44px",
                  padding: "0.65rem 0.9rem",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  background: "#ffffff",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  fontFamily: "var(--font-body)",
                }}
              >
                <option value="scheduled">Agendado</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
                <option value="no-show">Não compareceu</option>
              </select>
              <button className="btn btn--danger" onClick={() => handleDelete(a._id)}>
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
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
