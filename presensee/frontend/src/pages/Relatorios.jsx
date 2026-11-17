import { useMemo, useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import "../styles/Relatorios.css";

const TIPOS = [
  { id: "frequencia", nome: "Frequência por turma" },
  { id: "risco", nome: "Risco de evasão" },
  { id: "faltas", nome: "Histórico de faltas" },
  { id: "cadastro", nome: "Cadastro de alunos" },
  { id: "acompanhamento", nome: "Acompanhamento escolar" },
  { id: "intervencoes", nome: "Histórico de intervenções" },
];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

const media = (itens) => itens.length ? Math.round(itens.reduce((s, n) => s + Number(n), 0) / itens.length) : 0;
const risco = (f) => Number(f) >= 90 ? "Baixo" : Number(f) >= 75 ? "Médio" : "Alto";
const corFreq = (f) => Number(f) >= 90 ? "ok" : Number(f) >= 75 ? "atencao" : "risco";
const formatar = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "") ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : d || "—";
const limparPdf = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "-");
const textoSeguroCSV = (valor) => {
  const txt = String(valor ?? "");
  const seguro = /^[\s]*[=+@-]/.test(txt) ? `'${txt}` : txt;
  return `"${seguro.replace(/"/g, '""')}"`;
};

const limparDescricaoIncidente = (texto) =>
  String(texto || "")
    .replace(/\[Prioridade:\s*(Alta|Média|Baixa)\]\s*/gi, "")
    .replace(/\|\s*\[Atestado:\s*https?:\/\/[^\]]+\]/gi, "")
    .trim();

function formatarTurmaCompleta(classObj, fallbackNome) {
  const nome = classObj?.name || classObj?.nome || fallbackNome || "Sem turma";
  const curso = classObj?.course || classObj?.curso || "";
  const turno = classObj?.shift || classObj?.turno || "";
  const detalhe = [curso, turno].filter(Boolean).join(" · ");
  return {
    nome,
    detalhe,
    rotuloCompleto: detalhe ? `${nome} (${detalhe})` : nome,
  };
}

/* ---------- Helpers de data (sempre em horário local, formato AAAA-MM-DD) ---------- */
const paraISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const deISO = (s) => { const [a, m, d] = s.split("-").map(Number); return new Date(a, m - 1, d); };
const primeiroDiaDoMes = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

function Icone({ tipo, size = 20 }) {
  const paths = {
    relatorio: <><path d="M4 4h10l4 4v12H4z"/><path d="M14 4v4h4M8 13h6M8 17h6"/></>,
    pessoas: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    calendario: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    chevron: <path d="m6 9 6 6 6-6"/>,
    excel: <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8l5 8M13 8l-5 8M15 8h3M15 12h3M15 16h3"/></>,
    alerta: <><path d="M12 3v11"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></>,
    esquerda: <path d="m15 18-6-6 6-6"/>,
    direita: <path d="m9 18 6-6-6-6"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[tipo]}</svg>;
}

