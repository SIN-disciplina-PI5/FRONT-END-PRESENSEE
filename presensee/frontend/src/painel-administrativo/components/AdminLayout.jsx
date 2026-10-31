import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
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
    try { return JSON.parse(localStorage.getItem("usuario")) || {} } catch { return {} }
  })

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

  useEffect(() => {
    const update = () => {
      try { setPerfil(JSON.parse(localStorage.getItem("usuario")) || {}) } catch { setPerfil({}) }
    }
    window.addEventListener("admin-profile-updated", update)
    return () => window.removeEventListener("admin-profile-updated", update)
  }, [])

            menuWasOpen.current = false;
            return;
        }

  function handleLogout() {
    localStorage.removeItem("token")
    localStorage.removeItem("usuario")
    navigate("/login", { replace: true })
  }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        closeRef.current?.focus();

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setMobileOpen(false);
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [mobileOpen]);

    return (
        <div className="admin-layout">
            <header className="admin-mobile-appbar">
                <button
                    ref={toggleRef}
                    type="button"
                    className="admin-mobile-menu-trigger"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Abrir menu de navegação"
                    aria-controls="presensee-admin-mobile-drawer"
                    aria-expanded={mobileOpen}
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                    >
                        <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <span className="admin-mobile-brand" translate="no">
                    Presen<span>See</span>
                </span>
            </header>

            {mobileOpen && (
                <button
                    type="button"
                    className="admin-mobile-sidebar-backdrop"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Fechar menu"
                />
            )}

            <div
                id="presensee-admin-mobile-drawer"
                className={`admin-mobile-sidebar-holder${mobileOpen ? " mobile-open" : ""}`}
                onClick={(event) => {
                    if (event.target.closest("a")) {
                        setMobileOpen(false);
                    }
                }}
            >
                <div className="admin-mobile-drawer-top">
                    <strong translate="no">
                        Presen<span>See</span>
                    </strong>

                    <button
                        ref={closeRef}
                        type="button"
                        className="admin-mobile-drawer-close"
                        aria-label="Fechar menu de navegação"
                        onClick={() => setMobileOpen(false)}
                    >
                        ×
                    </button>
                </div>

                <Sidebar tipo="admin" mobileOpen={mobileOpen} />
            </div>

            <main className="admin-main">
                <Outlet />
            </main>
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
          {!collapsed && (
            <span className="admin-profile-text">
              <strong>{perfil.name || perfil.nome || "Superadmin"}</strong>
              <small>Administrador</small>
            </span>
          )}
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
