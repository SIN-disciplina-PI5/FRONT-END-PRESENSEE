import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { MascotAvatar } from "../components/Icons";
import api from "../services/api";
import "../styles/PerfilMonitor.css";

const CHAVE_USUARIO = "usuario";
const CHAVE_AVATAR = "avatarUsuario";

function lerUsuario() {
  try {
    const salvo = localStorage.getItem(CHAVE_USUARIO);
    const dados = salvo ? JSON.parse(salvo) : {};
    return {
      id: dados.id || dados._id || "",
      nome: dados.name || dados.nome || "Visitante",
      email: dados.email || "",
      telefone: dados.telefone || "",
      cargo: dados.role || dados.cargo || dados.perfil || "Monitor",
      instituicao: dados.escola?.nome || dados.instituicao || "Minha Escola",
    };
  } catch {
    return {
      id: "",
      nome: "Visitante",
      email: "",
      telefone: "",
      cargo: "Monitor",
      instituicao: "",
    };
  }
}

function lerAvatarAtual() {
  const direto = localStorage.getItem(CHAVE_AVATAR);
  if (direto) return direto;
  try {
    const u = JSON.parse(localStorage.getItem(CHAVE_USUARIO) || "{}");
    return u.avatar || "";
  } catch {
    return "";
  }
}

