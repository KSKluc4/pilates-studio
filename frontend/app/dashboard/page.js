"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

function DashboardContent() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    patients: 0,
    upcomingAppointments: 0,
    paymentsThisMonth: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    async function loadStats() {
      try {
        const [patients, appointments, payments] = await Promise.all([
          api.get("/patients", token),
          api.get("/appointments", token),
          api.get("/payments", token),
        ]);

        const now = new Date();
        const upcoming = appointments.filter(
          (a) => new Date(a.date) >= now && a.status === "scheduled"
        );

        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const monthTotal = payments
          .filter((p) => (p.referenceMonth || p.createdAt.slice(0, 7)) === currentMonth)
          .reduce((sum, p) => sum + p.amount, 0);

        setStats({
          patients: patients.length,
          upcomingAppointments: upcoming.length,
          paymentsThisMonth: monthTotal,
        });
      } catch (err) {
        setError(err.message);
      }
    }

    loadStats();
  }, [token]);

  return (
    <div className="container">
      <h1>Dashboard</h1>
      <p>
        Bem-vindo(a), {user?.name}! Você está conectado(a) como{" "}
        <strong>{user?.role}</strong>.
      </p>

      {error && <p className="error-text">{error}</p>}

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-card__value">{stats.patients}</div>
          <div>Pacientes cadastrados</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__value">{stats.upcomingAppointments}</div>
          <div>Próximos agendamentos</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card__value">R$ {stats.paymentsThisMonth.toFixed(2)}</div>
          <div>Pagamentos no mês</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
