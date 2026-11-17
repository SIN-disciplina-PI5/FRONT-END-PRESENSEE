import { useEffect, useRef, useState } from "react";
import GraficoRenderer from "./GraficoRenderer";
import mascoteImg from "../assets/mascote-chat.png";
import "../styles/ChatAssistente.css";
import { useNavigate } from "react-router-dom";
import { useGraficos } from "../context/GraficosContext";
import api from "../services/api";

const BOAS_VINDAS = {
  id: "boas-vindas",
  autor: "ia",
  texto: "Olá! Sou o assistente do PresenSee. Pergunte sobre a escola ou peça um gráfico.",
};

function obterChaveHistorico() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    const identificador = usuario.id || usuario._id || usuario.email || "padrao";
    return `presensee_chat_historico_${encodeURIComponent(String(identificador).toLowerCase())}`;
  } catch (error) {
    console.error("Não foi possível identificar o usuário do histórico do chat:", error);
    return "presensee_chat_historico_padrao";
  }
}

function historicoValido(mensagens) {
  return (
    Array.isArray(mensagens) &&
    mensagens.every(
      (mensagem) =>
        mensagem &&
        typeof mensagem.id === "string" &&
        (mensagem.autor === "user" || mensagem.autor === "ia") &&
        typeof mensagem.texto === "string"
    )
  );
}

function carregarHistorico(chave) {
  try {
    const salvo = localStorage.getItem(chave);
    if (!salvo) return { mensagens: [BOAS_VINDAS], erro: "" };

    const mensagens = JSON.parse(salvo);
    if (!historicoValido(mensagens)) throw new Error("Formato de histórico inválido.");

    return {
      mensagens: mensagens.length ? mensagens : [BOAS_VINDAS],
      erro: "",
    };
  } catch (error) {
    console.error("Não foi possível carregar o histórico do chat:", error);
    return {
      mensagens: [BOAS_VINDAS],
      erro: "Não foi possível carregar o histórico salvo desta conversa.",
    };
  }
}

