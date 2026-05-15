import { Navigate } from "react-router-dom";
import { useAuth, type Acao } from "../context/AuthContext";

interface Props {
  children:   React.ReactNode;
  acao?:      Acao;      // se informado, verifica permissão específica
}

export default function ProtectedRoute({ children, acao }: Props) {
  const { usuario, loading, can } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#040826", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#8899bb", fontSize: 14 }}>Verificando sessão...</div>
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  if (acao && !can(acao)) {
    return (
      <div style={{ minHeight: "100vh", background: "#040826", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", color: "#f0f0f0" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: "#f87171", marginBottom: 8 }}>Acesso negado</h2>
          <p style={{ color: "#8899bb" }}>Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}