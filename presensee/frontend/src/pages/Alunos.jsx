import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { IconAlunos, MascotAvatar } from "../components/Icons";
import { getUsuario } from "../services/auth";
import api from "../services/api";
import "../styles/Alunos.css";
import "../styles/AlunosRisco.css";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const NOTAS = {
  Julho: [ ["Matemática",6,7],["Dev. Mobile",7.5,8],["História",6.5,6],["Português",7,7],["PI",8,7.5],["Inglês",6,6.5] ],
  Agosto: [ ["Matemática",7,3],["Dev. Mobile",7,3],["História",7,3],["Português",7,3],["PI",7,3],["Inglês",7,3] ],
};
const OCORRENCIAS = [
  ["⚠️", "Falta injustificada", "12 de Agosto", "Aluno não compareceu à aula."],
  ["📝", "Baixo desempenho", "08 de Agosto", "Desempenho abaixo da média na avaliação."],
  ["💬", "Conversa com o monitor", "05 de Agosto", "Conversa realizada para acompanhamento do aluno."],
  ["⚠️", "Faltas recorrentes", "01 de Agosto", "Registrado aumento no número de faltas."],
];

const normalizeTurma = (valor) => {
  if (!valor) return "";
  const match = String(valor).match(/(\d)\s*(?:º\s*Ano\s*)?([A-Z])/i);
  return match ? `${match[1]}${match[2].toUpperCase()}` : String(valor);
};

