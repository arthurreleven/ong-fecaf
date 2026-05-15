import { useEffect, useState, useCallback } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { doacoesApi, type Resumo, type Doacao } from "../services/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const STATUS_STYLE: Record<string, CSSProperties> = {
  confirmado: { background: "#0a3d1f", color: "#4ade80", border: "1px solid #166534" },
  pendente:   { background: "#3b2700", color: "#fbbf24", border: "1px solid #92400e" },
  cancelado:  { background: "#3b0a0a", color: "#f87171", border: "1px solid #991b1b" },
};

const TIPO_LABEL: Record<string, string> = {
  pix:          "PIX",
  transferencia:"Transferência",
  dinheiro:     "Dinheiro",
  item:         "Item",
};

// ── Subcomponents ─────────────────────────────────────────────────────────────

function MetricCard({ label, value, accent, sub }: {
  label: string; value: string; accent: string; sub?: string;
}) {
  return (
    <div style={{
      background: "#070d2a",
      border: `1px solid ${accent}30`,
      borderLeft: `4px solid ${accent}`,
      borderRadius: 14,
      padding: "20px 24px",
      animation: "fadeUp .4s ease both",
    }}>
      <div style={{ fontSize: 12, color: "#8899bb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#8899bb", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function BarChart({ dados }: { dados: { mes: string; valor: number }[] }) {
  if (!dados.length) return <div style={{ color: "#555", fontSize: 13 }}>Sem dados ainda.</div>;
  const max = Math.max(...dados.map(d => d.valor));

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 120, paddingTop: 8 }}>
      {dados.map((d, i) => {
        const pct = max > 0 ? (d.valor / max) * 100 : 0;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 10, color: "#4ade80", fontWeight: 600 }}>
              {formatBRL(d.valor).replace("R$\u00a0", "")}
            </div>
            <div style={{
              width: "100%", background: "#4ade80", borderRadius: "4px 4px 0 0",
              height: `${Math.max(pct, 4)}%`,
              transition: "height .6s ease",
              animationDelay: `${i * 0.1}s`,
            }} />
            <div style={{ fontSize: 10, color: "#8899bb", whiteSpace: "nowrap" }}>{d.mes}</div>
          </div>
        );
      })}
    </div>
  );
}