function PerfilMonitor() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(lerUsuario);
  const [avatar, setAvatar] = useState(lerAvatarAtual);
  const [fotoArquivo, setFotoArquivo] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [salvandoNaAPI, setSalvandoNaAPI] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("perfil");

  // Estados de Suporte / Chamados
  const [categoriaSuporte, setCategoriaSuporte] = useState("Dúvida sobre o sistema");
  const [prioridadeSuporte, setPrioridadeSuporte] = useState("Normal");
  const [assuntoSuporte, setAssuntoSuporte] = useState("");
  const [mensagemSuporte, setMensagemSuporte] = useState("");
  const [avisoSuporte, setAvisoSuporte] = useState("");
  const [enviandoChamado, setEnviandoChamado] = useState(false);
  const [meusChamados, setMeusChamados] = useState([]);

  const emailOriginal = useRef(lerUsuario().email);

  useEffect(() => {
    function sincronizarPerfil() {
      setUsuario(lerUsuario());
      setAvatar(lerAvatarAtual());
    }

    sincronizarPerfil();
    window.addEventListener("avatar-atualizado", sincronizarPerfil);
    window.addEventListener("storage", sincronizarPerfil);
    return () => {
      window.removeEventListener("avatar-atualizado", sincronizarPerfil);
      window.removeEventListener("storage", sincronizarPerfil);
    };
  }, []);

  // Carrega os chamados abertos pela escola quando abre a aba de Ajuda e Suporte
  useEffect(() => {
    if (abaAtiva !== "ajuda") return;

    async function carregarMeusChamados() {
      try {
        const { data } = await api.get("/chamados");
        setMeusChamados(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao carregar chamados da escola:", err);
      }
    }

    carregarMeusChamados();
  }, [abaAtiva]);

  function alterarCampo(evento) {
    const { name, value } = evento.target;
    setUsuario((atual) => ({ ...atual, [name]: value }));
    setMensagem("");
  }

  function escolherFoto(evento) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setMensagem("Escolha um arquivo de imagem válido.");
      return;
    }

    if (arquivo.size > 2 * 1024 * 1024) {
      setMensagem("A imagem deve ter no máximo 2 MB.");
      evento.target.value = "";
      return;
    }

    setFotoArquivo(arquivo);

    const leitor = new FileReader();
    leitor.onload = () => {
      const imagem = String(leitor.result || "");
      setAvatar(imagem);
      setMensagem("Foto selecionada. Salve as alterações para enviar.");
      if (!modoEdicao) setModoEdicao(true);
    };
    leitor.readAsDataURL(arquivo);
  }

  async function enviarSolicitacaoSuporte(evento) {
    evento.preventDefault();

    if (!assuntoSuporte.trim() || !mensagemSuporte.trim()) {
      setAvisoSuporte("Preencha o assunto e descreva como podemos ajudar.");
      return;
    }

    setEnviandoChamado(true);
    setAvisoSuporte("");

    try {
      const payload = {
        titulo: assuntoSuporte.trim(),
        descricao: mensagemSuporte.trim(),
        categoria: categoriaSuporte,
        prioridade: prioridadeSuporte,
        solicitante: usuario.nome || "Usuário da Escola",
        escola: usuario.instituicao || undefined,
      };

      const { data } = await api.post("/chamados", payload);
      setMeusChamados((anteriores) => [data, ...anteriores]);

      setAssuntoSuporte("");
      setMensagemSuporte("");
      setPrioridadeSuporte("Normal");
      setAvisoSuporte("Chamado enviado com sucesso! A equipe administrativa do PresenSee já recebeu sua solicitação.");
    } catch (error) {
      console.error("Erro ao enviar chamado:", error);
      const msgErro = error.response?.data?.error || "Não foi possível enviar o chamado agora. Tente novamente.";
      setAvisoSuporte(msgErro);
    } finally {
      setEnviandoChamado(false);
    }
  }

  async function salvarPerfil(evento) {
    evento.preventDefault();

    if (!usuario.nome.trim()) {
      setMensagem("Informe seu nome para continuar.");
      return;
    }

    setSalvandoNaAPI(true);

    try {
      let urlFinal = avatar || "";

      if (usuario.id) {
        await api.patch(`/users/${usuario.id}`, {
          name: usuario.nome.trim(),
          email: usuario.email.trim(),
          telefone: usuario.telefone.trim(),
        });

        if (fotoArquivo) {
          const formData = new FormData();
          formData.append("photo", fotoArquivo);

          const responseAvatar = await api.patch(`/users/${usuario.id}/avatar`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (responseAvatar.data?.user?.avatar) {
            urlFinal = responseAvatar.data.user.avatar;
            setAvatar(urlFinal);
          }
        }
      }

      if (urlFinal) {
        localStorage.setItem(CHAVE_AVATAR, urlFinal);
      }

      const usuarioAtual = (() => {
        try {
          return JSON.parse(localStorage.getItem(CHAVE_USUARIO) || "{}");
        } catch {
          return {};
        }
      })();

      const atualizado = {
        ...usuarioAtual,
        nome: usuario.nome.trim(),
        name: usuario.nome.trim(),
        email: usuario.email.trim(),
        telefone: usuario.telefone.trim(),
        cargo: usuario.cargo.trim() || "Monitor",
        role: usuario.cargo.trim() || "Monitor",
        instituicao: usuario.instituicao.trim(),
        avatar: urlFinal,
      };

      localStorage.setItem(CHAVE_USUARIO, JSON.stringify(atualizado));

      setUsuario({
        id: atualizado.id || atualizado._id,
        nome: atualizado.nome,
        email: atualizado.email,
        telefone: atualizado.telefone,
        cargo: atualizado.cargo,
        instituicao: atualizado.instituicao,
      });

      setFotoArquivo(null);
      setModoEdicao(false);

      window.dispatchEvent(new Event("avatar-atualizado"));
      window.dispatchEvent(new Event("storage"));

      if (usuario.email.trim() !== emailOriginal.current) {
        setMensagem("E-mail atualizado. Por segurança, você precisa fazer login novamente com seu novo e-mail.");
        setTimeout(() => {
          localStorage.clear();
          navigate("/login");
        }, 3000);
        return;
      }

      setMensagem("Perfil salvo com sucesso no banco de dados!");
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      setMensagem("Erro ao comunicar com o servidor. Tente novamente.");
    } finally {
      setSalvandoNaAPI(false);
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
          {!modoEdicao && abaAtiva === "perfil" && (
            <button className="pm-botao-primario" type="button" onClick={() => { setModoEdicao(true); setMensagem(""); }}>
              <span aria-hidden="true">✎</span> Editar perfil
            </button>
          )}
        </header>

        <nav className="pm-abas" aria-label="Seções do perfil">
          <button type="button" className={abaAtiva === "perfil" ? "pm-aba pm-aba-ativa" : "pm-aba"} onClick={() => setAbaAtiva("perfil")}>
            <span aria-hidden="true">♙</span> Meu perfil
          </button>
          <button type="button" className={abaAtiva === "ajuda" ? "pm-aba pm-aba-ativa" : "pm-aba"} onClick={() => { setAbaAtiva("ajuda"); setAvisoSuporte(""); }}>
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
                <p>{usuario.cargo === "MANAGER" ? "Gestor Escolar" : usuario.cargo || "Monitor"}</p>
                <span className="pm-status"><span /> Conta ativa nesta sessão</span>
              </div>
              <label className="pm-botao-secundario pm-upload-foto">
                Alterar foto
                <input type="file" accept="image/*" onChange={escolherFoto} disabled={salvandoNaAPI} />
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
                  <input name="nome" value={usuario.nome} onChange={alterarCampo} disabled={!modoEdicao || salvandoNaAPI} required />
                </label>
                <label className="pm-campo">
                  <span>E-mail</span>
                  <input name="email" type="email" value={usuario.email} onChange={alterarCampo} disabled={!modoEdicao || salvandoNaAPI} placeholder="seuemail@escola.com" />
                </label>
                <label className="pm-campo">
                  <span>Telefone</span>
                  <input name="telefone" type="tel" value={usuario.telefone} onChange={alterarCampo} disabled={!modoEdicao || salvandoNaAPI} placeholder="(00) 00000-0000" />
                </label>
                <label className="pm-campo">
                  <span>Cargo</span>
                  <input name="cargo" value={usuario.cargo === "MANAGER" ? "Gestor" : usuario.cargo} onChange={alterarCampo} disabled />
                </label>
                <label className="pm-campo pm-campo-largo">
                  <span>Instituição de ensino</span>
                  <input name="instituicao" value={usuario.instituicao} onChange={alterarCampo} disabled={!modoEdicao || salvandoNaAPI} placeholder="Nome da escola ou instituição" />
                </label>
              </div>

              {mensagem && <p className="pm-mensagem" role="status" style={{ color: salvandoNaAPI ? "#666" : undefined }}>{mensagem}</p>}

              {modoEdicao && (
                <div className="pm-acoes-form">
                  <button
                    className="pm-botao-secundario"
                    type="button"
                    disabled={salvandoNaAPI}
                    onClick={() => {
                      setUsuario(lerUsuario());
                      setAvatar(lerAvatarAtual());
                      setFotoArquivo(null);
                      setModoEdicao(false);
                      setMensagem("");
                    }}
                  >
                    Cancelar
                  </button>
                  <button className="pm-botao-primario" type="submit" disabled={salvandoNaAPI}>
                    {salvandoNaAPI ? "Salvando..." : "Salvar alterações"}
                  </button>
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
                <div><strong>Tipo de perfil</strong><span>{usuario.cargo === "MANAGER" ? "Gestor Escolar" : usuario.cargo || "Monitor"}</span></div>
                <div><strong>Armazenamento</strong><span>Integrado ao banco de dados Neon</span></div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="pm-card pm-ajuda-card">
              <div className="pm-card-titulo">
                <span className="pm-icone pm-icone-azul">?</span>
                <div>
                  <h2>Abrir chamado de suporte</h2>
                  <p>Envie uma solicitação diretamente para o painel da administração do PresenSee.</p>
                </div>
              </div>

              <form className="pm-form-suporte" onSubmit={enviarSolicitacaoSuporte}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label className="pm-campo">
                    <span>Tipo de solicitação</span>
                    <select value={categoriaSuporte} onChange={(evento) => setCategoriaSuporte(evento.target.value)} disabled={enviandoChamado}>
                      <option>Dúvida sobre o sistema</option>
                      <option>Problema técnico</option>
                      <option>Acesso ou conta</option>
                      <option>Erro ou informação incorreta</option>
                      <option>Sugestão de melhoria</option>
                      <option>Outro assunto</option>
                    </select>
                  </label>

                  <label className="pm-campo">
                    <span>Prioridade</span>
                    <select value={prioridadeSuporte} onChange={(evento) => setPrioridadeSuporte(evento.target.value)} disabled={enviandoChamado}>
                      <option value="Baixa">Baixa</option>
                      <option value="Normal">Normal</option>
                      <option value="Alta">Alta</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </label>
                </div>

                <label className="pm-campo">
                  <span>Assunto</span>
                  <input value={assuntoSuporte} onChange={(evento) => setAssuntoSuporte(evento.target.value)} placeholder="Ex.: Dificuldade ao importar alunos da turma" maxLength={120} required disabled={enviandoChamado} />
                </label>

                <label className="pm-campo">
                  <span>Descreva sua solicitação</span>
                  <textarea value={mensagemSuporte} onChange={(evento) => setMensagemSuporte(evento.target.value)} placeholder="Explique o que está acontecendo e inclua os detalhes que podem ajudar nossa equipe..." rows={5} maxLength={3000} required disabled={enviandoChamado} />
                  <small className="pm-contador">{mensagemSuporte.length}/3000</small>
                </label>

                {avisoSuporte && <p className="pm-mensagem" role="status">{avisoSuporte}</p>}

                <div className="pm-acoes-form">
                  <button className="pm-botao-secundario" type="button" disabled={enviandoChamado} onClick={() => { setAssuntoSuporte(""); setMensagemSuporte(""); setAvisoSuporte(""); }}>
                    Limpar formulário
                  </button>
                  <button className="pm-botao-primario" type="submit" disabled={enviandoChamado}>
                    <span aria-hidden="true">➤</span> {enviandoChamado ? "Enviando..." : "Abrir chamado"}
                  </button>
                </div>
              </form>
            </section>

            {meusChamados.length > 0 && (
              <section className="pm-card" style={{ marginTop: "1.5rem" }}>
                <div className="pm-card-titulo">
                  <span className="pm-icone">▤</span>
                  <div>
                    <h2>Chamados da minha escola</h2>
                    <p>Acompanhe o andamento das solicitações enviadas à administração.</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                  {meusChamados.map((ch) => (
                    <div key={ch.id} style={{ padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <strong>{ch.titulo}</strong>
                        <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "999px", background: "#ede9fe", color: "#5b21b6" }}>
                          {ch.status || "Aberto"}
                        </span>
                      </div>
                      <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#475569" }}>{ch.descricao}</p>
                      <small style={{ color: "#64748b" }}>
                        {ch.categoria} • Prioridade: {ch.prioridade} • {ch.criadoEm ? new Date(ch.criadoEm).toLocaleDateString("pt-BR") : "Recente"}
                      </small>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </DashboardLayout>
  );
}

export default PerfilMonitor;