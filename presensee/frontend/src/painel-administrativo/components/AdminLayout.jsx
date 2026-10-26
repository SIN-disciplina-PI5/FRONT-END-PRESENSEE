
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { logoutAdminDemo } from "../services/adminDemo";
import {
  IconHome,
  IconAlunos,
  IconRelatorio,
  IconCollapse,
  IconMoon,
  IconSun,
  IconLogout,
  MascotAvatar
} from "../../components/Icons";
import AdminIcon from "./AdminIcons";
import "../../styles/Sidebar.css";
import "../styles/admin.css";
import "../styles/AdminSidebar.css";

const MENU = [
  {
    to: "/admin/dashboard",
    label: "Home",
    Icon: IconHome
  },
  {
    to: "/admin/escolas",
    label: "Escolas",
    Icon: null
  },
  {
    to: "/admin/gestores",
    label: "Gestores",
    Icon: IconAlunos
  },
  {
    to: "/admin/auditoria",
    label: "Auditoria",
    Icon: IconRelatorio
  }
];

export default function AdminLayout() {
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("adminSidebarCollapsed") === "true"
  );

  const [tema, setTema] = useState(
    localStorage.getItem("tema") || "light"
  );

  const [perfil, setPerfil] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("adminPerfilDemo")) || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("tema", tema);
  }, [tema]);

  useEffect(() => {
    const update = () => {
      try {
        setPerfil(
          JSON.parse(localStorage.getItem("adminPerfilDemo")) || {}
        );
      } catch {
        setPerfil({});
      }
    };

    window.addEventListener("admin-profile-updated", update);

    return () => {
      window.removeEventListener("admin-profile-updated", update);
    };
  }, []);

  function alternarColapso() {
    const novoValor = !collapsed;

    setCollapsed(novoValor);

    localStorage.setItem(
      "adminSidebarCollapsed",
      String(novoValor)
    );
  }

  function alternarTema() {
    setTema(tema === "light" ? "dark" : "light");
  }

  function handleLogout() {
    logoutAdminDemo();
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    navigate("/login", { replace: true });
  }

  return (
    <div className="admin-layout">
      <aside
        className={`sidebar admin-monitor-sidebar ${
          collapsed ? "collapsed" : ""
        }`}
      >
        <div className="sidebar-top">
          <div className="sidebar-logo">
            {!collapsed && (
              <h2 className="brand-font" translate="no">
                Presen<span>See</span>
              </h2>
            )}
          </div>

          <button
            type="button"
            className="collapse-toggle"
            onClick={alternarColapso}
            title={collapsed ? "Expandir menu" : "Encolher menu"}
            aria-label={collapsed ? "Expandir menu" : "Encolher menu"}
          >
            <IconCollapse collapsed={collapsed} />
          </button>
        </div>

        <nav
          className="sidebar-menu"
          aria-label="Navegação administrativa"
        >
          {MENU.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
            >
              {Icon ? (
                <Icon />
              ) : (
                <AdminIcon name="school" size={20} />
              )}

              {!collapsed && (
                <span className="menu-label">
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="theme-toggle"
          onClick={alternarTema}
          title={
            tema === "light"
              ? "Ativar modo escuro"
              : "Ativar modo claro"
          }
        >
          {tema === "light" ? <IconMoon /> : <IconSun />}

          {!collapsed && (
            <span>
              {tema === "light" ? "Modo escuro" : "Modo claro"}
            </span>
          )}
        </button>

        <div className="sidebar-user">
          <NavLink
            to="/admin/perfil"
            className="sidebar-user-link"
            title="Acessar perfil do administrador"
          >
            <div className="sidebar-avatar">
              {perfil.avatar ? (
                <img
                  src={perfil.avatar}
                  alt="Foto do administrador"
                />
              ) : (
                <MascotAvatar size={34} />
              )}
            </div>

            {!collapsed && (
              <div className="sidebar-user-info">
                <strong>
                  {perfil.nome || "Superadmin"}
                </strong>

                <span>Administrador</span>
              </div>
            )}
          </NavLink>
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
          title="Encerrar Sessão"
        >
          <IconLogout />

          {!collapsed && (
            <span>Encerrar Sessão</span>
          )}
        </button>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
