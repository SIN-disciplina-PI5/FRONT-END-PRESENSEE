import { Navigate } from "react-router-dom"
import { getUsuario, isAuthenticated } from "../services/auth"
import { isAdminDemo } from "../painel-administrativo/services/adminDemo"

function ProtectedRoute({ children }) {
  if (isAdminDemo()) return <Navigate to="/admin/dashboard" replace />
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  const role = String(getUsuario()?.perfil ?? getUsuario()?.role ?? "").toLowerCase()
  if (["superadmin", "super_admin", "administrador", "admin"].includes(role)) {
    return <Navigate to="/admin/dashboard" replace />
  }
  return children
}
export default ProtectedRoute
