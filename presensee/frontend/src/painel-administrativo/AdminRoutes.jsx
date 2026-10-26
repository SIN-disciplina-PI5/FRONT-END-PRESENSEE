import { Navigate, Outlet, Route } from "react-router-dom"
import { isAdminDemo } from "./services/adminDemo"
import AdminLayout from "./components/AdminLayout"
import AdminDashboard from "./pages/AdminDashboard"
import AdminEscolas from "./pages/AdminEscolas"
import AdminNovaEscola from "./pages/AdminNovaEscola"
import AdminGestores from "./pages/AdminGestores"
import AdminAuditoria from "./pages/AdminAuditoria"
import AdminPerfil from "./pages/AdminPerfil"
import AdminChamados from "./pages/AdminChamados";
function AdminGuard(){
 const token = localStorage.getItem("token")
 let user = null
 try { user = JSON.parse(localStorage.getItem("usuario")) } catch { /* sessão inválida */ }
 const role = String(user?.perfil ?? user?.role ?? "").toLowerCase()
 const authorized = isAdminDemo() || (token && ["superadmin", "super_admin", "administrador", "admin"].includes(role))
 return authorized ? <Outlet/> : <Navigate to="/login" replace/>
}
export function adminRoutes(){return <>
 <Route element={<AdminGuard/>}><Route path="/admin" element={<AdminLayout/>}>
 <Route index element={<Navigate to="dashboard" replace/>}/>
 <Route path="dashboard" element={<AdminDashboard/>}/>
 <Route path="escolas" element={<AdminEscolas/>}/>
 <Route path="escolas/nova" element={<AdminNovaEscola/>}/>
 <Route path="gestores" element={<AdminGestores/>}/>
 <Route path="chamados" element={<AdminChamados />} />
 <Route path="auditoria" element={<AdminAuditoria/>}/>
 <Route path="perfil" element={<AdminPerfil/>}/>
 </Route></Route></>}
