import { useState, useEffect, useCallback } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import { doacoesApi, type Doacao } from "../services/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

type Status  = "pendente" | "confirmado" | "cancelado";
type Tipo    = "pix" | "transferencia" | "dinheiro" | "item";
type Origem  = "webhook" | "manual";

const STATUS_STYLE: Record<Status, CSSProperties> = {
  confirmado: { background: "#0a3d1f", color: "#4ade80", border: "1px solid #166534" },
  pendente:   { background: "#3b2700", color: "#fbbf24", border: "1px solid #92400e" },
  cancelado:  { background: "#3b0a0a", color: "#f87171", border: "1px solid #991b1b" },
};

const TIPO_LABEL: Record<Tipo, string> = {
  pix:          "⚡ PIX",
  transferencia:"🏦 Transferência",
  dinheiro:     "💵 Dinheiro",
  item:         "📦 Item",
};

// ── Tipos do formulário ───────────────────────────────────────────────────────

interface FormState {
  doador_nome:  string;
  doador_email: string;
  valor:        string;
  tipo:         Tipo;
  status:       Status;
  descricao:    string;
  categoria:    string;
  quantidade:   string;
  data_doacao:  string;
}

const FORM_VAZIO: FormState = {
  doador_nome: "", doador_email: "", valor: "",
  tipo: "dinheiro", status: "pendente",
  descricao: "", categoria: "Roupas", quantidade: "",
  data_doacao: new Date().toISOString().slice(0, 10),
};

const CATEGORIAS = ["Roupas", "Alimentos", "Higiene", "Brinquedos", "Móveis", "Eletrônicos", "Outros"];

// ── Subcomponentes ────────────────────────────────────────────────────────────

