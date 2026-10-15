import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../services/api"
import { loginAdminDemo, logoutAdminDemo } from "../painel-administrativo/services/adminDemo"
import "../styles/Login.css"

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState("")
  const [enviando, setEnviando] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErro("")
    if (!email.trim() || !senha) { setErro("Preencha todos os campos"); return }

    // EXCLUSIVAMENTE LOCAL: permite demonstrar o superadministrador sem backend.
    // Esta combinação não deve existir em um build de produção.
if (loginAdminDemo(email, senha)) {
      localStorage.removeItem("token")
      localStorage.removeItem("usuario")
      navigate("/admin/dashboard", { replace: true })
      return
    }
    logoutAdminDemo()

    setEnviando(true)
    try {
      const response = await api.post("/auth/login", { email, senha })
      const { token } = response.data
      // O contrato da API deve retornar usuario com perfil e escolaId.
      // Nunca decidir o perfil pelo e-mail digitado na tela.
      const usuario = response.data.usuario ?? response.data.user
      const perfil = String(usuario?.perfil ?? usuario?.role ?? "").toLowerCase()
      const admin = ["superadmin", "super_admin", "administrador", "admin"].includes(perfil)
      const escola = ["gestor", "gestor_escolar", "monitor"].includes(perfil)
      if (!token || !usuario || (!admin && (!escola || !usuario.escolaId))) {
        setErro("O servidor não retornou perfil e escola válidos. Verifique a API de autenticação.")
        return
      }
      localStorage.setItem("token", token)
      localStorage.setItem("usuario", JSON.stringify(usuario))
      navigate(admin ? "/admin/dashboard" : "/dashboard", { replace: true })
    } catch (error) {
      console.error("Falha de autenticação", error)
      setErro("Email ou senha inválidos")
    } finally { setEnviando(false) }
  }

  function entrarComoVisitante() {
    logoutAdminDemo()
    localStorage.setItem("token", "token-demo")
    localStorage.setItem("usuario", JSON.stringify({ nome: "Visitante", perfil: "Demonstração" }))
    navigate("/dashboard", { replace: true })
  }

  return (
    <div className="login-page">
      <div className="login-blob-bg blob-a" />
      <div className="login-blob-bg blob-b" />
      <div className="login-shape shape-fill-1" />
      <div className="login-shape shape-fill-2" />
      <div className="login-shape shape-ring" />
      <div className="login-shape shape-outline" />
      <div className="login-topbar">
        <span className="login-ring-deco" />
        <h2 className="brand-font login-logo" translate="no">Presen<span>See</span></h2>
      </div>
      <div className="login-panels">
        <div className="scan-panel">
          <div className="scan-frame">
            <span className="scan-corner corner-tl" />
            <span className="scan-corner corner-tr" />
            <span className="scan-corner corner-bl" />
            <span className="scan-corner corner-br" />
            <div className="scan-face"><span className="scan-eye" /><span className="scan-eye" /><span className="scan-smile" /></div>
            <div className="scan-line" />
          </div>
          <h3>Cada presença importa, cada futuro também.</h3>
          <p>validando presença em tempo real</p>
          <div className="scan-badge"><span className="scan-dot" /><b> presente.</b></div>
        </div>
        <div className="login-card">
          <h1 className="brand-font">Conecte-<span>se</span></h1>
          <p className="login-subtitle">Acesse o painel de presença da sua turma.</p>
          <form onSubmit={handleLogin}>
            <label htmlFor="email">Email</label>
            <input id="email" className="login-input" type="email" placeholder="email@gmail.com" value={email} onChange={e=>setEmail(e.target.value)} />
            <label htmlFor="senha">Senha</label>
            <input id="senha" className="login-input" type={mostrarSenha ? "text" : "password"} placeholder="Senha" value={senha} onChange={e=>setSenha(e.target.value)} />
            <p className="show-password" onClick={()=>setMostrarSenha(!mostrarSenha)}>{mostrarSenha ? "Ocultar senha" : "Mostrar senha"}</p>
            {erro && <p className="error-message" role="alert">{erro}</p>}
            <button className="login-button" type="submit" disabled={enviando}>{enviando ? "Entrando..." : "Entrar"}</button>
            <button type="button" className="create-account" onClick={entrarComoVisitante}>Entrar como visitante</button>
          </form>
        </div>
      </div>
    </div>
  )
}
export default Login
