import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/NotificacoesHome.css";

const ETIQUETAS = {
  alto: "Alto risco",
  medio: "Atenção",
  baixo: "Informativo",
  comunicado: "Comunicado Admin"
};

function IconeSino() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

export default function NotificacoesHome({ notificacoes: notificacoesProp }) {
  const navigate = useNavigate();
  const areaRef = useRef(null);
  
  const [alertasApi, setAlertasApi] = useState([]);
  const [comunicadosApi, setComunicadosApi] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [comunicadoSelecionado, setComunicadoSelecionado] = useState(null);
  
  const [lidos, setLidos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("alertas_lidos")) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("alertas_lidos", JSON.stringify(lidos));
  }, [lidos]);

  useEffect(() => {
    async function buscarNotificacoes() {
      const [resAlertas, resComunicados] = await Promise.allSettled([
        notificacoesProp && notificacoesProp.length > 0
          ? Promise.resolve({ data: notificacoesProp })
          : api.get("/alerts"),
        api.get("/comunicados")
      ]);

      if (resAlertas.status === "fulfilled" && resAlertas.value?.data) {
        const lista = Array.isArray(resAlertas.value.data) ? resAlertas.value.data : [];
        setAlertasApi(lista);
      }

      if (resComunicados.status === "fulfilled" && resComunicados.value?.data) {
        const listaCom = Array.isArray(resComunicados.value.data) ? resComunicados.value.data : [];
        setComunicadosApi(listaCom);
      }
    }

    buscarNotificacoes();
  }, [notificacoesProp]);

  const fonteAlertas = (notificacoesProp && notificacoesProp.length > 0) ? notificacoesProp : alertasApi;

  const itensAlertas = (Array.isArray(fonteAlertas) ? fonteAlertas : []).map((alerta) => ({
    ...alerta,
    origem: "ALERTA",
    id: `alerta-${alerta.id || alerta._id || Math.random().toString(36).substr(2, 9)}`,
    alunoId: alerta.studentId || String(alerta.matricula ?? alerta.alunoId ?? "").trim() || null,
    subtitulo: alerta.student?.name || alerta.estudante || alerta.alunoNome || alerta.aluno?.nome || "Estudante",
    titulo: alerta.title || alerta.titulo || "Novo Alerta",
    descricao: alerta.message || alerta.descricao || alerta.mensagem || "",
    nivel: alerta.level || alerta.nivel || alerta.risco || "baixo",
    dataOrdenacao: alerta.createdAt ? new Date(alerta.createdAt).getTime() : 0,
    quando: alerta.quando || (alerta.createdAt ? new Date(alerta.createdAt).toLocaleDateString("pt-BR") : "Recente"),
  }));

  const itensComunicados = (Array.isArray(comunicadosApi) ? comunicadosApi : []).map((com) => {
    const tipoLower = String(com.tipo || "").toLowerCase();
    let nivel = "comunicado";
    if (tipoLower.includes("urgente") || tipoLower.includes("crítico") || tipoLower.includes("manutenção")) {
      nivel = "medio";
    }

    const dataRef = com.publicadoEm || com.alteradoEm || com.createdAt;
    return {
      ...com,
      origem: "COMUNICADO",
      id: `comunicado-${com.id}`,
      alunoId: null,
      subtitulo: `Administração • ${com.tipo || "Informativo"}`,
      titulo: com.titulo || "Comunicado da Administração",
      descricao: com.mensagem || "",
      nivel,
      dataOrdenacao: dataRef ? new Date(dataRef).getTime() : Date.now(),
      quando: dataRef ? new Date(dataRef).toLocaleDateString("pt-BR") : "Recente",
    };
  });

  // Combina comunicados do Admin + alertas da escola ordenados pelos mais recentes
  const alertas = [...itensComunicados, ...itensAlertas].sort(
    (a, b) => b.dataOrdenacao - a.dataOrdenacao
  );
  
  const naoLidos = alertas.filter((alerta) => !lidos.includes(alerta.id)).length;

  useEffect(() => {
    if (!aberto) return undefined;
    const fecharFora = (evento) => {
      if (!areaRef.current?.contains(evento.target)) {
        setAberto(false);
        setComunicadoSelecionado(null);
      }
    };
    const fecharEscape = (evento) => {
      if (evento.key === "Escape") {
        setAberto(false);
        setComunicadoSelecionado(null);
      }
    };
    document.addEventListener("pointerdown", fecharFora);
    document.addEventListener("keydown", fecharEscape);
    return () => {
      document.removeEventListener("pointerdown", fecharFora);
      document.removeEventListener("keydown", fecharEscape);
    };
  }, [aberto]);

  function visualizar(item) {
    setLidos((anteriores) => [...new Set([...anteriores, item.id])]);

    if (item.origem === "COMUNICADO") {
      setComunicadoSelecionado(item);
      return;
    }

    setAberto(false);
    const idAluno = item.alunoId;
    if (idAluno) {
      navigate(`/alunos/${encodeURIComponent(String(idAluno))}`, { state: { alertaAtivo: item } });
    } else {
      navigate("/alunos");
    }
  }

  function marcarTodasComoLidas() {
    const todosIds = alertas.map((a) => a.id);
    setLidos((anteriores) => [...new Set([...anteriores, ...todosIds])]);
  }

  return (
    <div className="pnot-root" ref={areaRef}>
      <button 
        type="button" 
        className={`pnot-trigger ${naoLidos ? "pnot-trigger--active" : ""}`} 
        onClick={(e) => {
          e.preventDefault();
          setAberto((a) => !a);
          setComunicadoSelecionado(null);
        }} 
        aria-label="Ver notificações" 
        aria-expanded={aberto}
      >
        <IconeSino />
        {naoLidos > 0 && <span className="pnot-count" aria-label={`${naoLidos} não lidas`}>{naoLidos}</span>}
      </button>

      {aberto && (
        <section className="pnot-popover" role="dialog" aria-label="Notificações e comunicados">
          <div className="pnot-heading">
            <div>
              <h2>{comunicadoSelecionado ? "Comunicado Oficial" : "Notificações"}</h2>
              <p>
                {comunicadoSelecionado
                  ? comunicadoSelecionado.quando
                  : naoLidos
                    ? `${naoLidos} item${naoLidos === 1 ? "" : "s"} não lido${naoLidos === 1 ? "" : "s"}`
                    : "Tudo em dia"}
              </p>
            </div>
            <button
              type="button"
              className="pnot-close"
              onClick={() => {
                if (comunicadoSelecionado) {
                  setComunicadoSelecionado(null);
                } else {
                  setAberto(false);
                }
              }}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          {comunicadoSelecionado ? (
            <div className="pnot-list" style={{ padding: "16px" }}>
              <span className="pnot-level-name" style={{ display: "inline-block", marginBottom: "8px" }}>
                {comunicadoSelecionado.subtitulo}
              </span>
              <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>{comunicadoSelecionado.titulo}</h3>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-line" }}>
                {comunicadoSelecionado.descricao}
              </p>
              <button
                type="button"
                onClick={() => setComunicadoSelecionado(null)}
                style={{
                  marginTop: "16px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "transparent",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                ← Voltar para notificações
              </button>
            </div>
          ) : (
            <>
              <div className="pnot-list">
                {alertas.length ? alertas.map((alerta) => {
                  const lido = lidos.includes(alerta.id);
                  return (
                    <button type="button" key={alerta.id} className={`pnot-item ${lido ? "pnot-item--read" : ""}`} onClick={() => visualizar(alerta)}>
                      <span className={`pnot-level pnot-level--${alerta.nivel || "baixo"}`} aria-hidden="true" />
                      <span className="pnot-content">
                        <span className="pnot-item-top"><strong>{alerta.titulo}</strong><small>{alerta.quando || ""}</small></span>
                        <span className="pnot-student">{alerta.subtitulo}</span>
                        <span className="pnot-description">{alerta.descricao}</span>
                        <span className="pnot-level-name">{ETIQUETAS[alerta.nivel] || "Informativo"}</span>
                      </span>
                      {!lido && <span className="pnot-unread" aria-label="Não lida" />}
                    </button>
                  );
                }) : (
                  <div className="pnot-empty">
                    <strong>Nenhuma notificação</strong>
                    <p>Os comunicados da administração e alertas dos estudantes aparecerão aqui.</p>
                  </div>
                )}
              </div>
              {alertas.length > 0 && (
                <div className="pnot-footer">
                  <button type="button" onClick={marcarTodasComoLidas} disabled={naoLidos === 0}>Marcar todas como lidas</button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}