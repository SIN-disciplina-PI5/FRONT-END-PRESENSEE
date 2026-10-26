
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getUsuario, logout } from "../services/auth";
import { logoutAdminDemo } from "../painel-administrativo/services/adminDemo";
import AdminIcon from "../painel-administrativo/components/AdminIcons";
import {
  IconHome,
  IconAlunos,
  IconCalendario,
  IconDiario,
  IconIntervencao,
  IconTurma,
  IconRelatorio,
  IconLogout,
  IconCollapse,
  IconCamera,
  IconSun,
  IconMoon,
  MascotAvatar
} from "./Icons";
import "../styles/Sidebar.css";

const MENU_MONITOR = [
  { to: "/dashboard", label: "Home", Icon: IconHome },
  { to: "/alunos", label: "Alunos", Icon: IconAlunos },
  {
    to: "/calendario",
    label: "Calendário Escolar",
    Icon: IconCalendario
  },
  {
    to: "/diario",
    label: "Diário do monitor",
    Icon: IconDiario
  },
  {
    to: "/intervencao",
    label: "Intervenção",
    Icon: IconIntervencao
  },
  { to: "/turmas", label: "Turma", Icon: IconTurma },
  {
    to: "/relatorios",
    label: "Relatório",
    Icon: IconRelatorio
  }
];

const MENU_ADMIN = [
  {
    to: "/admin/dashboard",
    label: "Home",
    Icon: IconHome
  },
  {
    to: "/admin/escolas",
    label: "Escolas",
    Icon: IconEscola
  },

  {
    to: "/admin/gestores",
    label: "Gestores",
    Icon: IconAlunos
  },

  {
  to: "/admin/chamados",
  label: "Chamados",
  Icon: IconChamados
},

{
  to: "/admin/comunicados",
  label: "Comunicados",
  Icon: IconComunicados
},

{
    to: "/admin/saude-sistema",
    label: "Saúde do Sistema",
    Icon: IconSaudeSistema
},

  {
    to: "/admin/auditoria",
    label: "Auditoria",
    Icon: IconRelatorio
  }
];

function IconEscola() {
  return <AdminIcon name="school" size={20} />;
}

function IconChamados() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 5h16v11H8l-4 4V5Z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  );
}

function IconComunicados() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 10v4h4l10 5V5L7 10H3Z" />
      <path d="M7 14l2 6h3l-2-5" />
      <path d="M20 9a4 4 0 0 1 0 6" />
    </svg>
  );
}

function IconSaudeSistema() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 12h4l3-7 4 14 3-7h4" />
        </svg>
    );
}

function obterPerfilAdmin() {
  try {
    return JSON.parse(
      localStorage.getItem("adminPerfilDemo")
    ) || {};
  } catch {
    return {};
  }
}

