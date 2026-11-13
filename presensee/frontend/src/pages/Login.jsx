import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../services/api"
import "../styles/Login.css"

function Login() {
  const navigate = useNavigate()
  
  // Estados do Login Normal
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState("")
  const [enviando, setEnviando] = useState(false)

  // Estados da Troca de Senha (Primeiro Acesso)
  const [precisaTrocarSenha, setPrecisaTrocarSenha] = useState(false)
  const [userIdTroca, setUserIdTroca] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [mensagemTroca, setMensagemTroca] = useState({ texto: "", tipo: "" })

  async function handleLogin(e) {
    e.preventDefault()
    setErro("")
    
    if (!email.trim() || !senha) { 
      setErro("Preencha todos os campos")
      return 
    }

    setEnviando(true)
    try {
      const response = await api.post("/login", { email, password: senha })
      
      const { token } = response.data
      const usuario = response.data.usuario ?? response.data.user
      const perfil = String(usuario?.perfil ?? usuario?.role ?? "").toLowerCase()
      
      const admin = ["superadmin", "super_admin", "administrador", "admin"].includes(perfil)
      const escola = ["gestor", "gestor_escolar", "monitor", "manager"].includes(perfil)
      
      if (!token || !usuario || (!admin && !escola)) {
        setErro("O servidor não retornou um perfil válido. Verifique a API de autenticação.")
        return
      }
      
      localStorage.setItem("token", token)
      localStorage.setItem("usuario", JSON.stringify(usuario))
      
      window.location.href = admin ? "/admin/dashboard" : "/dashboard"
    } catch (error) {
      console.error("Falha de autenticação", error)
      
      // INTERCEPTAÇÃO DO PRIMEIRO ACESSO (ERRO 403)
      if (error.response?.status === 403 && error.response?.data?.requirePasswordChange) {
        setUserIdTroca(error.response.data.userId)
        setPrecisaTrocarSenha(true)
        setErro("")
      } else {
        setErro(error.response?.data?.error || "Email ou senha inválidos.")
      }
    } finally { 
      setEnviando(false) 
    }
  }

  async function handleTrocarSenha(e) {
    e.preventDefault()
    setMensagemTroca({ texto: "", tipo: "" })

    if (!novaSenha || !confirmarSenha) {
      setMensagemTroca({ texto: "Preencha todos os campos.", tipo: "erro" })
      return
    }

    if (novaSenha !== confirmarSenha) {
      setMensagemTroca({ texto: "As senhas não coincidem.", tipo: "erro" })
      return
    }

    if (novaSenha.length < 6) {
      setMensagemTroca({ texto: "A senha deve ter pelo menos 6 caracteres.", tipo: "erro" })
      return
    }

    setEnviando(true)
    try {
      await api.post("/change-initial-password", {
        userId: userIdTroca,
        newPassword: novaSenha
      })

      setMensagemTroca({ texto: "Senha alterada com sucesso! Faça login para continuar.", tipo: "sucesso" })
      
      // Retorna ao login após 3 segundos
      setTimeout(() => {
        setPrecisaTrocarSenha(false)
        setSenha("") // Limpa a senha provisória do input
        setNovaSenha("")
        setConfirmarSenha("")
        setMensagemTroca({ texto: "", tipo: "" })
      }, 3000)

    } catch (error) {
      console.error("Erro ao trocar senha", error)
      setMensagemTroca({ 
        texto: error.response?.data?.error || "Erro ao alterar a senha. Tente novamente.", 
        tipo: "erro" 
      })
    } finally {
      setEnviando(false)
    }
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
          {!precisaTrocarSenha ? (
            // FORMULÁRIO DE LOGIN NORMAL
            <>
              <h1 className="brand-font">Conecte-<span>se</span></h1>
              <p className="login-subtitle">Acesse o painel de presença da sua turma.</p>
              <form onSubmit={handleLogin}>
                <label htmlFor="email">Email</label>
                <input id="email" className="login-input" type="email" placeholder="email@escola.com" value={email} onChange={e=>setEmail(e.target.value)} disabled={enviando} />
                
                <label htmlFor="senha">Senha</label>
                <input id="senha" className="login-input" type={mostrarSenha ? "text" : "password"} placeholder="Senha" value={senha} onChange={e=>setSenha(e.target.value)} disabled={enviando} />
                
                <p className="show-password" onClick={()=>setMostrarSenha(!mostrarSenha)}>
                  {mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                </p>
                
                {erro && <p className="error-message" role="alert">{erro}</p>}
                
                <button className="login-button" type="submit" disabled={enviando}>
                  {enviando ? "Processando..." : "Entrar"}
                </button>
              </form>
            </>
          ) : (
            // FORMULÁRIO DE TROCA DE SENHA (PRIMEIRO ACESSO)
            <>
              <h1 className="brand-font" style={{ fontSize: "1.8rem", color: "#e53935" }}>Atenção</h1>
              <p className="login-subtitle" style={{ color: "#333", fontWeight: "500" }}>
                Este é o seu primeiro acesso. Por segurança, você precisa cadastrar uma nova senha antes de continuar.
              </p>
              
              <form onSubmit={handleTrocarSenha} style={{ marginTop: "1rem" }}>
                <label htmlFor="nova-senha">Nova Senha</label>
                <input 
                  id="nova-senha" 
                  className="login-input" 
                  type="password" 
                  placeholder="Mínimo 6 caracteres" 
                  value={novaSenha} 
                  onChange={e=>setNovaSenha(e.target.value)} 
                  disabled={enviando} 
                />
                
                <label htmlFor="confirmar-senha" style={{ marginTop: "10px" }}>Confirmar Nova Senha</label>
                <input 
                  id="confirmar-senha" 
                  className="login-input" 
                  type="password" 
                  placeholder="Repita a nova senha" 
                  value={confirmarSenha} 
                  onChange={e=>setConfirmarSenha(e.target.value)} 
                  disabled={enviando} 
                />
                
                {mensagemTroca.texto && (
                  <p 
                    className="error-message" 
                    role="alert" 
                    style={{ 
                      color: mensagemTroca.tipo === "sucesso" ? "#11ba7a" : "#f23b4b",
                      backgroundColor: mensagemTroca.tipo === "sucesso" ? "#e6f8f1" : "#ffebee",
                      padding: "8px",
                      borderRadius: "6px"
                    }}
                  >
                    {mensagemTroca.texto}
                  </p>
                )}
                
                <button className="login-button" type="submit" disabled={enviando}>
                  {enviando ? "Processando..." : "Salvar e Continuar"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login