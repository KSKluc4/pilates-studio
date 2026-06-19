"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ProtectedRoute from "../../../../components/ProtectedRoute";
import { useAuth } from "../../../../context/AuthContext";
import { api } from "../../../../lib/api";

const EQ_COLORS = {
  Cadillac: { bg: "#2d6a4f", text: "#fff" },
  Reformer: { bg: "#52b788", text: "#fff" },
  "Chair 1": { bg: "#e9c46a", text: "#1b1b1b" },
  "Chair 2": { bg: "#f4a261", text: "#1b1b1b" },
  Barrel: { bg: "#457b9d", text: "#fff" },
};

function EquipmentBadge({ name }) {
  const c = EQ_COLORS[name] || { bg: "#d8eee1", text: "#1b1b1b" };
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        borderRadius: "999px",
        padding: "0.2rem 0.75rem",
        fontSize: "0.8rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
        letterSpacing: "0.02em",
      }}
    >
      {name}
    </span>
  );
}

function HistoryContent() {
  const { token } = useAuth();
  const { id } = useParams();

  const [patientName, setPatientName] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !id) return;
    api
      .get(`/patients/${id}/equipment-history`, token)
      .then(({ patient, history: h }) => {
        setPatientName(patient.name);
        setHistory(h);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <Link
            href="/patients"
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              display: "inline-block",
              marginBottom: "0.4rem",
            }}
          >
            ← Pacientes
          </Link>
          <h1 style={{ margin: 0 }}>
            {patientName || "Paciente"}
          </h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Histórico de equipamentos
          </p>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p style={{ color: "var(--text-secondary)" }}>Carregando...</p>
      ) : history.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            Nenhuma aula concluída com equipamento registrado.
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            O equipamento é atribuído ao visualizar o rodízio em Agendamentos.
          </p>
        </div>
      ) : (
        <>
          {/* summary chips */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginBottom: "1.5rem",
            }}
          >
            {Object.entries(
              history.reduce((acc, h) => {
                acc[h.equipment] = (acc[h.equipment] || 0) + 1;
                return acc;
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .map(([eq, count]) => {
                const c = EQ_COLORS[eq] || { bg: "#d8eee1", text: "#1b1b1b" };
                return (
                  <span
                    key={eq}
                    style={{
                      background: c.bg,
                      color: c.text,
                      borderRadius: "999px",
                      padding: "0.3rem 1rem",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                    }}
                  >
                    {eq} · {count}×
                  </span>
                );
              })}
          </div>

          {/* consecutive-repeat warning */}
          {hasConsecutiveRepeat(history) && (
            <p
              className="error-text"
              style={{ marginBottom: "1rem", fontSize: "0.85rem" }}
            >
              ⚠ Atenção: o histórico contém aulas consecutivas com o mesmo equipamento.
            </p>
          )}

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Data</th>
                <th>Equipamento</th>
                <th>Repetiu?</th>
                <th>Duração</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => {
                const prev = history[i + 1]; // history is desc; next in time = i+1
                const repeated = prev && prev.equipment === h.equipment;
                return (
                  <tr key={h._id}>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                      {history.length - i}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {new Date(h.date).toLocaleDateString("pt-BR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <EquipmentBadge name={h.equipment} />
                    </td>
                    <td>
                      {repeated ? (
                        <span style={{ color: "var(--danger)", fontSize: "0.82rem", fontWeight: 700 }}>
                          ✗ sim
                        </span>
                      ) : (
                        <span style={{ color: "var(--accent)", fontSize: "0.82rem", fontWeight: 600 }}>
                          ✓ não
                        </span>
                      )}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      {h.durationMinutes} min
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function hasConsecutiveRepeat(history) {
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i].equipment === history[i + 1].equipment) return true;
  }
  return false;
}

export default function PatientHistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}
