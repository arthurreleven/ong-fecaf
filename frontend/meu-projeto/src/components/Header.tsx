import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

interface User {
  nome: string;
  email: string;
  avatarUrl?: string;
}

interface NavItem {
  label: string;
  path: string;
}

interface HeaderProps {
  user?: User | null;
  onLogout?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",  path: "/dashboard" },
  { label: "Doações",    path: "/doacoes"   },
  { label: "Relatórios", path: "/relatorios"},
  { label: "Doadores",   path: "/doadores"  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map(n => n[0])
    .join("")
    .toUpperCase();
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function UserMenu({ user, onLogout }: { user: User; onLogout?: () => void }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
    } finally {
      onLogout?.();
      navigate("/login");
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen(prev => !prev)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "transparent",
          border: "1px solid #2a3a70",
          borderRadius: 10,
          padding: "6px 12px 6px 6px",
          cursor: "pointer",
          color: "#f0f0f0",
          transition: "border-color .2s",
        }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.nome}
            style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "#f97316", color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700,
          }}>
            {getInitials(user.nome)}
          </div>
        )}
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{user.nome}</div>
          <div style={{ fontSize: 11, color: "#8899bb", lineHeight: 1.2 }}>{user.email}</div>
        </div>
        {/* Chevron */}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ marginLeft: 4, transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M2 4l4 4 4-4" stroke="#8899bb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)",
            minWidth: 200, zIndex: 50,
            background: "#070d2a",
            border: "1px solid #2a3a70",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,.5)",
          }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e2a5e" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f97316" }}>{user.nome}</div>
              <div style={{ fontSize: 11, color: "#8899bb", marginTop: 2 }}>{user.email}</div>
            </div>

            {[
              { label: "Meu perfil",       path: "/perfil"       },
              { label: "Configurações",    path: "/configuracoes" },
            ].map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                style={{
                  display: "block", padding: "10px 16px",
                  fontSize: 13, color: "#d0d8f0",
                  textDecoration: "none",
                  transition: "background .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#111b40")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {item.label}
              </Link>
            ))}

            <div style={{ borderTop: "1px solid #1e2a5e" }}>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%", textAlign: "left",
                  padding: "10px 16px", fontSize: 13,
                  background: "transparent", border: "none",
                  color: "#f87171", cursor: "pointer",
                  transition: "background .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#2a0a0a")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                Sair da conta
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation();

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 30 }}
        onClick={onClose}
      />
      <nav style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: 260, zIndex: 40,
        background: "#00020D",
        borderRight: "2px solid #f97316",
        padding: "24px 0",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "0 20px 20px", borderBottom: "1px solid #1e2a5e", marginBottom: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f97316" }}>🤝 ONG Doações</div>
          <div style={{ fontSize: 11, color: "#4a5a88", marginTop: 4 }}>Sistema de Doações</div>
        </div>

        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              style={{
                display: "block", padding: "12px 20px",
                fontSize: 15, fontWeight: active ? 600 : 400,
                color: active ? "#f97316" : "#d0d8f0",
                textDecoration: "none",
                borderLeft: active ? "3px solid #f97316" : "3px solid transparent",
                background: active ? "rgba(249,115,22,.08)" : "transparent",
                transition: "all .15s",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Header({ user, onLogout }: HeaderProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "#00020D",
        borderBottom: "3px solid #f97316",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex", alignItems: "center", gap: 24,
        }}>

          {/* Logo */}
          <Link
            to="/dashboard"
            style={{ textDecoration: "none", flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "#f97316",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>
              🤝
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f97316", lineHeight: 1.1 }}>ONG Doações</div>
              <div style={{ fontSize: 10, color: "#4a5a88", lineHeight: 1.1 }}>Sistema de Registro</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
            {NAV_ITEMS.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    padding: "6px 14px",
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? "#f97316" : "#a0aec0",
                    textDecoration: "none",
                    borderRadius: 8,
                    background: active ? "rgba(249,115,22,.12)" : "transparent",
                    border: active ? "1px solid rgba(249,115,22,.3)" : "1px solid transparent",
                    transition: "all .2s",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#f0f0f0"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#a0aec0"; }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {/* Nova doação — CTA rápido */}
            <Link
              to="/doar"
              style={{
                padding: "7px 16px",
                background: "#f97316",
                color: "#000",
                fontSize: 13, fontWeight: 700,
                borderRadius: 8,
                textDecoration: "none",
                border: "none",
                whiteSpace: "nowrap",
                transition: "opacity .2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              + Nova Doação
            </Link>

            {user ? (
              <UserMenu user={user} onLogout={onLogout} />
            ) : (
              <Link
                to="/login"
                style={{
                  padding: "7px 16px", fontSize: 13, fontWeight: 600,
                  color: "#f0f0f0", textDecoration: "none",
                  border: "1px solid #2a3a70", borderRadius: 8,
                  transition: "border-color .2s",
                }}
              >
                Entrar
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              style={{
                display: "none", // shown via media query workaround below
                background: "transparent", border: "none",
                color: "#f0f0f0", cursor: "pointer", padding: 4,
              }}
              aria-label="Abrir menu"
              className="mobile-hamburger"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Responsive style — injected globally */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-hamburger { display: block !important; }
          header nav { display: none !important; }
        }
      `}</style>
    </>
  );
}