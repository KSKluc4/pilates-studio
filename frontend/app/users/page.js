"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

function UsersContent() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [roleChoice, setRoleChoice] = useState({});

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  async function loadUsers() {
    try {
      const data = await api.get("/users", token);
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (token && user?.role === "admin") loadUsers();
  }, [token, user]);

  async function handleApprove(id) {
    const role = roleChoice[id] || "recepcionista";
    try {
      await api.put(`/users/${id}/approve`, { role }, token);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remover este usuário?")) return;
    try {
      await api.delete(`/users/${id}`, token);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  if (user && user.role !== "admin") return null;

  return (
    <div className="container">
      <div className="page-header">
        <h1>Usuários</h1>
      </div>

      {error && <p className="error-text">{error}</p>}

      {/* Tabela — visível em telas médias e grandes */}
      <div className="desktop-table">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.status === "active" ? "Ativo" : "Pendente"}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {u.status === "pending" && (
                      <>
                        <select
                          value={roleChoice[u._id] || "recepcionista"}
                          onChange={(e) =>
                            setRoleChoice({ ...roleChoice, [u._id]: e.target.value })
                          }
                        >
                          <option value="recepcionista">Recepcionista</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button className="btn btn--primary" onClick={() => handleApprove(u._id)}>
                          Aprovar
                        </button>
                      </>
                    )}
                    <button className="btn btn--danger" onClick={() => handleDelete(u._id)}>
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
        {users.map((u) => (
          <div key={u._id} className="mobile-card">
            <div className="mobile-card__title">{u.name}</div>
            <div className="mobile-card__field">
              <span className="mobile-card__label">Email:</span>
              <span>{u.email}</span>
            </div>
            <div className="mobile-card__field">
              <span className="mobile-card__label">Role:</span>
              <span>{u.role}</span>
            </div>
            <div className="mobile-card__field">
              <span className="mobile-card__label">Status:</span>
              <span>{u.status === "active" ? "Ativo" : "Pendente"}</span>
            </div>
            <div className="mobile-card__actions">
              {u.status === "pending" && (
                <>
                  <select
                    value={roleChoice[u._id] || "recepcionista"}
                    onChange={(e) =>
                      setRoleChoice({ ...roleChoice, [u._id]: e.target.value })
                    }
                  >
                    <option value="recepcionista">Recepcionista</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="btn btn--primary" onClick={() => handleApprove(u._id)}>
                    Aprovar
                  </button>
                </>
              )}
              <button className="btn btn--danger" onClick={() => handleDelete(u._id)}>
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <UsersContent />
    </ProtectedRoute>
  );
}