export default function Alunos() {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = getUsuario();
  
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [turmaSelecionada, setTurmaSelecionada] = useState(() => normalizeTurma(location.state?.turma));
  const [riscoSelecionado, setRiscoSelecionado] = useState("");
  const [frequenciaSelecionada, setFrequenciaSelecionada] = useState("");
  const [ordenacao, setOrdenacao] = useState({ campo: "nome", direcao: "asc" });
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [modalAtivo, setModalAtivo] = useState("principal");
  const [mesSelecionado, setMesSelecionado] = useState("Agosto");
  const [mesNotas, setMesNotas] = useState("Agosto");

  useEffect(() => {
    async function carregarAlunos() {
      try {
        // Substitua '/alunos' por '/students' caso sua rota backend esteja em inglês
        const response = await api.get("/alunos");
        
        // Mapeia os dados do back-end para o formato do front-end
        const alunosFormatados = response.data.map((aluno) => {
          const frequencia = aluno.attendanceRate ?? aluno.frequencia ?? 100;
          return {
            ...aluno,
            id: aluno.id,
            nome: aluno.name || aluno.nome || "Aluno sem nome",
            turma: normalizeTurma(aluno.class?.name || aluno.turma || "N/A"),
            frequencia: frequencia,
            risco: aluno.riskLevel || (frequencia < 75 ? "Alto" : frequencia < 90 ? "Médio" : "Baixo"),
            ultimaAtualizacao: aluno.updatedAt ? new Date(aluno.updatedAt).toLocaleDateString("pt-BR") : "—"
          };
        });
        
        setAlunos(alunosFormatados);
      } catch (error) {
        console.error("Erro ao buscar alunos:", error);
      } finally {
        setLoading(false);
      }
    }
    
    carregarAlunos();
  }, []);

  const turmas = useMemo(() => [...new Set(alunos.map((aluno) => aluno.turma))]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })), [alunos]);
    
  const resumo = useMemo(() => ({
    Baixo: alunos.filter((a) => a.risco === "Baixo").length,
    Médio: alunos.filter((a) => a.risco === "Médio").length,
    Alto: alunos.filter((a) => a.risco === "Alto").length,
  }), [alunos]);
  
  const alunosFiltrados = useMemo(() => alunos.filter((aluno) => {
    const nomeOk = aluno.nome.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR"));
    const turmaOk = !turmaSelecionada || aluno.turma === turmaSelecionada;
    const riscoOk = !riscoSelecionado || aluno.risco === riscoSelecionado;
    const f = aluno.frequencia;
    const frequenciaOk = !frequenciaSelecionada ||
      (frequenciaSelecionada === "acima-80" && f > 80) ||
      (frequenciaSelecionada === "70-80" && f >= 70 && f <= 80) ||
      (frequenciaSelecionada === "abaixo-70" && f < 70);
    return nomeOk && turmaOk && riscoOk && frequenciaOk;
  }), [alunos, busca, turmaSelecionada, riscoSelecionado, frequenciaSelecionada]);
  
  const alunosOrdenados = useMemo(() => [...alunosFiltrados].sort((a, b) => {
    const x = a[ordenacao.campo];
    const y = b[ordenacao.campo];
    const comparacao = typeof x === "number" ? x - y : String(x).localeCompare(String(y), "pt-BR", { numeric: true });
    return ordenacao.direcao === "asc" ? comparacao : -comparacao;
  }), [alunosFiltrados, ordenacao]);
  
  const totalPaginas = Math.max(1, Math.ceil(alunosOrdenados.length / itensPorPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const alunosPaginados = alunosOrdenados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);
  
  const atualizarFiltro = (setter, valor) => { setter(valor); setPagina(1); };
  const ordenar = (campo) => { setOrdenacao((prev) => ({ campo, direcao: prev.campo === campo && prev.direcao === "asc" ? "desc" : "asc" })); setPagina(1); };
  const abrirAluno = (aluno) => { setAlunoSelecionado(aluno); setModalAtivo("principal"); };
  const fecharAluno = () => { setAlunoSelecionado(null); setModalAtivo("principal"); };
  
  const diasNoMes = new Date(2026, MESES.indexOf(mesSelecionado) + 1, 0).getDate();
  const diasFrequencia = Array.from({ length: diasNoMes }, (_, index) => ({ dia: index + 1, presente: (index + 1) % 7 !== 0 && index + 1 !== 5 && index + 1 !== 12 }));
  const percentualFrequencia = Math.round(diasFrequencia.filter((d) => d.presente).length / diasFrequencia.length * 100);
  const notasDoMes = (NOTAS[mesNotas] || []).map(([disciplina, n1, n2]) => ({ disciplina, n1, n2, media: (n1 + n2) / 2 }));

  return (
    <DashboardLayout>
      <div className="alunos-page">
        <header className="alunos-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  <div className="alunos-header-usuario">
    <div>
      <h1>Alunos</h1>
      <p>Gerencie os alunos, acompanhe a frequência e identifique os níveis de risco.</p>
    </div>
  </div>
  <button
    type="button"
    onClick={() => navigate("/novo-aluno")}
    style={{
      padding: "10px 18px",
      borderRadius: "8px",
      border: "none",
      background: "#633df2",
      color: "#ffffff",
      fontWeight: "600",
      cursor: "pointer",
      fontSize: "14px"
    }}
  >
    + Novo Aluno
  </button>
</header>

        <section className="alunos-resumo" aria-label="Filtrar alunos por nível de risco">
          <button
            type="button"
            className={`alunos-resumo-card total ${!riscoSelecionado ? "selecionado" : ""}`}
            onClick={() => {
              setRiscoSelecionado("");
              setTurmaSelecionada("");
              setFrequenciaSelecionada("");
              setBusca("");
              setPagina(1);
            }}
            aria-pressed={!riscoSelecionado}
          >
            <span className="alunos-resumo-icone" aria-hidden="true"><IconAlunos width={27} height={27} /></span>
            <div>
              <strong>{alunos.length}</strong>
              <b>Total de alunos</b>
              <small>Cadastrados no sistema</small>
            </div>
          </button>
          {[["Baixo", "baixo"], ["Médio", "medio"], ["Alto", "alto"]].map(([nivel, classe]) => (
            <button
              type="button"
              className={`alunos-resumo-card ${classe} ${riscoSelecionado === nivel ? "selecionado" : ""}`}
              key={nivel}
              onClick={() => {
                setRiscoSelecionado((atual) => atual === nivel ? "" : nivel);
                setTurmaSelecionada("");
                setFrequenciaSelecionada("");
                setBusca("");
                setPagina(1);
              }}
              aria-pressed={riscoSelecionado === nivel}
            >
              <span className="alunos-resumo-icone" aria-hidden="true"><span className="alunos-resumo-ponto" /></span>
              <div>
                <strong>{resumo[nivel]}</strong>
                <b>{nivel} risco</b>
                <small>{alunos.length ? Math.round((resumo[nivel] / alunos.length) * 100) : 0}% do total</small>
              </div>
            </button>
          ))}
        </section>

        <section className="alunos-filtros-panel" aria-label="Filtros da listagem">
          <label className="alunos-busca">
            <span aria-hidden="true" className="alunos-search-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg></span>
            <input
              className="search-aluno"
              type="search"
              placeholder="Buscar aluno por nome..."
              value={busca}
              onChange={(e) => atualizarFiltro(setBusca, e.target.value)}
              aria-label="Buscar aluno por nome"
            />
          </label>
          <div className="alunos-filtro">
            <label htmlFor="alunos-turma">Turma</label>
            <select id="alunos-turma" value={turmaSelecionada} onChange={(e) => atualizarFiltro(setTurmaSelecionada, e.target.value)}>
              <option value="">Todas as turmas</option>
              {turmas.map((turma) => <option value={turma} key={turma}>{turma}</option>)}
            </select>
          </div>
          <div className="alunos-filtro">
            <label htmlFor="alunos-risco">Nível de risco</label>
            <select id="alunos-risco" value={riscoSelecionado} onChange={(e) => atualizarFiltro(setRiscoSelecionado, e.target.value)}>
              <option value="">Todos os riscos</option>
              {["Baixo", "Médio", "Alto"].map((nivel) => <option value={nivel} key={nivel}>{nivel}</option>)}
            </select>
          </div>
          <div className="alunos-filtro">
            <label htmlFor="alunos-frequencia">Frequência</label>
            <select id="alunos-frequencia" value={frequenciaSelecionada} onChange={(e) => atualizarFiltro(setFrequenciaSelecionada, e.target.value)}>
              <option value="">Todas</option>
              <option value="acima-80">Acima de 80%</option>
              <option value="70-80">Entre 70% e 80%</option>
              <option value="abaixo-70">Abaixo de 70%</option>
            </select>
          </div>
        </section>

        <section className="alunos-tabela-panel" aria-label="Listagem de alunos">
          <div className="alunos-tabela-scroll">
            <table className="students-table">
              <thead>
                <tr>
                  {[["nome", "Aluno"], ["turma", "Turma"], ["frequencia", "Frequência"], ["risco", "Risco"]].map(([campo, titulo]) => (
                    <th scope="col" key={campo}>
                      <button type="button" className="alunos-ordenar" onClick={() => ordenar(campo)}>
                        {titulo} <span aria-hidden="true">↕</span>
                      </button>
                    </th>
                  ))}
                  <th scope="col">Última atualização</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="alunos-vazio">Carregando alunos...</td></tr>
                ) : alunosPaginados.map((aluno) => {
                  const iniciais = aluno.nome.split(" ").slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();
                  const cor = aluno.frequencia < 75 ? "alto" : aluno.frequencia < 90 ? "medio" : "baixo";
                  return (
                    <tr key={aluno.id || Math.random()}>
                      <td><div className="alunos-nome"><span className="alunos-avatar">{iniciais}</span><strong>{aluno.nome}</strong></div></td>
                      <td><span className="alunos-turma-tag">{aluno.turma}</span></td>
                      <td>
                        <div className="alunos-frequencia">
                          <span>{aluno.frequencia}%</span>
                          <progress className={`alunos-progresso ${cor}`} value={aluno.frequencia} max="100" aria-label={`Frequência de ${aluno.nome}`} />
                        </div>
                      </td>
                      <td><span className={`risk-status ${aluno.risco.toLowerCase()}`}><span className="risk-dot" />{aluno.risco}</span></td>
                      <td className="alunos-atualizacao">{aluno.ultimaAtualizacao}</td>
                      <td>
                        <div className="alunos-acoes">
                          <button type="button" className="alunos-acao" onClick={() => abrirAluno(aluno)} aria-label={`Ver detalhes de ${aluno.nome}`} title="Ver detalhes"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button>
                          <button type="button" className="alunos-acao" onClick={() => navigate(`/alunos/${aluno.id}`)} aria-label={`Abrir perfil de ${aluno.nome}`} title="Abrir perfil">⋮</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && alunosPaginados.length === 0 && <tr><td colSpan={6} className="alunos-vazio">Nenhum aluno encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="alunos-paginacao">
            <span>Mostrando {alunosPaginados.length} de {alunosFiltrados.length} alunos</span>
            <div className="alunos-paginas">
              <button type="button" disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)} aria-label="Página anterior">‹</button>
              <strong>{paginaAtual}</strong><span>de {totalPaginas}</span>
              <button type="button" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)} aria-label="Próxima página">›</button>
            </div>
            <label className="alunos-por-pagina">
              Itens por página
              <select value={itensPorPagina} onChange={(e) => { setItensPorPagina(Number(e.target.value)); setPagina(1); }}>
                {[10, 20, 50].map((n) => <option value={n} key={n}>{n}</option>)}
              </select>
            </label>
          </footer>
        </section>
      </div>

    {alunoSelecionado && <div className="student-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) fecharAluno(); }} role="presentation">
      <div className="student-modal" role="dialog" aria-modal="true" aria-label={`Informações de ${alunoSelecionado.nome}`}>
        <button className="close-modal" onClick={fecharAluno} aria-label="Fechar">×</button>
        <div className="student-modal-header"><div className="student-avatar">👤</div><div><h2>{alunoSelecionado.nome}</h2><p>Turma {alunoSelecionado.turma}</p></div><span className={`modal-risk ${alunoSelecionado.risco.toLowerCase()}`}>Risco {alunoSelecionado.risco}</span></div>
        {modalAtivo === "principal" && <><div className="student-summary"><div><strong>5.0</strong><span>Média geral (exemplo)</span></div><div><strong>4</strong><span>Ocorrências (exemplo)</span></div><button className="frequency-summary" onClick={() => setModalAtivo("frequencia")}><strong>{alunoSelecionado.frequencia}%</strong><span>Frequência geral</span></button></div><div className="risk-reason"><h3>Indicadores de acompanhamento</h3><div>🟡 Verificar tendência da frequência</div><div>🟡 Conferir notas e ocorrências recentes</div></div><div className="student-actions"><button onClick={() => setModalAtivo("notas")}>📝 <span>Notas</span></button><button onClick={() => setModalAtivo("ocorrencias")}>📋 <span>Ocorrências</span></button><button onClick={() => navigate(`/alunos/${alunoSelecionado.id}`)}>👤 <span>Perfil do aluno</span></button></div></>}
        {modalAtivo === "frequencia" && <><div className="frequency-title"><div><h2>Frequência Geral</h2><select className="frequency-month-select" value={mesSelecionado} onChange={(e) => setMesSelecionado(e.target.value)}>{MESES.map((mes) => <option key={mes} value={mes}>{mes}</option>)}</select></div><div className="frequency-circle"><span>{percentualFrequencia}%</span></div></div><p className="alunos-modal-aviso">Calendário demonstrativo; frequência real do aluno: {alunoSelecionado.frequencia}%.</p><div className="frequency-week">{["seg", "ter", "qua", "qui", "sex"].map((dia) => <span key={dia}>{dia}</span>)}</div><div className="frequency-grid">{diasFrequencia.map((dia) => <div className="frequency-day" key={dia.dia}><span className="day-number">{dia.dia}</span><span className={`day-status ${dia.presente ? "presente" : "falta"}`}>{dia.presente ? "✓" : "×"}</span></div>)}</div><button className="back-frequency" onClick={() => setModalAtivo("principal")}>← Voltar</button></>}
        {modalAtivo === "notas" && <><h2 className="detail-title">Notas</h2><div className="notes-filter"><label htmlFor="mes-notas">Ver mês</label><select id="mes-notas" value={mesNotas} onChange={(e) => setMesNotas(e.target.value)}>{MESES.map((mes) => <option key={mes}>{mes}</option>)}</select></div><p className="alunos-modal-aviso">Notas demonstrativas.</p>{notasDoMes.length ? <><div className="notes-table-wrapper"><table className="notes-table"><thead><tr><th>Disciplina</th><th>1ª</th><th>2ª</th><th>Média</th><th>Tendência</th></tr></thead><tbody>{notasDoMes.map((nota) => <tr key={nota.disciplina}><td>{nota.disciplina}</td><td>{nota.n1.toFixed(1)}</td><td>{nota.n2.toFixed(1)}</td><td><span className={`note-badge ${nota.media < 5 ? "nota-baixa" : nota.media < 7 ? "nota-media" : "nota-alta"}`}>{nota.media.toFixed(1)}</span></td><td><span className={`trend ${nota.n2 > nota.n1 ? "subindo" : nota.n2 < nota.n1 ? "caindo" : "estavel"}`}>{nota.n2 > nota.n1 ? "↑ Subindo" : nota.n2 < nota.n1 ? "↓ Caindo" : "→ Estável"}</span></td></tr>)}</tbody></table></div><div className="notes-average"><span>Média do mês</span><strong>{(notasDoMes.reduce((soma, n) => soma + n.media, 0) / notasDoMes.length).toFixed(1)}</strong></div></> : <p className="empty-message">Sem notas registradas neste mês.</p>}<button className="back-frequency" onClick={() => setModalAtivo("principal")}>← Voltar</button></>}
        {modalAtivo === "ocorrencias" && <><h2 className="detail-title">Ocorrências</h2><p className="alunos-modal-aviso">Registros demonstrativos.</p><div className="occurrences-list">{OCORRENCIAS.map(([icone, titulo, data, descricao]) => <article className="occurrence-item" key={`${data}-${titulo}`}><div className="occurrence-icon">{icone}</div><div className="occurrence-content"><div className="occurrence-top"><strong>{titulo}</strong><span>{data}</span></div><p>{descricao}</p></div></article>)}</div><button className="back-frequency" onClick={() => setModalAtivo("principal")}>← Voltar</button></>}
      </div>
    </div>}
    </DashboardLayout>
  );
}