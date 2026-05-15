import { useState, useEffect, useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import { doacoesApi, type PixGerado, type Doacao } from "../services/api";

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatNomePublico = (nome: string) => {
  if (!nome || nome === "Doador Anônimo") return "Doador Anônimo";
  const partes = nome.trim().split(" ");
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1][0]}.`;
};

function useContador(alvo: number, duracao = 2000) {
  const [valor, setValor] = useState(0);
  useEffect(() => {
    if (alvo === 0) return;
    let inicio: number | null = null;
    const step = (ts: number) => {
      if (!inicio) inicio = ts;
      const p = Math.min((ts - inicio) / duracao, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setValor(Math.floor(alvo * ease));
      if (p < 1) requestAnimationFrame(step);
      else setValor(alvo);
    };
    requestAnimationFrame(step);
  }, [alvo, duracao]);
  return valor;
}

/* dispara a animação da barra só quando ela entra na viewport */
function useVisivel(ref: React.RefObject<HTMLElement | null>) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisivel(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return visivel;
}

/* ─────────────────────────────────────────
   CSS GLOBAL
───────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;0,700;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --creme:        #faf6f0;
    --creme2:       #f2ebe0;
    --verde:        #2d6a3f;
    --verde2:       #1e4a2b;
    --verde-claro:  #4a9460;
    --verde-menta:  #d4ead9;
    --amarelo:      #e8b84b;
    --amarelo2:     #f9c74f;
    --branco:       #ffffff;
    --cinza:        #6b6056;
    --escuro:       #1c1410;
    --sombra:       0 4px 24px rgba(28,20,16,.10);
    --sombra-lg:    0 12px 48px rgba(28,20,16,.16);
    --radius:       16px;
    --radius-sm:    10px;
  }

  html { scroll-behavior: smooth; }
  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--creme);
    color: var(--escuro);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  @keyframes fadeUp   { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:none} }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes slideIn  { from{opacity:0;transform:translateX(-18px)} to{opacity:1;transform:none} }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes glow     { 0%,100%{box-shadow:0 0 0 0 rgba(45,106,63,.35)} 50%{box-shadow:0 0 0 10px rgba(45,106,63,0)} }
  @keyframes spin     { to{transform:rotate(360deg)} }
  @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes newDoa   { 0%{opacity:0;transform:translateY(-16px) scale(.95)} 15%{opacity:1;transform:none} 80%{opacity:1} 100%{opacity:0;transform:translateY(-8px)} }
  @keyframes bounce   { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(9px)} }
  @keyframes kenBurns { from{transform:scale(1)} to{transform:scale(1.06)} }
  @keyframes statPop  { from{opacity:0;transform:scale(.85) translateY(10px)} to{opacity:1;transform:none} }
  @keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  button { font-family: 'DM Sans', sans-serif; }

  .btn-verde {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    background: var(--verde); color: #fff;
    border: none; border-radius: 100px;
    padding: 14px 32px; font-size: 15px; font-weight: 700;
    cursor: pointer; letter-spacing: .02em;
    transition: background .2s, transform .15s, box-shadow .2s;
    box-shadow: 0 4px 20px rgba(45,106,63,.35);
    animation: glow 3s ease-in-out infinite;
  }
  .btn-verde:hover  { background: var(--verde2); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(45,106,63,.45); }
  .btn-verde:active { transform: translateY(0); }

  .btn-outline {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    background: transparent; color: var(--verde);
    border: 2px solid var(--verde); border-radius: 100px;
    padding: 12px 28px; font-size: 15px; font-weight: 700;
    cursor: pointer; transition: all .2s;
  }
  .btn-outline:hover { background: var(--verde); color: #fff; transform: translateY(-2px); }

  .input-base {
    width: 100%; background: var(--branco);
    border: 1.5px solid #ddd5c8; border-radius: var(--radius-sm);
    padding: 12px 16px; color: var(--escuro); font-size: 15px;
    font-family: 'DM Sans', sans-serif; outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .input-base:focus  { border-color: var(--verde-claro); box-shadow: 0 0 0 3px rgba(74,148,96,.15); }
  .input-base::placeholder { color: #b0a898; }

  .card {
    background: var(--branco); border-radius: var(--radius);
    border: 1.5px solid #e8e0d6; box-shadow: var(--sombra);
    transition: transform .25s, box-shadow .25s, border-color .25s;
  }
  .card:hover { transform: translateY(-4px); box-shadow: var(--sombra-lg); border-color: var(--verde-menta); }

  .section   { padding: 80px 24px; }
  .container { max-width: 1060px; margin: 0 auto; }

  .eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
    color: var(--verde); background: var(--verde-menta);
    padding: 5px 12px; border-radius: 100px; margin-bottom: 14px;
  }
  .display { font-family: 'Lora', serif; line-height: 1.15; }

  /* barra de progresso */
  .progress-fill {
    height: 100%; border-radius: 100px;
    background: linear-gradient(90deg, var(--verde-claro), var(--amarelo2));
    transition: width 1.8s cubic-bezier(.22,1,.36,1);
    position: relative; overflow: hidden;
  }
  .progress-fill::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.3) 50%, transparent);
    background-size: 200% 100%;
    animation: shimmer 2.5s linear infinite;
  }

  /* impact card accent */
  .impact-card { position: relative; overflow: hidden; }
  .impact-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:3px;
    background: linear-gradient(90deg, var(--verde-claro), var(--amarelo));
    transform: scaleX(0); transform-origin: left; transition: transform .3s;
  }
  .impact-card:hover::before { transform: scaleX(1); }

  /* vídeo responsivo */
  .video-wrap {
    position: relative; padding-bottom: 56.25%;
    border-radius: 18px; overflow: hidden;
    box-shadow: 0 20px 60px rgba(28,20,16,.18);
  }
  .video-wrap iframe {
    position: absolute; inset: 0;
    width: 100%; height: 100%; border: none;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--creme2); }
  ::-webkit-scrollbar-thumb { background: #c4b49a; border-radius: 100px; }
`;

