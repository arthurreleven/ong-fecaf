import { useState, useMemo } from "react";
import type { CSSProperties } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type TipoDoacao = "dinheiro" | "item";
type StatusDoacao = "confirmado" | "pendente" | "cancelado";

interface Doacao {
  id: number;
  tipo: TipoDoacao;
  doador: string;
  valor: number;
  metodo: string;
  descricao: string;
  data: string;
  status: StatusDoacao;
  categoria?: string;
  quantidade?: number;
}

interface ToastData {
  msg: string;
  type: "success" | "error" | "warning";
}

interface FormState {
  tipo: TipoDoacao;
  doador: string;
  valor: string | number;
  metodo: string;
  descricao: string;
  categoria: string;
  quantidade: string | number;
  data: string;
  status: StatusDoacao;
}

type BtnVariant = "primary" | "danger" | "secondary";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIAS_ITEM = ["Roupas", "Alimentos", "Higiene", "Brinquedos", "Móveis", "Eletrônicos", "Outros"];
const METODOS_PIX     = ["PIX", "Transferência", "Dinheiro em espécie", "Depósito"];

const STATUS_COLORS: Record<StatusDoacao, { bg: string; text: string; border: string }> = {
  confirmado: { bg: "#0a3d1f", text: "#4ade80", border: "#166534" },
  pendente:   { bg: "#3b2700", text: "#fbbf24", border: "#92400e" },
  cancelado:  { bg: "#3b0a0a", text: "#f87171", border: "#991b1b" },
};

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const initialDoacoes: Doacao[] = [
  { id: 1, tipo: "dinheiro", doador: "Maria Silva",    valor: 250,  metodo: "PIX",                 descricao: "",                           data: "2025-04-01", status: "confirmado" },
  { id: 2, tipo: "item",     doador: "João Pereira",   valor: 0,    metodo: "",                    descricao: "Roupas infantis (10 peças)",  data: "2025-04-02", status: "confirmado", categoria: "Roupas",    quantidade: 10 },
  { id: 3, tipo: "dinheiro", doador: "Empresa XYZ",    valor: 1500, metodo: "Transferência",       descricao: "",                           data: "2025-04-03", status: "confirmado" },
  { id: 4, tipo: "item",     doador: "Ana Costa",      valor: 0,    metodo: "",                    descricao: "Arroz, feijão, macarrão",     data: "2025-04-04", status: "pendente",   categoria: "Alimentos", quantidade: 20 },
  { id: 5, tipo: "dinheiro", doador: "Roberto Lima",   valor: 80,   metodo: "Dinheiro em espécie", descricao: "",                           data: "2025-04-05", status: "pendente" },
  { id: 6, tipo: "item",     doador: "Fernanda Souza", valor: 0,    metodo: "",                    descricao: "Shampoo, sabonete, pasta",    data: "2025-04-06", status: "confirmado", categoria: "Higiene",   quantidade: 15 },
];

