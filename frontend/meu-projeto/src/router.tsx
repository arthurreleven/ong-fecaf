import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./layouts/ProtectedRoute";
import InternalLayout from "./layouts/InternalLayout";
import Site from "./pages/Site";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Doacoes from "./pages/Doacoes";
import Usuarios from "./pages/Usuarios";

export default function Router() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"       element={<Site />} />
          <Route path="/login"  element={<Login />} />

          <Route element={
            <ProtectedRoute>
              <InternalLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={
              <ProtectedRoute acao="ver_dashboard"><Dashboard /></ProtectedRoute>
            }/>
            <Route path="/doacoes" element={
              <ProtectedRoute acao="ver_doacoes"><Doacoes /></ProtectedRoute>
            }/>
            <Route path="/usuarios" element={
              <ProtectedRoute acao="gerenciar_usuarios"><Usuarios /></ProtectedRoute>
            }/>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}