function Sidebar({ tipo = "monitor", mobileOpen = false }) {
  const navigate = useNavigate();
  const isAdmin = tipo === "admin";
  const usuario = getUsuario();
  const inputAvatar = useRef(null);

  const [avatar, setAvatar] = useState(
    localStorage.getItem("avatarUsuario") || ""
  );

  const [perfilAdmin, setPerfilAdmin] = useState(
    obterPerfilAdmin
  );

  const chaveColapso = isAdmin
    ? "adminSidebarCollapsed"
    : "sidebarCollapsed";

  const [collapsed, setCollapsed] = useState(
    localStorage.getItem(chaveColapso) === "true"
  );

  const [tema, setTema] = useState(
    localStorage.getItem("tema") || "light"
  );

  const showCollapsed = collapsed && !mobileOpen;

  const menu = isAdmin ? MENU_ADMIN : MENU_MONITOR;

  const nome = isAdmin
    ? perfilAdmin.nome || "Superadmin"
    : usuario?.nome || "Visitante";

  const cargo = isAdmin ? "Administrador" : "Monitor";

  const foto = isAdmin ? perfilAdmin.avatar : avatar;

  const rotaPerfil = isAdmin
    ? "/admin/perfil"
    : "/perfil-monitor";

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      tema
    );

    localStorage.setItem("tema", tema);
  }, [tema]);

  useEffect(() => {
    if (!isAdmin) return;

    function atualizarPerfil() {
      setPerfilAdmin(obterPerfilAdmin());
    }

    window.addEventListener(
      "admin-profile-updated",
      atualizarPerfil
    );

    return () => {
      window.removeEventListener(
        "admin-profile-updated",
        atualizarPerfil
      );
    };
  }, [isAdmin]);

  function alternarColapso() {
    const novoValor = !collapsed;

    setCollapsed(novoValor);

    localStorage.setItem(
      chaveColapso,
      String(novoValor)
    );
  }

  function alternarTema() {
    setTema(tema === "light" ? "dark" : "light");
  }

  function handleLogout() {
    if (isAdmin) {
      logoutAdminDemo();
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
    } else {
      logout();
    }

    navigate("/login", { replace: true });
  }

  function escolherAvatar(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo) return;

    const leitor = new FileReader();

    leitor.onload = () => {
      const imagem = leitor.result;

      setAvatar(imagem);
      localStorage.setItem("avatarUsuario", imagem);
    };

    leitor.readAsDataURL(arquivo);
  }

  return (
    <aside
      className={`sidebar ${
        showCollapsed ? "collapsed" : ""
      } ${isAdmin ? "sidebar-admin" : ""}`}
    >
      <div className="sidebar-top">
        <div className="sidebar-logo">
          {!showCollapsed && (
            <h2 className="brand-font" translate="no">
              Presen<span>See</span>
            </h2>
          )}
        </div>

        <button
          type="button"
          className="collapse-toggle"
          onClick={alternarColapso}
          title={
            showCollapsed
              ? "Expandir menu"
              : "Encolher menu"
          }
          aria-label={
            showCollapsed
              ? "Expandir menu"
              : "Encolher menu"
          }
        >
          <IconCollapse collapsed={showCollapsed} />
        </button>
      </div>

      <nav
        className="sidebar-menu"
        aria-label={
          isAdmin
            ? "Navegação administrativa"
            : "Navegação do monitor"
        }
      >
        {menu.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={
              showCollapsed ? label : undefined
            }
          >
            <Icon />

            {!showCollapsed && (
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
        {tema === "light" ? (
          <IconMoon />
        ) : (
          <IconSun />
        )}

        {!showCollapsed && (
          <span>
            {tema === "light"
              ? "Modo escuro"
              : "Modo claro"}
          </span>
        )}
      </button>

      <div className="sidebar-user">
        <NavLink
          to={rotaPerfil}
          className="sidebar-user-link"
          title={`Acessar perfil do ${cargo.toLowerCase()}`}
        >
          <div className="sidebar-avatar">
            {foto ? (
              <img
                src={foto}
                alt="Foto do usuário"
              />
            ) : (
              <MascotAvatar size={34} />
            )}
          </div>

          {!showCollapsed && (
            <div className="sidebar-user-info">
              <strong>{nome}</strong>
              <span>{cargo}</span>
            </div>
          )}
        </NavLink>

        {!isAdmin && (
          <>
            <button
              type="button"
              className="sidebar-avatar-edit"
              onClick={() => inputAvatar.current?.click()}
              title="Alterar foto"
              aria-label="Alterar foto do perfil"
            >
              <IconCamera />
            </button>

            <input
              ref={inputAvatar}
              type="file"
              accept="image/*"
              onChange={escolherAvatar}
              style={{ display: "none" }}
            />
          </>
        )}
      </div>

      <button
        type="button"
        className="logout-button"
        onClick={handleLogout}
        title="Encerrar Sessão"
      >
        <IconLogout />

        {!showCollapsed && (
          <span>Encerrar Sessão</span>
        )}
      </button>
    </aside>
  );
}

export default Sidebar;
