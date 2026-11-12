import { NavLink, useNavigate, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getUsuario, logout } from "../services/auth";
import "../styles/Sidebar.css";

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

function IconEscola() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M8 2v4M16 2v4M4 9h16M9 14h.01M15 14h.01M9 18h.01M15 18h.01" />
    </svg>
  );
}

function IconChamados() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16v11H8l-4 4V5Z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  );
}

function IconComunicados() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10v4h4l10 5V5L7 10H3Z" />
      <path d="M7 14l2 6h3l-2-5" />
      <path d="M20 9a4 4 0 0 1 0 6" />
    </svg>
  );
}

function IconSaudeSistema() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h4l3-7 4 14 3-7h4" />
        </svg>
    );
}

const MENU_MONITOR = [
  { to: "/dashboard", label: "Home", Icon: IconHome },
  { to: "/alunos", label: "Alunos", Icon: IconAlunos },
  { to: "/calendario", label: "Calendário", Icon: IconCalendario },
  { to: "/diario", label: "Diário", Icon: IconDiario },
  { to: "/intervencao", label: "Intervenção", Icon: IconIntervencao },
  { to: "/turmas", label: "Turma", Icon: IconTurma },
  { to: "/relatorios", label: "Relatório", Icon: IconRelatorio }
];

const MENU_ADMIN = [
  { to: "/admin/dashboard", label: "Home", Icon: IconHome },
  { to: "/admin/escolas", label: "Escolas", Icon: IconEscola },
  { to: "/admin/gestores", label: "Gestores", Icon: IconAlunos },
  { to: "/admin/chamados", label: "Chamados", Icon: IconChamados },
  { to: "/admin/comunicados", label: "Comunicados", Icon: IconComunicados },
  { to: "/admin/saude-sistema", label: "Saúde do Sistema", Icon: IconSaudeSistema },
  { to: "/admin/auditoria", label: "Auditoria", Icon: IconRelatorio }
];

function Sidebar({ tipo = "monitor", mobileOpen = false }) {
  const navigate = useNavigate();
  const isAdmin = tipo === "admin";
  const usuario = getUsuario();
  const inputAvatar = useRef(null);

  const [avatar, setAvatar] = useState(localStorage.getItem("avatarUsuario") || "");
  const [collapsed, setCollapsed] = useState(localStorage.getItem("sidebarCollapsed") === "true");
  const [tema, setTema] = useState(localStorage.getItem("tema") || "light");

  const showCollapsed = collapsed && !mobileOpen;
  const menu = isAdmin ? MENU_ADMIN : MENU_MONITOR;
  
  // Utiliza diretamente os dados reais do utilizador autenticado
  const nomeExibicao = usuario?.name || usuario?.nome || (isAdmin ? "Superadmin" : "Visitante");
  const roleDb = String(usuario?.role || usuario?.perfil || "").toUpperCase();
  
  let cargoExibicao = "Visitante";
  if (isAdmin || roleDb === "ADMIN" || roleDb === "SUPERADMIN") cargoExibicao = "Administrador";
  else if (roleDb === "MANAGER" || roleDb === "GESTOR") cargoExibicao = "Gestor";
  else if (roleDb === "MONITOR") cargoExibicao = "Monitor";

  const foto = avatar || usuario?.avatar || "";
  const rotaPerfil = isAdmin ? "/admin/perfil" : "/perfil-monitor";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("tema", tema);
  }, [tema]);

  function alternarColapso() {
    const novoValor = !collapsed;
    setCollapsed(novoValor);
    localStorage.setItem("sidebarCollapsed", String(novoValor));
  }

  function alternarTema() { setTema(tema === "light" ? "dark" : "light"); }

  function escolherAvatar(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      const imagem = leitor.result;
      setAvatar(imagem);
      localStorage.setItem("avatarUsuario", imagem);
    };
    leitor.readAsDataURL(arquivo);
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <div className="sidebar-logo">
          {!showCollapsed && (
            <h2 className="brand-font" translate="no">
              Presen<span>See</span>
            </h2>
          )}
        </div>
        <button type="button" className="collapse-toggle" onClick={alternarColapso}>
          <IconCollapse collapsed={showCollapsed} />
        </button>
      </div>

      <nav className="sidebar-menu">
        {menu.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} title={collapsed ? label : undefined}>
            <Icon />
            {!collapsed && <span className="menu-label">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <button type="button" className="theme-toggle" onClick={alternarTema} title="Alternar Tema">
        {tema === "light" ? <IconMoon /> : <IconSun />}
        {!collapsed && <span>{tema === "light" ? "Modo escuro" : "Modo claro"}</span>}
      </button>

      <div className="sidebar-user">
        <Link to={rotaPerfil} className="sidebar-user-link" title="Acessar perfil">
          <div className="sidebar-avatar">
            {foto ? <img src={foto} alt="Foto do usuário" /> : <MascotAvatar size={34} />}
          </div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <strong>{nomeExibicao}</strong>
              <span>{cargoExibicao}</span>
            </div>
          )}
        </Link>
        <button type="button" className="sidebar-avatar-edit" onClick={() => inputAvatar.current?.click()} title="Alterar foto">
          <IconCamera />
        </button>
        <input ref={inputAvatar} type="file" accept="image/*" onChange={escolherAvatar} style={{ display: "none" }} />
      </div>

      <button className="logout-button" onClick={handleLogout} title="Encerrar Sessão">
        <IconLogout />
        {!collapsed && <span>Encerrar Sessão</span>}
      </button>
    </aside>
  );
}

export default Sidebar;