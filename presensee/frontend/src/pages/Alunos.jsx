import { useMemo, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { IconAlunos } from "../components/Icons";
import api from "../services/api";
import "../styles/Alunos.css";
import "../styles/AlunosRisco.css";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatarTurmaCompleta(classObj, fallbackNome) {
  const nome = classObj?.name || fallbackNome || "Sem turma";
  const curso = classObj?.course || "";
  const turno = classObj?.shift || "";
  const detalhe = [curso, turno].filter(Boolean).join(" · ");
  return { nome, detalhe, rotuloCompleto: detalhe ? `${nome} (${detalhe})` : nome };
}

export default function Alunos() {
  const location = useLocation();
  const navigate = useNavigate();

  const [alunos, setAlunos] = useState([]);
  const [turmasLista, setTurmasLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [turmaSelecionada, setTurmaSelecionada] = useState(() => location.state?.turma || "");
  const [riscoSelecionado, setRiscoSelecionado] = useState("");
  const [frequenciaSelecionada, setFrequenciaSelecionada] = useState("");
  const [ordenacao, setOrdenacao] = useState({ campo: "nome", direcao: "asc" });
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);
  const [modalAtivo, setModalAtivo] = useState("principal");
  const [mesSelecionado, setMesSelecionado] = useState(MESES[new Date().getMonth()]);
  const [mesNotas, setMesNotas] = useState(MESES[new Date().getMonth()]);
  const [carregandoFreq, setCarregandoFreq] = useState(false);

  const [alunoEditando, setAlunoEditando] = useState(null);
  const [formAluno, setFormAluno] = useState({
    name: "",
    registration: "",
    classId: "",
    email: "",
    guardianName: "",
    guardianPhone: "",
  });
  const [salvandoAluno, setSalvandoAluno] = useState(false);
  const [erroEdicaoAluno, setErroEdicaoAluno] = useState("");

  const alertaProcessado = useRef(false);

  async function carregarDados() {
    setLoading(true);
    try {
      const [resAlunos, resTurmas] = await Promise.all([
        api.get("/students"),
        api.get("/classes").catch(() => ({ data: [] })),
      ]);

      setTurmasLista(Array.isArray(resTurmas.data) ? resTurmas.data : []);

      const alunosFormatados = resAlunos.data.map((aluno) => {
        const frequencia = aluno.attendanceRate ?? aluno.frequencia ?? 100;
        const turmaInfo = formatarTurmaCompleta(aluno.class, aluno.turma);
        return {
          ...aluno,
          id: aluno.id || aluno._id,
          nome: aluno.name || aluno.nome || "Aluno sem nome",
          foto:
            aluno.biometricDataUrl ||
            aluno.biometryUrl ||
            aluno.photoUrl ||
            aluno.avatar ||
            "",
          turma: turmaInfo.nome,
          turmaDetalhe: turmaInfo.detalhe,
          turmaRotuloCompleto: turmaInfo.rotuloCompleto,
          frequencia,
          risco:
            aluno.riskLevel ||
            aluno.risk ||
            (frequencia < 75 ? "Alto" : frequencia < 90 ? "Médio" : "Baixo"),
          ultimaAtualizacao: aluno.updatedAt
            ? new Date(aluno.updatedAt).toLocaleDateString("pt-BR")
            : "—",
        };
      });

      setAlunos(alunosFormatados);
    } catch (error) {
      console.error("Erro ao buscar alunos:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const turmasFiltro = useMemo(() => {
    const mapa = new Map();
    turmasLista.forEach((t) => {
      const info = formatarTurmaCompleta(t, t.name);
      mapa.set(info.nome, info.rotuloCompleto);
    });
    alunos.forEach((a) => {
      if (a.turma && !mapa.has(a.turma)) {
        mapa.set(a.turma, a.turmaRotuloCompleto);
      }
    });
    return Array.from(mapa.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "pt-BR", { numeric: true })
    );
  }, [turmasLista, alunos]);

  const resumo = useMemo(
    () => ({
      Baixo: alunos.filter((a) => a.risco === "Baixo").length,
      Médio: alunos.filter((a) => a.risco === "Médio").length,
      Alto: alunos.filter((a) => a.risco === "Alto").length,
    }),
    [alunos]
  );

  const alunosFiltrados = useMemo(
    () =>
      alunos.filter((aluno) => {
        const termo = busca.trim().toLocaleLowerCase("pt-BR");
        const nomeOk =
          !termo ||
          aluno.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
          String(aluno.registration || "").toLowerCase().includes(termo);
        const turmaOk = !turmaSelecionada || aluno.turma === turmaSelecionada;
        const riscoOk = !riscoSelecionado || aluno.risco === riscoSelecionado;
        const f = aluno.frequencia;
        const frequenciaOk =
          !frequenciaSelecionada ||
          (frequenciaSelecionada === "acima-80" && f > 80) ||
          (frequenciaSelecionada === "70-80" && f >= 70 && f <= 80) ||
          (frequenciaSelecionada === "abaixo-70" && f < 70);
        return nomeOk && turmaOk && riscoOk && frequenciaOk;
      }),
    [alunos, busca, turmaSelecionada, riscoSelecionado, frequenciaSelecionada]
  );

  const alunosOrdenados = useMemo(
    () =>
      [...alunosFiltrados].sort((a, b) => {
        const x = a[ordenacao.campo];
        const y = b[ordenacao.campo];
        const comparacao =
          typeof x === "number"
            ? x - y
            : String(x).localeCompare(String(y), "pt-BR", { numeric: true });
        return ordenacao.direcao === "asc" ? comparacao : -comparacao;
      }),
    [alunosFiltrados, ordenacao]
  );

  const totalPaginas = Math.max(1, Math.ceil(alunosOrdenados.length / itensPorPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const alunosPaginados = alunosOrdenados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  const atualizarFiltro = (setter, valor) => {
    setter(valor);
    setPagina(1);
  };
  const ordenar = (campo) => {
    setOrdenacao((prev) => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === "asc" ? "desc" : "asc",
    }));
    setPagina(1);
  };

  async function carregarFrequenciaReal(alunoId, nomeMes = mesSelecionado) {
    if (!alunoId) return;
    setCarregandoFreq(true);
    try {
      const mesNumero = MESES.indexOf(nomeMes) + 1;
      const anoAtual = new Date().getFullYear();
      const res = await api.get(
        `/students/${alunoId}/attendance-history?month=${mesNumero}&year=${anoAtual}`
      );
      const registrosMes = Array.isArray(res.data) ? res.data : [];

      setAlunoSelecionado((prev) => {
        if (!prev || prev.id !== alunoId) return prev;
        const outrosMeses = (prev.attendances || []).filter((a) => {
          const d = new Date(a.date);
          return !(d.getMonth() + 1 === mesNumero && d.getFullYear() === anoAtual);
        });
        return {
          ...prev,
          attendances: [...outrosMeses, ...registrosMes],
        };
      });
    } catch (err) {
      console.error("Erro ao sincronizar histórico de frequência:", err);
    } finally {
      setCarregandoFreq(false);
    }
  }

  const abrirAluno = async (aluno, abaInicial = "principal") => {
    setAlunoSelecionado(aluno);
    setModalAtivo(abaInicial);
    try {
      const res = await api.get(`/students/${aluno.id}`);
      const incidentesLimpos = (res.data.incidents || []).filter(
        (inc) => inc.type !== "FICHA_CADASTRO"
      );
      const attendancesReais = res.data.attendances || [];
      const totalAulas = attendancesReais.length;
      const presencas = attendancesReais.filter((a) => a.status === "PRESENT").length;
      const freqCalculada =
        totalAulas > 0 ? Math.round((presencas / totalAulas) * 100) : aluno.frequencia;

      setAlunoSelecionado((prev) => ({
        ...prev,
        ...res.data,
        frequencia: freqCalculada,
        foto:
          res.data.biometricDataUrl ||
          res.data.biometryUrl ||
          res.data.photoUrl ||
          prev?.foto ||
          "",
        grades: res.data.grades || [],
        incidents: incidentesLimpos,
        attendances: attendancesReais,
      }));
    } catch (error) {
      console.error("Erro ao carregar detalhes completos do aluno:", error);
    }
  };

  const fecharAluno = () => {
    setAlunoSelecionado(null);
    setModalAtivo("principal");
    alertaProcessado.current = false;

    if (location.pathname !== "/alunos" || location.state) {
      navigate("/alunos", { replace: true, state: {} });
    }
  };

  async function abrirEdicaoAluno(aluno, e) {
    if (e) e.stopPropagation();
    setErroEdicaoAluno("");
    setAlunoSelecionado(null);
    setAlunoEditando(aluno);
    setFormAluno({
      name: aluno.nome || "",
      registration: aluno.registration || "",
      classId: aluno.classId || aluno.class?.id || "",
      email: aluno.email || "",
      guardianName: aluno.guardianName || "",
      guardianPhone: aluno.guardianPhone || "",
    });

    try {
      const res = await api.get(`/students/${aluno.id}`);
      setFormAluno({
        name: res.data.name || aluno.nome || "",
        registration: res.data.registration || aluno.registration || "",
        classId: res.data.classId || aluno.classId || "",
        email: res.data.email || "",
        guardianName: res.data.guardianName || "",
        guardianPhone: res.data.guardianPhone || "",
      });
    } catch (err) {
      console.error("Erro ao carregar ficha do aluno para edição:", err);
    }
  }

  async function salvarEdicaoAluno(e) {
    e.preventDefault();
    if (!alunoEditando) return;
    setErroEdicaoAluno("");
    setSalvandoAluno(true);

    try {
      await api.patch(`/students/${alunoEditando.id}`, {
        name: formAluno.name.trim(),
        registration: formAluno.registration.trim(),
        classId: formAluno.classId,
        email: formAluno.email.trim(),
        guardianName: formAluno.guardianName.trim(),
        guardianPhone: formAluno.guardianPhone.trim(),
      });
      setAlunoEditando(null);
      await carregarDados();
    } catch (error) {
      setErroEdicaoAluno(error.response?.data?.error || "Não foi possível atualizar o aluno.");
    } finally {
      setSalvandoAluno(false);
    }
  }

  async function excluirAluno(aluno, e) {
    if (e) e.stopPropagation();
    const confirmar = window.confirm(`Deseja realmente excluir o aluno "${aluno.nome}"?`);
    if (!confirmar) return;

    try {
      await api.delete(`/students/${aluno.id}`);
      if (alunoSelecionado?.id === aluno.id) fecharAluno();
      await carregarDados();
    } catch (error) {
      alert(error.response?.data?.error || "Não foi possível excluir o aluno.");
    }
  }

  useEffect(() => {
    if (alunos.length > 0 && !alertaProcessado.current) {
      let alunoIdAlvo = location.state?.alertaAtivo?.alunoId;

      if (!alunoIdAlvo) {
        const match = location.pathname.match(/\/alunos\/([^/]+)/);
        if (match) alunoIdAlvo = match[1];
      }

      if (alunoIdAlvo) {
        const alunoParaAbrir = alunos.find((a) => String(a.id) === String(alunoIdAlvo));
        if (alunoParaAbrir) {
          const abaDestino = location.state?.alertaAtivo ? "ocorrencias" : "principal";
          abrirAluno(alunoParaAbrir, abaDestino);
          alertaProcessado.current = true;
        }
      }
    }
  }, [alunos, location.pathname, location.state]);

  const mediaGeral =
    alunoSelecionado?.grades?.length > 0
      ? (
          alunoSelecionado.grades.reduce((s, n) => s + n.value, 0) /
          alunoSelecionado.grades.length
        ).toFixed(1)
      : "-";

  const notasDoMes = (alunoSelecionado?.grades || []).filter(
    (g) => new Date(g.date).getMonth() === MESES.indexOf(mesNotas)
  );
  const mediaDoMes =
    notasDoMes.length > 0
      ? (notasDoMes.reduce((s, n) => s + n.value, 0) / notasDoMes.length).toFixed(1)
      : "-";

  // Cálculo real do calendário mensal (sem dados simulados)
  const anoCalendario = new Date().getFullYear();
  const indiceMes = MESES.indexOf(mesSelecionado);
  const diasNoMes = new Date(anoCalendario, indiceMes + 1, 0).getDate();
  const primeiroDiaSemana = new Date(anoCalendario, indiceMes, 1).getDay(); // 0 = Dom, 6 = Sáb
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const celulasVaziasInicio = Array.from({ length: primeiroDiaSemana }, (_, i) => i);

  const diasFrequencia = Array.from({ length: diasNoMes }, (_, index) => {
    const dia = index + 1;
    const dataCelula = new Date(anoCalendario, indiceMes, dia);
    dataCelula.setHours(0, 0, 0, 0);

    const freqReal = alunoSelecionado?.attendances?.find((a) => {
      const d = new Date(a.date);
      return (
        d.getDate() === dia &&
        d.getMonth() === indiceMes &&
        d.getFullYear() === anoCalendario
      );
    });

    const ehFimDeSemana = dataCelula.getDay() === 0 || dataCelula.getDay() === 6;
    const ehHoje = dataCelula.getTime() === hoje.getTime();
    const ehFuturo = dataCelula.getTime() > hoje.getTime();

    let statusDia = "sem-registro";
    if (freqReal) {
      if (freqReal.status === "PRESENT") statusDia = "presente";
      else if (freqReal.status === "EXCUSED") statusDia = "justificada";
      else statusDia = "falta";
    } else if (ehFimDeSemana) {
      statusDia = "fim-de-semana";
    } else if (ehFuturo) {
      statusDia = "futuro";
    }

    const horarioRegistro = freqReal?.date
      ? new Date(freqReal.date).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    return {
      dia,
      statusDia,
      ehHoje,
      horarioRegistro,
    };
  });

  const totalPresencasMes = diasFrequencia.filter((d) => d.statusDia === "presente").length;
  const totalFaltasMes = diasFrequencia.filter((d) => d.statusDia === "falta").length;
  const totalJustificadasMes = diasFrequencia.filter((d) => d.statusDia === "justificada").length;

  return (
    <DashboardLayout>
      <div className="alunos-page">
        <header
          className="alunos-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
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
              fontSize: "14px",
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
            <span className="alunos-resumo-icone" aria-hidden="true">
              <IconAlunos width={27} height={27} />
            </span>
            <div>
              <strong>{alunos.length}</strong>
              <b>Total de alunos</b>
              <small>Cadastrados no sistema</small>
            </div>
          </button>
          {[
            ["Baixo", "baixo"],
            ["Médio", "medio"],
            ["Alto", "alto"],
          ].map(([nivel, classe]) => (
            <button
              type="button"
              className={`alunos-resumo-card ${classe} ${
                riscoSelecionado === nivel ? "selecionado" : ""
              }`}
              key={nivel}
              onClick={() => {
                setRiscoSelecionado((atual) => (atual === nivel ? "" : nivel));
                setTurmaSelecionada("");
                setFrequenciaSelecionada("");
                setBusca("");
                setPagina(1);
              }}
              aria-pressed={riscoSelecionado === nivel}
            >
              <span className="alunos-resumo-icone" aria-hidden="true">
                <span className="alunos-resumo-ponto" />
              </span>
              <div>
                <strong>{resumo[nivel]}</strong>
                <b>{nivel} risco</b>
                <small>
                  {alunos.length ? Math.round((resumo[nivel] / alunos.length) * 100) : 0}% do total
                </small>
              </div>
            </button>
          ))}
        </section>

        <section className="alunos-filtros-panel" aria-label="Filtros da listagem">
          <label className="alunos-busca">
            <span aria-hidden="true" className="alunos-search-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 5 5" />
              </svg>
            </span>
            <input
              className="search-aluno"
              type="search"
              placeholder="Buscar aluno por nome ou matrícula..."
              value={busca}
              onChange={(e) => atualizarFiltro(setBusca, e.target.value)}
              aria-label="Buscar aluno por nome"
            />
          </label>
          <div className="alunos-filtro">
            <label htmlFor="alunos-turma">Turma</label>
            <select
              id="alunos-turma"
              value={turmaSelecionada}
              onChange={(e) => atualizarFiltro(setTurmaSelecionada, e.target.value)}
            >
              <option value="">Todas as turmas</option>
              {turmasFiltro.map(([valor, rotulo]) => (
                <option value={valor} key={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="alunos-filtro">
            <label htmlFor="alunos-risco">Nível de risco</label>
            <select
              id="alunos-risco"
              value={riscoSelecionado}
              onChange={(e) => atualizarFiltro(setRiscoSelecionado, e.target.value)}
            >
              <option value="">Todos os riscos</option>
              {["Baixo", "Médio", "Alto"].map((nivel) => (
                <option value={nivel} key={nivel}>
                  {nivel}
                </option>
              ))}
            </select>
          </div>
          <div className="alunos-filtro">
            <label htmlFor="alunos-frequencia">Frequência</label>
            <select
              id="alunos-frequencia"
              value={frequenciaSelecionada}
              onChange={(e) => atualizarFiltro(setFrequenciaSelecionada, e.target.value)}
            >
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
                  {[
                    ["nome", "Aluno"],
                    ["turma", "Turma / Modalidade"],
                    ["frequencia", "Frequência"],
                    ["risco", "Risco"],
                  ].map(([campo, titulo]) => (
                    <th scope="col" key={campo}>
                      <button
                        type="button"
                        className="alunos-ordenar"
                        onClick={() => ordenar(campo)}
                      >
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
                  <tr>
                    <td colSpan={6} className="alunos-vazio">
                      Carregando alunos...
                    </td>
                  </tr>
                ) : (
                  alunosPaginados.map((aluno) => {
                    const iniciais = aluno.nome
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((parte) => parte[0])
                      .join("")
                      .toUpperCase();
                    const cor =
                      aluno.frequencia < 75
                        ? "alto"
                        : aluno.frequencia < 90
                        ? "medio"
                        : "baixo";
                    return (
                      <tr key={aluno.id || Math.random()}>
                        <td>
                          <div className="alunos-nome">
                            <span className="alunos-avatar" style={{ overflow: "hidden" }}>
                              {aluno.foto ? (
                                <img
                                  src={aluno.foto}
                                  alt={aluno.nome}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    borderRadius: "50%",
                                  }}
                                />
                              ) : (
                                iniciais
                              )}
                            </span>
                            <div>
                              <strong>{aluno.nome}</strong>
                              {aluno.registration && (
                                <small
                                  style={{
                                    display: "block",
                                    color: "#64748b",
                                    fontSize: "11px",
                                  }}
                                >
                                  Mat. {aluno.registration}
                                </small>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span className="alunos-turma-tag">{aluno.turma}</span>
                            {aluno.turmaDetalhe && (
                              <small style={{ fontSize: "11px", color: "#64748b" }}>
                                {aluno.turmaDetalhe}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="alunos-frequencia">
                            <span>{aluno.frequencia}%</span>
                            <progress
                              className={`alunos-progresso ${cor}`}
                              value={aluno.frequencia}
                              max="100"
                              aria-label={`Frequência de ${aluno.nome}`}
                            />
                          </div>
                        </td>
                        <td>
                          <span className={`risk-status ${aluno.risco.toLowerCase()}`}>
                            <span className="risk-dot" />
                            {aluno.risco}
                          </span>
                        </td>
                        <td className="alunos-atualizacao">{aluno.ultimaAtualizacao}</td>
                        <td>
                          <div
                            className="alunos-acoes"
                            style={{ display: "flex", gap: "6px", alignItems: "center" }}
                          >
                            <button
                              type="button"
                              className="alunos-acao"
                              onClick={() => abrirAluno(aluno)}
                              aria-label={`Ver detalhes de ${aluno.nome}`}
                              title="Ver detalhes"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="18"
                                height="18"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.9"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => abrirEdicaoAluno(aluno, e)}
                              title="Editar aluno"
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                background: "#fff",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={(e) => excluirAluno(aluno, e)}
                              title="Excluir aluno"
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid #fecaca",
                                background: "#fef2f2",
                                color: "#b91c1c",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
                {!loading && alunosPaginados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="alunos-vazio">
                      Nenhum aluno encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="alunos-paginacao">
            <span>
              Mostrando {alunosPaginados.length} de {alunosFiltrados.length} alunos
            </span>
            <div className="alunos-paginas">
              <button
                type="button"
                disabled={paginaAtual <= 1}
                onClick={() => setPagina(paginaAtual - 1)}
                aria-label="Página anterior"
              >
                ‹
              </button>
              <strong>{paginaAtual}</strong>
              <span>de {totalPaginas}</span>
              <button
                type="button"
                disabled={paginaAtual >= totalPaginas}
                onClick={() => setPagina(paginaAtual + 1)}
                aria-label="Próxima página"
              >
                ›
              </button>
            </div>
            <label className="alunos-por-pagina">
              Itens por página
              <select
                value={itensPorPagina}
                onChange={(e) => {
                  setItensPorPagina(Number(e.target.value));
                  setPagina(1);
                }}
              >
                {[10, 20, 50].map((n) => (
                  <option value={n} key={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </footer>
        </section>
      </div>

      {/* MODAL DE VISUALIZAÇÃO DO ALUNO */}
      {alunoSelecionado && (
        <div
          className="student-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fecharAluno();
          }}
          role="presentation"
        >
          <div
            className="student-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Informações de ${alunoSelecionado.nome}`}
            style={{ maxWidth: modalAtivo === "frequencia" ? "580px" : undefined }}
          >
            <button className="close-modal" onClick={fecharAluno} aria-label="Fechar">
              ×
            </button>

            <div className="student-modal-header">
              <div className="student-avatar" style={{ overflow: "hidden" }}>
                {alunoSelecionado.foto ? (
                  <img
                    src={alunoSelecionado.foto}
                    alt={alunoSelecionado.nome}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  "👤"
                )}
              </div>
              <div>
                <h2>{alunoSelecionado.nome}</h2>
                <p>{alunoSelecionado.turmaRotuloCompleto}</p>
              </div>
              <span className={`modal-risk ${alunoSelecionado.risco.toLowerCase()}`}>
                Risco {alunoSelecionado.risco}
              </span>
            </div>

            {modalAtivo === "principal" && (
              <>
                <div className="student-summary">
                  <div>
                    <strong>{alunoSelecionado.grades ? mediaGeral : "..."}</strong>
                    <span>Média geral</span>
                  </div>
                  <div>
                    <strong>
                      {alunoSelecionado.incidents ? alunoSelecionado.incidents.length : "..."}
                    </strong>
                    <span>Ocorrências</span>
                  </div>
                  <button
                    className="frequency-summary"
                    onClick={() => {
                      setModalAtivo("frequencia");
                      carregarFrequenciaReal(alunoSelecionado.id, mesSelecionado);
                    }}
                  >
                    <strong>{alunoSelecionado.frequencia}%</strong>
                    <span>Frequência geral</span>
                  </button>
                </div>
                <div className="risk-reason">
                  <h3>Indicadores de acompanhamento</h3>
                  <div>🟡 Verificar tendência da frequência</div>
                  <div>🟡 Conferir notas e ocorrências recentes</div>
                </div>
                <div className="student-actions">
                  <button onClick={() => setModalAtivo("notas")}>
                    📝 <span>Notas</span>
                  </button>
                  <button onClick={() => setModalAtivo("ocorrencias")}>
                    📋 <span>Ocorrências</span>
                  </button>
                  <button onClick={() => navigate(`/alunos/${alunoSelecionado.id}`)}>
                    👤 <span>Perfil do aluno</span>
                  </button>
                </div>
              </>
            )}

            {modalAtivo === "frequencia" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div>
                    <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", color: "#0f172a" }}>
                      Frequência Geral
                    </h2>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <select
                        className="frequency-month-select"
                        value={mesSelecionado}
                        onChange={(e) => {
                          const novoMes = e.target.value;
                          setMesSelecionado(novoMes);
                          carregarFrequenciaReal(alunoSelecionado.id, novoMes);
                        }}
                      >
                        {MESES.map((mes) => (
                          <option key={mes} value={mes}>
                            {mes}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          carregarFrequenciaReal(alunoSelecionado.id, mesSelecionado)
                        }
                        disabled={carregandoFreq}
                        title="Atualizar registros do Totem Facial"
                        style={{
                          padding: "8px 12px",
                          borderRadius: "10px",
                          border: "1px solid #cbd5e1",
                          background: "#f8fafc",
                          color: "#334155",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: carregandoFreq ? "wait" : "pointer",
                        }}
                      >
                        {carregandoFreq ? "Sincronizando..." : "↻ Atualizar"}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      width: "74px",
                      height: "74px",
                      borderRadius: "50%",
                      background: `conic-gradient(#10b981 ${
                        alunoSelecionado.frequencia * 3.6
                      }deg, #e2e8f0 0deg)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "58px",
                        height: "58px",
                        borderRadius: "50%",
                        background: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "15px",
                        color: "#0f172a",
                      }}
                    >
                      {alunoSelecionado.frequencia}%
                    </div>
                  </div>
                </div>

                {/* Mini-cards de resumo do mês */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: "12px",
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                    }}
                  >
                    <strong style={{ display: "block", fontSize: "18px", color: "#047857" }}>
                      {totalPresencasMes}
                    </strong>
                    <span style={{ fontSize: "12px", color: "#065f46", fontWeight: 600 }}>
                      Presenças no mês
                    </span>
                  </div>
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: "12px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                    }}
                  >
                    <strong style={{ display: "block", fontSize: "18px", color: "#b91c1c" }}>
                      {totalFaltasMes}
                    </strong>
                    <span style={{ fontSize: "12px", color: "#991b1b", fontWeight: 600 }}>
                      Faltas
                    </span>
                  </div>
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: "12px",
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    <strong style={{ display: "block", fontSize: "18px", color: "#1d4ed8" }}>
                      {totalJustificadasMes}
                    </strong>
                    <span style={{ fontSize: "12px", color: "#1e40af", fontWeight: 600 }}>
                      Justificadas
                    </span>
                  </div>
                </div>

                {/* Dias da semana reais (Dom a Sáb) */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "6px",
                    textAlign: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                  }}
                >
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((diaSem) => (
                    <span key={diaSem}>{diaSem}</span>
                  ))}
                </div>

                {/* Grade do Calendário */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
                  {celulasVaziasInicio.map((vazio) => (
                    <div key={`empty-${vazio}`} style={{ height: "54px" }} />
                  ))}

                  {diasFrequencia.map((d) => {
                    const estilosPorStatus = {
                      presente: {
                        bg: "#ecfdf5",
                        border: "#6ee7b7",
                        color: "#047857",
                        badge: "✓",
                        label: d.horarioRegistro ? `Presente às ${d.horarioRegistro}` : "Presente",
                      },
                      falta: {
                        bg: "#fef2f2",
                        border: "#fca5a5",
                        color: "#b91c1c",
                        badge: "×",
                        label: "Falta",
                      },
                      justificada: {
                        bg: "#eff6ff",
                        border: "#93c5fd",
                        color: "#1d4ed8",
                        badge: "J",
                        label: "Falta Justificada",
                      },
                      "fim-de-semana": {
                        bg: "#f8fafc",
                        border: "#f1f5f9",
                        color: "#94a3b8",
                        badge: "—",
                        label: "Fim de semana",
                      },
                      futuro: {
                        bg: "#ffffff",
                        border: "#f1f5f9",
                        color: "#cbd5e1",
                        badge: "·",
                        label: "Aguardando",
                      },
                      "sem-registro": {
                        bg: "#f8fafc",
                        border: "#e2e8f0",
                        color: "#64748b",
                        badge: "—",
                        label: "Sem chamada registrada",
                      },
                    };
                    const st = estilosPorStatus[d.statusDia];

                    return (
                      <div
                        key={d.dia}
                        title={`Dia ${d.dia} de ${mesSelecionado}: ${st.label}`}
                        style={{
                          height: "54px",
                          borderRadius: "10px",
                          backgroundColor: st.bg,
                          border: d.ehHoje ? "2px solid #633df2" : `1px solid ${st.border}`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "2px",
                          boxShadow: d.ehHoje ? "0 0 0 2px rgba(99, 61, 242, 0.15)" : "none",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: d.ehHoje ? 800 : 600,
                            color: d.ehHoje ? "#633df2" : "#334155",
                          }}
                        >
                          {d.dia}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 800,
                            color: st.color,
                            lineHeight: 1,
                          }}
                        >
                          {st.badge}
                        </span>
                        {d.statusDia === "presente" && d.horarioRegistro && (
                          <span style={{ fontSize: "9px", color: "#059669", fontWeight: 600 }}>
                            {d.horarioRegistro}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legenda */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "14px",
                    fontSize: "12px",
                    color: "#475569",
                    paddingTop: "4px",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "3px",
                        background: "#10b981",
                      }}
                    />{" "}
                    Presente (Facial)
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "3px",
                        background: "#ef4444",
                      }}
                    />{" "}
                    Falta
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "3px",
                        background: "#3b82f6",
                      }}
                    />{" "}
                    Justificada
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "3px",
                        border: "2px solid #633df2",
                      }}
                    />{" "}
                    Hoje
                  </span>
                </div>

                <button className="back-frequency" onClick={() => setModalAtivo("principal")}>
                  ← Voltar
                </button>
              </div>
            )}

            {modalAtivo === "notas" && (
              <>
                <h2 className="detail-title">Notas Reais</h2>
                <div className="notes-filter">
                  <label htmlFor="mes-notas">Ver mês</label>
                  <select
                    id="mes-notas"
                    value={mesNotas}
                    onChange={(e) => setMesNotas(e.target.value)}
                  >
                    {MESES.map((mes) => (
                      <option key={mes}>{mes}</option>
                    ))}
                  </select>
                </div>

                {notasDoMes.length > 0 ? (
                  <>
                    <div className="notes-table-wrapper">
                      <table className="notes-table">
                        <thead>
                          <tr>
                            <th>Disciplina</th>
                            <th>Nota</th>
                            <th>Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notasDoMes.map((nota) => (
                            <tr key={nota.id}>
                              <td>{nota.subject}</td>
                              <td>
                                <span
                                  className={`note-badge ${
                                    nota.value < 5
                                      ? "nota-baixa"
                                      : nota.value < 7
                                      ? "nota-media"
                                      : "nota-alta"
                                  }`}
                                >
                                  {nota.value.toFixed(1)}
                                </span>
                              </td>
                              <td>{new Date(nota.date).toLocaleDateString("pt-BR")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="notes-average">
                      <span>Média do mês</span>
                      <strong>{mediaDoMes}</strong>
                    </div>
                  </>
                ) : (
                  <p
                    className="empty-message"
                    style={{ textAlign: "center", padding: "30px", color: "#666" }}
                  >
                    Sem notas registradas neste mês.
                  </p>
                )}
                <button className="back-frequency" onClick={() => setModalAtivo("principal")}>
                  ← Voltar
                </button>
              </>
            )}

            {modalAtivo === "ocorrencias" && (
              <>
                <h2 className="detail-title">Ocorrências Registradas</h2>
                <div className="occurrences-list">
                  {alunoSelecionado.incidents?.length > 0 ? (
                    alunoSelecionado.incidents.map((inc) => {
                      const descricaoLimpa = (inc.description || "")
                        .replace(/\|\s*\[Atestado:\s*https?:\/\/[^\]]+\]/i, "")
                        .trim();
                      return (
                        <article className="occurrence-item" key={inc.id}>
                          <div className="occurrence-icon">
                            {inc.type?.toLowerCase().includes("falta") ? "⚠️" : "📝"}
                          </div>
                          <div className="occurrence-content">
                            <div className="occurrence-top">
                              <strong>{inc.type}</strong>
                              <span>{new Date(inc.date).toLocaleDateString("pt-BR")}</span>
                            </div>
                            <p>{descricaoLimpa}</p>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <p
                      className="empty-message"
                      style={{ textAlign: "center", padding: "30px", color: "#666" }}
                    >
                      Nenhuma ocorrência registrada.
                    </p>
                  )}
                </div>
                <button className="back-frequency" onClick={() => setModalAtivo("principal")}>
                  ← Voltar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DO ALUNO (CRUD COMPLETO) */}
      {alunoEditando && (
        <div className="student-modal-overlay" onClick={() => setAlunoEditando(null)}>
          <div
            className="student-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Editar aluno"
            style={{ maxWidth: "540px" }}
          >
            <button
              className="close-modal"
              onClick={() => setAlunoEditando(null)}
              aria-label="Fechar edição"
            >
              ×
            </button>
            <h2 style={{ marginTop: 0 }}>Editar Aluno</h2>

            <form
              onSubmit={salvarEdicaoAluno}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Nome Completo *
                <input
                  type="text"
                  value={formAluno.name}
                  onChange={(e) => setFormAluno({ ...formAluno, name: e.target.value })}
                  required
                  style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Matrícula *
                  <input
                    type="text"
                    value={formAluno.registration}
                    onChange={(e) =>
                      setFormAluno({ ...formAluno, registration: e.target.value })
                    }
                    required
                    style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </label>

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  E-mail
                  <input
                    type="email"
                    value={formAluno.email}
                    onChange={(e) => setFormAluno({ ...formAluno, email: e.target.value })}
                    style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </label>
              </div>

              {/* TOGGLE LIST DE TURMAS NA EDIÇÃO DO ALUNO */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Turma *</span>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    maxHeight: "150px",
                    overflowY: "auto",
                  }}
                >
                  {turmasLista.map((t) => {
                    const id = t.id || t._id;
                    const ativo = String(formAluno.classId) === String(id);
                    const info = formatarTurmaCompleta(t, t.name);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFormAluno({ ...formAluno, classId: id })}
                        style={{
                          padding: "7px 12px",
                          borderRadius: "8px",
                          border: ativo ? "2px solid #633df2" : "1px solid #cbd5e1",
                          background: ativo ? "#633df2" : "#fff",
                          color: ativo ? "#fff" : "#1e293b",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div>{info.nome}</div>
                        {info.detalhe && (
                          <div style={{ fontSize: "10px", opacity: 0.85 }}>{info.detalhe}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Responsável
                  <input
                    type="text"
                    value={formAluno.guardianName}
                    onChange={(e) =>
                      setFormAluno({ ...formAluno, guardianName: e.target.value })
                    }
                    style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </label>

                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Telefone do Responsável
                  <input
                    type="tel"
                    value={formAluno.guardianPhone}
                    onChange={(e) =>
                      setFormAluno({ ...formAluno, guardianPhone: e.target.value })
                    }
                    style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </label>
              </div>

              {erroEdicaoAluno && (
                <p
                  style={{
                    color: "#b91c1c",
                    background: "#fee2e2",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    margin: 0,
                  }}
                >
                  {erroEdicaoAluno}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "6px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setAlunoEditando(null)}
                  style={{
                    padding: "9px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoAluno}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#633df2",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {salvandoAluno ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}