import { useState, useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import DashboardLayout from "../layouts/DashboardLayout"
import GaugeChart from "../components/GaugeChart"
import api from "../services/api"
import "../styles/AlunoPerfil.css"

function corFrequencia(valor) {
  if (valor < 75) return "#ef4444"; // Vermelho: ruim
  if (valor < 90) return "#eab308"; // Amarelo: médio
  return "#22c55e"; // Verde: bom
}

function corRisco(valor) {
  if (valor >= 70) return "#ef4444"; // Alto risco
  if (valor >= 40) return "#eab308"; // Risco médio
  return "#22c55e"; // Baixo risco
}

function iniciais(nome) {
  if (!nome) return "AL";
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(parte => parte[0])
    .join("")
    .toUpperCase()
}

function formatarDataDisplay(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("pt-BR");
}

function AlunoPerfil() {
  const { id } = useParams()
  const [aluno, setAluno] = useState(null)
  const [historico, setHistorico] = useState([])
  const [pendencias, setPendencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [historicoExpandido, setHistoricoExpandido] = useState(false)

  useEffect(() => {
    async function carregarPerfil() {
      try {
        // 1. Buscar dados do aluno
        // Ajuste para "/students" se a sua rota for em inglês
        const resAluno = await api.get(`/alunos/${id}`);
        const dadosAluno = resAluno.data;
        
        const frequencia = dadosAluno.attendanceRate ?? dadosAluno.frequencia ?? 100;
        
        setAluno({
          id: dadosAluno.id,
          nome: dadosAluno.name || dadosAluno.nome || "Aluno sem nome",
          matricula: dadosAluno.registration || dadosAluno.matricula || "N/A",
          turma: dadosAluno.class?.name || dadosAluno.turma || "Turma não vinculada",
          email: dadosAluno.email || "Não informado",
          frequencia: frequencia,
          risco: dadosAluno.riskLevel || (frequencia < 75 ? 85 : frequencia < 90 ? 50 : 10),
          status: dadosAluno.status || (frequencia < 75 ? "Em acompanhamento" : "Regular"),
          faltas: dadosAluno.absences || dadosAluno.faltas || 0,
          responsaveis: dadosAluno.guardians || dadosAluno.responsaveis || []
        });

        // 2. Buscar intervenções (Eventos) do aluno
        try {
          const resEventos = await api.get(`/eventos?studentId=${id}`);
          const eventos = Array.isArray(resEventos.data) ? resEventos.data : [];
          setHistorico(eventos.map(e => ({
            id: e.id,
            data: e.createdAt || e.data,
            tipo: e.type || e.tipo || "Intervenção",
            descricao: e.description || e.descricao
          })).sort((a, b) => String(b.data).localeCompare(String(a.data))));
        } catch (e) { console.warn("Rota de eventos pendente para o aluno"); }

        // 3. Buscar pendências (Incidentes) do aluno
        try {
          const resIncidentes = await api.get(`/incidentes?studentId=${id}`);
          const incidentes = Array.isArray(resIncidentes.data) ? resIncidentes.data : [];
          setPendencias(incidentes.filter(i => i.isPending || i.type === "PENDENCIA").map(p => ({
            id: p.id,
            texto: p.description || p.texto,
            feita: p.resolved || p.feita || false,
          })));
        } catch (e) { console.warn("Rota de incidentes pendente para o aluno"); }

      } catch (error) {
        console.error("Erro ao buscar perfil do aluno:", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (id) carregarPerfil();
  }, [id])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="perfil-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <p>Carregando perfil do estudante...</p>
        </div>
      </DashboardLayout>
    )
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
    )
  }

  const ultimasIntervencoes = historicoExpandido ? historico : historico.slice(0, 3)
  const responsavelPrincipal = aluno.responsaveis?.[0]

  async function adicionarPendencia() {
    const texto = window.prompt("Digite a nova pendência:");
    if (!texto || !texto.trim()) return;

    try {
      const payload = {
        description: texto.trim(),
        studentId: id,
        isPending: true,
        type: "PENDENCIA",
        resolved: false
      };
      
      const response = await api.post("/incidentes", payload);
      const nova = response.data;
      
      setPendencias(lista => [...lista, {
        id: nova.id || Date.now(),
        texto: payload.description,
        feita: false,
      }]);
    } catch (error) {
      console.error("Erro ao adicionar pendência", error);
      alert("Falha ao salvar pendência no servidor.");
    }
  }

  async function editarPendencia(item) {
    const texto = window.prompt("Edite a descrição da pendência:", item.texto);
    if (texto === null || !texto.trim()) return;

    try {
      await api.patch(`/incidentes/${item.id}`, { description: texto.trim(), texto: texto.trim() });
      setPendencias(lista => lista.map(p => p.id === item.id ? { ...p, texto: texto.trim() } : p));
    } catch (error) {
      console.error("Erro ao editar", error);
    }
  }

  async function excluirPendencia(idPendencia) {
    const confirmar = window.confirm("Deseja realmente excluir esta pendência?");
    if (!confirmar) return;

    try {
      await api.delete(`/incidentes/${idPendencia}`);
      setPendencias(lista => lista.filter(item => item.id !== idPendencia));
    } catch (error) {
      console.error("Erro ao excluir", error);
    }
  }

  async function alternarPendencia(idPendencia) {
    const pendencia = pendencias.find(p => p.id === idPendencia);
    const novoStatus = !pendencia.feita;
    
    setPendencias((lista) => lista.map((item) => item.id === idPendencia ? { ...item, feita: novoStatus } : item));
    
    try {
      await api.patch(`/incidentes/${idPendencia}`, { resolved: novoStatus, feita: novoStatus });
    } catch (error) {
      console.error("Erro ao alternar pendência", error);
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
              {iniciais(aluno.nome)}
            </div>
            <div className="perfil-identificacao-texto">
              <h1>{aluno.nome}</h1>
              <p>{aluno.turma} <span>·</span> Matrícula: {aluno.matricula}</p>
              <span className={`perfil-status-badge ${aluno.frequencia < 75 ? "alto" : aluno.frequencia < 90 ? "medio" : "baixo"}`}>
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
              <span>Responsável: {responsavelPrincipal?.nome || "Não informado"}</span>
            </div>
            <div className="perfil-contato-item">
              <span className="perfil-contato-icone">☎</span>
              <span>{responsavelPrincipal?.telefone || "Telefone não informado"}</span>
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
                <GaugeChart
                  value={aluno.frequencia}
                  color={corFrequencia(aluno.frequencia)}
                />
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
                {ultimasIntervencoes.map(item => (
                  <div className="perfil-timeline-item" key={item.id}>
                    <div className="perfil-timeline-marcador"><span /></div>
                    <div className="perfil-timeline-data">{formatarDataDisplay(item.data)}</div>
                    <div className="perfil-timeline-conteudo">
                      <span className={`perfil-tipo-badge ${
                        item.tipo === "Conversa Individual"
                          ? "conversa"
                          : item.tipo === "Contato com responsável"
                            ? "responsavel"
                            : "encaminhamento"
                      }`}>
                        {item.tipo}
                      </span>
                      <p>{item.descricao || "Sem descrição registrada."}</p>
                    </div>
                  </div>
                ))}
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
                  {pendencias.filter(item => !item.feita).length} abertas
                </span>
                <button
                  type="button"
                  className="perfil-btn-adicionar-pendencia"
                  onClick={adicionarPendencia}
                  title="Adicionar pendência"
                  aria-label="Adicionar pendência"
                >
                  +
                </button>
              </div>
            </header>

            {pendencias.length > 0 ? (
              <div className="perfil-pendencias-modernas">
                {pendencias.map(item => (
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
                        onClick={() => editarPendencia(item)}
                        title="Editar pendência"
                        aria-label={`Editar pendência: ${item.texto}`}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="perfil-btn-excluir-pendencia"
                        onClick={() => excluirPendencia(item.id)}
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
      </main>
    </DashboardLayout>
  )
}

export default AlunoPerfil