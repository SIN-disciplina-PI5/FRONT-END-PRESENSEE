import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { logoutAdminDemo } from "../services/adminDemo"
import AdminIcon from "./AdminIcons"
import "../styles/admin.css"

const menu = [
  { to: "/admin/dashboard", label: "Home", icon: "home" },
  { to: "/admin/escolas", label: "Escolas", icon: "school" },
  { to: "/admin/gestores", label: "Gestores", icon: "users" },
  { to: "/admin/auditoria", label: "Auditoria", icon: "file" }
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(localStorage.getItem("adminSidebarCollapsed") === "true")
  const [tema, setTema] = useState(localStorage.getItem("tema") || "light")
  const [perfil, setPerfil] = useState(() => {
    try { return JSON.parse(localStorage.getItem("adminPerfilDemo")) || {} } catch { return {} }
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema)
    localStorage.setItem("tema", tema)
  }, [tema])

  useEffect(() => {
    const update = () => {
      try { setPerfil(JSON.parse(localStorage.getItem("adminPerfilDemo")) || {}) } catch { setPerfil({}) }
    }
    window.addEventListener("admin-profile-updated", update)
    return () => window.removeEventListener("admin-profile-updated", update)
  }, [])

  function toggleCollapse() {
    setCollapsed((previous) => {
      localStorage.setItem("adminSidebarCollapsed", String(!previous))
      return !previous
    })
  }

  function handleLogout() {
    logoutAdminDemo()
    localStorage.removeItem("token")
    localStorage.removeItem("usuario")
    navigate("/login", { replace: true })
  }

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${collapsed ? "compact" : ""}`}>
        <div className="admin-brand">
          {!collapsed && <h2 className="brand-font" translate="no">Presen<span>See</span></h2>}
          <button type="button" onClick={toggleCollapse} aria-label={collapsed ? "Expandir menu" : "Recolher menu"} title={collapsed ? "Expandir menu" : "Recolher menu"}>
            <AdminIcon name="collapse" size={17} />
          </button>
        </div>

        <nav className="admin-navigation" aria-label="Navegação administrativa">
          {menu.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} title={collapsed ? label : undefined} className={({ isActive }) => isActive ? "active" : ""}>
              <AdminIcon name={icon} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="admin-bottom admin-theme-button" onClick={() => setTema(tema === "light" ? "dark" : "light")}>
          <AdminIcon name={tema === "light" ? "moon" : "sun"} />
          {!collapsed && <span>{tema === "light" ? "Modo escuro" : "Modo claro"}</span>}
        </button>

        <NavLink to="/admin/perfil" className="admin-profile-link" title="Meu perfil de administrador">
          <span className="admin-profile-avatar">
            {perfil.avatar ? <img src={perfil.avatar} alt="Avatar do administrador" /> : <AdminIcon name="user" size={22} />}
          </span>
          {!collapsed && <span className="admin-profile-text"><strong>{perfil.nome || "Superadmin"}</strong><small>Administrador</small></span>}
        </NavLink>

        <button type="button" className="admin-bottom admin-logout" onClick={handleLogout}>
          <AdminIcon name="logout" />
          {!collapsed && <span>Encerrar Sessão</span>}
        </button>
      </aside>

      <main className="admin-main"><Outlet /></main>
    </div>
  )
}
