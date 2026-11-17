import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import AdminIcon from "./AdminIcons";
import "../styles/admin.css";

const menu = [
  { to: "/admin/dashboard", label: "Home", icon: "home" },
  { to: "/admin/escolas", label: "Escolas", icon: "school" },
  { to: "/admin/gestores", label: "Gestores", icon: "users" },
  { to: "/admin/chamados", label: "Chamados", icon: "message-circle" },
  { to: "/admin/comunicados", label: "Comunicados", icon: "bell" },
  { to: "/admin/saude-sistema", label: "Saúde do Sistema", icon: "activity" },
  { to: "/admin/auditoria", label: "Auditoria", icon: "file" }
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpenAtPath, setMobileOpenAtPath] = useState(null);
  const mobileOpen = mobileOpenAtPath === location.pathname;
  const toggleRef = useRef(null);
  const closeRef = useRef(null);
  const menuWasOpen = useRef(false);
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("adminSidebarCollapsed") === "true"
  );
  const [tema, setTema] = useState(localStorage.getItem("tema") || "light");
  const [perfil, setPerfil] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("usuario")) || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("tema", tema);
  }, [tema]);

  useEffect(() => {
    if (!mobileOpen) {
      if (menuWasOpen.current) toggleRef.current?.focus();
      menuWasOpen.current = false;
      return undefined;
    }

    menuWasOpen.current = true;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") setMobileOpenAtPath(null);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  useEffect(() => {
    const update = () => {
      try {
        setPerfil(JSON.parse(localStorage.getItem("usuario")) || {});
      } catch {
        setPerfil({});
      }
    };
    window.addEventListener("admin-profile-updated", update);
    window.addEventListener("avatar-atualizado", update);
    return () => {
      window.removeEventListener("admin-profile-updated", update);
      window.removeEventListener("avatar-atualizado", update);
    };
  }, []);

  function alternarColapso() {
    const proximo = !collapsed;
    setCollapsed(proximo);
    localStorage.setItem("adminSidebarCollapsed", String(proximo));
  }

  function handleLogout() {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("avatarUsuario");
    navigate("/login", { replace: true });
  }

  const showCollapsed = collapsed && !mobileOpen;

  return (
    <div className={`admin-layout ${tema}`}>
      <header className="admin-mobile-appbar">
        <button
          ref={toggleRef}
          type="button"
          className="admin-mobile-menu-trigger"
          onClick={() => setMobileOpenAtPath(location.pathname)}
          aria-label="Abrir menu de navegação"
          aria-controls="admin-mobile-drawer"
          aria-expanded={mobileOpen}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="admin-mobile-brand" translate="no">Presen<span>See</span></span>
      </header>
      {mobileOpen && (
        <button
          className="admin-mobile-sidebar-backdrop"
          type="button"
          onClick={() => setMobileOpenAtPath(null)}
          aria-label="Fechar menu"
        />
      )}
      <div id="admin-mobile-drawer" className={`admin-sidebar-holder${mobileOpen ? " mobile-open" : ""}`}>
        <div className="admin-mobile-drawer-top">
          <strong translate="no">Presen<span>See</span></strong>
          <button
            ref={closeRef}
            type="button"
            className="admin-mobile-drawer-close"
            aria-label="Fechar menu de navegação"
            onClick={() => setMobileOpenAtPath(null)}
          >
            ×
          </button>
        </div>
        <aside className={`admin-sidebar ${showCollapsed ? "compact collapsed" : ""}`}>
          <div className="admin-brand">
            {!showCollapsed && (
              <h2 className="brand-font" translate="no">
                Presen<span>See</span>
              </h2>
            )}
            <button
              type="button"
              onClick={alternarColapso}
              title={showCollapsed ? "Expandir menu" : "Recolher menu"}
              aria-label={showCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: showCollapsed ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s ease"
                }}
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>

          <nav className="admin-navigation" aria-label="Navegação administrativa">
            {menu.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                title={showCollapsed ? label : undefined}
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={() => setMobileOpenAtPath(null)}
              >
                <AdminIcon name={icon} />
                {!showCollapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            className="admin-bottom admin-theme-button"
            title="Alternar Tema"
            onClick={() => {
              const nextTema = tema === "light" ? "dark" : "light";
              setTema(nextTema);
            }}
          >
            <AdminIcon name={tema === "light" ? "moon" : "sun"} />
            {!showCollapsed && <span>{tema === "light" ? "Modo escuro" : "Modo claro"}</span>}
          </button>

          <NavLink
            to="/admin/perfil"
            className={({ isActive }) =>
              `admin-profile-link ${isActive ? "active" : ""}`
            }
            title="Meu perfil de administrador"
            onClick={() => setMobileOpenAtPath(null)}
          >
            <span className="admin-profile-avatar">
              {perfil.avatar ? (
                <img src={perfil.avatar} alt="Avatar do administrador" />
              ) : (
                <AdminIcon name="user" size={20} />
              )}
            </span>
            {!showCollapsed && (
              <span className="admin-profile-text">
                <strong>{perfil.name || perfil.nome || "Superadmin"}</strong>
                <small>Administrador</small>
              </span>
            )}
          </NavLink>

          <button
            type="button"
            className="admin-bottom admin-logout"
            title="Encerrar Sessão"
            onClick={handleLogout}
          >
            <AdminIcon name="logout" />
            {!showCollapsed && <span>Encerrar Sessão</span>}
          </button>
        </aside>
      </div>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}