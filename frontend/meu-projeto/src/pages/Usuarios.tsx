import { useState, useEffect, useCallback, type CSSProperties, type ChangeEvent } from "react";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

interface Usuario {
  id:           number;
  nome:         string;
  email:        string;
  papel:        "admin" | "funcionario";
  ativo:        boolean;
  data_criacao: string;
  ultimo_acesso: string | null;
}

interface FormU {
  nome:  string;
  email: string;
  senha: string;
  papel: "admin" | "funcionario";
  ativo: boolean;
}

const FORM_VAZIO: FormU = { nome: "", email: "", senha: "", papel: "funcionario", ativo: true };

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res  = await fetch(`${API}${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.erro ?? "Erro");
  return data;
}

function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#070d2a", border: "1px solid #1e2a5e", borderRadius: 16, padding: 32, width: "100%", maxWidth: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{titulo}</h2>
          <button onClick={onFechar} style={{ background: "none", border: "none", color: "#8899bb", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Usuarios() {
  const { usuario: eu } = useAuth();
  const [usuarios,  setUsuarios]  = useState<Usuario[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modalForm, setModalForm] = useState<{ aberto: boolean; editando: Usuario | null }>({ aberto: false, editando: null });
  const [form,      setForm]      = useState<FormU>(FORM_VAZIO);
  const [salvando,  setSalvando]  = useState(false);
  const [confirmar, setConfirmar] = useState<Usuario | null>(null);
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const carregar = useCallback(async () => {
    try {
      const data = await req<Usuario[]>("/api/auth/usuarios");
      setUsuarios(data);
    } catch { showToast("Erro ao carregar usuários.", false); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirNovo   = () => { setForm(FORM_VAZIO); setModalForm({ aberto: true, editando: null }); };
  const abrirEditar = (u: Usuario) => { setForm({ nome: u.nome, email: u.email, senha: "", papel: u.papel, ativo: u.ativo }); setModalForm({ aberto: true, editando: u }); };

  const handleSalvar = async () => {
    if (!form.nome || !form.email) { showToast("Nome e e-mail obrigatórios.", false); return; }
    if (!modalForm.editando && !form.senha) { showToast("Senha obrigatória para novo usuário.", false); return; }
    setSalvando(true);
    try {
      if (modalForm.editando) {
        await req(`/api/auth/usuarios/${modalForm.editando.id}`, { method: "PATCH", body: JSON.stringify(form) });
        showToast("Usuário atualizado!");
      } else {
        await req("/api/auth/usuarios", { method: "POST", body: JSON.stringify(form) });
        showToast("Usuário criado!");
      }
      setModalForm({ aberto: false, editando: null });
      carregar();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erro.", false);
    } finally { setSalvando(false); }
  };

  const handleDeletar = async (u: Usuario) => {
    try {
      await req(`/api/auth/usuarios/${u.id}`, { method: "DELETE" });
      showToast("Usuário removido.");
      setConfirmar(null);
      carregar();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Erro.", false);
    }
  };

  const inputS: CSSProperties = { width: "100%", background: "#0b1035", border: "1px solid #2a3a70", borderRadius: 8, padding: "10px 14px", color: "#f0f0f0", fontSize: 14, boxSizing: "border-box", outline: "none" };
  const set = (campo: keyof FormU) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [campo]: campo === "ativo" ? (e.target as HTMLInputElement).checked : e.target.value }));

  return (
    <div style={{ minHeight: "100vh", background: "#040826", color: "#f0f0f0", fontFamily: "'Segoe UI', sans-serif" }}>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Gerenciar Usuários</h1>
            <p style={{ fontSize: 13, color: "#8899bb", margin: "4px 0 0" }}>{usuarios.length} usuário(s) cadastrado(s)</p>
          </div>
          <button onClick={abrirNovo} style={{ background: "#f97316", color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            + Novo Usuário
          </button>
        </div>

        <div style={{ background: "#070d2a", border: "1px solid #1e2a5e", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Usuário", "Papel", "Status", "Último acesso", "Ações"].map(h => (
                  <th key={h} style={{ background: "#0b1035", color: "#8899bb", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, padding: "12px 16px", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={5} style={{ padding: "32px 0", textAlign: "center", color: "#555" }}>Carregando...</td></tr>
                : usuarios.map(u => (
                  <tr key={u.id} style={{ borderTop: "1px solid #0e1535" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600 }}>{u.nome} {u.id === eu?.id && <span style={{ fontSize: 11, color: "#8899bb" }}>(você)</span>}</div>
                      <div style={{ fontSize: 12, color: "#8899bb" }}>{u.email}</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: u.papel === "admin" ? "#3b1f00" : "#1a1a3e", color: u.papel === "admin" ? "#fb923c" : "#818cf8", border: `1px solid ${u.papel === "admin" ? "#92400e" : "#3730a3"}` }}>
                        {u.papel === "admin" ? "👑 Admin" : "👤 Funcionário"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: u.ativo ? "#0a3d1f" : "#3b0a0a", color: u.ativo ? "#4ade80" : "#f87171", border: `1px solid ${u.ativo ? "#166534" : "#991b1b"}` }}>
                        {u.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#8899bb" }}>
                      {u.ultimo_acesso ? new Date(u.ultimo_acesso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Nunca"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <button onClick={() => abrirEditar(u)} style={{ background: "transparent", border: "1px solid #3730a3", color: "#818cf8", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", marginRight: 6 }}>Editar</button>
                      {u.id !== eu?.id && (
                        <button onClick={() => setConfirmar(u)} style={{ background: "transparent", border: "1px solid #991b1b", color: "#f87171", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>Remover</button>
                      )}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </main>

      {modalForm.aberto && (
        <Modal titulo={modalForm.editando ? "Editar Usuário" : "Novo Usuário"} onFechar={() => setModalForm({ aberto: false, editando: null })}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ fontSize: 12, color: "#8899bb", display: "block", marginBottom: 5 }}>Nome *</label>
              <input style={inputS} value={form.nome} onChange={set("nome")} placeholder="Nome completo" /></div>
            <div><label style={{ fontSize: 12, color: "#8899bb", display: "block", marginBottom: 5 }}>E-mail *</label>
              <input style={inputS} type="email" value={form.email} onChange={set("email")} placeholder="email@ong.org" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ fontSize: 12, color: "#8899bb", display: "block", marginBottom: 5 }}>Senha {modalForm.editando ? "(deixe vazio para manter)" : "*"}</label>
              <input style={inputS} type="password" value={form.senha} onChange={set("senha")} placeholder="••••••••" /></div>
            <div><label style={{ fontSize: 12, color: "#8899bb", display: "block", marginBottom: 5 }}>Papel</label>
              <select style={inputS} value={form.papel} onChange={set("papel")}>
                <option value="funcionario">Funcionário</option>
                <option value="admin">Administrador</option>
              </select></div>
          </div>
          {modalForm.editando && (
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" id="ativo" checked={form.ativo} onChange={set("ativo")} />
              <label htmlFor="ativo" style={{ fontSize: 14, color: "#f0f0f0", cursor: "pointer" }}>Conta ativa</label>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={handleSalvar} disabled={salvando} style={{ flex: 1, background: "#f97316", color: "#000", border: "none", borderRadius: 8, padding: 13, fontWeight: 700, fontSize: 14, cursor: salvando ? "not-allowed" : "pointer", opacity: salvando ? 0.7 : 1 }}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={() => setModalForm({ aberto: false, editando: null })} style={{ background: "#1e2a5e", color: "#f0f0f0", border: "none", borderRadius: 8, padding: "13px 20px", cursor: "pointer" }}>Cancelar</button>
          </div>
        </Modal>
      )}

      {confirmar && (
        <Modal titulo="Confirmar remoção" onFechar={() => setConfirmar(null)}>
          <p style={{ color: "#8899bb", fontSize: 14, marginBottom: 24 }}>
            Deseja remover <strong style={{ color: "#f0f0f0" }}>{confirmar.nome}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => handleDeletar(confirmar)} style={{ flex: 1, background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: 12, fontWeight: 700, cursor: "pointer" }}>Remover</button>
            <button onClick={() => setConfirmar(null)} style={{ background: "#1e2a5e", color: "#f0f0f0", border: "none", borderRadius: 8, padding: "12px 20px", cursor: "pointer" }}>Cancelar</button>
          </div>
        </Modal>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.ok ? "#14532d" : "#7f1d1d", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, zIndex: 999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}