import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

type Etapa = "form" | "qrcode" | "sucesso";

interface PixData {
  payment_id: string;
  qr_code: string;
  qr_code_base64: string;
  valor: number;
  expiracao: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Component ─────────────────────────────────────────────────────────────────

export default function DoarForm() {
  const [etapa, setEtapa]     = useState<Etapa>("form");
  const [valor, setValor]     = useState("");
  const [nome, setNome]       = useState("");
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState("");
  const [pix, setPix]         = useState<PixData | null>(null);
  const [copiado, setCopiado] = useState(false);
  const pollingRef            = useRef<ReturnType<typeof setInterval> | null>(null);

  // Valores rápidos de doação
  const valoresRapidos = [10, 25, 50, 100];

  const navigate = useNavigate();

  // ── Polling: verifica a cada 5s se o pagamento foi aprovado ────────────────
  useEffect(() => {
    if (etapa !== "qrcode" || !pix) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${API}/api/doacoes/pix/${pix.payment_id}/status`);
        const data = await res.json();
        if (data.status === "approved") {
          clearInterval(pollingRef.current!);
          setEtapa("sucesso");
        }
      } catch {
        // ignora erros de rede no polling
      }
    }, 5000);

    return () => clearInterval(pollingRef.current!);
  }, [etapa, pix]);

  // ── Gerar QR code ──────────────────────────────────────────────────────────
  const handleGerar = async () => {
    setErro("");
    if (!valor || Number(valor) <= 0) { setErro("Informe um valor válido."); return; }
    if (!nome.trim())                  { setErro("Informe seu nome.");        return; }
    if (!email.trim())                 { setErro("Informe seu e-mail.");      return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/doacoes/gerar-pix`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ valor: Number(valor), nome, email }),
      });

      if (!res.ok) {
        const err = await res.json();
        setErro(err.erro ?? "Erro ao gerar QR code. Tente novamente.");
        return;
      }

      const data: PixData = await res.json();
      setPix(data);
      setEtapa("qrcode");
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  // ── Copiar código PIX ──────────────────────────────────────────────────────
  const handleCopiar = async () => {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.qr_code);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const S = {
    wrap:    { maxWidth: 480, margin: "0 auto", padding: "32px 20px" } as React.CSSProperties,
    card:    { background: "#070d2a", border: "1px solid #1e2a5e", borderRadius: 16, padding: 32 } as React.CSSProperties,
    title:   { fontSize: 22, fontWeight: 700, color: "#f97316", marginBottom: 8, textAlign: "center" as const },
    sub:     { fontSize: 14, color: "#8899bb", textAlign: "center" as const, marginBottom: 28 },
    label:   { fontSize: 13, color: "#8899bb", marginBottom: 6, display: "block" } as React.CSSProperties,
    input:   { width: "100%", background: "#0b1035", border: "1px solid #2a3a70", borderRadius: 8, padding: "11px 14px", color: "#f0f0f0", fontSize: 15, boxSizing: "border-box" as const, outline: "none" },
    btn:     { width: "100%", background: "#f97316", color: "#000", border: "none", borderRadius: 10, padding: "14px", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8, transition: "opacity .2s" } as React.CSSProperties,
    btnSec:  { width: "100%", background: "transparent", color: "#8899bb", border: "1px solid #2a3a70", borderRadius: 10, padding: "11px", fontSize: 14, cursor: "pointer", marginTop: 10 } as React.CSSProperties,
    erro:    { background: "#2a0a0a", border: "1px solid #991b1b", color: "#f87171", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 },
    quickRow:{ display: "flex", gap: 8, marginBottom: 20 } as React.CSSProperties,
    quickBtn:(ativo: boolean): React.CSSProperties => ({
      flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
      background: ativo ? "#f97316" : "transparent",
      color:      ativo ? "#000"    : "#8899bb",
      border:     `1px solid ${ativo ? "#f97316" : "#2a3a70"}`,
      transition: "all .15s",
    }),
  };

  // ── Render: Formulário ─────────────────────────────────────────────────────
  if (etapa === "form") return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.title}>Fazer uma doação</div>
        <div style={S.sub}>Sua contribuição faz a diferença!</div>

        {erro && <div style={S.erro}>{erro}</div>}

        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Valor da doação</label>
          <div style={S.quickRow}>
            {valoresRapidos.map(v => (
              <button
                key={v}
                style={S.quickBtn(valor === String(v))}
                onClick={() => setValor(String(v))}
              >
                R$ {v}
              </button>
            ))}
          </div>
          <input
            style={S.input}
            type="number"
            placeholder="Outro valor (R$)"
            value={valor}
            onChange={e => setValor(e.target.value)}
            min="1"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Seu nome</label>
          <input
            style={S.input}
            placeholder="Como prefere ser chamado?"
            value={nome}
            onChange={e => setNome(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={S.label}>E-mail</label>
          <input
            style={S.input}
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} onClick={handleGerar} disabled={loading}>
          {loading ? "Gerando QR code..." : `Doar ${valor ? formatBRL(Number(valor)) : ""}`}
        </button>
      </div>
    </div>
  );

  // ── Render: QR Code ────────────────────────────────────────────────────────
  if (etapa === "qrcode" && pix) return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.title}>Pague com PIX</div>
        <div style={S.sub}>Escaneie o QR code ou use o código copia e cola</div>

        {/* Valor */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: "#4ade80" }}>
            {formatBRL(pix.valor)}
          </span>
        </div>

        {/* QR Code */}
        {pix.qr_code_base64 && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <img
              src={`data:image/png;base64,${pix.qr_code_base64}`}
              alt="QR Code PIX"
              style={{ width: 220, height: 220, borderRadius: 12, border: "3px solid #f97316" }}
            />
          </div>
        )}

        {/* Copia e cola */}
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>PIX copia e cola</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              readOnly
              style={{ ...S.input, fontSize: 11, color: "#8899bb" }}
              value={pix.qr_code}
            />
            <button
              onClick={handleCopiar}
              style={{ background: copiado ? "#166534" : "#1e2a5e", color: copiado ? "#4ade80" : "#fff", border: "none", borderRadius: 8, padding: "0 16px", cursor: "pointer", whiteSpace: "nowrap", fontSize: 13, fontWeight: 600 }}
            >
              {copiado ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>

        {/* Aguardando */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#0a2a1a", border: "1px solid #166534", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ade80", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: 13, color: "#4ade80" }}>Aguardando pagamento...</span>
        </div>

        <button style={S.btnSec} onClick={() => { setEtapa("form"); setPix(null); }}>
          ← Voltar
        </button>

        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      </div>
    </div>
  );

  // ── Render: Sucesso ────────────────────────────────────────────────────────
  return (
    <div style={S.wrap}>
      <div style={{ ...S.card, textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <div style={{ ...S.title, fontSize: 26 }}>Doação confirmada!</div>
        <div style={{ ...S.sub, fontSize: 16, marginBottom: 32 }}>
          Obrigado, {nome}! Sua doação de{" "}
          <strong style={{ color: "#4ade80" }}>{formatBRL(Number(valor))}</strong>{" "}
          foi recebida com sucesso.
        </div>
        <button style={S.btn} onClick={() => { setEtapa("form"); setValor(""); setNome(""); setEmail(""); setPix(null); }}>
          Fazer outra doação
        </button>
        <button style={S.btn} onClick={() => { navigate("/"); }}>
          Voltar para página inicial
        </button>
      </div>
    </div>
  );
}