/* ─────────────────────────────────────────
   BARRA DE PROGRESSO
───────────────────────────────────────── */
const META_CAMPANHA = 5000;

function BarraProgresso({ total }: { total: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const visivel = useVisivel(ref as React.RefObject<HTMLElement | null>);
  const pct = Math.min(Math.round((total / META_CAMPANHA) * 100), 100);
  const animado = useContador(visivel ? total : 0, 1600);

  return (
    <div ref={ref} style={{ background: "var(--verde2)", padding: "28px 24px" }}>
      <div className="container">
        <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,255,255,.5)", marginBottom: 14 }}>
          Meta da campanha
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 600, margin: "0 auto 10px", fontSize: 14, color: "rgba(255,255,255,.72)", fontWeight: 500 }}>
          <span>{formatBRL(animado)} arrecadados</span>
          <span>Meta: {formatBRL(META_CAMPANHA)}</span>
        </div>
        <div style={{ maxWidth: 600, margin: "0 auto", background: "rgba(255,255,255,.15)", borderRadius: 100, height: 14, overflow: "hidden" }}>
          <div className="progress-fill" style={{ width: visivel ? `${pct}%` : "0%" }} />
        </div>
        <p className="display" style={{ textAlign: "center", marginTop: 10, fontSize: 22, fontWeight: 700, color: "var(--amarelo)" }}>
          {visivel ? pct : 0}% da meta atingida
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MODAL DE DOAÇÃO
───────────────────────────────────────── */
type Etapa = "form" | "qrcode" | "sucesso";

