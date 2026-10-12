import { useEffect, useState } from "react"
import DashboardLayout from "../layouts/DashboardLayout"
import { MascotAvatar } from "../components/Icons"
import "../styles/PerfilMonitor.css"

const CHAVE_USUARIO = "usuario"
const CHAVE_AVATAR = "avatarUsuario"
// Substitua pelo e-mail oficial da equipe de suporte do PresenSee.
const EMAIL_SUPORTE = "suporte@seudominio.com.br"

function lerUsuario() {
  try {
    const salvo = localStorage.getItem(CHAVE_USUARIO)
    const dados = salvo ? JSON.parse(salvo) : {}
    return {
      nome: dados.nome || "Visitante",
      email: dados.email || "",
      telefone: dados.telefone || "",
      cargo: dados.cargo || dados.perfil || "Monitor",
      instituicao: dados.instituicao || "",
    }
  } catch {
    return {
      nome: "Visitante",
      email: "",
      telefone: "",
      cargo: "Monitor",
      instituicao: "",
    }
  }
}

function PerfilMonitor() {
  const [usuario, setUsuario] = useState(lerUsuario)
  const [avatar, setAvatar] = useState(() => localStorage.getItem(CHAVE_AVATAR) || "")
  const [mensagem, setMensagem] = useState("")
  const [modoEdicao, setModoEdicao] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState("perfil")
  const [categoriaSuporte, setCategoriaSuporte] = useState("Dúvida sobre o sistema")
  const [assuntoSuporte, setAssuntoSuporte] = useState("")
  const [mensagemSuporte, setMensagemSuporte] = useState("")
  const [avisoSuporte, setAvisoSuporte] = useState("")

  useEffect(() => {
    setUsuario(lerUsuario())
    setAvatar(localStorage.getItem(CHAVE_AVATAR) || "")
  }, [])

  function alterarCampo(evento) {
    const { name, value } = evento.target
    setUsuario((atual) => ({ ...atual, [name]: value }))
    setMensagem("")
  }

  function escolherFoto(evento) {
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return

    if (!arquivo.type.startsWith("image/")) {
      setMensagem("Escolha um arquivo de imagem válido.")
      return
    }

    if (arquivo.size > 2 * 1024 * 1024) {
      setMensagem("A imagem deve ter no máximo 2 MB.")
      evento.target.value = ""
      return
    }

    const leitor = new FileReader()
    leitor.onload = () => {
      const imagem = String(leitor.result || "")
      try {
        localStorage.setItem(CHAVE_AVATAR, imagem)
        setAvatar(imagem)
        setMensagem("Foto do perfil atualizada.")
      } catch {
        setMensagem("Não foi possível salvar essa imagem. Tente uma foto menor.")
      }
    }
    leitor.readAsDataURL(arquivo)
  }

  function enviarSolicitacaoSuporte(evento) {
    evento.preventDefault()

    if (!assuntoSuporte.trim() || !mensagemSuporte.trim()) {
      setAvisoSuporte("Preencha o assunto e descreva como podemos ajudar.")
      return
    }

    const assunto = `[PresenSee] ${categoriaSuporte}: ${assuntoSuporte.trim()}`
    const corpo = [
      "Olá, equipe PresenSee!",
      "",
      "Preciso de suporte com a seguinte solicitação:",
      mensagemSuporte.trim(),
      "",
      `Nome: ${usuario.nome || "Não informado"}`,
      `E-mail para contato: ${usuario.email || "Não informado"}`,
      `Categoria: ${categoriaSuporte}`,
    ].join("\\n")

    window.location.href = `mailto:${EMAIL_SUPORTE}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`
    setAvisoSuporte("Seu aplicativo de e-mail deve abrir com a mensagem preenchida. Revise e envie o e-mail por lá.")
  }

  function salvarPerfil(evento) {
    evento.preventDefault()

    if (!usuario.nome.trim()) {
      setMensagem("Informe seu nome para continuar.")
      return
    }

    try {
      const usuarioAtual = (() => {
        try {
          return JSON.parse(localStorage.getItem(CHAVE_USUARIO) || "{}")
        } catch {
          return {}
        }
      })()

      const atualizado = {
        ...usuarioAtual,
        nome: usuario.nome.trim(),
        email: usuario.email.trim(),
        telefone: usuario.telefone.trim(),
        cargo: usuario.cargo.trim() || "Monitor",
        perfil: usuarioAtual.perfil || usuario.cargo.trim() || "Monitor",
        instituicao: usuario.instituicao.trim(),
      }

      localStorage.setItem(CHAVE_USUARIO, JSON.stringify(atualizado))
      setUsuario({
        nome: atualizado.nome,
        email: atualizado.email,
        telefone: atualizado.telefone,
        cargo: atualizado.cargo,
        instituicao: atualizado.instituicao,
      })
      setModoEdicao(false)
      setMensagem("Perfil salvo neste navegador.")
    } catch {
      setMensagem("Não foi possível salvar os dados do perfil.")
    }
  }

  return (
    <DashboardLayout>
      <main className="perfil-monitor-page">
        <header className="pm-cabecalho">
          <div>
            <span className="pm-etiqueta">MINHA CONTA</span>
            <h1>Perfil do monitor</h1>
            <p>Consulte e atualize suas informações pessoais e profissionais.</p>
          </div>
          {!modoEdicao && (
            <button className="pm-botao-primario" type="button" onClick={() => { setModoEdicao(true); setMensagem("") }}>
              <span aria-hidden="true">✎</span> Editar perfil
            </button>
          )}
        </header>

        <nav className="pm-abas" aria-label="Seções do perfil">
          <button type="button" className={abaAtiva === "perfil" ? "pm-aba pm-aba-ativa" : "pm-aba"} onClick={() => setAbaAtiva("perfil")}>
            <span aria-hidden="true">♙</span> Meu perfil
          </button>
          <button type="button" className={abaAtiva === "ajuda" ? "pm-aba pm-aba-ativa" : "pm-aba"} onClick={() => { setAbaAtiva("ajuda"); setAvisoSuporte("") }}>
            <span aria-hidden="true">?</span> Ajuda e suporte
          </button>
        </nav>

        {abaAtiva === "perfil" ? (
          <>
        <section className="pm-resumo">
          <div className="pm-avatar-grande">
            {avatar ? <img src={avatar} alt={`Foto de ${usuario.nome}`} /> : <MascotAvatar size={84} />}
          </div>
          <div className="pm-resumo-dados">
            <h2>{usuario.nome || "Visitante"}</h2>
            <p>{usuario.cargo || "Monitor"}</p>
            <span className="pm-status"><span /> Conta ativa nesta sessão</span>
          </div>
          <label className="pm-botao-secundario pm-upload-foto">
            Alterar foto
            <input type="file" accept="image/*" onChange={escolherFoto} />
          </label>
        </section>

        <form className="pm-card" onSubmit={salvarPerfil}>
          <div className="pm-card-titulo">
            <span className="pm-icone">♙</span>
            <div>
              <h2>Informações pessoais</h2>
              <p>Os dados abaixo identificam seu perfil no sistema.</p>
            </div>
          </div>

          <div className="pm-form-grid">
            <label className="pm-campo">
              <span>Nome completo</span>
              <input name="nome" value={usuario.nome} onChange={alterarCampo} disabled={!modoEdicao} required />
            </label>
            <label className="pm-campo">
              <span>E-mail</span>
              <input name="email" type="email" value={usuario.email} onChange={alterarCampo} disabled={!modoEdicao} placeholder="seuemail@escola.com" />
            </label>
            <label className="pm-campo">
              <span>Telefone</span>
              <input name="telefone" type="tel" value={usuario.telefone} onChange={alterarCampo} disabled={!modoEdicao} placeholder="(00) 00000-0000" />
            </label>
            <label className="pm-campo">
              <span>Cargo</span>
              <input name="cargo" value={usuario.cargo} onChange={alterarCampo} disabled={!modoEdicao} />
            </label>
            <label className="pm-campo pm-campo-largo">
              <span>Instituição de ensino</span>
              <input name="instituicao" value={usuario.instituicao} onChange={alterarCampo} disabled={!modoEdicao} placeholder="Nome da escola ou instituição" />
            </label>
          </div>

          {mensagem && <p className="pm-mensagem" role="status">{mensagem}</p>}

          {modoEdicao && (
            <div className="pm-acoes-form">
              <button className="pm-botao-secundario" type="button" onClick={() => { setUsuario(lerUsuario()); setModoEdicao(false); setMensagem("") }}>
                Cancelar
              </button>
              <button className="pm-botao-primario" type="submit">Salvar alterações</button>
            </div>
          )}
        </form>

        <section className="pm-card pm-seguranca">
          <div className="pm-card-titulo">
            <span className="pm-icone pm-icone-azul">⌑</span>
            <div>
              <h2>Segurança e acesso</h2>
              <p>As configurações de senha dependem do serviço de autenticação conectado ao PresenSee.</p>
            </div>
          </div>
          <div className="pm-info-seguranca">
            <div><strong>Tipo de perfil</strong><span>{usuario.cargo || "Monitor"}</span></div>
            <div><strong>Armazenamento</strong><span>Alterações locais neste navegador</span></div>
          </div>
        </section>          </>
        ) : (
          <section className="pm-card pm-ajuda-card">
            <div className="pm-card-titulo">
              <span className="pm-icone pm-icone-azul">?</span>
              <div>
                <h2>Ajuda e suporte</h2>
                <p>Envie uma solicitação à equipe do PresenSee para tirar dúvidas ou relatar um problema.</p>
              </div>
            </div>

            <div className="pm-ajuda-intro">
              <span className="pm-ajuda-ilustracao" aria-hidden="true">✉</span>
              <div>
                <strong>Como podemos ajudar?</strong>
                <p>Seu aplicativo de e-mail será aberto com a mensagem pronta para você revisar e enviar.</p>
              </div>
            </div>

            <form className="pm-form-suporte" onSubmit={enviarSolicitacaoSuporte}>
              <label className="pm-campo">
                <span>Tipo de solicitação</span>
                <select value={categoriaSuporte} onChange={(evento) => setCategoriaSuporte(evento.target.value)}>
                  <option>Dúvida sobre o sistema</option>
                  <option>Problema técnico</option>
                  <option>Acesso ou conta</option>
                  <option>Erro ou informação incorreta</option>
                  <option>Sugestão de melhoria</option>
                  <option>Outro assunto</option>
                </select>
              </label>

              <label className="pm-campo">
                <span>Assunto</span>
                <input value={assuntoSuporte} onChange={(evento) => setAssuntoSuporte(evento.target.value)} placeholder="Ex.: Não consigo registrar uma intervenção" maxLength={120} required />
              </label>

              <label className="pm-campo">
                <span>Descreva sua solicitação</span>
                <textarea value={mensagemSuporte} onChange={(evento) => setMensagemSuporte(evento.target.value)} placeholder="Explique o que está acontecendo e inclua os detalhes que podem ajudar nossa equipe..." rows={6} maxLength={3000} required />
                <small className="pm-contador">{mensagemSuporte.length}/3000</small>
              </label>

              <div className="pm-suporte-destino">
                <span aria-hidden="true">ⓘ</span>
                <p>O e-mail será preparado no aplicativo configurado no seu dispositivo. Você poderá revisar a mensagem antes de enviá-la.</p>
              </div>

              {avisoSuporte && <p className="pm-mensagem" role="status">{avisoSuporte}</p>}

              <div className="pm-acoes-form">
                <button className="pm-botao-secundario" type="button" onClick={() => { setAssuntoSuporte(""); setMensagemSuporte(""); setAvisoSuporte("") }}>
                  Limpar formulário
                </button>
                <button className="pm-botao-primario" type="submit"><span aria-hidden="true">➤</span> Preparar e-mail</button>
              </div>
            </form>
          </section>
        )}

      </main>
    </DashboardLayout>
  )
}

export default PerfilMonitor
