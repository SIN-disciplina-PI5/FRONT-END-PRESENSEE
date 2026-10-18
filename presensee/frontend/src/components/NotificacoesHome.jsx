import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../services/auth";
import "../styles/NotificacoesHome.css";


const EXEMPLOS = [
  {
    id: "demo-alerta-1",
    titulo: "Faltas consecutivas",
    estudante: "Gabriel Soares",
    descricao: "O estudante acumulou 4 faltas consecutivas.",
    nivel: "alto",
    quando: "Hoje",
  },
  {
    id: "demo-alerta-2",
    titulo: "Frequência em atenção",
    estudante: "Pedro Henrique",
    descricao: "A frequência do estudante está abaixo do esperado.",
    nivel: "medio",
    quando: "Ontem",
  },
  {
    id: "demo-alerta-3",
    titulo: "Acompanhamento recomendado",
    estudante: "Marcos Heitor",
    descricao: "Revise os indicadores de presença deste estudante.",
    nivel: "medio",
    quando: "Esta semana",
  },
];

const ETIQUETAS = { alto: "Alto risco", medio: "Atenção", baixo: "Informativo" };

function IconeSino() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

export default function NotificacoesHome({ notificacoes }) {
  const navigate = useNavigate();
  const areaRef = useRef(null);
  const isDemo = getToken() === "token-demo";
  const alertas = Array.isArray(notificacoes) ? notificacoes : isDemo ? EXEMPLOS : [];
  const [aberto, setAberto] = useState(false);
  const [lidos, setLidos] = useState([]);
  const naoLidos = alertas.filter((alerta) => !lidos.includes(alerta.id)).length;

  useEffect(() => {
    if (!aberto) return undefined;

    const fecharAoClicarFora = (evento) => {
      if (!areaRef.current?.contains(evento.target)) setAberto(false);
    };
    const fecharComEscape = (evento) => {
      if (evento.key === "Escape") setAberto(false);
    };

    document.addEventListener("pointerdown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("pointerdown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [aberto]);

  function visualizar(alerta) {
    setLidos((anteriores) => [...new Set([...anteriores, alerta.id])]);
    setAberto(false);
    navigate("/alunos");
  }

  return (
    <div className="pnot-root" ref={areaRef}>
      <button
        type="button"
        className={`pnot-trigger ${aberto ? "pnot-trigger--active" : ""}`}
        onClick={() => setAberto((anterior) => !anterior)}
        aria-label={`Notificações, ${naoLidos} não lidas`}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        title="Notificações de estudantes"
      >
        <IconeSino />
        {naoLidos > 0 && <span className="pnot-count">{naoLidos > 9 ? "9+" : naoLidos}</span>}
      </button>

      {aberto && (
        <section className="pnot-popover" role="dialog" aria-label="Notificações de estudantes">
          <div className="pnot-heading">
            <div>
              <h2>Notificações</h2>
              <p>{naoLidos ? `${naoLidos} alerta${naoLidos === 1 ? "" : "s"} não lido${naoLidos === 1 ? "" : "s"}` : "Tudo em dia"}</p>
            </div>
            <button type="button" className="pnot-close" onClick={() => setAberto(false)} aria-label="Fechar notificações">×</button>
          </div>
          <div className="pnot-list">
            {alertas.length ? alertas.map((alerta) => {
              const lido = lidos.includes(alerta.id);
              return (
                <button type="button" key={alerta.id} className={`pnot-item ${lido ? "pnot-item--read" : ""}`} onClick={() => visualizar(alerta)}>
                  <span className={`pnot-level pnot-level--${alerta.nivel || "baixo"}`} aria-hidden="true" />
                  <span className="pnot-content">
                    <span className="pnot-item-top"><strong>{alerta.titulo}</strong><small>{alerta.quando || ""}</small></span>
                    <span className="pnot-student">{alerta.estudante}</span>
                    <span className="pnot-description">{alerta.descricao}</span>
                    <span className="pnot-level-name">{ETIQUETAS[alerta.nivel] || "Informativo"}</span>
                  </span>
                  {!lido && <span className="pnot-unread" aria-label="Não lida" />}
                </button>
              );
            }) : (
              <div className="pnot-empty"><strong>Nenhuma notificação por enquanto</strong><p>Os alertas dos estudantes aparecerão aqui quando a integração estiver disponível.</p></div>
            )}
          </div>
          {alertas.length > 0 && (
            <div className="pnot-footer">
              <button type="button" onClick={() => setLidos(alertas.map((a) => a.id))} disabled={naoLidos === 0}>Marcar todas como lidas</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
