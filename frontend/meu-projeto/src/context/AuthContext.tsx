import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Papel = "admin" | "funcionario";

export interface UsuarioLogado {
  id:    number;
  nome:  string;
  email: string;
  papel: Papel;
  ativo: boolean;
}

export type Acao =
  | "ver_dashboard"
  | "ver_doacoes"
  | "criar_doacao"
  | "alterar_status"
  | "excluir_doacao"
  | "gerenciar_usuarios";

const PERMISSOES: Record<Papel, Acao[]> = {
  admin:       ["ver_dashboard","ver_doacoes","criar_doacao","alterar_status","excluir_doacao","gerenciar_usuarios"],
  funcionario: ["ver_dashboard","ver_doacoes","criar_doacao"],
};

interface AuthContextData {
  usuario: UsuarioLogado | null;
  loading: boolean;
  login:   (email: string, senha: string) => Promise<void>;
  logout:  () => Promise<void>;
  isAdmin: boolean;
  can:     (acao: Acao) => boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);
const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [loading, setLoading] = useState(true);

  const verificarSessao = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/auth/me`, { credentials: "include" });
      if (res.ok) setUsuario(await res.json());
      else        setUsuario(null);
    } catch {
      setUsuario(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { verificarSessao(); }, [verificarSessao]);

  const login = async (email: string, senha: string) => {
    const res  = await fetch(`${API}/api/auth/login`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro ?? "Erro ao fazer login.");
    setUsuario(data.usuario);
  };

  const logout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
    setUsuario(null);
  };

  const can = (acao: Acao): boolean => {
    if (!usuario) return false;
    return PERMISSOES[usuario.papel]?.includes(acao) ?? false;
  };

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout, isAdmin: usuario?.papel === "admin", can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);