function Skeleton({ w = "100%", h = 16 }: { w?: string | number; h?: number }) {
  return (
    <div style={{ width: w, height: h, borderRadius: 6, background: "linear-gradient(90deg,#0b1035 25%,#131c40 50%,#0b1035 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
  );
}

function Badge({ status }: { status: Status }) {
  return (
    <span style={{ ...STATUS_STYLE[status], padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
      {status}
    </span>
  );
}

function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#070d2a", border: "1px solid #1e2a5e", borderRadius: 16, padding: 32, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{titulo}</h2>
          <button onClick={onFechar} style={{ background: "transparent", border: "none", color: "#8899bb", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Formulário de doação manual ───────────────────────────────────────────────

function FormDoacao({ inicial, onSalvar, onCancelar, salvando }: {
  inicial:   FormState;
  onSalvar:  (f: FormState) => void;
  onCancelar:() => void;
  salvando:  boolean;
}) {
  const [form, setForm] = useState<FormState>(inicial);
  const [erro, setErro] = useState("");

  const set = (campo: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [campo]: e.target.value }));

  const handleSubmit = () => {
    if (!form.doador_nome.trim())                           { setErro("Nome do doador obrigatório."); return; }
    if (form.tipo !== "item" && (!form.valor || Number(form.valor) <= 0)) { setErro("Informe um valor válido."); return; }
    if (form.tipo === "item" && !form.descricao.trim())     { setErro("Descreva o item doado.");      return; }
    setErro("");
    onSalvar(form);
  };

  const inputS: CSSProperties  = { width: "100%", background: "#0b1035", border: "1px solid #2a3a70", borderRadius: 8, padding: "10px 14px", color: "#f0f0f0", fontSize: 14, boxSizing: "border-box", outline: "none" };
  const labelS: CSSProperties  = { fontSize: 12, color: "#8899bb", marginBottom: 5, display: "block" };
  const groupS: CSSProperties  = { marginBottom: 16 };
  const rowS:   CSSProperties  = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 };

  return (
    <div>
      {erro && <div style={{ background: "#2a0a0a", border: "1px solid #991b1b", color: "#f87171", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{erro}</div>}

      {/* Tipo */}
      <div style={groupS}>
        <label style={labelS}>Tipo de doação</label>
        <div style={{ display: "flex", gap: 8 }}>
          {(["dinheiro", "pix", "transferencia", "item"] as Tipo[]).map(t => (
            <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
              style={{ flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: form.tipo === t ? "#f97316" : "transparent", color: form.tipo === t ? "#000" : "#8899bb", border: `1px solid ${form.tipo === t ? "#f97316" : "#2a3a70"}` }}>
              {TIPO_LABEL[t].split(" ")[1] ?? TIPO_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div style={rowS}>
        <div>
          <label style={labelS}>Nome do doador *</label>
          <input style={inputS} value={form.doador_nome} onChange={set("doador_nome")} placeholder="Nome completo" />
        </div>
        <div>
          <label style={labelS}>E-mail</label>
          <input style={inputS} type="email" value={form.doador_email} onChange={set("doador_email")} placeholder="email@exemplo.com" />
        </div>
      </div>

      {form.tipo !== "item" ? (
        <div style={rowS}>
          <div>
            <label style={labelS}>Valor (R$) *</label>
            <input style={inputS} type="number" min="0" value={form.valor} onChange={set("valor")} placeholder="0,00" />
          </div>
          <div>
            <label style={labelS}>Data</label>
            <input style={inputS} type="date" value={form.data_doacao} onChange={set("data_doacao")} />
          </div>
        </div>
      ) : (
        <>
          <div style={rowS}>
            <div>
              <label style={labelS}>Categoria</label>
              <select style={inputS} value={form.categoria} onChange={set("categoria")}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelS}>Quantidade</label>
              <input style={inputS} type="number" min="1" value={form.quantidade} onChange={set("quantidade")} placeholder="1" />
            </div>
          </div>
          <div style={groupS}>
            <label style={labelS}>Descrição dos itens *</label>
            <input style={inputS} value={form.descricao} onChange={set("descricao")} placeholder="Ex: Camisas masculinas tamanho M" />
          </div>
        </>
      )}

      <div style={rowS}>
        <div>
          <label style={labelS}>Status</label>
          <select style={inputS} value={form.status} onChange={set("status")}>
            <option value="pendente">Pendente</option>
            <option value="confirmado">Confirmado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div>
          <label style={labelS}>Observações</label>
          <input style={inputS} value={form.descricao} onChange={set("descricao")} placeholder="Opcional" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button onClick={handleSubmit} disabled={salvando}
          style={{ flex: 1, background: "#f97316", color: "#000", border: "none", borderRadius: 8, padding: 13, fontWeight: 700, fontSize: 14, cursor: salvando ? "not-allowed" : "pointer", opacity: salvando ? 0.7 : 1 }}>
          {salvando ? "Salvando..." : "Salvar doação"}
        </button>
        <button onClick={onCancelar}
          style={{ background: "#1e2a5e", color: "#f0f0f0", border: "none", borderRadius: 8, padding: "13px 20px", fontSize: 14, cursor: "pointer" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Doacoes() {
  const [doacoes,    setDoacoes]    = useState<Doacao[]>([]);
  const [total,      setTotal]      = useState(0);
  const [pagina,     setPagina]     = useState(1);
  const [totalPags,  setTotalPags]  = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [erro,       setErro]       = useState("");

  // Filtros
  const [filtroTipo,   setFiltroTipo]   = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busca,        setBusca]        = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");

  // Modais
  const [modalNova,    setModalNova]    = useState(false);
  const [modalExcluir, setModalExcluir] = useState<Doacao | null>(null);
  const [salvando,     setSalvando]     = useState(false);
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null);

  // Debounce da busca
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 400);
    return () => clearTimeout(t);
  }, [busca]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const carregar = useCallback(async () => {
    setErro("");
    setLoading(true);
    try {
      const res = await doacoesApi.listar({
        tipo:       filtroTipo   || undefined,
        status:     filtroStatus || undefined,
        pagina,
        por_pagina: 12,
      });
      setDoacoes(res.items);
      setTotal(res.total);
      setTotalPags(res.total_paginas);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [filtroTipo, filtroStatus, pagina]);

  useEffect(() => { carregar(); }, [carregar]);

  // Filtra localmente pela busca (nome)
  const listaFiltrada = buscaDebounced
    ? doacoes.filter(d => d.doador_nome.toLowerCase().includes(buscaDebounced.toLowerCase()))
    : doacoes;

  const handleStatusChange = async (doacao: Doacao, status: string) => {
    try {
      await doacoesApi.atualizarStatus(doacao.id, status);
      setDoacoes(prev => prev.map(d => d.id === doacao.id ? { ...d, status: status as Status } : d));
      showToast("Status atualizado!");
    } catch {
      showToast("Erro ao atualizar status.", false);
    }
  };

  const handleSalvar = async (form: FormState) => {
    setSalvando(true);
    try {
      await doacoesApi.criar({
        doador_nome:  form.doador_nome,
        doador_email: form.doador_email || undefined,
        valor:        form.tipo !== "item" ? Number(form.valor) : 0,
        tipo:         form.tipo,
        status:       form.status,
        descricao:    form.descricao || undefined,
        categoria:    form.tipo === "item" ? form.categoria : undefined,
        quantidade:   form.tipo === "item" ? Number(form.quantidade) || 1 : undefined,
        data_doacao:  form.data_doacao,
      });
      setModalNova(false);
      showToast("Doação registrada!");
      carregar();
    } catch {
      showToast("Erro ao salvar doação.", false);
    } finally {
      setSalvando(false);
    }
  };

  // ── Estilos ───────────────────────────────────────────────────────────────
  const page: CSSProperties  = { maxWidth: 1200, margin: "0 auto", padding: "32px 20px" };
  const card: CSSProperties  = { background: "#070d2a", border: "1px solid #1e2a5e", borderRadius: 14 };
  const thS:  CSSProperties  = { background: "#0b1035", color: "#8899bb", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, padding: "12px 16px", textAlign: "left", whiteSpace: "nowrap" };
  const tdS:  CSSProperties  = { padding: "13px 16px", borderTop: "1px solid #0e1535", fontSize: 13, verticalAlign: "middle" };
  const filterS: CSSProperties = { background: "#0b1035", border: "1px solid #2a3a70", borderRadius: 8, padding: "8px 12px", color: "#f0f0f0", fontSize: 13, outline: "none", cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: "#040826", color: "#f0f0f0", fontFamily: "'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      `}</style>

      <main style={page}>

        {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Gerenciar Doações</h1>
            <p style={{ fontSize: 13, color: "#8899bb", margin: "4px 0 0" }}>
              {total} doação{total !== 1 ? "ões" : ""} no total
            </p>
          </div>
          <button onClick={() => setModalNova(true)}
            style={{ background: "#f97316", color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            + Nova Doação
          </button>
        </div>

        {erro && (
          <div style={{ background: "#2a0a0a", border: "1px solid #991b1b", color: "#f87171", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 14 }}>
            {erro}
          </div>
        )}

        {/* ── Filtros ───────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <input
            style={{ ...filterS, minWidth: 220 }}
            placeholder="Buscar por nome..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          <select style={filterS} value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1); }}>
            <option value="">Todos os tipos</option>
            <option value="pix">PIX</option>
            <option value="transferencia">Transferência</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="item">Item</option>
          </select>
          <select style={filterS} value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1); }}>
            <option value="">Todos os status</option>
            <option value="confirmado">Confirmado</option>
            <option value="pendente">Pendente</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <button onClick={carregar}
            style={{ background: "#1e2a5e", color: "#f0f0f0", border: "1px solid #2a3a70", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>
            ↻ Atualizar
          </button>
        </div>

        {/* ── Tabela ───────────────────────────────────────────────────── */}
        <div style={{ ...card, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Data", "Doador", "Tipo", "Origem", "Valor / Qtd", "Status", "Ações"].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} style={tdS}><Skeleton h={14} /></td>
                      ))}
                    </tr>
                  ))
                : listaFiltrada.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} style={{ ...tdS, textAlign: "center", color: "#555", padding: "40px 0" }}>
                        Nenhuma doação encontrada.
                      </td>
                    </tr>
                  )
                  : listaFiltrada.map((d, i) => (
                    <tr key={d.id} style={{ background: i % 2 === 0 ? "#070d2a" : "#060b26", animation: "fadeUp .3s ease" }}>
                      <td style={{ ...tdS, color: "#8899bb", whiteSpace: "nowrap" }}>{formatData(d.data_criacao)}</td>
                      <td style={tdS}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d.doador_nome}</div>
                        {d.doador_email && <div style={{ fontSize: 11, color: "#8899bb" }}>{d.doador_email}</div>}
                      </td>
                      <td style={tdS}>
                        <span style={{ fontSize: 12, color: "#a0aec0" }}>{TIPO_LABEL[d.tipo as Tipo] ?? d.tipo}</span>
                      </td>
                      <td style={tdS}>
                        <span style={{ fontSize: 11, background: d.origem === "webhook" ? "#0a2a1a" : "#1a1a3e", color: d.origem === "webhook" ? "#4ade80" : "#818cf8", border: `1px solid ${d.origem === "webhook" ? "#166534" : "#3730a3"}`, borderRadius: 20, padding: "2px 8px" }}>
                          {d.origem === "webhook" ? "⚡ Auto" : "✏️ Manual"}
                        </span>
                      </td>
                      <td style={tdS}>
                        {d.tipo !== "item"
                          ? <span style={{ color: "#4ade80", fontWeight: 700 }}>{formatBRL(d.valor)}</span>
                          : <span style={{ color: "#818cf8" }}>{d.quantidade} un. — {d.categoria}</span>
                        }
                      </td>
                      <td style={tdS}>
                        <select
                          value={d.status}
                          onChange={e => handleStatusChange(d, e.target.value)}
                          style={{ ...filterS, fontSize: 12, padding: "4px 8px", color: STATUS_STYLE[d.status as Status]?.color as string, background: STATUS_STYLE[d.status as Status]?.background as string, border: STATUS_STYLE[d.status as Status]?.border as string }}
                        >
                          <option value="pendente">Pendente</option>
                          <option value="confirmado">Confirmado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                      <td style={tdS}>
                        <button onClick={() => setModalExcluir(d)}
                          style={{ background: "transparent", border: "1px solid #991b1b", color: "#f87171", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* ── Paginação ─────────────────────────────────────────────────── */}
        {totalPags > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 20 }}>
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
              style={{ background: "#1e2a5e", color: pagina === 1 ? "#555" : "#f0f0f0", border: "1px solid #2a3a70", borderRadius: 8, padding: "7px 14px", cursor: pagina === 1 ? "not-allowed" : "pointer", fontSize: 13 }}>
              ← Anterior
            </button>
            {Array.from({ length: Math.min(5, totalPags) }, (_, i) => {
              const p = Math.max(1, Math.min(pagina - 2, totalPags - 4)) + i;
              return (
                <button key={p} onClick={() => setPagina(p)}
                  style={{ background: pagina === p ? "#f97316" : "#1e2a5e", color: pagina === p ? "#000" : "#f0f0f0", border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 13, fontWeight: pagina === p ? 700 : 400 }}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPagina(p => Math.min(totalPags, p + 1))} disabled={pagina === totalPags}
              style={{ background: "#1e2a5e", color: pagina === totalPags ? "#555" : "#f0f0f0", border: "1px solid #2a3a70", borderRadius: 8, padding: "7px 14px", cursor: pagina === totalPags ? "not-allowed" : "pointer", fontSize: 13 }}>
              Próxima →
            </button>
          </div>
        )}
      </main>

      {/* ── Modal nova doação ──────────────────────────────────────────── */}
      {modalNova && (
        <Modal titulo="Registrar Doação Manual" onFechar={() => setModalNova(false)}>
          <FormDoacao
            inicial={FORM_VAZIO}
            onSalvar={handleSalvar}
            onCancelar={() => setModalNova(false)}
            salvando={salvando}
          />
        </Modal>
      )}

      {/* ── Modal confirmar exclusão ───────────────────────────────────── */}
      {modalExcluir && (
        <Modal titulo="Confirmar exclusão" onFechar={() => setModalExcluir(null)}>
          <p style={{ color: "#8899bb", fontSize: 14, marginBottom: 24 }}>
            Deseja excluir a doação de <strong style={{ color: "#f0f0f0" }}>{modalExcluir.doador_nome}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={async () => {
                showToast("Funcionalidade de exclusão a implementar no backend.");
                setModalExcluir(null);
              }}
              style={{ flex: 1, background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: 12, fontWeight: 700, cursor: "pointer" }}>
              Excluir
            </button>
            <button onClick={() => setModalExcluir(null)}
              style={{ background: "#1e2a5e", color: "#f0f0f0", border: "none", borderRadius: 8, padding: "12px 20px", cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.ok ? "#14532d" : "#7f1d1d", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,.4)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}