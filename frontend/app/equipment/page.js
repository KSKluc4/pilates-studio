"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../lib/api";

function EquipmentContent() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [equipment, setEquipment] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  async function loadEquipment() {
    try {
      const data = await api.get("/equipment", token);
      setEquipment(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (token && user?.role === "admin") loadEquipment();
  }, [token, user]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/equipment", { name }, token);
      setName("");
      setSuccess("Equipamento adicionado com sucesso.");
      await loadEquipment();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id, equipmentName) {
    if (!confirm(`Remover o equipamento "${equipmentName}"?`)) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/equipment/${id}`, token);
      setSuccess("Equipamento removido com sucesso.");
      await loadEquipment();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user || user.role !== "admin") return null;

  return (
    <div className="container">
      <div className="page-header">
        <h1>Equipamentos</h1>
      </div>

      {error && <p className="error-text">{error}</p>}
      {success && (
        <p
          style={{
            background: "var(--highlight)",
            color: "var(--primary-dark)",
            borderRadius: "8px",
            padding: "0.6rem 0.9rem",
            fontSize: "0.88rem",
            fontWeight: 600,
            marginBottom: "1rem",
          }}
        >
          {success}
        </p>
      )}

      <div className="card" style={{ marginBottom: "2rem" }}>
        <h3>Novo equipamento</h3>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Nome
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Reformer, Cadillac..."
              required
            />
          </label>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Salvando..." : "Adicionar equipamento"}
          </button>
        </form>
      </div>

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Cadastrado em</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {equipment.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                Nenhum equipamento cadastrado.
              </td>
            </tr>
          ) : (
            equipment.map((eq) => (
              <tr key={eq._id}>
                <td>{eq.name}</td>
                <td>{new Date(eq.createdAt).toLocaleDateString("pt-BR")}</td>
                <td>
                  <button
                    className="btn btn--danger"
                    onClick={() => handleDelete(eq._id, eq.name)}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function EquipmentPage() {
  return (
    <ProtectedRoute>
      <EquipmentContent />
    </ProtectedRoute>
  );
}