/* ---------- Seletor de período ---------- */
function SeletorPeriodo({ inicio, fim, onChange }) {
  const [aberto, setAberto] = useState(false);
  const [mesBase, setMesBase] = useState(() => primeiroDiaDoMes(deISO(inicio)));
  const [ini, setIni] = useState(inicio);
  const [fi, setFi] = useState(fim);
  const [hover, setHover] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  function alternar() {
    if (!aberto) {
      setIni(inicio);
      setFi(fim);
      setHover(null);
      setMesBase(primeiroDiaDoMes(deISO(inicio)));
    }
    setAberto(!aberto);
  }

  function aplicar(a, b) {
    onChange(a, b);
    setAberto(false);
  }

  function clicarDia(iso) {
    if (ini && !fi) {
      if (iso < ini) { setIni(iso); return; }
      setFi(iso);
      aplicar(ini, iso);
      return;
    }
    setIni(iso);
    setFi(null);
  }

  function mudarMes(delta) {
    setMesBase((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  const hojeISO = paraISO(new Date());
  const limiteFim = fi || (ini && hover && hover >= ini ? hover : null);

  function renderMes(base) {
    const ano = base.getFullYear();
    const mes = base.getMonth();
    const vazios = new Date(ano, mes, 1).getDay();
    const total = new Date(ano, mes + 1, 0).getDate();
    const celulas = [];

    for (let i = 0; i < vazios; i++) celulas.push(<span key={`v${i}`} className="periodo-dia periodo-dia--vazio" />);

    for (let d = 1; d <= total; d++) {
      const iso = paraISO(new Date(ano, mes, d));
      const eInicio = iso === ini;
      const eFim = iso === limiteFim;
      const noMeio = ini && limiteFim && iso > ini && iso < limiteFim;
      const classes = [
        "periodo-dia",
        eInicio ? "periodo-dia--inicio" : "",
        eFim ? "periodo-dia--fim" : "",
        noMeio ? "periodo-dia--meio" : "",
        eInicio && limiteFim && limiteFim !== ini ? "periodo-dia--tem-faixa" : "",
        iso === hojeISO ? "periodo-dia--hoje" : "",
      ].join(" ");

      celulas.push(
        <button
          key={iso}
          type="button"
          className={classes}
          onClick={() => clicarDia(iso)}
          onMouseEnter={() => setHover(iso)}
        >
          <span>{d}</span>
        </button>
      );
    }

    return (
      <div className="periodo-mes" key={`${ano}-${mes}`}>
        <div className="periodo-mes-titulo">{MESES[mes]} de {ano}</div>
        <div className="periodo-semana">
          {DIAS_SEMANA.map((s, i) => <span key={i}>{s}</span>)}
        </div>
        <div className="periodo-grade" onMouseLeave={() => setHover(null)}>{celulas}</div>
      </div>
    );
  }

  const atalhos = [
    {
      nome: "Este mês",
      valor: () => {
        const h = new Date();
        return [paraISO(new Date(h.getFullYear(), h.getMonth(), 1)), paraISO(h)];
      },
    },
    {
      nome: "Mês passado",
      valor: () => {
        const h = new Date();
        return [paraISO(new Date(h.getFullYear(), h.getMonth() - 1, 1)), paraISO(new Date(h.getFullYear(), h.getMonth(), 0))];
      },
    },
    {
      nome: "Últimos 30 dias",
      valor: () => {
        const h = new Date();
        return [paraISO(new Date(h.getFullYear(), h.getMonth(), h.getDate() - 29)), paraISO(h)];
      },
    },
  ];

  const segundoMes = new Date(mesBase.getFullYear(), mesBase.getMonth() + 1, 1);

  return (
    <div className="periodo-wrap" ref={ref}>
      <button type="button" className="report-select-wrap periodo-trigger" onClick={alternar} aria-haspopup="dialog" aria-expanded={aberto}>
        <Icone tipo="calendario" />
        <span className="periodo-trigger-texto">{formatar(inicio)} — {formatar(fim)}</span>
        <Icone tipo="chevron" size={18} />
      </button>

      {aberto && (
        <div className="periodo-popup" role="dialog" aria-label="Selecionar período">
          <button type="button" className="periodo-nav periodo-nav--prev" onClick={() => mudarMes(-1)} aria-label="Mês anterior">
            <Icone tipo="esquerda" size={18} />
          </button>
          <button type="button" className="periodo-nav periodo-nav--next" onClick={() => mudarMes(1)} aria-label="Próximo mês">
            <Icone tipo="direita" size={18} />
          </button>

          <div className="periodo-meses">
            {renderMes(mesBase)}
            {renderMes(segundoMes)}
          </div>

          <div className="periodo-rodape">
            <span className="periodo-dica">
              {ini && !fi ? "Agora escolha a data final" : "Escolha a data inicial e a final"}
            </span>
            <div className="periodo-atalhos">
              {atalhos.map((a) => (
                <button key={a.nome} type="button" className="periodo-atalho" onClick={() => { const [x, y] = a.valor(); aplicar(x, y); }}>
                  {a.nome}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Relatorios() {
  const [tipo, setTipo] = useState("frequencia");
  const [turmaFiltro, setTurmaFiltro] = useState("TODAS");

  const [alunosData, setAlunosData] = useState([]);
  const [chamadasData, setChamadasData] = useState([]);
  const [intervencoesData, setIntervencoesData] = useState([]);
  const [turmasData, setTurmasData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dataInicio, setDataInicio] = useState(() => {
    const h = new Date();
    return paraISO(new Date(h.getFullYear(), h.getMonth(), 1));
  });
  const [dataFim, setDataFim] = useState(() => paraISO(new Date()));

  const descricaoPeriodo = `${formatar(dataInicio)} a ${formatar(dataFim)}`;
  const sufixoArquivo = `${dataInicio}_a_${dataFim}`;
  const noPeriodo = (data) => {
    const dia = String(data || "").slice(0, 10);
    return dia >= dataInicio && dia <= dataFim;
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [resAlunos, resIncidentes, resTurmas, resChamadas] = await Promise.all([
          api.get("/students").catch(() => ({ data: [] })),
          api.get("/incidents").catch(() => ({ data: [] })),
          api.get("/classes").catch(() => ({ data: [] })),
          api.get("/attendances").catch(() => ({ data: [] })),
        ]);

        const todasChamadas = Array.isArray(resChamadas.data) ? resChamadas.data : [];
        const todosIncidentes = Array.isArray(resIncidentes.data) ? resIncidentes.data : [];
        const todasTurmas = Array.isArray(resTurmas.data) ? resTurmas.data : [];

        const mapaTurmasPorId = new Map();
        todasTurmas.forEach((t) => {
          const tid = String(t.id || t._id);
          mapaTurmasPorId.set(tid, t);
        });

        const chamadasPorAluno = new Map();
        todasChamadas.forEach((c) => {
          const sid = String(c.studentId);
          if (!chamadasPorAluno.has(sid)) chamadasPorAluno.set(sid, []);
          chamadasPorAluno.get(sid).push(c);
        });

        const pendenciasPorAluno = new Map();
        todosIncidentes.forEach((inc) => {
          if (!inc.studentId) return;
          if (inc.type === "PENDENCIA" || inc.isPending === true) {
            const sid = String(inc.studentId);
            if (!pendenciasPorAluno.has(sid)) pendenciasPorAluno.set(sid, []);
            pendenciasPorAluno.get(sid).push(limparDescricaoIncidente(inc.description));
          }
        });

        const alunosFormatados = (resAlunos.data || []).map((a) => {
          const sid = String(a.id || a._id);
          const turmaId = String(a.classId || a.class?.id || "");
          const turmaObj = a.class || mapaTurmasPorId.get(turmaId) || null;
          const infoTurma = formatarTurmaCompleta(turmaObj, a.turma);

          const chamadasAluno = chamadasPorAluno.get(sid) || [];
          const faltasNaoJustificadas = chamadasAluno.filter((c) => c.status === "ABSENT").length;

          const historicoFaltasReais = chamadasAluno
            .filter((c) => c.status === "ABSENT" || c.status === "EXCUSED")
            .map((c) => ({
              data: paraISO(new Date(c.date)),
              justificada: c.status === "EXCUSED",
            }));

          return {
            ...a,
            id: sid,
            nome: a.name || a.nome,
            turmaId: turmaId || infoTurma.rotuloCompleto,
            turma: infoTurma.nome,
            turmaDetalhe: infoTurma.detalhe,
            turmaCompleta: infoTurma.rotuloCompleto,
            frequencia: a.frequency ?? a.attendanceRate ?? a.frequencia ?? 100,
            faltas: chamadasAluno.length > 0 ? faltasNaoJustificadas : (a.absences ?? a.faltas ?? 0),
            historicoFaltas: historicoFaltasReais,
            pendencias: pendenciasPorAluno.get(sid) || [],
          };
        });

        const intervencoesFormatadas = todosIncidentes
          .filter(
            (i) =>
              i.studentId &&
              !["FICHA_CADASTRO", "CONFIG_HORARIO_AULA", "PENDENCIA", "RESOLVIDO"].includes(i.type)
          )
          .map((i) => ({
            ...i,
            id: i.id || i._id,
            alunoId: String(i.studentId || i.alunoId),
            data: i.date || i.createdAt || i.data,
            tipo: i.type || i.tipo || "Intervenção",
            descricao: limparDescricaoIncidente(i.description || i.descricao),
          }));

        setAlunosData(alunosFormatados);
        setChamadasData(todasChamadas);
        setIntervencoesData(intervencoesFormatadas);
        setTurmasData(todasTurmas);
      } catch (error) {
        console.error("Erro ao carregar dados para os relatórios:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Lista padronizada de turmas com ID + Rótulo Completo: "1º Ano A (Ensino Fundamental · Tarde)"
  const LISTA_TURMAS = useMemo(() => {
    const mapa = new Map();

    turmasData.forEach((t) => {
      const id = String(t.id || t._id);
      const info = formatarTurmaCompleta(t, t.name);
      mapa.set(id, {
        id,
        nome: info.nome,
        detalhe: info.detalhe,
        rotuloCompleto: info.rotuloCompleto,
        attendanceRate: t.attendanceRate,
      });
    });

    alunosData.forEach((a) => {
      const id = String(a.turmaId);
      if (id && !mapa.has(id)) {
        mapa.set(id, {
          id,
          nome: a.turma,
          detalhe: a.turmaDetalhe,
          rotuloCompleto: a.turmaCompleta,
          attendanceRate: undefined,
        });
      }
    });

    return Array.from(mapa.values()).sort((a, b) =>
      a.rotuloCompleto.localeCompare(b.rotuloCompleto, "pt-BR", { numeric: true })
    );
  }, [turmasData, alunosData]);

  const nomeTurmaSelecionada = useMemo(() => {
    if (turmaFiltro === "TODAS") return "Todas as turmas";
    const encontrada = LISTA_TURMAS.find((t) => t.id === turmaFiltro);
    return encontrada ? encontrada.rotuloCompleto : turmaFiltro;
  }, [turmaFiltro, LISTA_TURMAS]);

  const estudantes = useMemo(
    () =>
      alunosData.filter((a) => {
        const freq = a.frequencia ?? 100;
        return (
          Number.isFinite(Number(freq)) &&
          (turmaFiltro === "TODAS" || String(a.turmaId) === String(turmaFiltro))
        );
      }),
    [alunosData, turmaFiltro]
  );

  const faltasPeriodo = useMemo(
    () =>
      estudantes.flatMap((a) =>
        (a.historicoFaltas || [])
          .filter((f) => noPeriodo(f.data))
          .map((f) => ({ aluno: a, ...f }))
      ),
    [estudantes, dataInicio, dataFim]
  );

  const intervencoesPeriodo = useMemo(
    () =>
      intervencoesData
        .filter((i) => noPeriodo(i.data))
        .filter((i) => estudantes.some((a) => String(a.id) === String(i.alunoId)))
        .map((i) => ({
          ...i,
          aluno: estudantes.find((a) => String(a.id) === String(i.alunoId)),
        })),
    [intervencoesData, estudantes, dataInicio, dataFim]
  );

  const turmas = useMemo(
    () =>
      LISTA_TURMAS.filter((t) => turmaFiltro === "TODAS" || String(t.id) === String(turmaFiltro)).map(
        (turmaObj) => {
          const lista = estudantes.filter((a) => String(a.turmaId) === String(turmaObj.id));
          const faltas = faltasPeriodo.filter((f) => String(f.aluno.turmaId) === String(turmaObj.id));
          const acoes = intervencoesPeriodo.filter((i) => String(i.aluno.turmaId) === String(turmaObj.id));

          const freqMedia =
            lista.length === 0
              ? 0
              : turmaObj.attendanceRate !== undefined
              ? turmaObj.attendanceRate
              : media(lista.map((a) => a.frequencia));

          return {
            id: turmaObj.id,
            turma: turmaObj.nome,
            detalhe: turmaObj.detalhe,
            turmaCompleta: turmaObj.rotuloCompleto,
            alunos: lista.length,
            frequencia: freqMedia,
            baixo: lista.filter((a) => risco(a.frequencia) === "Baixo").length,
            medio: lista.filter((a) => risco(a.frequencia) === "Médio").length,
            alto: lista.filter((a) => risco(a.frequencia) === "Alto").length,
            faltas: faltas.filter((f) => !f.justificada).length,
            justificadas: faltas.filter((f) => f.justificada).length,
            intervencoes: acoes.length,
            comPendencias: lista.filter((a) => (a.pendencias || []).length > 0).length,
          };
        }
      ),
    [LISTA_TURMAS, estudantes, faltasPeriodo, intervencoesPeriodo, turmaFiltro]
  );

  const freqGeral = useMemo(() => {
    if (estudantes.length === 0) return 0;
    const idsEstudantes = new Set(estudantes.map((e) => String(e.id)));
    const chamadasFiltradas = chamadasData.filter((c) => idsEstudantes.has(String(c.studentId)));
    if (chamadasFiltradas.length > 0) {
      const presentesOuAbonados = chamadasFiltradas.filter(
        (c) => c.status === "PRESENT" || c.status === "EXCUSED"
      ).length;
      return Math.round((presentesOuAbonados / chamadasFiltradas.length) * 100);
    }
    return media(estudantes.map((a) => a.frequencia));
  }, [estudantes, chamadasData]);

  const resumo = [
    { titulo: "Frequência Geral", valor: `${freqGeral}%`, icone: "%", classe: "frequencia" },
    { titulo: "Total de Alunos", valor: estudantes.length, icone: "pessoas", classe: "alunos" },
    { titulo: "Alunos em Risco", valor: estudantes.filter((a) => Number(a.frequencia) < 90).length, icone: "alerta", classe: "risco" },
  ];

  const colunas = {
    frequencia: ["Turma / Modalidade", "Alunos", "Frequência"],
    risco: ["Turma / Modalidade", "Médio risco", "Alto risco"],
    faltas: ["Turma / Modalidade", "Faltas não justificadas", "Justificadas / Abonadas"],
    cadastro: ["Turma / Modalidade", "Alunos", "Frequência"],
    acompanhamento: ["Turma / Modalidade", "Com pendências", "Em risco"],
    intervencoes: ["Turma / Modalidade", "Intervenções no período", "Alunos"],
  }[tipo];

  const linhasResumo = turmas.map((t) => {
    switch (tipo) {
      case "risco": return [t.turmaCompleta, t.medio, t.alto];
      case "faltas": return [t.turmaCompleta, t.faltas, t.justificadas];
      case "acompanhamento": return [t.turmaCompleta, t.comPendencias, t.medio + t.alto];
      case "intervencoes": return [t.turmaCompleta, t.intervencoes, t.alunos];
      default: return [t.turmaCompleta, t.alunos, `${t.frequencia}%`];
    }
  });

  const titulo = TIPOS.find((t) => t.id === tipo)?.nome || "Relatório";

  function montarRelatorio() {
    const secoes = [];
    const adicionar = (nome, cabecalho, linhas) => secoes.push({ nome, cabecalho, linhas });

    adicionar("Resumo por turma", colunas, linhasResumo);

    const linhaAluno = (a) => {
      const freq = a.frequencia;
      return [
        a.registration || a.matricula || a.id,
        a.nome,
        a.turmaCompleta,
        `${freq}%`,
        risco(freq),
        a.faltas,
        a.status || "Ativo",
        a.email || "",
        a.telefone || "",
        (a.guardians || a.responsaveis || [])
          .map((r) => `${r.nome || r.name} (${r.parentesco || "Resp."}): ${r.telefone || ""}`)
          .join(" | "),
      ];
    };

    const cabAluno = [
      "Matrícula",
      "Nome completo",
      "Turma / Modalidade",
      "Frequência atual",
      "Risco atual",
      "Faltas não justificadas",
      "Situação",
      "E-mail",
      "Contato",
      "Responsáveis e telefones",
    ];

    const alunosOrdenados = [...estudantes].sort((a, b) => {
      const turmaA = a.turmaCompleta || "";
      const turmaB = b.turmaCompleta || "";
      const nomeA = a.nome || "";
      const nomeB = b.nome || "";
      return turmaA.localeCompare(turmaB, "pt-BR", { numeric: true }) || nomeA.localeCompare(nomeB);
    });

    adicionar("Dados individuais dos alunos (situação atual)", cabAluno, alunosOrdenados.map(linhaAluno));

    if (["frequencia", "risco", "acompanhamento", "cadastro"].includes(tipo)) {
      adicionar(
        "Acompanhamento individual",
        ["Matrícula", "Aluno", "Turma / Modalidade", "Risco atual", "Observações", "Pendências abertas"],
        alunosOrdenados.map((a) => [
          a.registration || a.matricula || a.id,
          a.nome,
          a.turmaCompleta,
          risco(a.frequencia),
          a.observacoes || "",
          (a.pendencias || []).join(" | "),
        ])
      );
    }

    if (["faltas", "frequencia", "acompanhamento"].includes(tipo)) {
      adicionar(
        `Ausências e abonos registrados de ${descricaoPeriodo}`,
        ["Data", "Matrícula", "Aluno", "Turma / Modalidade", "Status"],
        [...faltasPeriodo]
          .sort((a, b) => b.data.localeCompare(a.data))
          .map((f) => [
            formatar(f.data),
            f.aluno.registration || f.aluno.matricula || f.aluno.id,
            f.aluno.nome,
            f.aluno.turmaCompleta,
            f.justificada ? "Justificada / Abonada" : "Falta",
          ])
      );
    }

    if (["intervencoes", "acompanhamento", "risco"].includes(tipo)) {
      adicionar(
        `Intervenções registradas de ${descricaoPeriodo}`,
        ["Data", "Matrícula", "Aluno", "Turma / Modalidade", "Tipo", "Descrição"],
        [...intervencoesPeriodo]
          .sort((a, b) => String(b.data).localeCompare(String(a.data)))
          .map((i) => [
            formatar(String(i.data).slice(0, 10)),
            i.aluno.registration || i.aluno.matricula || i.aluno.id,
            i.aluno.nome,
            i.aluno.turmaCompleta,
            i.tipo,
            i.descricao || "",
          ])
      );
    }

    return secoes;
  }

  function exportarExcel() {
    const secoes = montarRelatorio();
    const linhas = [
      ["PresenSee — " + titulo],
      ["Turma", nomeTurmaSelecionada],
      ["Período de registros", descricaoPeriodo],
      ["Indicadores de frequência e risco", "Situação atual extraída da API"],
      ["Gerado em", new Date().toLocaleString("pt-BR")],
      [],
      ...resumo.map((r) => [r.titulo, r.valor]),
      [],
    ];

    secoes.forEach((s) => {
      linhas.push([s.nome], s.cabecalho, ...(s.linhas.length ? s.linhas : [["Nenhum registro no período"]]), []);
    });

    const csv = linhas.map((linha) => linha.map(textoSeguroCSV).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `presensee-${tipo}-${sufixoArquivo}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportarPDF() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const largura = 297, margem = 13, rodape = 196;
    let y = 18;

    const inicioPagina = () => {
      doc.setFillColor(96, 61, 228); doc.rect(0, 0, largura, 7, "F");
      doc.setTextColor(28, 31, 59); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
      doc.text("PresenSee - " + limparPdf(titulo), margem, 17);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(95, 100, 125);
      doc.text(limparPdf(`${nomeTurmaSelecionada} | ${descricaoPeriodo} | Relatório API`), margem, 24);
      y = 32;
    };

    inicioPagina();
    doc.setFontSize(10); doc.setTextColor(45, 48, 75);
    const resumoLinha = resumo.map((r) => `${limparPdf(r.titulo)}: ${r.valor}`).join("      |      ");
    doc.text(resumoLinha, margem, y); y += 7;
    doc.setFontSize(8); doc.setTextColor(95, 100, 120);
    doc.text("Frequencia e risco: situacao atual no banco de dados (faltas abonadas contam como presenca).", margem, y); y += 11;

    const larguraColunas = (quantidade) => (largura - margem * 2) / quantidade;

    const blocoTabela = (secao) => {
      if (y > rodape - 20) { doc.addPage(); inicioPagina(); }
      doc.setTextColor(60, 40, 145); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text(limparPdf(secao.nome), margem, y); y += 7;
      const colWidth = larguraColunas(secao.cabecalho.length);

      const cabe = () => {
        if (y > rodape - 12) { doc.addPage(); inicioPagina(); }
        doc.setFillColor(238, 235, 249); doc.rect(margem, y - 4, largura - 2 * margem, 8, "F");
        doc.setTextColor(35, 33, 80); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
        secao.cabecalho.forEach((valor, i) => doc.text(doc.splitTextToSize(limparPdf(valor), colWidth - 3).slice(0, 1), margem + i * colWidth + 1, y));
        y += 8;
      };

      cabe();
      const valores = secao.linhas.length ? secao.linhas : [["Nenhum registro no período"]];

      valores.forEach((linha, index) => {
        const celulas = secao.cabecalho.map((_, i) => doc.splitTextToSize(limparPdf(linha[i] ?? ""), colWidth - 3).slice(0, 3));
        const altura = Math.max(7, Math.max(...celulas.map((c) => c.length)) * 3.6 + 2);
        if (y + altura > rodape) { doc.addPage(); inicioPagina(); cabe(); }
        if (index % 2 === 0) { doc.setFillColor(249, 248, 252); doc.rect(margem, y - 3.5, largura - 2 * margem, altura, "F"); }
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(45, 45, 65);
        celulas.forEach((c, i) => doc.text(c, margem + i * colWidth + 1, y));
        y += altura;
      });
      y += 10;
    };

    montarRelatorio().forEach(blocoTabela);

    for (let p = 1; p <= doc.getNumberOfPages(); p++) {
      doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(115, 116, 132);
      doc.text(`PresenSee - Pagina ${p} de ${doc.getNumberOfPages()}`, margem, 204);
    }

    doc.save(`presensee-${tipo}-${sufixoArquivo}.pdf`);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <main className="relatorios-page">
          <p style={{ padding: "2rem" }}>Gerando dados do relatório a partir da API...</p>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="relatorios-page">
        <header className="report-header">
          <h1>Relatórios</h1>
          <p>Gere relatórios detalhados a partir dos dados da escola.</p>
        </header>

        <section className="report-filtros" aria-label="Configuração do relatório">
          <label className="report-filtro"><span>Tipo de relatório</span><div className="report-select-wrap">
            <Icone tipo="relatorio" /><select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select><Icone tipo="chevron" size={18}/></div>
          </label>
          <label className="report-filtro"><span>Turma</span><div className="report-select-wrap">
            <Icone tipo="pessoas" /><select value={turmaFiltro} onChange={(e) => setTurmaFiltro(e.target.value)}>
              <option value="TODAS">Todas as turmas</option>
              {LISTA_TURMAS.map((t) => (
                <option key={t.id} value={t.id}>{t.rotuloCompleto}</option>
              ))}
            </select><Icone tipo="chevron" size={18}/></div>
          </label>
          <div className="report-filtro">
            <span>Período</span>
            <SeletorPeriodo
              inicio={dataInicio}
              fim={dataFim}
              onChange={(a, b) => { setDataInicio(a); setDataFim(b); }}
            />
          </div>
          <div className="report-actions">
            <button type="button" className="report-button report-button--excel" onClick={exportarExcel}><Icone tipo="excel" size={17}/> Exportar Excel</button>
            <button type="button" className="report-button report-button--pdf" onClick={exportarPDF}><Icone tipo="relatorio" size={17}/> Exportar PDF</button>
          </div>
        </section>

        <section className="report-cards" aria-label="Resumo escolar">
          {resumo.map((item) => <article className="report-card" key={item.titulo}>
            <div className={`report-card-icon report-card-icon--${item.classe}`}>
              {item.icone === "%" ? <strong>%</strong> : <Icone tipo={item.icone} size={26}/>}
            </div><div className="report-card-dados"><h3>{item.titulo}</h3><p>{item.valor}</p></div>
          </article>)}
        </section>

        <section className="report-table-container">
          <div className="report-section-header"><h2>{titulo}</h2></div>
          <p className="report-contexto">{["faltas", "intervencoes"].includes(tipo)
            ? `Registros de ${descricaoPeriodo}. Exportações incluem os detalhes por aluno e data.`
            : "Indicadores atuais baseados no banco de dados. Na exportação, os registros datados são filtrados pelo período selecionado."}</p>
          <div className="report-table-scroll"><table className="report-table"><thead><tr>
            {colunas.map((c) => <th key={c}>{c}</th>)}
          </tr></thead><tbody>{turmas.map((t, index) => (
            <tr key={t.id}><td className="report-turma-name">
              <div>{t.turma}</div>
              {t.detalhe && <small style={{ display: "block", fontSize: "11px", color: "#64748b", fontWeight: 500 }}>{t.detalhe}</small>}
            </td>
              <td>{linhasResumo[index][1]}</td>
              <td>{["frequencia", "cadastro"].includes(tipo) ? <div className="report-frequency">
                <span className={`report-badge report-badge--${corFreq(t.frequencia)}`}>{t.frequencia}%</span>
                <div className="report-frequency-bar" role="progressbar" aria-label={`Frequência de ${t.turmaCompleta}`} aria-valuenow={t.frequencia} aria-valuemin={0} aria-valuemax={100}>
                  <span className={`report-frequency-fill report-frequency-fill--${corFreq(t.frequencia)}`} style={{width: `${t.frequencia}%`}}/>
                </div></div> : linhasResumo[index][2]}</td>
            </tr>))}</tbody></table></div>
        </section>
      </main>
    </DashboardLayout>
  );
}