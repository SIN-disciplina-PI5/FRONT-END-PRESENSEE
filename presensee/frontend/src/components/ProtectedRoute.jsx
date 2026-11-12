import { Navigate } from "react-router-dom"
import { getUsuario, isAuthenticated } from "../services/auth"

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  
  const role = String(getUsuario()?.perfil ?? getUsuario()?.role ?? "").toLowerCase()
  
  if (["superadmin", "super_admin", "administrador", "admin"].includes(role)) {
    return <Navigate to="/admin/dashboard" replace />
  }
  
  return children
}

export default ProtectedRoute