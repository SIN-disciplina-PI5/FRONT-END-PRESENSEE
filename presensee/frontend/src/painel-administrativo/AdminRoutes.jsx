import { Navigate, Outlet, Route } from "react-router-dom";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminEscolas from "./pages/AdminEscolas";
import AdminNovaEscola from "./pages/AdminNovaEscola";
import AdminGestores from "./pages/AdminGestores";
import AdminChamados from "./pages/AdminChamados";
import AdminComunicados from "./pages/AdminComunicados";
import AdminSaudeSistema from "./pages/AdminSaudeSistema";
import AdminAuditoria from "./pages/AdminAuditoria";
import AdminPerfil from "./pages/AdminPerfil";

function AdminGuard() {
  const token = localStorage.getItem("token");
  let user = null;
  
  try {
    user = JSON.parse(localStorage.getItem("usuario"));
  } catch {
    /* sessão inválida */
  }
  
  const role = String(user?.perfil ?? user?.role ?? "").toLowerCase();
  const authorized = token && ["superadmin", "super_admin", "administrador", "admin"].includes(role);
  
  return authorized ? <Outlet /> : <Navigate to="/login" replace />;
}

export function adminRoutes() {
  return (
    <>
      <Route element={<AdminGuard />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="escolas" element={<AdminEscolas />} />
          <Route path="escolas/nova" element={<AdminNovaEscola />} />
          <Route path="gestores" element={<AdminGestores />} />
          {/* Bloqueia criação avulsa de gestor e redireciona para o cadastro de escola */}
          <Route path="gestores/novo" element={<Navigate to="/admin/escolas/nova" replace />} />
          <Route path="chamados" element={<AdminChamados />} />
          <Route path="comunicados" element={<AdminComunicados />} />
          <Route path="saude-sistema" element={<AdminSaudeSistema />} />
          <Route path="auditoria" element={<AdminAuditoria />} />
          <Route path="perfil" element={<AdminPerfil />} />
        </Route>
      </Route>
    </>
  );
}