function Skeleton({ height = 20, width = "100%" }: { height?: number; width?: string | number }) {
  return (
    <div style={{
      height, width,
      background: "linear-gradient(90deg, #0b1035 25%, #131c40 50%, #0b1035 75%)",
      backgroundSize: "200% 100%",
      borderRadius: 6,
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [resumo,  setResumo]  = useState<Resumo | null>(null);
  const [recentes, setRecentes] = useState<Doacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState("");

  // Agrupamento mensal para o gráficonavigate("/");
  const [porMes, setPorMes] = useState<{ mes: string; valor: number }[]>([]);

  const carregar = useCallback(async () => {
    setErro("");
    try {
      const [res, lista] = await Promise.all([
        doacoesApi.resumo(),
        doacoesApi.listar({ por_pagina: 8 }),
      ]);
      setResumo(res);
      setRecentes(lista.items);

      // Agrupa por mês (últimos 4)
      const mapa: Record<string, number> = {};
      lista.items
        .filter(d => d.status === "confirmado" && d.tipo !== "item")
        .forEach(d => {
          const m = new Date(d.data_criacao).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
          mapa[m] = (mapa[m] ?? 0) + d.valor;
        });
      setPorMes(Object.entries(mapa).slice(-4).map(([mes, valor]) => ({ mes, valor })));
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Styles ─────────────────────────────────────────────────────────────────
  const page: CSSProperties   = { maxWidth: 1100, margin: "0 auto", padding: "32px 20px" };
  const card: CSSProperties   = { background: "#070d2a", border: "1px solid #1e2a5e", borderRadius: 14, padding: 24 };
  const cardTitle: CSSProperties = { fontSize: 12, color: "#8899bb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, fontWeight: 600 };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#040826", color: "#f0f0f0", fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes fadeUp  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
        @keyframes shimmer { from { background-position:200% 0 } to { background-position:-200% 0 } }
      `}</style>

      <main style={page}>

        {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Dashboard</h1>
            <p style={{ fontSize: 14, color: "#8899bb", margin: "4px 0 0" }}>
              Visão geral das doações da ONG
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={carregar}
              style={{ background: "#1e2a5e", color: "#f0f0f0", border: "1px solid #2a3a70", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}
            >
              ↻ Atualizar
            </button>
            <Link
              to="/doacoes/nova"
              style={{ background: "#f97316", color: "#000", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
            >
              + Nova Doação
            </Link>
          </div>
        </div>

        {erro && (
          <div style={{ background: "#2a0a0a", border: "1px solid #991b1b", color: "#f87171", borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 14 }}>
            {erro} — <button onClick={carregar} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", textDecoration: "underline" }}>tentar novamente</button>
          </div>
        )}

        {/* ── Métricas ──────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ background: "#070d2a", border: "1px solid #1e2a5e", borderRadius: 14, padding: "20px 24px" }}>
                <Skeleton height={12} width="60%" />
                <div style={{ marginTop: 12 }}><Skeleton height={28} width="80%" /></div>
              </div>
            ))
          ) : resumo ? (
            <>
              <MetricCard label="Total arrecadado"      value={formatBRL(resumo.total_dinheiro)} accent="#4ade80" sub="doações confirmadas" />
              <MetricCard label="Itens recebidos"       value={`${resumo.total_itens} un.`}      accent="#818cf8" sub="doações confirmadas" />
              <MetricCard label="Doações este mês"      value={String(resumo.do_mes)}             accent="#f97316" sub="todos os tipos" />
              <MetricCard label="Aguardando confirmação" value={String(resumo.pendentes)}         accent="#fbbf24" sub="pendentes" />
            </>
          ) : null}
        </div>

        {/* ── Gráfico + Doações recentes ────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, marginBottom: 28 }}>

          {/* Gráfico mensal */}
          <div style={card}>
            <div style={cardTitle}>Arrecadação mensal</div>
            {loading
              ? <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 120 }}>
                  {[60, 90, 45, 100].map((h, i) => <Skeleton key={i} height={h} width="25%" />)}
                </div>
              : <BarChart dados={porMes} />
            }
          </div>

          {/* Últimas doações */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={cardTitle}>Últimas doações</div>
              <Link to="/doacoes" style={{ fontSize: 12, color: "#f97316", textDecoration: "none" }}>Ver todas →</Link>
            </div>

            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #131c40" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <Skeleton height={14} width={120} />
                      <Skeleton height={11} width={80} />
                    </div>
                    <Skeleton height={20} width={70} />
                  </div>
                ))
              : recentes.length === 0
                ? <div style={{ color: "#555", fontSize: 13, paddingTop: 8 }}>Nenhuma doação registrada ainda.</div>
                : recentes.map(d => (
                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #131c40" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* Ícone de origem */}
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: d.origem === "webhook" ? "#0a2a1a" : "#1a1a3e",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                        }}>
                          {d.origem === "webhook" ? "⚡" : "✏️"}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{d.doador_nome}</div>
                          <div style={{ fontSize: 12, color: "#8899bb" }}>
                            {TIPO_LABEL[d.tipo]} · {formatData(d.data_criacao)}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {d.tipo !== "item"
                          ? <span style={{ color: "#4ade80", fontWeight: 700, fontSize: 15 }}>{formatBRL(d.valor)}</span>
                          : <span style={{ color: "#818cf8", fontSize: 14 }}>{d.quantidade} un.</span>
                        }
                        <span style={{ ...STATUS_STYLE[d.status], padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                          {d.status}
                        </span>
                      </div>
                    </div>
                  ))
            }
          </div>
        </div>

        {/* ── Atalhos ───────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { to: "/doar",    label: "Página de Doação",   desc: "Link público para doadores",   icon: "🔗", cor: "#f97316" },
            { to: "/doacoes", label: "Gerenciar Doações",  desc: "Listar, editar e confirmar",   icon: "📋", cor: "#818cf8" },
          ].map(item => (
            <Link key={item.to} to={item.to} style={{ textDecoration: "none" }}>
              <div style={{
                ...card,
                display: "flex", alignItems: "center", gap: 16,
                transition: "border-color .2s, transform .2s",
                cursor: "pointer",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = item.cor; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1e2a5e"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
              >
                <div style={{ fontSize: 28 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: item.cor }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "#8899bb", marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </main>
    </div>
  );
}