export default function ChatAssistente() {
  const [aberto, setAberto] = useState(false);
  const [chaveHistorico] = useState(obterChaveHistorico);
  const [historicoInicial] = useState(() => carregarHistorico(chaveHistorico));
  const [mensagens, setMensagens] = useState(historicoInicial.mensagens);
  const [erroHistorico, setErroHistorico] = useState(historicoInicial.erro);
  const [texto, setTexto] = useState("");
  const [digitando, setDigitando] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const fimRef = useRef(null);
  const mensagensRef = useRef(historicoInicial.mensagens);
  const filaPersistenciaRef = useRef(Promise.resolve());
  const { adicionarGrafico } = useGraficos();
  const navigate = useNavigate();

  useEffect(() => {
    let ativo = true;

    async function carregarHistoricoDoServidor() {
      try {
        const { data } = await api.get("/chat/historico");
        const mensagensServidor = data?.mensagens;
        if (!historicoValido(mensagensServidor)) {
          throw new Error("O servidor retornou um histórico inválido.");
        }

        if (!ativo) return;

        if (mensagensServidor.length > 0) {
          mensagensRef.current = mensagensServidor;
          setMensagens(mensagensServidor);
          try {
            localStorage.setItem(chaveHistorico, JSON.stringify(mensagensServidor));
          } catch (error) {
            console.error("Não foi possível atualizar a cópia local do histórico:", error);
          }
        } else if (mensagensRef.current.length > 1) {
          await api.put("/chat/historico", { mensagens: mensagensRef.current });
        }

        if (ativo) setErroHistorico("");
      } catch (error) {
        if (!ativo) return;
        console.error("Não foi possível sincronizar o histórico do chat:", error);
        setErroHistorico(
          "Não foi possível sincronizar a conversa entre dispositivos. A cópia local foi mantida."
        );
      } finally {
        if (ativo) setCarregandoHistorico(false);
      }
    }

    void carregarHistoricoDoServidor();
    return () => {
      ativo = false;
    };
  }, [chaveHistorico]);

  function sincronizarHistorico(mensagens) {
    filaPersistenciaRef.current = filaPersistenciaRef.current
      .then(() => api.put("/chat/historico", { mensagens }))
      .then(() => setErroHistorico(""))
      .catch((error) => {
        console.error("Não foi possível sincronizar o histórico do chat:", error);
        setErroHistorico(
          "Conversa não sincronizada entre dispositivos. A cópia local foi mantida."
        );
      });
  }

  function atualizarMensagens(atualizar) {
    const novasMensagens = atualizar(mensagensRef.current);
    mensagensRef.current = novasMensagens;
    setMensagens(novasMensagens);

    try {
      localStorage.setItem(chaveHistorico, JSON.stringify(novasMensagens));
    } catch (error) {
      console.error("Não foi possível salvar o histórico do chat:", error);
    }
    sincronizarHistorico(novasMensagens);
  }

  useEffect(() => {
    if (aberto) fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, digitando, aberto]);

  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (e) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  function adicionarNoDashboard(mensagem) {
    const { titulo, subtitulo, tipo, dados, eixoX, eixoY } = mensagem.grafico;
    adicionarGrafico({
      titulo,
      subtitulo,
      tipo,
      dados,
      eixoX,
      eixoY,
      promptOriginal: mensagem.promptOriginal || titulo,
    });

    atualizarMensagens((prev) =>
      prev.map((m) => (m.id === mensagem.id ? { ...m, adicionado: true } : m))
    );
  }

  function verPersonalizado() {
    setAberto(false);
    navigate("/personalizado");
  }

  async function enviar(e) {
    e.preventDefault();
    const pergunta = texto.trim();
    if (!pergunta || digitando || carregandoHistorico) return;

    const historicoAtual = mensagens.slice(-6);
    atualizarMensagens((prev) => [
      ...prev,
      { id: crypto.randomUUID(), autor: "user", texto: pergunta },
    ]);
    setTexto("");
    setDigitando(true);

    try {
      const res = await api.post("/chat", {
        mensagem: pergunta,
        historico: historicoAtual,
      });

      atualizarMensagens((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          autor: "ia",
          texto: res.data.texto || "Não consegui processar a resposta.",
          grafico: res.data.grafico || null,
          promptOriginal: pergunta,
        },
      ]);
    } catch (error) {
      console.error("Erro no chat:", error);
      atualizarMensagens((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          autor: "ia",
          texto:
            error.response?.data?.error ||
            "Não foi possível conectar ao assistente agora. Tente novamente em instantes.",
        },
      ]);
    } finally {
      setDigitando(false);
    }
  }

  return (
    <>
      {aberto && (
        <section className="chat-janela" role="dialog" aria-label="Assistente PresenSee">
          <header className="chat-topo">
            <strong>✦ Assistente PresenSee</strong>
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar chat">
              ×
            </button>
          </header>

          <div className="chat-mensagens" aria-live="polite">
            {mensagens.map((m) => (
              <div key={m.id} className={`chat-linha ${m.autor}`}>
                {m.autor === "ia" && <img src={mascoteImg} alt="" className="chat-avatar" />}
                <div className="chat-balao">
                  <p>{m.texto}</p>
                  {m.grafico && (
                    <div className="chat-grafico">
                      <strong>{m.grafico.titulo}</strong>
                      <span>{m.grafico.subtitulo}</span>
                      <GraficoRenderer grafico={m.grafico} altura={160} />
                      {m.adicionado ? (
                        <div className="chat-adicionado">
                          <span>✓ Adicionado</span>
                          <button type="button" onClick={verPersonalizado}>
                            Ver em Personalizado
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="chat-add"
                          onClick={() => adicionarNoDashboard(m)}
                        >
                          Adicionar no Dashboard
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {digitando && (
              <div className="chat-linha ia">
                <img src={mascoteImg} alt="" className="chat-avatar" />
                <div className="chat-balao chat-digitando" aria-label="Assistente digitando">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          <form className="chat-form" onSubmit={enviar}>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Pergunte algo sobre a escola..."
              aria-label="Mensagem para o assistente"
              disabled={carregandoHistorico}
            />
            <button
              type="submit"
              disabled={!texto.trim() || digitando || carregandoHistorico}
              aria-label="Enviar"
            >
              ➤
            </button>
          </form>
          {carregandoHistorico && (
            <small className="chat-sincronizando" role="status">
              Sincronizando histórico...
            </small>
          )}
          <small className="chat-aviso">
            O assistente pode cometer erros. Verifique as informações.
          </small>
          {erroHistorico && (
            <small className="chat-erro" role="alert">
              {erroHistorico}
            </small>
          )}
        </section>
      )}

      <button
        type="button"
        className="chat-fab"
        onClick={() => setAberto((v) => !v)}
        aria-label={aberto ? "Fechar assistente" : "Abrir assistente"}
        aria-expanded={aberto}
      >
        <img src={mascoteImg} alt="" />
      </button>
    </>
  );
}