function DoarModal({ onFechar, onSucesso }: {
  onFechar: () => void;
  onSucesso: (nome: string, valor: number) => void;
}) {
  const [etapa,   setEtapa]   = useState<Etapa>("form");
  const [valor,   setValor]   = useState("");
  const [nome,    setNome]    = useState("");
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [erro,    setErro]    = useState("");
  const [pix,     setPix]     = useState<PixGerado | null>(null);
  const [copiado, setCopiado] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (etapa !== "qrcode" || !pix) return;
    pollingRef.current = setInterval(async () => {
      try {
        const data = await doacoesApi.statusPix(pix.payment_id);
        if (data.status === "approved") {
          clearInterval(pollingRef.current!);
          setEtapa("sucesso");
          onSucesso(nome, Number(valor));
        }
      } catch { /* ignora */ }
    }, 5000);
    return () => clearInterval(pollingRef.current!);
  }, [etapa, pix, nome, valor, onSucesso]);

  const handleGerar = async () => {
    setErro("");
    if (!valor || Number(valor) <= 0) { setErro("Informe um valor válido."); return; }
    if (!nome.trim())                  { setErro("Informe seu nome."); return; }
    if (!email.trim())                 { setErro("Informe seu e-mail."); return; }
    setLoading(true);
    try {
      const data = await doacoesApi.gerarPix({ valor: Number(valor), nome, email });
      setPix(data);
      setEtapa("qrcode");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao gerar QR code.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopiar = async () => {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.qr_code);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(28,20,16,.72)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fadeIn .2s ease" };
  const modal: CSSProperties   = { background: "var(--branco)", borderRadius: 24, padding: 36, width: "100%", maxWidth: 460, position: "relative", maxHeight: "90vh", overflowY: "auto", animation: "fadeUp .3s ease", boxShadow: "0 24px 80px rgba(28,20,16,.25)" };
  const closeBtn: CSSProperties = { position: "absolute", top: 16, right: 16, background: "var(--creme2)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 14, color: "var(--cinza)", display: "flex", alignItems: "center", justifyContent: "center" };

  /* SUCESSO */
  if (etapa === "sucesso") return (
    <div style={overlay} onClick={onFechar}>
      <div style={{ ...modal, textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 64, marginBottom: 16, animation: "float 2s ease-in-out infinite" }}>🌱</div>
        <h2 className="display" style={{ fontSize: 28, marginBottom: 10, color: "var(--verde2)" }}>
          Obrigado, {nome.split(" ")[0]}!
        </h2>
        <p style={{ color: "var(--cinza)", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          Sua doação de <strong style={{ color: "var(--verde)" }}>{formatBRL(Number(valor))}</strong> foi confirmada.<br />
          Você acabou de plantar uma semente de esperança. ❤️
        </p>
        <button className="btn-verde" style={{ width: "100%" }} onClick={onFechar}>Fechar</button>
      </div>
    </div>
  );

  /* QR CODE */
  if (etapa === "qrcode" && pix) return (
    <div style={overlay}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <button style={closeBtn} onClick={onFechar}>✕</button>
        <div className="eyebrow">💸 Pix gerado</div>
        <h2 className="display" style={{ fontSize: 22, marginBottom: 6 }}>Quase lá!</h2>
        <p style={{ color: "var(--cinza)", fontSize: 14, marginBottom: 24 }}>Escaneie o QR Code ou use o copia e cola no app do seu banco.</p>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span className="display" style={{ fontSize: 38, fontWeight: 700, color: "var(--verde)" }}>{formatBRL(pix.valor)}</span>
        </div>
        {pix.qr_code_base64 && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div style={{ padding: 12, background: "var(--creme)", borderRadius: 16, border: "2px solid var(--verde-menta)" }}>
              <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code Pix" style={{ width: 188, height: 188, borderRadius: 10, display: "block" }} />
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "stretch" }}>
          <input readOnly className="input-base" style={{ flex: 1, fontSize: 11, color: "var(--cinza)", cursor: "default" }} value={pix.qr_code} />
          <button
            onClick={handleCopiar}
            style={{ background: copiado ? "var(--verde)" : "var(--creme2)", color: copiado ? "#fff" : "var(--escuro)", border: "1.5px solid " + (copiado ? "var(--verde)" : "#ddd5c8"), borderRadius: "var(--radius-sm)", padding: "0 18px", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all .2s", whiteSpace: "nowrap" }}
          >
            {copiado ? "✓ Copiado!" : "Copiar"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f0f9f3", border: "1.5px solid #c3e6cb", borderRadius: "var(--radius-sm)", padding: "12px 16px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--verde-claro)", animation: "pulse 1.5s infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "var(--verde2)", fontWeight: 500 }}>Aguardando confirmação do pagamento…</span>
        </div>
      </div>
    </div>
  );

  /* FORMULÁRIO */
  const VALORES = [10, 25, 50, 100];
  return (
    <div style={overlay} onClick={onFechar}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <button style={closeBtn} onClick={onFechar}>✕</button>
        <div className="eyebrow">💚 Fazer doação</div>
        <h2 className="display" style={{ fontSize: 24, marginBottom: 4 }}>Escolha seu impacto</h2>
        <p style={{ color: "var(--cinza)", fontSize: 13, marginBottom: 24 }}>100% do valor vai direto para as crianças e famílias que atendemos.</p>

        {erro && <div style={{ background: "#fff5f5", border: "1.5px solid #fca5a5", color: "#991b1b", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{erro}</div>}

        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--cinza)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>Valor da doação</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
          {VALORES.map(v => {
            const ativo = valor === String(v);
            return (
              <button key={v} onClick={() => setValor(String(v))}
                style={{ padding: "10px 4px", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all .18s", background: ativo ? "var(--verde)" : "var(--creme)", color: ativo ? "#fff" : "var(--escuro)", border: `1.5px solid ${ativo ? "var(--verde)" : "#ddd5c8"}`, transform: ativo ? "scale(1.04)" : "none", boxShadow: ativo ? "0 4px 16px rgba(45,106,63,.3)" : "none" }}>
                R${v}
              </button>
            );
          })}
        </div>
        <input className="input-base" type="number" placeholder="Outro valor (R$)" value={VALORES.includes(Number(valor)) ? "" : valor} onChange={e => setValor(e.target.value)} min="1" style={{ marginBottom: 20 }} />

        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--cinza)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>Seu nome</p>
        <input className="input-base" placeholder="Como prefere ser chamado?" value={nome} onChange={e => setNome(e.target.value)} style={{ marginBottom: 14 }} />

        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--cinza)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>E-mail</p>
        <input className="input-base" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} style={{ marginBottom: 24 }} />

        <button className="btn-verde" style={{ width: "100%", opacity: loading ? .7 : 1, padding: "15px 32px", fontSize: 16, borderRadius: "var(--radius-sm)" }} onClick={handleGerar} disabled={loading}>
          {loading
            ? <><div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />Gerando Pix…</>
            : `💚 Doar ${valor ? formatBRL(Number(valor)) : ""} via Pix`}
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: "#b0a898", marginTop: 14 }}>🔒 Pagamento seguro via Mercado Pago</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   PÁGINA PRINCIPAL
───────────────────────────────────────── */
export default function Site() {
  const [totalArrecadado, setTotalArrecadado] = useState(0);
  const [totalDoadores,   setTotalDoadores]   = useState(0);
  const [feed,            setFeed]            = useState<Doacao[]>([]);
  const [modalAberto,     setModalAberto]     = useState(false);
  const [novaDoacao,      setNovaDoacao]      = useState<{ nome: string; valor: number } | null>(null);
  const totalAnimado = useContador(totalArrecadado);

  const carregarDados = useCallback(async () => {
    try {
      const [resumo, lista] = await Promise.all([
        doacoesApi.resumo(),
        doacoesApi.listar({ status: "confirmado", por_pagina: 6 }),
      ]);
      setTotalArrecadado(resumo.total_dinheiro);
      setTotalDoadores(lista.total);
      setFeed(lista.items.filter((d: Doacao) => d.tipo !== "item"));
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleSucesso = (nome: string, valor: number) => {
    setNovaDoacao({ nome, valor });
    setTimeout(() => { setNovaDoacao(null); carregarDados(); }, 4000);
  };

  useEffect(() => {
    const id = "semear-css";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id; s.textContent = GLOBAL_CSS;
      document.head.appendChild(s);
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--creme)", color: "var(--escuro)" }}>

      {/* ── Toast nova doação ── */}
      {novaDoacao && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 200, background: "var(--branco)", border: "1.5px solid var(--verde-menta)", borderLeft: "4px solid var(--verde)", borderRadius: 14, padding: "14px 20px", animation: "newDoa 4s ease forwards", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 32px rgba(28,20,16,.16)" }}>
          <span style={{ fontSize: 22 }}>🌱</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--verde2)" }}>{novaDoacao.nome.split(" ")[0]} acabou de doar!</div>
            <div style={{ fontSize: 12, color: "var(--cinza)", marginTop: 2 }}>{formatBRL(novaDoacao.valor)}</div>
          </div>
        </div>
      )}

      {/* ══ HEADER ══ */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(250,246,240,.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e8e0d6", padding: "0 32px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 116 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 90, height: 95, borderRadius: 12, background: "#faf6f0eb", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(45,106,63,.3)", overflow: "hidden", padding: 0 }}> <img src="/ong.png" alt="Logo Instituto Semear" style={{width: "100%", height: "100%", objectFit: "contain" }}/> </div>
            <div>
              <div className="display" style={{ fontSize: 17, fontWeight: 700, color: "var(--verde2)" }}>Sementes do Amanhã</div>
              <div style={{ fontSize: 11, color: "var(--cinza)" }}>Transformando vidas desde 2018</div>
            </div>
          </div>
          <button className="btn-verde" style={{ padding: "9px 22px", fontSize: 14 }} onClick={() => setModalAberto(true)}>💚 Quero Doar</button>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section style={{ background: "var(--verde2)", position: "relative", overflow: "hidden", minHeight: "87vh", display: "flex", alignItems: "center" }}>
        {/* Ken Burns */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(160deg,rgba(15,35,18,.88) 0%,rgba(30,74,43,.72) 55%,rgba(160,92,44,.28) 100%),url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&q=80')", backgroundSize: "cover", backgroundPosition: "center", animation: "kenBurns 18s ease-in-out infinite alternate" }} />
        {/* grain */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")", opacity: .5, pointerEvents: "none" }} />

        <div className="container" style={{ padding: "80px 24px 100px", position: "relative", zIndex: 2 }}>
          <div style={{ maxWidth: 700, animation: "fadeUp .7s ease" }}>
            <div className="eyebrow" style={{ background: "rgba(74,148,96,.22)", color: "#a8d8b8", border: "1px solid rgba(74,148,96,.3)" }}>
              🌱 ONG sem fins lucrativos · São Paulo, SP
            </div>
            <h1 className="display" style={{ fontSize: "clamp(38px,5.5vw,64px)", color: "#fff", marginBottom: 20, fontWeight: 700, textShadow: "0 2px 30px rgba(0,0,0,.35)" }}>
              Transforme o futuro<br />de uma <span style={{ color: "var(--amarelo)", fontStyle: "italic" }}>criança hoje</span>
            </h1>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,.75)", lineHeight: 1.75, maxWidth: 520, marginBottom: 40, fontWeight: 300 }}>
              Apoie o Instituto Semear com uma doação via Pix rápida e segura. Cada real planta uma semente de esperança.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 64 }}>
              <button className="btn-verde" style={{ background: "var(--amarelo)", color: "var(--escuro)", boxShadow: "0 4px 20px rgba(232,184,75,.5)", fontSize: 16, padding: "15px 36px" }} onClick={() => setModalAberto(true)}>
                💚 Doar agora via Pix
              </button>
              <button className="btn-outline" style={{ borderColor: "rgba(255,255,255,.4)", color: "rgba(255,255,255,.85)" }} onClick={() => document.getElementById("video-section")?.scrollIntoView({ behavior: "smooth" })}>
                Conheça o projeto ↓
              </button>
            </div>

            {/* Stats do hero */}
            <div style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
              {[
                { num: "+150", label: "crianças atendidas" },
                { num: "6 anos", label: "de impacto" },
                { num: "4",      label: "programas ativos" },
              ].map((s, i) => (
                <div key={s.label} style={{ textAlign: "center", animation: `statPop .5s ease ${.8 + i * .12}s both` }}>
                  <div className="display" style={{ fontSize: 28, fontWeight: 700, color: "var(--amarelo)", lineHeight: 1 }}>{s.num}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 4, letterSpacing: ".03em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position: "absolute", bottom: 28, left: "50%", animation: "bounce 2s ease-in-out infinite", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, color: "rgba(255,255,255,.4)", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase" }}>
          <span>Scroll</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </section>

      {/* ══ BARRA DE PROGRESSO ══ */}
      <BarraProgresso total={totalArrecadado} />

      {/* ══ CONTADOR ══ */}
      <section style={{ background: "var(--branco)", borderBottom: "1px solid #e8e0d6", padding: "44px 24px" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              { val: formatBRL(totalAnimado), label: "arrecadados",         icon: "💰" },
              { val: String(totalDoadores),   label: "doações realizadas",  icon: "🤝" },
              { val: "6 anos",                label: "transformando vidas", icon: "📅" },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "16px 24px", borderRight: i < 2 ? "1px solid #e8e0d6" : "none", animation: `fadeUp .5s ease ${i * .1}s both` }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{item.icon}</div>
                <div className="display" style={{ fontSize: "clamp(22px,3.5vw,36px)", fontWeight: 700, color: "var(--verde)", lineHeight: 1 }}>{item.val}</div>
                <div style={{ fontSize: 13, color: "var(--cinza)", marginTop: 6 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ VÍDEO ══ */}
      <section id="video-section" className="section" style={{ background: "var(--creme2)" }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div className="eyebrow" style={{ margin: "0 auto 14px" }}>🎥 Em imagens</div>
            <h2 className="display" style={{ fontSize: "clamp(26px,3.5vw,40px)", marginBottom: 14 }}>
              Conheça o impacto do projeto
            </h2>
            <p style={{ color: "var(--cinza)", fontSize: 16, lineHeight: 1.7, fontWeight: 300, maxWidth: 540, margin: "0 auto" }}>
              Veja de perto como o Instituto Semear transforma a vida de crianças e adolescentes todos os dias.
            </p>
          </div>
          {/* ⚠️ Troque o ID abaixo pelo ID real do YouTube da ONG */}
          <div className="video-wrap">
            <iframe
              src="https://www.youtube.com/embed/BkGWrBd6JHc?si=DnMVCejWAtGQA6L6"
              title="Instituto Semear — impacto do projeto"
              allowFullScreen loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ══ IMPACTO ══ */}
      <section id="impacto" className="section" style={{ background: "var(--creme)" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 56px" }}>
            <div className="eyebrow" style={{ margin: "0 auto 14px" }}>✦ O que fazemos</div>
            <h2 className="display" style={{ fontSize: "clamp(28px,4vw,42px)", marginBottom: 16 }}>
              Cada criança merece<br />uma chance real
            </h2>
            <p style={{ color: "var(--cinza)", fontSize: 16, lineHeight: 1.75, fontWeight: 300 }}>
              Quatro frentes de atuação que se complementam e transformam realidades inteiras.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {[
              { icon: "🎓", num: "+150",   label: "Educação e Reforço", desc: "Acompanhamento pedagógico para que nenhuma criança fique para trás.", delay: 0 },
              { icon: "🎵", num: "3",      label: "Música e Dança",     desc: "Oficinas artísticas que desenvolvem criatividade e autoestima.", delay: .08 },
              { icon: "💻", num: "80+",    label: "Inclusão Digital",   desc: "Tecnologia e programação para o mercado de trabalho do futuro.", delay: .16 },
              { icon: "🍽️", num: "5 dias", label: "Apoio Social",       desc: "Alimentação, acolhimento e suporte às famílias vulneráveis.", delay: .24 },
            ].map(c => (
              <div key={c.label} className="card impact-card" style={{ padding: "28px 24px", animation: `fadeUp .5s ease ${c.delay}s both` }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{c.icon}</div>
                <div className="display" style={{ fontSize: 30, fontWeight: 700, color: "var(--verde)", lineHeight: 1 }}>{c.num}</div>
                <div style={{ fontWeight: 700, fontSize: 15, margin: "6px 0 8px" }}>{c.label}</div>
                <div style={{ fontSize: 13, color: "var(--cinza)", lineHeight: 1.6, fontWeight: 300 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEED DE DOAÇÕES ══ */}
      <section className="section" style={{ background: "var(--creme2)" }}>
        <div className="container" style={{ maxWidth: 680 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="eyebrow" style={{ margin: "0 auto 14px" }}>💚 Comunidade</div>
            <h2 className="display" style={{ fontSize: "clamp(26px,3.5vw,38px)", marginBottom: 12 }}>
              Quem está ajudando agora
            </h2>
            <p style={{ color: "var(--cinza)", fontSize: 15, fontWeight: 300 }}>Junte-se a essas pessoas incríveis e faça parte da mudança.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
            {feed.length === 0
              ? <div style={{ textAlign: "center", color: "var(--cinza)", padding: "48px 0", fontSize: 15 }}>Seja o primeiro a plantar uma semente! 🌱</div>
              : feed.map((d, i) => (
                  <div key={d.id} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", animation: `slideIn .4s ease ${i * .06}s both` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--verde-menta)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                        {d.origem === "webhook" ? "⚡" : "💚"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{formatNomePublico(d.doador_nome)}</div>
                        <div style={{ fontSize: 12, color: "var(--cinza)", marginTop: 2 }}>
                          {new Date(d.data_criacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                    <div className="display" style={{ fontSize: 18, fontWeight: 700, color: "var(--verde)" }}>{formatBRL(d.valor)}</div>
                  </div>
                ))
            }
          </div>
          <div style={{ textAlign: "center" }}>
            <button className="btn-verde" onClick={() => setModalAberto(true)}>💚 Quero fazer parte dessa lista</button>
          </div>
        </div>
      </section>

      {/* ══ SEGURANÇA ══ */}
      <section style={{ background: "var(--branco)", padding: "36px 24px", borderTop: "1px solid #e8e0d6" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--cinza)", marginBottom: 20, opacity: .55 }}>
            Segurança &amp; Transparência
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            {[
              { icon: "🔒", text: "Pagamento seguro via Mercado Pago" },
              { icon: "🏦", text: "Tecnologia Pix — Banco Central" },
              { icon: "📋", text: "ONG registrada e auditada" },
            ].map(b => (
              <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--cinza)", fontWeight: 500, background: "var(--creme)", padding: "8px 16px", borderRadius: 100, border: "1px solid #e8e0d6" }}>
                <span>{b.icon}</span>{b.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ background: "var(--escuro)", color: "rgba(255,255,255,.5)", padding: "48px 24px", textAlign: "center" }}>
        <div className="display" style={{ fontSize: 22, color: "#fff", marginBottom: 6 }}>🌱 Instituto Semear</div>
        <div style={{ fontSize: 13, marginBottom: 20, opacity: .6 }}>Transformando vidas desde 2018 · São Paulo, SP</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { href: "#",  label: "Início" },
            { href: "#video-section", label: "O Projeto" },
            { href: "#impacto",       label: "Impacto" },
            { href: "https://www.ongsementesdoamanha.org.br/", label: "Site Oficial", ext: true },
          ].map(l => (
            <a key={l.label} href={l.href} target={l.ext ? "_blank" : undefined} rel={l.ext ? "noopener noreferrer" : undefined}
              style={{ color: "rgba(255,255,255,.45)", fontSize: 13, textDecoration: "none", transition: "color .2s" }}
              onMouseOver={e => (e.currentTarget.style.color = "var(--amarelo)")}
              onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,.45)")}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div style={{ fontSize: 12, opacity: .3 }}>CNPJ 00.000.000/0001-00 · Todas as doações são processadas com segurança via Mercado Pago</div>
      </footer>

      {/* ══ MODAL ══ */}
      {modalAberto && (
        <DoarModal
          onFechar={() => setModalAberto(false)}
          onSucesso={(nome, valor) => { setModalAberto(false); handleSucesso(nome, valor); }}
        />
      )}
    </div>
  );
}