const EMPTY_FORM: FormState = {
  tipo: "dinheiro", doador: "", valor: "", metodo: "PIX",
  descricao: "", categoria: "Roupas", quantidade: "", data: "", status: "pendente",
};

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  wrap:    { minHeight: "100vh", background: "#040826", color: "#f0f0f0", fontFamily: "'Segoe UI', sans-serif", paddingBottom: 60 } as CSSProperties,
  header:  { background: "#00020D", borderBottom: "3px solid #f97316", padding: "14px 28px", display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between" } as CSSProperties,
  logo:    { fontSize: 22, fontWeight: 700, color: "#f97316", letterSpacing: 1 } as CSSProperties,
  nav:     { display: "flex", gap: 8 } as CSSProperties,
  navBtn:  (active: boolean): CSSProperties => ({ background: active ? "#f97316" : "transparent", color: active ? "#000" : "#ccc", border: "2px solid " + (active ? "#f97316" : "#444"), borderRadius: 8, padding: "7px 18px", cursor: "pointer", fontWeight: 600, fontSize: 14, transition: "all .2s" }),
  page:    { maxWidth: 1100, margin: "0 auto", padding: "32px 20px" } as CSSProperties,
  card:    { background: "#070d2a", border: "1px solid #1e2a5e", borderRadius: 14, padding: 24 } as CSSProperties,
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 } as CSSProperties,
  metric:  (accent: string): CSSProperties => ({ background: "#070d2a", border: `1px solid ${accent}40`, borderRadius: 14, padding: "20px 24px", borderLeft: `4px solid ${accent}` }),
  mLabel:  { fontSize: 12, color: "#8899bb", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 6 } as CSSProperties,
  mValue:  (accent: string): CSSProperties => ({ fontSize: 30, fontWeight: 700, color: accent }),
  sectionTitle: { fontSize: 20, fontWeight: 700, color: "#f97316", marginBottom: 20 } as CSSProperties,
  pill:    (sc: { bg: string; text: string; border: string }): CSSProperties => ({ display: "inline-block", padding: "3px 11px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }),
  typePill:(t: TipoDoacao): CSSProperties  => ({ display: "inline-block", padding: "3px 11px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: t === "dinheiro" ? "#0a2a1a" : "#1a1a3e", color: t === "dinheiro" ? "#4ade80" : "#818cf8", border: `1px solid ${t === "dinheiro" ? "#166534" : "#3730a3"}` }),
  row:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 } as CSSProperties,
  label:   { fontSize: 13, color: "#8899bb", marginBottom: 6, display: "block" } as CSSProperties,
  input:   { width: "100%", background: "#0b1035", border: "1px solid #2a3a70", borderRadius: 8, padding: "10px 14px", color: "#f0f0f0", fontSize: 14, boxSizing: "border-box" as const, outline: "none" } as CSSProperties,
  select:  { width: "100%", background: "#0b1035", border: "1px solid #2a3a70", borderRadius: 8, padding: "10px 14px", color: "#f0f0f0", fontSize: 14, boxSizing: "border-box" as const, outline: "none" } as CSSProperties,
  btn:     (v: BtnVariant): CSSProperties => ({ background: v === "primary" ? "#f97316" : v === "danger" ? "#dc2626" : "#1e2a5e", color: v === "primary" ? "#000" : "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "opacity .2s" }),
  tableWrap: { overflowX: "auto" as const, borderRadius: 14, border: "1px solid #1e2a5e" } as CSSProperties,
  th:      { background: "#0b1035", color: "#8899bb", fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 1, padding: "12px 16px", textAlign: "left" as const, whiteSpace: "nowrap" as const } as CSSProperties,
  td:      { padding: "13px 16px", borderTop: "1px solid #131c40", fontSize: 14, verticalAlign: "middle" } as CSSProperties,
  actionBtn: (c: string): CSSProperties => ({ background: "transparent", border: `1px solid ${c}`, color: c, borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", marginRight: 6 }),
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function App() {
  const [doacoes, setDoacoes]         = useState<Doacao[]>(initialDoacoes);
  const [view, setView]               = useState<"dashboard" | "list" | "form">("dashboard");
  const [form, setForm]               = useState<FormState>(EMPTY_FORM);
  const [editId, setEditId]           = useState<number | null>(null);
  const [filterTipo, setFilterTipo]   = useState<"todos" | TipoDoacao>("todos");
  const [filterStatus, setFilterStatus] = useState<"todos" | StatusDoacao>("todos");
  const [search, setSearch]           = useState("");
  const [toast, setToast]             = useState<ToastData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const showToast = (msg: string, type: ToastData["type"] = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Metrics ────────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const confirmed     = doacoes.filter(d => d.status === "confirmado");
    const totalDinheiro = confirmed.filter(d => d.tipo === "dinheiro").reduce((s, d) => s + d.valor, 0);
    const totalItens    = confirmed.filter(d => d.tipo === "item").reduce((s, d) => s + (d.quantidade ?? 0), 0);
    const mesAtual      = new Date().toISOString().slice(0, 7);
    const doMes         = doacoes.filter(d => d.data.startsWith(mesAtual)).length;
    const pendentes     = doacoes.filter(d => d.status === "pendente").length;
    return { totalDinheiro, totalItens, doMes, pendentes, total: doacoes.length };
  }, [doacoes]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => doacoes.filter(d => {
    if (filterTipo   !== "todos" && d.tipo   !== filterTipo)   return false;
    if (filterStatus !== "todos" && d.status !== filterStatus) return false;
    if (search && !d.doador.toLowerCase().includes(search.toLowerCase()) &&
        !d.descricao.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.data.localeCompare(a.data)), [doacoes, filterTipo, filterStatus, search]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!form.doador.trim()) { showToast("Preencha o nome do doador.", "error"); return; }
    if (form.tipo === "dinheiro" && (!form.valor || Number(form.valor) <= 0)) { showToast("Informe um valor válido.", "error"); return; }
    if (form.tipo === "item" && !form.descricao.trim()) { showToast("Descreva o item doado.", "error"); return; }
    if (!form.data) { showToast("Informe a data.", "error"); return; }

    const base: Doacao = {
      id:         editId ?? Date.now(),
      tipo:       form.tipo,
      doador:     form.doador,
      valor:      form.tipo === "dinheiro" ? Number(form.valor) : 0,
      metodo:     form.metodo,
      descricao:  form.descricao,
      data:       form.data,
      status:     form.status,
      categoria:  form.tipo === "item" ? form.categoria : undefined,
      quantidade: form.tipo === "item" ? Number(form.quantidade) || 1 : undefined,
    };

    if (editId) {
      setDoacoes(prev => prev.map(d => d.id === editId ? base : d));
      showToast("Doação atualizada!");
    } else {
      setDoacoes(prev => [base, ...prev]);
      showToast("Doação registrada com sucesso!");
    }
    setForm(EMPTY_FORM);
    setEditId(null);
    setView("list");
  };

  const handleEdit = (d: Doacao) => {
    setForm({ ...d, valor: d.valor || "", quantidade: d.quantidade ?? "", categoria: d.categoria ?? "" });
    setEditId(d.id);
    setView("form");
  };

  const handleDelete = (id: number) => {
    setDoacoes(prev => prev.filter(d => d.id !== id));
    setDeleteConfirm(null);
    showToast("Doação removida.", "warning");
  };

  const handleStatusChange = (id: number, status: StatusDoacao) => {
    setDoacoes(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const today = new Date().toISOString().slice(0, 10);

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const renderDashboard = () => {
    const byMonth: Record<string, number> = {};
    doacoes.filter(d => d.status === "confirmado" && d.tipo === "dinheiro").forEach(d => {
      const m = d.data.slice(0, 7);
      byMonth[m] = (byMonth[m] ?? 0) + d.valor;
    });
    const topMes = Object.entries(byMonth).sort().slice(-4);

    const byCat: Record<string, number> = {};
    doacoes.filter(d => d.tipo === "item" && d.status === "confirmado").forEach(d => {
      if (d.categoria) byCat[d.categoria] = (byCat[d.categoria] ?? 0) + (d.quantidade ?? 0);
    });

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={S.sectionTitle}>Painel de Doações</div>
          <button style={S.btn("primary")} onClick={() => { setForm({ ...EMPTY_FORM, data: today }); setEditId(null); setView("form"); }}>
            + Nova Doação
          </button>
        </div>

        <div style={S.metricGrid}>
          {([ 
            { label: "Total arrecadado",        value: formatBRL(metrics.totalDinheiro), accent: "#4ade80" },
            { label: "Itens recebidos",          value: `${metrics.totalItens} unidades`, accent: "#818cf8" },
            { label: "Doações este mês",         value: String(metrics.doMes),            accent: "#f97316" },
            { label: "Aguardando confirmação",   value: String(metrics.pendentes),        accent: "#fbbf24" },
          ] as { label: string; value: string; accent: string }[]).map((m, i) => (
            <div key={i} style={S.metric(m.accent)}>
              <div style={S.mLabel}>{m.label}</div>
              <div style={S.mValue(m.accent)}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div style={S.card}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#8899bb", marginBottom: 16 }}>ARRECADAÇÃO MENSAL (R$)</div>
            {topMes.length === 0
              ? <div style={{ color: "#555" }}>Sem dados</div>
              : topMes.map(([m, v]) => {
                  const maxV = Math.max(...topMes.map(x => x[1]));
                  const pct  = Math.round((v / maxV) * 100);
                  return (
                    <div key={m} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span>{m}</span><span style={{ color: "#4ade80" }}>{formatBRL(v)}</span>
                      </div>
                      <div style={{ background: "#1e2a5e", borderRadius: 4, height: 8 }}>
                        <div style={{ width: `${pct}%`, background: "#4ade80", borderRadius: 4, height: 8, transition: "width .4s" }} />
                      </div>
                    </div>
                  );
                })}
          </div>

          <div style={S.card}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#8899bb", marginBottom: 16 }}>ITENS POR CATEGORIA</div>
            {Object.keys(byCat).length === 0
              ? <div style={{ color: "#555" }}>Sem dados</div>
              : Object.entries(byCat).map(([cat, qty]) => (
                  <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #131c40", fontSize: 14 }}>
                    <span>{cat}</span>
                    <span style={{ color: "#818cf8", fontWeight: 700 }}>{qty} un.</span>
                  </div>
                ))}
          </div>
        </div>

        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#8899bb", marginBottom: 14 }}>ÚLTIMAS DOAÇÕES</div>
          {doacoes.slice(0, 5).map(d => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #131c40" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{d.doador}</div>
                <div style={{ fontSize: 12, color: "#8899bb" }}>{d.data}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={S.typePill(d.tipo)}>{d.tipo === "dinheiro" ? "Dinheiro" : d.categoria}</span>
                {d.tipo === "dinheiro"
                  ? <span style={{ color: "#4ade80", fontWeight: 700 }}>{formatBRL(d.valor)}</span>
                  : <span style={{ color: "#818cf8" }}>{d.quantidade} un.</span>}
                <span style={S.pill(STATUS_COLORS[d.status])}>{d.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── List ───────────────────────────────────────────────────────────────────
  const renderList = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={S.sectionTitle}>Histórico de Doações</div>
        <button style={S.btn("primary")} onClick={() => { setForm({ ...EMPTY_FORM, data: today }); setEditId(null); setView("form"); }}>
          + Nova Doação
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" as const }}>
        <input
          style={{ ...S.input, maxWidth: 240 }}
          placeholder="Buscar doador ou item…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={{ ...S.select, width: "auto" }} value={filterTipo} onChange={e => setFilterTipo(e.target.value as "todos" | TipoDoacao)}>
          <option value="todos">Todos os tipos</option>
          <option value="dinheiro">Dinheiro</option>
          <option value="item">Itens</option>
        </select>
        <select style={{ ...S.select, width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value as "todos" | StatusDoacao)}>
          <option value="todos">Todos os status</option>
          <option value="confirmado">Confirmado</option>
          <option value="pendente">Pendente</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <span style={{ color: "#8899bb", fontSize: 13, alignSelf: "center" }}>{filtered.length} resultado(s)</span>
      </div>

      <div style={S.tableWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
          <thead>
            <tr>
              {["Data", "Doador", "Tipo", "Valor / Qtd", "Descrição", "Status", "Ações"].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#555" }}>Nenhuma doação encontrada.</td></tr>
            )}
            {filtered.map(d => (
              <tr key={d.id} style={{ background: "#070d2a" }}>
                <td style={S.td}><span style={{ color: "#8899bb" }}>{d.data}</span></td>
                <td style={{ ...S.td, fontWeight: 600 }}>{d.doador}</td>
                <td style={S.td}><span style={S.typePill(d.tipo)}>{d.tipo === "dinheiro" ? "💰 Dinheiro" : `📦 ${d.categoria ?? "Item"}`}</span></td>
                <td style={S.td}>
                  {d.tipo === "dinheiro"
                    ? <span style={{ color: "#4ade80", fontWeight: 700 }}>{formatBRL(d.valor)}</span>
                    : <span style={{ color: "#818cf8" }}>{d.quantidade} un.</span>}
                </td>
                <td style={{ ...S.td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, color: "#8899bb", fontSize: 13 }}>
                  {d.descricao || d.metodo || "—"}
                </td>
                <td style={S.td}>
                  <select
                    value={d.status}
                    onChange={e => handleStatusChange(d.id, e.target.value as StatusDoacao)}
                    style={{ ...S.select, width: "auto", fontSize: 12, padding: "4px 8px", color: STATUS_COLORS[d.status].text, background: STATUS_COLORS[d.status].bg, border: `1px solid ${STATUS_COLORS[d.status].border}` }}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </td>
                <td style={S.td}>
                  <button style={S.actionBtn("#818cf8")} onClick={() => handleEdit(d)}>Editar</button>
                  <button style={S.actionBtn("#f87171")} onClick={() => setDeleteConfirm(d.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Form ───────────────────────────────────────────────────────────────────
  const renderForm = () => (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button style={{ ...S.btn("secondary"), padding: "6px 14px" }} onClick={() => { setView("list"); setEditId(null); setForm(EMPTY_FORM); }}>← Voltar</button>
        <div style={S.sectionTitle}>{editId ? "Editar Doação" : "Registrar Doação"}</div>
      </div>

      <div style={S.card}>
        <div style={{ marginBottom: 20 }}>
          <div style={S.label}>Tipo de doação</div>
          <div style={{ display: "flex", gap: 12 }}>
            {(["dinheiro", "item"] as TipoDoacao[]).map(t => (
              <button key={t} style={{ ...S.btn(form.tipo === t ? "primary" : "secondary"), flex: 1 }}
                onClick={() => setForm(f => ({ ...f, tipo: t }))}>
                {t === "dinheiro" ? "💰 Dinheiro" : "📦 Item Físico"}
              </button>
            ))}
          </div>
        </div>

        <div style={S.row}>
          <div>
            <label style={S.label}>Nome do doador *</label>
            <input style={S.input} placeholder="Ex: Maria Silva" value={form.doador} onChange={e => setForm(f => ({ ...f, doador: e.target.value }))} />
          </div>
          <div>
            <label style={S.label}>Data da doação *</label>
            <input type="date" style={S.input} value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
          </div>
        </div>

        {form.tipo === "dinheiro" ? (
          <div style={S.row}>
            <div>
              <label style={S.label}>Valor (R$) *</label>
              <input type="number" style={S.input} placeholder="0,00" min="0" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
            </div>
            <div>
              <label style={S.label}>Método de pagamento</label>
              <select style={S.select} value={form.metodo} onChange={e => setForm(f => ({ ...f, metodo: e.target.value }))}>
                {METODOS_PIX.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <>
            <div style={S.row}>
              <div>
                <label style={S.label}>Categoria *</label>
                <select style={S.select} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  {CATEGORIAS_ITEM.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Quantidade (unidades)</label>
                <input type="number" style={S.input} placeholder="1" min="1" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Descrição dos itens *</label>
              <input style={S.input} placeholder="Ex: Camisas masculinas tamanho M" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
          </>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Observações {form.tipo === "item" ? "(opcional)" : ""}</label>
          <input style={S.input} placeholder="Ex: Doação recorrente mensal" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={S.label}>Status</label>
          <select style={S.select} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as StatusDoacao }))}>
            <option value="pendente">Pendente</option>
            <option value="confirmado">Confirmado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ ...S.btn("primary"), flex: 1, padding: "14px" }} onClick={handleSubmit}>
            {editId ? "Salvar Alterações" : "Registrar Doação"}
          </button>
          <button style={{ ...S.btn("secondary"), padding: "14px" }} onClick={() => { setView("list"); setEditId(null); setForm(EMPTY_FORM); }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div style={S.wrap}>
      <header style={S.header}>
        <div>
          <div style={S.logo}>🤝 ONG Doações</div>
          <div style={{ fontSize: 11, color: "#4a5a88", marginTop: 2 }}>Sistema de Registro de Doações</div>
        </div>
        <nav style={S.nav}>
          {([ ["dashboard", "Dashboard"], ["list", "Histórico"], ["form", "Nova Doação"] ] as [typeof view, string][]).map(([v, label]) => (
            <button key={v} style={S.navBtn(view === v)}
              onClick={() => { if (v === "form") { setForm({ ...EMPTY_FORM, data: today }); setEditId(null); } setView(v); }}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main style={S.page}>
        {view === "dashboard" && renderDashboard()}
        {view === "list"      && renderList()}
        {view === "form"      && renderForm()}
      </main>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "error" ? "#7f1d1d" : toast.type === "warning" ? "#78350f" : "#14532d", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, zIndex: 999, maxWidth: 320 } as CSSProperties}>
          {toast.msg}
        </div>
      )}

      {deleteConfirm !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 } as CSSProperties}>
          <div style={{ background: "#070d2a", border: "1px solid #dc2626", borderRadius: 14, padding: 32, maxWidth: 360, textAlign: "center" as const }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Confirmar exclusão</div>
            <div style={{ color: "#8899bb", marginBottom: 24, fontSize: 14 }}>Esta ação não pode ser desfeita.</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button style={S.btn("danger")} onClick={() => handleDelete(deleteConfirm)}>Excluir</button>
              <button style={S.btn("secondary")} onClick={() => setDeleteConfirm(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}