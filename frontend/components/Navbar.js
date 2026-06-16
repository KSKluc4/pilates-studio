"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="navbar">
      <div className="navbar__row">
        <Link href="/dashboard" className="navbar__brand" onClick={closeMenu}>
          Pilates Studio
        </Link>

        <button
          type="button"
          className="navbar__toggle"
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`navbar__menu ${menuOpen ? "navbar__menu--open" : ""}`}>
          <nav className="navbar__links">
            <Link href="/dashboard" onClick={closeMenu}>
              Dashboard
            </Link>
            <Link href="/patients" onClick={closeMenu}>
              Pacientes
            </Link>
            <Link href="/appointments" onClick={closeMenu}>
              Agendamentos
            </Link>
            {user.role === "admin" && (
              <Link href="/users" onClick={closeMenu}>
                Usuários
              </Link>
            )}
          </nav>
          <div className="navbar__user">
            <span>
              {user.name} <em>({user.role})</em>
            </span>
            <button onClick={logout} className="btn btn--ghost">
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
