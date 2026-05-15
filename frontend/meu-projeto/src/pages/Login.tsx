import { useState, useEffect, type FormEvent, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ── Configurações ─────────────────────────────────────────────────────────────
const MAX_TENTATIVAS   = 5;
const BLOQUEIO_SEGUNDOS = 300; // 5 minutos
const STORAGE_KEY      = "ong_login_bloqueio";

// ── Persistência no localStorage ─────────────────────────────────────────────

interface BloqueioStorage {
  tentativas:  number;
  bloqueadoAte: number | null; // timestamp em ms
}

function lerStorage(): BloqueioStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tentativas: 0, bloqueadoAte: null };
    return JSON.parse(raw) as BloqueioStorage;
  } catch {
    return { tentativas: 0, bloqueadoAte: null };
  }
}

function salvarStorage(data: BloqueioStorage) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function limparStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [email,   setEmail]   = useState("");
  const [senha,   setSenha]   = useState("");
  const [erro,    setErro]    = useState("");
  const [loading, setLoading] = useState(false);

  // Inicializa direto do localStorage — sobrevive ao refresh
  const [tentativas,  setTentativas]  = useState(() => lerStorage().tentativas);
  const [bloqueadoAte, setBloqueadoAte] = useState<number | null>(() => lerStorage().bloqueadoAte);
  const [countdown,   setCountdown]   = useState(0);

  // Calcula se ainda está bloqueado ao montar (ou após refresh)
  const bloqueado = bloqueadoAte !== null && Date.now() < bloqueadoAte;

  // Countdown em tempo real
  useEffect(() => {
    if (!bloqueado || !bloqueadoAte) return;

    const tick = () => {
      const restante = Math.max(0, Math.ceil((bloqueadoAte - Date.now()) / 1000));
      setCountdown(restante);
      if (restante === 0) {
        // Bloqueio expirou
        setBloqueadoAte(null);
        setTentativas(0);
        setErro("");
        limparStorage();
      }
    };

    tick(); // executa imediatamente ao montar
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [bloqueado, bloqueadoAte]);

  const formatCountdown = (s: number) => {
    const m   = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (bloqueado) return;

    setErro("");
    setLoading(true);

    try {
      await login(email, senha);
      limparStorage(); // login ok → limpa qualquer registro anterior
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer login.";

      // 429 vindo do backend → bloqueia imediatamente
      if (msg.toLowerCase().includes("muitas tentativas")) {
        const ate = Date.now() + BLOQUEIO_SEGUNDOS * 1000;
        setBloqueadoAte(ate);
        setTentativas(MAX_TENTATIVAS);
        salvarStorage({ tentativas: MAX_TENTATIVAS, bloqueadoAte: ate });
        setErro("Muitas tentativas. Aguarde 5 minutos.");
        return;
      }

      // Incrementa tentativas e persiste
      const novas = tentativas + 1;
      setTentativas(novas);

      if (novas >= MAX_TENTATIVAS) {
        const ate = Date.now() + BLOQUEIO_SEGUNDOS * 1000;
        setBloqueadoAte(ate);
        salvarStorage({ tentativas: novas, bloqueadoAte: ate });
        setErro("Muitas tentativas incorretas. Aguarde 5 minutos.");
      } else {
        salvarStorage({ tentativas: novas, bloqueadoAte: null });
        const restantes = MAX_TENTATIVAS - novas;
        setErro(`${msg} (${restantes} tentativa${restantes !== 1 ? "s" : ""} restante${restantes !== 1 ? "s" : ""})`);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputS: CSSProperties = {
    width: "100%", background: "#0b1035",
    border: `1px solid ${bloqueado ? "#991b1b" : "#2a3a70"}`,
    borderRadius: 10, padding: "12px 16px",
    color: bloqueado ? "#555" : "#f0f0f0",
    fontSize: 15, boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#040826", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#f97316", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>🌱</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f0f0f0", margin: 0 }}>Instituto Semear</h1>
          <p style={{ color: "#8899bb", fontSize: 14, marginTop: 6 }}>Painel interno da equipe</p>
        </div>

        <div style={{ background: "#070d2a", border: `1px solid ${bloqueado ? "#991b1b" : "#1e2a5e"}`, borderRadius: 16, padding: 32, transition: "border-color .3s" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 24px" }}>Entrar na sua conta</h2>

          {/* Tela de bloqueio */}
          {bloqueado ? (
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
              <div style={{ color: "#f87171", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                Acesso temporariamente bloqueado
              </div>
              <div style={{ color: "#8899bb", fontSize: 13, marginBottom: 20 }}>
                Muitas tentativas incorretas foram detectadas.
              </div>
              <div style={{ background: "#1a0a0a", border: "1px solid #7f1d1d", borderRadius: 12, padding: "16px 24px", display: "inline-block" }}>
                <div style={{ color: "#fbbf24", fontSize: 36, fontWeight: 900, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {formatCountdown(countdown)}
                </div>
                <div style={{ color: "#8899bb", fontSize: 12, marginTop: 4 }}>restantes para desbloquear</div>
              </div>
              <div style={{ color: "#4a5a88", fontSize: 11, marginTop: 16 }}>
                O bloqueio persiste mesmo ao atualizar a página.
              </div>
            </div>
          ) : (
            <>
              {/* Erro */}
              {erro && (
                <div style={{ background: "#2a0a0a", border: "1px solid #991b1b", color: "#f87171", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 20 }}>
                  {erro}
                </div>
              )}

              {/* Barra de tentativas */}
              {tentativas > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8899bb", marginBottom: 4 }}>
                    <span>Tentativas incorretas</span>
                    <span style={{ color: tentativas >= 3 ? "#f87171" : "#fbbf24" }}>
                      {tentativas}/{MAX_TENTATIVAS}
                    </span>
                  </div>
                  <div style={{ background: "#1e2a5e", borderRadius: 4, height: 4 }}>
                    <div style={{ width: `${(tentativas / MAX_TENTATIVAS) * 100}%`, height: 4, borderRadius: 4, background: tentativas >= 3 ? "#dc2626" : "#fbbf24", transition: "width .3s, background .3s" }} />
                  </div>
                </div>
              )}

              {/* Formulário */}
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, color: "#8899bb", marginBottom: 6, display: "block" }}>E-mail</label>
                  <input style={inputS} type="email" placeholder="seu@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, color: "#8899bb", marginBottom: 6, display: "block" }}>Senha</label>
                  <input style={inputS} type="password" placeholder="••••••••"
                    value={senha} onChange={e => setSenha(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading}
                  style={{ width: "100%", background: "#f97316", color: "#000", border: "none", borderRadius: 10, padding: 14, fontSize: 16, fontWeight: 700, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", color: "#4a5a88", fontSize: 12, marginTop: 20 }}>
          Acesso restrito à equipe da ONG
        </p>
      </div>
    </div>
  );
}