import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import GaugeChart from "../components/GaugeChart";
import api from "../services/api";
import "../styles/AlunoPerfil.css";

const PRIORIDADES = ["Alta", "Média", "Baixa"];

function corFrequencia(valor) {
  if (valor < 75) return "#ef4444";
  if (valor < 90) return "#eab308";
  return "#22c55e";
}

function corRisco(valor) {
  if (valor >= 70) return "#ef4444";
  if (valor >= 40) return "#eab308";
  return "#22c55e";
}

function iniciais(nome) {
  if (!nome) return "AL";
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function formatarDataDisplay(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("pt-BR");
}

function limparTagsPendencia(texto) {
  if (!texto) return "";
  return texto.replace(/\[Prioridade:\s*(Alta|Média|Baixa)\]\s*/gi, "").trim();
}

function extrairPrioridadePendencia(texto) {
  if (!texto) return "Média";
  const match = texto.match(/\[Prioridade:\s*(Alta|Média|Baixa)\]/i);
  return match ? match[1] : "Média";
}

function AlunoPerfil() {
  const { id } = useParams();
  const [aluno, setAluno] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [pendencias, setPendencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historicoExpandido, setHistoricoExpandido] = useState(false);

  // Estados do Modal Customizado de Pendência (Criar / Editar)
  const [modalPendenciaAberto, setModalPendenciaAberto] = useState(false);
  const [pendenciaEditando, setPendenciaEditando] = useState(null);
  const [textoPendencia, setTextoPendencia] = useState("");
  const [prioridadePendencia, setPrioridadePendencia] = useState("Média");
  const [erroPendencia, setErroPendencia] = useState("");
  const [salvandoPendencia, setSalvandoPendencia] = useState(false);

  // Estado do Modal de Confirmação de Exclusão
  const [pendenciaParaExcluir, setPendenciaParaExcluir] = useState(null);
  const [excluindoPendencia, setExcluindoPendencia] = useState(false);

  useEffect(() => {
    async function carregarPerfil() {
      try {
        setLoading(true);
        let dadosAluno = null;

        try {
          const resAluno = await api.get(`/students/${encodeURIComponent(id)}`);
          dadosAluno = resAluno.data?.student || resAluno.data;
        } catch (errDireto) {
          console.warn("Busca direta /students/:id falhou, tentando localizar na listagem geral...", errDireto);
        }

        if (!dadosAluno || !dadosAluno.id) {
          const resLista = await api.get("/students");
          const lista = Array.isArray(resLista.data) ? resLista.data : [];
          dadosAluno = lista.find(
            (s) => String(s.id) === String(id) || String(s.registration || s.matricula) === String(id)
          );
        }

        if (!dadosAluno) {
          setAluno(null);
          return;
        }

        const studentRealId = dadosAluno.id || id;

        let attendances = Array.isArray(dadosAluno.attendances) ? dadosAluno.attendances : [];
        if (attendances.length === 0) {
          try {
            const resFreq = await api.get(`/students/${studentRealId}/attendance-history`);
            attendances = Array.isArray(resFreq.data) ? resFreq.data : [];
          } catch {
            // Segue com attendances vazio se a rota não retornar registros
          }
        }

        const totalChamadas = attendances.length;
        const totalPresentes = attendances.filter((a) => a.status === "PRESENT").length;
        const totalFaltas =
          totalChamadas > 0
            ? attendances.filter((a) => a.status === "ABSENT").length
            : (dadosAluno.absences ?? dadosAluno.faltas ?? 0);

        const frequenciaCalculada =
          dadosAluno.attendanceRate ??
          dadosAluno.frequencia ??
          (totalChamadas > 0 ? Math.round((totalPresentes / totalChamadas) * 100) : 100);

        const riscoCalculado =
          dadosAluno.riskLevel ??
          (frequenciaCalculada < 75 ? 85 : frequenciaCalculada < 90 ? 50 : 10);

        let listaResponsaveis = [];
        if (Array.isArray(dadosAluno.guardians) && dadosAluno.guardians.length > 0) {
          listaResponsaveis = dadosAluno.guardians;
        } else if (Array.isArray(dadosAluno.responsaveis) && dadosAluno.responsaveis.length > 0) {
          listaResponsaveis = dadosAluno.responsaveis;
        } else if (
          dadosAluno.guardianName ||
          dadosAluno.responsavelNome ||
          dadosAluno.guardianPhone ||
          dadosAluno.responsavelTelefone
        ) {
          listaResponsaveis = [
            {
              nome: dadosAluno.guardianName || dadosAluno.responsavelNome || "Não informado",
              telefone: dadosAluno.guardianPhone || dadosAluno.responsavelTelefone || "Telefone não informado",
            },
          ];
        }

        setAluno({
          id: studentRealId,
          nome: dadosAluno.name || dadosAluno.nome || "Aluno sem nome",
          matricula: dadosAluno.registration || dadosAluno.matricula || "N/A",
          turma: dadosAluno.class?.name || dadosAluno.turma?.name || dadosAluno.turma || "Turma não vinculada",
          email: dadosAluno.email || "Não informado",
          foto: dadosAluno.biometryUrl || dadosAluno.photoUrl || dadosAluno.avatar || "",
          frequencia: frequenciaCalculada,
          risco: riscoCalculado,
          status: dadosAluno.status || (frequenciaCalculada < 75 ? "Em acompanhamento" : "Regular"),
          faltas: totalFaltas,
          responsaveis: listaResponsaveis,
        });

        try {
          const resIncidentes = await api.get(`/incidents?studentId=${studentRealId}`);
          const todosIncidentes = Array.isArray(resIncidentes.data) ? resIncidentes.data : [];
          const incidentes = todosIncidentes.filter(
            (i) => !i.studentId || String(i.studentId) === String(studentRealId)
          );

          const historicoFiltrado = incidentes.filter(
            (i) => !i.isPending && i.type !== "PENDENCIA" && i.type !== "RESOLVIDO"
          );
          setHistorico(
            historicoFiltrado
              .map((e) => ({
                id: e.id || e._id,
                data: e.createdAt || e.date || e.data,
                tipo: e.type || e.tipo || "Intervenção",
                descricao: e.description || e.descricao,
              }))
              .sort((a, b) => String(b.data).localeCompare(String(a.data)))
          );

          const pends = incidentes.filter(
            (i) => i.isPending || i.type === "PENDENCIA" || i.type === "RESOLVIDO"
          );
          setPendencias(
            pends.map((p) => {
              const bruto = p.description || p.texto || "";
              return {
                id: p.id || p._id,
                texto: limparTagsPendencia(bruto),
                prioridade: extrairPrioridadePendencia(bruto),
                feita: p.resolved || p.feita || p.type === "RESOLVIDO" || false,
              };
            })
          );
        } catch (e) {
          console.warn("Rota de incidentes pendente para o aluno:", e);
        }
      } catch (error) {
        console.error("Erro ao buscar perfil do aluno:", error);
      } finally {
        setLoading(false);
      }
    }

    if (id) carregarPerfil();
  }, [id]);

  // Fecha modais com ESC
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (modalPendenciaAberto && !salvandoPendencia) fecharModalPendencia();
        if (pendenciaParaExcluir && !excluindoPendencia) setPendenciaParaExcluir(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalPendenciaAberto, salvandoPendencia, pendenciaParaExcluir, excluindoPendencia]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="perfil-page" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
          <p>Carregando perfil do estudante...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!aluno) {
    return (
      <DashboardLayout>
        <div className="perfil-page">
          <h1>Aluno não encontrado</h1>
          <Link to="/alunos" className="diario-link-aluno">
            ← Voltar para a lista de alunos
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const ultimasIntervencoes = historicoExpandido ? historico : historico.slice(0, 3);
  const responsavelPrincipal = aluno.responsaveis?.[0];

  function abrirModalNovaPendencia() {
    setPendenciaEditando(null);
    setTextoPendencia("");
    setPrioridadePendencia("Média");
    setErroPendencia("");
    setModalPendenciaAberto(true);
  }

  function abrirModalEditarPendencia(item) {
    setPendenciaEditando(item);
    setTextoPendencia(item.texto);
    setPrioridadePendencia(item.prioridade || "Média");
    setErroPendencia("");
    setModalPendenciaAberto(true);
  }

  function fecharModalPendencia() {
    setModalPendenciaAberto(false);
    setPendenciaEditando(null);
    setTextoPendencia("");
    setErroPendencia("");
  }

  async function salvarPendenciaModal(e) {
    e.preventDefault();
    const textoLimpo = textoPendencia.trim();
    if (!textoLimpo) {
      setErroPendencia("Descreva a pendência antes de salvar.");
      return;
    }

    setSalvandoPendencia(true);
    setErroPendencia("");

    const descricaoFormatada = `[Prioridade: ${prioridadePendencia}] ${textoLimpo}`;

    try {
      if (pendenciaEditando) {
        await api.patch(`/incidents/${pendenciaEditando.id}`, {
          description: descricaoFormatada,
          priority: prioridadePendencia,
        });

        setPendencias((lista) =>
          lista.map((p) =>
            p.id === pendenciaEditando.id
              ? { ...p, texto: textoLimpo, prioridade: prioridadePendencia }
              : p
          )
        );
      } else {
        const payload = {
          description: descricaoFormatada,
          studentId: aluno.id,
          isPending: true,
          type: "PENDENCIA",
          priority: prioridadePendencia,
          resolved: false,
        };

        const response = await api.post("/incidents", payload);
        const nova = response.data;

        setPendencias((lista) => [
          ...lista,
          {
            id: nova.id || nova._id || Date.now(),
            texto: textoLimpo,
            prioridade: prioridadePendencia,
            feita: false,
          },
        ]);
      }

      fecharModalPendencia();
    } catch (error) {
      console.error("Erro ao salvar pendência:", error);
      setErroPendencia("Não foi possível salvar a pendência no servidor. Tente novamente.");
    } finally {
      setSalvandoPendencia(false);
    }
  }

  async function confirmarExclusaoPendencia() {
    if (!pendenciaParaExcluir) return;
    setExcluindoPendencia(true);

    try {
      await api.delete(`/incidents/${pendenciaParaExcluir.id}`);
      setPendencias((lista) => lista.filter((item) => item.id !== pendenciaParaExcluir.id));
      setPendenciaParaExcluir(null);
    } catch (error) {
      console.error("Erro ao excluir pendência:", error);
    } finally {
      setExcluindoPendencia(false);
    }
  }

  async function alternarPendencia(idPendencia) {
    const pendencia = pendencias.find((p) => p.id === idPendencia);
    if (!pendencia) return;
    const novoStatus = !pendencia.feita;

    setPendencias((lista) =>
      lista.map((item) => (item.id === idPendencia ? { ...item, feita: novoStatus } : item))
    );

    try {
      await api.patch(`/incidents/${idPendencia}`, { resolved: novoStatus });
    } catch (error) {
      console.error("Erro ao alternar pendência:", error);
    }
  }

  return (
    <DashboardLayout>
      <main className="perfil-page perfil-moderno">
        <div className="perfil-breadcrumb">
          <Link to="/alunos">Alunos</Link>
          <span>/</span>
          <span>Perfil do aluno</span>
        </div>

        <section className="perfil-cabecalho">
          <div className="perfil-identificacao">
            <div className="perfil-avatar-iniciais">
              {aluno.foto ? (
                <img
                  src={aluno.foto}
                  alt={aluno.nome}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                />
              ) : (
                iniciais(aluno.nome)
              )}
            </div>
            <div className="perfil-identificacao-texto">
              <h1>{aluno.nome}</h1>
              <p>
                {aluno.turma} <span>·</span> Matrícula: {aluno.matricula}
              </p>
              <span
                className={`perfil-status-badge ${
                  aluno.frequencia < 75 ? "alto" : aluno.frequencia < 90 ? "medio" : "baixo"
                }`}
              >
                <span className="perfil-status-ponto" />
                {aluno.status}
              </span>
            </div>
          </div>

          <div className="perfil-contatos">
            <div className="perfil-contato-item">
              <span className="perfil-contato-icone">✉</span>
              <span>{aluno.email}</span>
            </div>
            <div className="perfil-contato-item">
              <span className="perfil-contato-icone">♙</span>
              <span>Responsável: {responsavelPrincipal?.nome || responsavelPrincipal?.name || "Não informado"}</span>
            </div>
            <div className="perfil-contato-item">
              <span className="perfil-contato-icone">☎</span>
              <span>{responsavelPrincipal?.telefone || responsavelPrincipal?.phone || "Telefone não informado"}</span>
            </div>
          </div>

          <div className="perfil-risco">
            <span className="perfil-risco-label">Risco atual</span>
            <strong>{aluno.risco}%</strong>
            <div className="perfil-risco-barra">
              <span
                style={{
                  width: `${Math.min(100, Math.max(0, Number(aluno.risco) || 0))}%`,
                  backgroundColor: corRisco(aluno.risco),
                }}
              />
            </div>
            <p>
              {aluno.frequencia < 75
                ? "Frequência abaixo do esperado. É importante manter o acompanhamento."
                : "Continue acompanhando a frequência e o desempenho do aluno."}
            </p>
          </div>
        </section>

        <section className="perfil-indicadores">
          <article className="perfil-indicador perfil-indicador-frequencia">
            <div className="perfil-indicador-titulo">
              <span className="perfil-indicador-icone">↗</span>
              <h2>Frequência</h2>
            </div>
            <div className="perfil-frequencia-conteudo">
              <div className="perfil-gauge-moderno">
                <GaugeChart value={aluno.frequencia} color={corFrequencia(aluno.frequencia)} />
              </div>
              <div className="perfil-frequencia-legenda">
                <span className={`perfil-pilula-frequencia ${aluno.frequencia < 75 ? "atencao" : "normal"}`}>
                  {aluno.frequencia < 75 ? "Abaixo do esperado" : "Frequência registrada"}
                </span>
                <p>Frequência atual do aluno</p>
              </div>
            </div>
          </article>

          <article className="perfil-indicador perfil-indicador-faltas">
            <div className="perfil-indicador-titulo">
              <span className="perfil-indicador-icone">▦</span>
              <h2>Faltas</h2>
            </div>
            <strong className="perfil-indicador-numero">{aluno.faltas}</strong>
            <span className="perfil-indicador-descricao">Faltas registradas</span>
            <span className="perfil-indicador-detalhe">Histórico de frequência</span>
          </article>

          <article className="perfil-indicador perfil-indicador-intervencoes">
            <div className="perfil-indicador-titulo">
              <span className="perfil-indicador-icone">▤</span>
              <h2>Intervenções</h2>
            </div>
            <strong className="perfil-indicador-numero">{historico.length}</strong>
            <span className="perfil-indicador-descricao">
              {historico.length === 1 ? "Intervenção registrada" : "Intervenções registradas"}
            </span>
            {historico.length > 0 && (
              <span className="perfil-indicador-detalhe">
                Última em {formatarDataDisplay(historico[0].data)}
              </span>
            )}
          </article>
        </section>

        <section className="perfil-inferior">
          <article className="perfil-bloco perfil-bloco-historico">
            <header className="perfil-bloco-cabecalho">
              <div className="perfil-bloco-titulo">
                <span className="perfil-bloco-icone roxo">◷</span>
                <h2>Últimas intervenções</h2>
              </div>
              {historico.length > 3 && (
                <button
                  type="button"
                  className="perfil-link-historico"
                  onClick={() => setHistoricoExpandido(!historicoExpandido)}
                >
                  {historicoExpandido ? "Mostrar menos" : "Ver histórico completo"}
                  <span>{historicoExpandido ? "↑" : "→"}</span>
                </button>
              )}
            </header>

            {historico.length > 0 ? (
              <div className="perfil-timeline">
                {ultimasIntervencoes.map((item) => {
                  const texto = item.descricao || "";
                  const matchAtestado = texto.match(/\|\s*\[Atestado:\s*(https?:\/\/[^\]]+)\]/i);
                  const textoLimpo = texto.replace(/\|\s*\[Atestado:\s*https?:\/\/[^\]]+\]/i, "").trim();

                  return (
                    <div className="perfil-timeline-item" key={item.id}>
                      <div className="perfil-timeline-marcador">
                        <span />
                      </div>
                      <div className="perfil-timeline-data">{formatarDataDisplay(item.data)}</div>
                      <div className="perfil-timeline-conteudo">
                        <span
                          className={`perfil-tipo-badge ${
                            item.tipo === "Conversa Individual"
                              ? "conversa"
                              : item.tipo === "Contato com responsável"
                                ? "responsavel"
                                : "encaminhamento"
                          }`}
                        >
                          {item.tipo}
                        </span>
                        <p>{textoLimpo || "Sem descrição registrada."}</p>
                        {matchAtestado && (
                          <a
                            href={matchAtestado[1]}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              marginTop: "6px",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#633df2",
                              textDecoration: "none",
                            }}
                          >
                            📄 Abrir documento do atestado ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="perfil-sem-registros">
                <span>◷</span>
                <p>Nenhuma intervenção registrada para este aluno.</p>
              </div>
            )}
          </article>

          <article className="perfil-bloco perfil-bloco-pendencias">
            <header className="perfil-bloco-cabecalho">
              <div className="perfil-bloco-titulo">
                <span className="perfil-bloco-icone verde">☷</span>
                <h2>Pendências</h2>
              </div>
              <div className="perfil-pendencias-acoes">
                <span className="perfil-pendencias-contador">
                  {pendencias.filter((item) => !item.feita).length} abertas
                </span>
                <button
                  type="button"
                  className="perfil-btn-adicionar-pendencia"
                  onClick={abrirModalNovaPendencia}
                  title="Adicionar pendência"
                  aria-label="Adicionar pendência"
                >
                  +
                </button>
              </div>
            </header>

            {pendencias.length > 0 ? (
              <div className="perfil-pendencias-modernas">
                {pendencias.map((item) => (
                  <div key={item.id} className={`perfil-pendencia-item ${item.feita ? "concluida" : ""}`}>
                    <label className="perfil-pendencia-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(item.feita)}
                        onChange={() => alternarPendencia(item.id)}
                      />
                      <span className="perfil-pendencia-texto">{item.texto}</span>
                    </label>
                    <div className="perfil-pendencia-botoes">
                      <button
                        type="button"
                        className="perfil-btn-editar-pendencia"
                        onClick={() => abrirModalEditarPendencia(item)}
                        title="Editar pendência"
                        aria-label={`Editar pendência: ${item.texto}`}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="perfil-btn-excluir-pendencia"
                        onClick={() => setPendenciaParaExcluir(item)}
                        title="Excluir pendência"
                        aria-label={`Excluir pendência: ${item.texto}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="perfil-sem-registros">
                <span>✓</span>
                <p>Nenhuma pendência para este aluno.</p>
              </div>
            )}
          </article>
        </section>

        {/* MODAL CUSTOMIZADO: ADICIONAR / EDITAR PENDÊNCIA */}
        {modalPendenciaAberto && (
          <div
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !salvandoPendencia) fecharModalPendencia();
            }}
            role="presentation"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(3px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              zIndex: 1100,
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-modal-pendencia"
              style={{
                width: "100%",
                maxWidth: "460px",
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 20px 45px rgba(15, 23, 42, 0.22)",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <h2 id="titulo-modal-pendencia" style={{ margin: 0, fontSize: "19px", color: "#0f172a" }}>
                    {pendenciaEditando ? "Editar pendência" : "Nova pendência"}
                  </h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                    Estudante: <strong>{aluno.nome}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fecharModalPendencia}
                  disabled={salvandoPendencia}
                  aria-label="Fechar modal"
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    fontSize: "18px",
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={salvarPendenciaModal} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: 600, color: "#334155" }}>
                  <span>Descrição da pendência *</span>
                  <textarea
                    rows={3}
                    maxLength={300}
                    autoFocus
                    required
                    disabled={salvandoPendencia}
                    value={textoPendencia}
                    onChange={(e) => {
                      setTextoPendencia(e.target.value);
                      setErroPendencia("");
                    }}
                    placeholder="Ex.: Solicitar assinatura do responsável no termo de compromisso..."
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                  <small style={{ fontWeight: 400, color: "#64748b", textAlign: "right" }}>
                    {textoPendencia.length}/300
                  </small>
                </label>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>Prioridade</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                    {PRIORIDADES.map((nivel) => {
                      const ativa = prioridadePendencia === nivel;
                      const cores = {
                        Alta: { bg: "#fee2e2", border: "#ef4444", text: "#b91c1c" },
                        Média: { bg: "#fef3c7", border: "#f59e0b", text: "#b45309" },
                        Baixa: { bg: "#dcfce7", border: "#22c55e", text: "#15803d" },
                      }[nivel];
                      return (
                        <button
                          key={nivel}
                          type="button"
                          disabled={salvandoPendencia}
                          onClick={() => setPrioridadePendencia(nivel)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "8px",
                            border: `1.5px solid ${ativa ? cores.border : "#e2e8f0"}`,
                            backgroundColor: ativa ? cores.bg : "#f8fafc",
                            color: ativa ? cores.text : "#475569",
                            fontWeight: 600,
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          {nivel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {erroPendencia && (
                  <p role="alert" style={{ margin: 0, padding: "8px 12px", borderRadius: "8px", background: "#fee2e2", color: "#b91c1c", fontSize: "13px" }}>
                    {erroPendencia}
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="button"
                    disabled={salvandoPendencia}
                    onClick={fecharModalPendencia}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#475569",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvandoPendencia}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#633df2",
                      color: "#ffffff",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: salvandoPendencia ? "not-allowed" : "pointer",
                    }}
                  >
                    {salvandoPendencia ? "Salvando..." : pendenciaEditando ? "Salvar alterações" : "Adicionar pendência"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CUSTOMIZADO: CONFIRMAR EXCLUSÃO DE PENDÊNCIA */}
        {pendenciaParaExcluir && (
          <div
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !excluindoPendencia) setPendenciaParaExcluir(null);
            }}
            role="presentation"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(3px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              zIndex: 1100,
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-modal-excluir-pendencia"
              style={{
                width: "100%",
                maxWidth: "400px",
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 20px 45px rgba(15, 23, 42, 0.22)",
                border: "1px solid #e2e8f0",
              }}
            >
              <h2 id="titulo-modal-excluir-pendencia" style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#0f172a" }}>
                Excluir pendência
              </h2>
              <p style={{ margin: "0 0 18px 0", fontSize: "14px", color: "#475569", lineHeight: 1.5 }}>
                Tem certeza que deseja excluir a pendência <strong>“{pendenciaParaExcluir.texto}”</strong>? Esta ação não poderá ser desfeita.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  disabled={excluindoPendencia}
                  onClick={() => setPendenciaParaExcluir(null)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={excluindoPendencia}
                  onClick={confirmarExclusaoPendencia}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#ef4444",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: excluindoPendencia ? "not-allowed" : "pointer",
                  }}
                >
                  {excluindoPendencia ? "Excluindo..." : "Sim, excluir"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}

export default AlunoPerfil;