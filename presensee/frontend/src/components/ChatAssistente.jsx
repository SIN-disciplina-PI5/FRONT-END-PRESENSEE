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

export default function ChatAssistente() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState([BOAS_VINDAS]);
  const [texto, setTexto] = useState("");
  const [digitando, setDigitando] = useState(false);
  const fimRef = useRef(null);
  const { adicionarGrafico } = useGraficos();
  const navigate = useNavigate();

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

    setMensagens((prev) =>
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
    if (!pergunta || digitando) return;

    const historicoAtual = mensagens.slice(-6);
    setMensagens((prev) => [
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

      setMensagens((prev) => [
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
      setMensagens((prev) => [
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
            />
            <button type="submit" disabled={!texto.trim() || digitando} aria-label="Enviar">
              ➤
            </button>
          </form>
          <small className="chat-aviso">
            O assistente pode cometer erros. Verifique as informações.
          </small>
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