import { NavLink, useNavigate, Link } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import { getUsuario, logout } from "../services/auth"
import "../styles/Sidebar.css"
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
  MascotAvatar,
} from "./Icons"

const MENU = [
  { to: "/dashboard", label: "Home", Icon: IconHome },
  { to: "/alunos", label: "Alunos", Icon: IconAlunos },
  { to: "/calendario", label: "Calendário Escolar", Icon: IconCalendario },
  { to: "/diario", label: "Diário do monitor", Icon: IconDiario },
  { to: "/intervencao", label: "Intervenção", Icon: IconIntervencao },
  { to: "/turmas", label: "Turma", Icon: IconTurma },
  { to: "/relatorios", label: "Relatório", Icon: IconRelatorio },
]

function Sidebar({ mobileOpen = false }) {
  const navigate = useNavigate()
  const usuario = getUsuario()
  const [avatar, setAvatar] = useState(localStorage.getItem("avatarUsuario") || "")
  const [collapsed, setCollapsed] = useState(localStorage.getItem("sidebarCollapsed") === "true")
  const [tema, setTema] = useState(localStorage.getItem("tema") || "light")
  const inputAvatar = useRef(null)
  const showCollapsed = collapsed && !mobileOpen

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema)
    localStorage.setItem("tema", tema)
  }, [tema])

  function handleLogout() {
    logout()
    navigate("/login")
  }

  function alternarColapso() {
    const novoValor = !collapsed
    setCollapsed(novoValor)
    localStorage.setItem("sidebarCollapsed", String(novoValor))
  }

  function alternarTema() {
    setTema(tema === "light" ? "dark" : "light")
  }

  function escolherAvatar(e) {
    const arquivo = e.target.files[0]
    if (!arquivo) return
    const leitor = new FileReader()
    leitor.onload = () => {
      const imagem = leitor.result
      setAvatar(imagem)
      localStorage.setItem("avatarUsuario", imagem)
    }
    leitor.readAsDataURL(arquivo)
  }

  return (
    <aside className={`sidebar ${showCollapsed ? "collapsed" : ""}`}>
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
          title={showCollapsed ? "Expandir menu" : "Encolher menu"}
        >
          <IconCollapse collapsed={showCollapsed} />
        </button>
      </div>
      <nav className="sidebar-menu">
        {MENU.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} title={showCollapsed ? label : undefined}>
            <Icon />
            {!showCollapsed && <span className="menu-label">{label}</span>}
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        className="theme-toggle"
        onClick={alternarTema}
        title={tema === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
      >
        {tema === "light" ? <IconMoon /> : <IconSun />}
        {!showCollapsed && <span>{tema === "light" ? "Modo escuro" : "Modo claro"}</span>}
      </button>
      <div className="sidebar-user">
        <Link to="/perfil-monitor" className="sidebar-user-link" title="Acessar perfil do monitor">
          <div className="sidebar-avatar">
            {avatar ? <img src={avatar} alt="Foto do usuário" /> : <MascotAvatar size={34} />}
          </div>
          {!showCollapsed && (
            <div className="sidebar-user-info">
              <strong>{usuario?.nome || "Visitante"}</strong>
              <span>Monitor</span>
            </div>
          )}
        </Link>
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
      </div>
      <button type="button" className="logout-button" onClick={handleLogout} title="Encerrar Sessão">
        <IconLogout />
        {!showCollapsed && <span>Encerrar Sessão</span>}
      </button>
    </aside>
  )
}

export default Sidebar
