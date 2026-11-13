import { useMemo, useRef, useState, useEffect } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import "../styles/Calendario.css";

const CORES = ["#633df2", "#17b989", "#3187f4", "#fa667c", "#e9af32", "#f59c52"];
const TIPOS = ["Evento externo", "Pedagógico", "Esportivo", "Outro"];

const MODELO = {
  titulo: "", descricao: "", tipo: "Evento externo", modo: "periodo", inicio: "", fim: "",
  alternados: [], cor: CORES[0], abono: "escola", publico: "", alunoIds: ""
};

function parseData(valor) {
  return new Date(`${valor}T12:00:00`);
}

function dataISO(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function gerarIntervalo(inicio, fim) {
  if (!inicio || !fim || fim < inicio) return [];
  const lista = [];
  const atual = parseData(inicio);
  const ultimo = parseData(fim);
  while (atual <= ultimo && lista.length < 366) {
    lista.push(dataISO(atual));
    atual.setDate(atual.getDate() + 1);
  }
  return lista;
}

function formatarData(data) {
  return parseData(data).toLocaleDateString("pt-BR");
}

function resumoDatas(datas) {
  if (!datas?.length) return "—";
  const ordenadas = [...datas].sort();
  return ordenadas.length === 1
    ? formatarData(ordenadas[0])
    : `${formatarData(ordenadas[0])} – ${formatarData(ordenadas.at(-1))}${
        ordenadas.length > 2 && gerarIntervalo(ordenadas[0], ordenadas.at(-1)).length !== ordenadas.length
          ? ` (${ordenadas.length} dias)`
          : ""
      }`;
}

function calendarioDoMes(mes) {
  const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1, 12);
  const inicio = new Date(primeiro);
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7));
  const ultimo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  const quantidade = Math.ceil((((primeiro.getDay() + 6) % 7) + ultimo.getDate()) / 7) * 7;
  return Array.from({ length: quantidade }, (_, index) => {
    const data = new Date(inicio);
    data.setDate(inicio.getDate() + index);
    return { data: dataISO(data), numero: data.getDate(), noMes: data.getMonth() === mes.getMonth() };
  });
}

export default function Calendario() {
  const [eventos, setEventos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(() => new Date());
  const [visao, setVisao] = useState("mes");
  const [diaSelecionado, setDiaSelecionado] = useState(dataISO(new Date()));
  const [painel, setPainel] = useState("fechado");
  const [form, setForm] = useState({ ...MODELO, inicio: dataISO(new Date()), fim: dataISO(new Date()) });
  const [editando, setEditando] = useState(null);
  const [pesquisa, setPesquisa] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  // Estados de Justificativa de Falta com Autocomplete + Toggle List
  const [atestado, setAtestado] = useState({ alunoId: "", aluno: "", turma: "", inicio: "", fim: "", observacao: "" });
  const [arquivoAtestado, setArquivoAtestado] = useState(null);
  const [listaAlunosAberta, setListaAlunosAberta] = useState(false);
  const [listaTurmasAberta, setListaTurmasAberta] = useState(false);
  const [salvandoAtestado, setSalvandoAtestado] = useState(false);
  const buscaAlunoRef = useRef(null);
  const buscaTurmaRef = useRef(null);

  const tituloMes = mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const dias = useMemo(() => calendarioDoMes(mes), [mes]);
  const eventosMes = useMemo(
    () => eventos.filter((evento) => evento.datas && evento.datas.some((data) => data.startsWith(dataISO(mes).slice(0, 7)))),
    [eventos, mes]
  );
  const eventosFiltrados = useMemo(
    () =>
      eventosMes
        .filter(
          (evento) =>
            (!filtroTipo || evento.tipo === filtroTipo) &&
            `${evento.titulo} ${evento.descricao}`.toLowerCase().includes(pesquisa.trim().toLowerCase())
        )
        .sort((a, b) => (a.datas?.[0] || "").localeCompare(b.datas?.[0] || "")),
    [eventosMes, filtroTipo, pesquisa]
  );

  // Fecha as toggle lists ao clicar fora
  useEffect(() => {
    function aoClicarFora(e) {
      if (buscaTurmaRef.current && !buscaTurmaRef.current.contains(e.target)) {
        setListaTurmasAberta(false);
      }
      if (buscaAlunoRef.current && !buscaAlunoRef.current.contains(e.target)) {
        setListaAlunosAberta(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const carregarEventos = async () => {
    try {
      const response = await api.get("/events");
      const eventosMapeados = (Array.isArray(response.data) ? response.data : []).map((e) => ({
        id: e.id || e._id,
        titulo: e.title || e.titulo,
        descricao: e.description || e.descricao,
        tipo: e.type || e.tipo,
        modo: e.mode || e.modo || "periodo",
        datas: e.dates || e.datas || [],
        cor: e.color || e.cor || CORES[0],
        abono: e.allowance || e.abono || "escola",
        publico: e.audience || e.publico || ""
      }));
      setEventos(eventosMapeados);
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarTurmasEAlunos = async () => {
    try {
      const [resTurmas, resAlunos] = await Promise.all([
        api.get("/classes"),
        api.get("/students")
      ]);
      const listaTurmas = Array.isArray(resTurmas.data) ? resTurmas.data : [];
      const listaAlunos = (Array.isArray(resAlunos.data) ? resAlunos.data : []).map((a) => ({
        id: a.id || a._id,
        nome: a.name || a.nome || "Aluno sem nome",
        matricula: a.registration || a.matricula || "",
        turma: a.class?.name || a.turma || "Sem turma"
      }));
      setTurmas(listaTurmas);
      setAlunos(listaAlunos);
    } catch (error) {
      console.error("Erro ao carregar turmas e alunos:", error);
    }
  };

  useEffect(() => {
    carregarEventos();
    carregarTurmasEAlunos();
  }, []);

  const turmasSugeridas = useMemo(() => {
    const termo = normalizar(atestado.turma);
    const nomesTurmas = turmas.map((t) => t.name || t.nome).filter(Boolean);
    return nomesTurmas.filter((nome) => !termo || normalizar(nome).includes(termo));
  }, [turmas, atestado.turma]);

  const alunosSugeridos = useMemo(() => {
    const termo = normalizar(atestado.aluno);
    const filtroTurma = normalizar(atestado.turma);
    return alunos
      .filter((a) => {
        const bateTurma = !filtroTurma || normalizar(a.turma).includes(filtroTurma);
        const bateTexto =
          !termo ||
          normalizar(a.nome).includes(termo) ||
          normalizar(a.matricula).includes(termo);
        return bateTurma && bateTexto;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .slice(0, 15);
  }, [alunos, atestado.aluno, atestado.turma]);

  function selecionarAlunoAtestado(aluno) {
    setAtestado((prev) => ({
      ...prev,
      alunoId: aluno.id,
      aluno: aluno.nome,
      turma: aluno.turma !== "Sem turma" ? aluno.turma : prev.turma
    }));
    setListaAlunosAberta(false);
    setErro("");
  }

  function selecionarTurmaAtestado(nomeTurma) {
    setAtestado((prev) => ({
      ...prev,
      turma: nomeTurma,
      alunoId: "",
      aluno: ""
    }));
    setListaTurmasAberta(false);
    setListaAlunosAberta(true);
  }

  function mudarMes(direcao) {
    if (visao === "semana") {
      const novoDia = parseData(diaSelecionado);
      novoDia.setDate(novoDia.getDate() + direcao * 7);
      setDiaSelecionado(dataISO(novoDia));
      setMes(new Date(novoDia.getFullYear(), novoDia.getMonth(), 1));
      return;
    }
    const novo = new Date(mes.getFullYear(), mes.getMonth() + direcao, 1);
    setMes(novo);
    setDiaSelecionado(dataISO(novo));
  }

  function novoEvento() {
    setEditando(null);
    setForm({ ...MODELO, inicio: diaSelecionado, fim: diaSelecionado, alternados: [] });
    setErro("");
    setMensagem("");
    setPainel("evento");
  }

  function editarEvento(evento) {
    const ordenadas = [...evento.datas].sort();
    setEditando(evento.id);
    setForm({
      ...MODELO,
      ...evento,
      inicio: ordenadas[0],
      fim: ordenadas.at(-1),
      modo: evento.modo || (evento.datas.length === 1 ? "dia" : "periodo"),
      alternados: evento.datas
    });
    setPainel("evento");
    setErro("");
    setMensagem("");
  }

  async function salvarEvento(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");
    const datas =
      form.modo === "dia"
        ? [form.inicio]
        : form.modo === "periodo"
          ? gerarIntervalo(form.inicio, form.fim)
          : [...new Set(form.alternados)].sort();

    if (!form.titulo.trim()) return setErro("Informe um título para o evento.");
    if (!datas.length) return setErro("Selecione as datas do evento. O período deve ter até 366 dias.");
    if (form.abono === "especificos" && !form.publico.trim()) return setErro("Selecione qual turma terá as faltas abonadas.");

    const payload = {
      title: form.titulo.trim(),
      description: form.descricao?.trim() || "",
      type: form.tipo,
      mode: form.modo,
      dates: datas,
      color: form.cor,
      allowance: form.abono,
      audience: form.abono === "especificos" ? form.publico.trim() : "Toda a escola"
    };

    try {
      if (editando) {
        await api.patch(`/events/${editando}`, payload);
        setMensagem("Evento atualizado com sucesso!");
      } else {
        await api.post("/events", payload);
        setMensagem("Evento criado com sucesso!");
      }
      carregarEventos();
      setMes(parseData(datas[0]));
      setDiaSelecionado(datas[0]);
      setTimeout(() => setPainel("fechado"), 1500);
    } catch (error) {
      console.error("Erro ao salvar evento:", error);
      setErro("Ocorreu um erro ao salvar o evento.");
    }
  }

  async function excluirEvento(evento) {
    const id = evento.id;
    if (!window.confirm(`Excluir o evento “${evento.titulo}”?`)) return;

    try {
      await api.delete(`/events/${id}`);
      carregarEventos();
      if (editando === id) {
        setEditando(null);
        setPainel("fechado");
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir o evento.");
    }
  }

  async function salvarAtestado(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");

    let alunoAlvoId = atestado.alunoId;
    if (!alunoAlvoId && atestado.aluno.trim()) {
      const matchExato = alunos.find(
        (a) =>
          normalizar(a.nome) === normalizar(atestado.aluno) ||
          normalizar(a.matricula) === normalizar(atestado.aluno)
      );
      if (matchExato) alunoAlvoId = matchExato.id;
    }

    if (!alunoAlvoId) {
      return setErro("Selecione um estudante válido na lista de sugestões.");
    }
    if (!atestado.inicio || !atestado.fim || atestado.fim < atestado.inicio) {
      return setErro("Informe um período válido (início e término).");
    }
    if (!arquivoAtestado) {
      return setErro("Selecione o documento do atestado.");
    }
    if (arquivoAtestado.size > 5 * 1024 * 1024) {
      return setErro("O arquivo deve ter no máximo 5 MB.");
    }
    if (!["application/pdf", "image/png", "image/jpeg"].includes(arquivoAtestado.type)) {
      return setErro("Use PDF, PNG ou JPG.");
    }

    setSalvandoAtestado(true);
    try {
      const formData = new FormData();
      formData.append("studentId", String(alunoAlvoId));
      formData.append("inicio", atestado.inicio);
      formData.append("fim", atestado.fim);
      if (atestado.observacao.trim()) {
        formData.append("observacao", atestado.observacao.trim());
      }
      formData.append("file", arquivoAtestado);

      await api.post("/incidents/certificate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAtestado({ alunoId: "", aluno: "", turma: "", inicio: "", fim: "", observacao: "" });
      setArquivoAtestado(null);
      e.currentTarget.reset();
      setMensagem("Atestado enviado para a nuvem e registrado no histórico do estudante!");
    } catch (error) {
      console.error("Erro ao registrar justificativa:", error.response?.data || error);
      const detalheApi = error.response?.data?.error || error.response?.data?.detalhes;
      setErro(detalheApi || "Falha ao enviar o atestado. Verifique sua conexão.");
    } finally {
      setSalvandoAtestado(false);
    }
  }

  const primeiraDataSemana = useMemo(() => {
    const selecionada = parseData(diaSelecionado);
    selecionada.setDate(selecionada.getDate() - ((selecionada.getDay() + 6) % 7));
    return selecionada;
  }, [diaSelecionado]);

  const diasVisiveis = useMemo(() => {
    if (visao === "semana") {
      return Array.from({ length: 7 }, (_, index) => {
        const data = new Date(primeiraDataSemana);
        data.setDate(data.getDate() + index);
        return { data: dataISO(data), numero: data.getDate(), noMes: data.getMonth() === mes.getMonth() };
      });
    }
    return dias;
  }, [dias, primeiraDataSemana, mes, visao]);

  const linhas =
    visao === "semana"
      ? [diasVisiveis]
      : Array.from({ length: Math.ceil(diasVisiveis.length / 7) }, (_, i) => {
          const semana = diasVisiveis.slice(i * 7, i * 7 + 7);
          return visao === "util" ? semana.slice(0, 5) : semana;
        });

  const diasCabecalho = visao === "util"
    ? ["Seg", "Ter", "Qua", "Qui", "Sex"]
    : ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const tituloPeriodo = visao === "semana"
    ? `${formatarData(diasVisiveis[0].data)} – ${formatarData(diasVisiveis.at(-1).data)}`
    : tituloMes;

  function criarEventoNaData(dia) {
    setDiaSelecionado(dia);
    setEditando(null);
    setForm({ ...MODELO, modo: "dia", inicio: dia, fim: dia, alternados: [] });
    setErro("");
    setMensagem("");
    setPainel("evento");
  }

  function selecionarDia(dia) {
    setDiaSelecionado(dia);
    if (painel === "evento" && !editando) {
      setForm((anterior) => ({ ...anterior, inicio: dia, fim: dia }));
    }
  }

  function fecharPainel() {
    setPainel("fechado");
    setEditando(null);
    setErro("");
    setMensagem("");
    setListaAlunosAberta(false);
    setListaTurmasAberta(false);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <main className="ce-page">
          <p style={{ padding: "2rem" }}>Carregando calendário...</p>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="ce-page">
        <header className="ce-header">
          <div className="ce-heading">
            <div>
              <h1>Calendário Escolar</h1>
              <p>Gerencie eventos escolares e defina se as faltas serão abonadas.</p>
            </div>
          </div>
          <div className="ce-top-actions">
            <button type="button" className="ce-btn-primary" onClick={novoEvento}>+ Novo evento</button>
            <button
              type="button"
              className="ce-btn-outline"
              onClick={() => {
                setPainel("atestado");
                setEditando(null);
                setErro("");
                setMensagem("");
              }}
            >
              + Justificar falta
            </button>
          </div>
        </header>

        <div className={`ce-layout ${painel !== "fechado" ? "ce-layout-open" : ""}`}>
          <div className="ce-left">
            <section className="ce-card ce-calendar" aria-label="Calendário escolar">
              <div className="ce-toolbar">
                <div className="ce-nav">
                  <button onClick={() => mudarMes(-1)} aria-label="Mês anterior">‹</button>
                  <button onClick={() => mudarMes(1)} aria-label="Próximo mês">›</button>
                  <button
                    onClick={() => {
                      const agora = new Date();
                      setMes(new Date(agora.getFullYear(), agora.getMonth(), 1));
                      setDiaSelecionado(dataISO(agora));
                    }}
                  >
                    Hoje
                  </button>
                </div>
                <h2 className="ce-period-title">{tituloPeriodo}</h2>
                <div className="ce-view-switch" aria-label="Visualização do calendário">
                  {[["mes", "Mês"], ["semana", "Semana"], ["util", "Semana útil"], ["lista", "Lista"]].map(([v, label]) => (
                    <button type="button" key={v} className={visao === v ? "ativo" : ""} onClick={() => setVisao(v)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ce-calendar-content" key={`${visao}-${tituloPeriodo}`}>
                {visao === "lista" ? (
                  <div className="ce-list-calendar">
                    {eventosMes.length ? (
                      [...eventosMes]
                        .sort((a, b) => a.datas[0].localeCompare(b.datas[0]))
                        .map((evento) => (
                          <button key={evento.id} className="ce-list-event" onClick={() => editarEvento(evento)}>
                            <span className="ce-cor" style={{ backgroundColor: evento.cor }} />
                            <strong>{evento.titulo}</strong>
                            <span>{resumoDatas(evento.datas)}</span>
                          </button>
                        ))
                    ) : (
                      <p>Nenhum evento neste mês.</p>
                    )}
                  </div>
                ) : (
                  <div className={`ce-calendar-scroll ${visao === "semana" ? "ce-calendar-weekmode" : ""}`}>
                    <div className={`ce-weekdays ${visao === "util" ? "ce-five-days" : ""}`}>
                      {diasCabecalho.map((dia) => (
                        <span key={dia}>{dia}</span>
                      ))}
                    </div>
                    <div className={`ce-weeks ${visao === "semana" ? "ce-weeks-expanded" : ""}`}>
                      {linhas.map((semana, index) => (
                        <div
                          className={`ce-week ${visao === "util" ? "ce-five-days" : ""} ${visao === "semana" ? "ce-week-expanded" : ""}`}
                          key={`${semana[0].data}-${index}`}
                        >
                          {semana.map((dia) => {
                            const eventosDia = eventos.filter((evento) => evento.datas?.includes(dia.data));
                            return (
                              <div
                                key={dia.data}
                                role="button"
                                tabIndex={0}
                                className={`ce-day ${!dia.noMes ? "ce-day-out" : ""} ${diaSelecionado === dia.data ? "ce-selected" : ""} ${
                                  dia.data === dataISO(new Date()) ? "ce-today" : ""
                                }`}
                                onClick={() => selecionarDia(dia.data)}
                                onDoubleClick={() => criarEventoNaData(dia.data)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    selecionarDia(dia.data);
                                  }
                                }}
                                aria-label={`${formatarData(dia.data)} — ${eventosDia.length} eventos`}
                              >
                                <span className="ce-day-head">
                                  <span className="ce-day-number">{dia.numero}</span>
                                  {visao !== "mes" && (
                                    <span className="ce-day-caption">
                                      {parseData(dia.data).toLocaleDateString("pt-BR", { month: "short" })}
                                    </span>
                                  )}
                                </span>
                                <span className="ce-day-events">
                                  {eventosDia.slice(0, visao === "mes" ? 2 : 5).map((evento) => (
                                    <button
                                      type="button"
                                      className="ce-event-chip"
                                      key={evento.id}
                                      style={{
                                        backgroundColor: `${evento.cor}20`,
                                        color: evento.cor,
                                        borderLeftColor: evento.cor
                                      }}
                                      title={evento.titulo}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        editarEvento(evento);
                                      }}
                                      onDoubleClick={(e) => e.stopPropagation()}
                                    >
                                      {evento.titulo}
                                    </button>
                                  ))}
                                  {eventosDia.length > (visao === "mes" ? 2 : 5) && (
                                    <small className="ce-more-events">
                                      +{eventosDia.length - (visao === "mes" ? 2 : 5)} eventos
                                    </small>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="ce-calendar-footer">
                <p className="ce-hint">Clique em um evento para editar ou selecione um dia para cadastrar.</p>
                <span>{eventosMes.length} evento(s) neste mês</span>
              </div>
            </section>

            <section className="ce-card ce-list-section">
              <div className="ce-list-head">
                <div>
                  <h2>Eventos do mês</h2>
                  <p>Eventos cadastrados em {tituloMes}.</p>
                </div>
                <div className="ce-list-filters">
                  <input value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} placeholder="Buscar evento..." aria-label="Buscar evento" />
                  <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} aria-label="Filtrar tipo">
                    <option value="">Todos os tipos</option>
                    {TIPOS.map((tipo) => (
                      <option key={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="ce-table-scroll">
                <table className="ce-table">
                  <thead>
                    <tr>
                      <th>Evento</th>
                      <th>Período</th>
                      <th>Tipo</th>
                      <th>Abono</th>
                      <th>Público</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventosFiltrados.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <span className="ce-event-title">
                            <i className="ce-cor" style={{ backgroundColor: e.cor }} />
                            {e.titulo}
                          </span>
                        </td>
                        <td>{resumoDatas(e.datas)}</td>
                        <td>
                          <span className="ce-pill ce-type">{e.tipo}</span>
                        </td>
                        <td>
                          <span className={`ce-pill ${e.abono === "nenhum" ? "ce-no" : "ce-yes"}`}>
                            {e.abono === "nenhum" ? "Não" : "Sim"}
                          </span>
                        </td>
                        <td>{e.publico}</td>
                        <td>
                          <div className="ce-row-actions">
                            <button type="button" onClick={() => editarEvento(e)}>Editar</button>
                            <button type="button" onClick={() => excluirEvento(e)} aria-label={`Excluir ${e.titulo}`}>
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!eventosFiltrados.length && (
                      <tr>
                        <td colSpan="6" className="ce-empty">Nenhum evento encontrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {painel !== "fechado" && (
            <aside className="ce-card ce-form-panel" key={painel}>
              <div className="ce-form-heading">
                <h2>{painel === "atestado" ? "Justificativa médica" : editando ? "Editar evento" : "Novo evento"}</h2>
                <button type="button" onClick={fecharPainel} aria-label="Fechar painel">×</button>
              </div>

              {painel === "atestado" ? (
                <form onSubmit={salvarAtestado} className="ce-form">
                  <p className="ce-info">A justificativa será registrada no histórico do estudante. O atestado não gera abono automático.</p>

                  {/* CAMPO TURMA COM AUTOCOMPLETE + TOGGLE LIST */}
                  <div ref={buscaTurmaRef} style={{ position: "relative" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span>Turma (opcional para filtrar)</span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="text"
                          autoComplete="off"
                          value={atestado.turma}
                          onFocus={() => setListaTurmasAberta(true)}
                          onChange={(e) => {
                            setAtestado({ ...atestado, turma: e.target.value, alunoId: "", aluno: "" });
                            setListaTurmasAberta(true);
                          }}
                          placeholder="Digite ou selecione a turma..."
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => setListaTurmasAberta((prev) => !prev)}
                          aria-label="Alternar lista de turmas"
                          style={{ padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer" }}
                        >
                          {listaTurmasAberta ? "▲" : "▼"}
                        </button>
                      </div>
                    </label>

                    {listaTurmasAberta && (
                      <div
                        role="listbox"
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 25,
                          maxHeight: "160px",
                          overflowY: "auto",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          marginTop: "4px",
                          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)"
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => selecionarTurmaAtestado("")}
                          style={{ width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", color: "#633df2", fontWeight: 600 }}
                        >
                          Todas as turmas
                        </button>
                        {turmasSugeridas.length > 0 ? (
                          turmasSugeridas.map((nomeT) => (
                            <button
                              key={nomeT}
                              type="button"
                              onClick={() => selecionarTurmaAtestado(nomeT)}
                              style={{ width: "100%", textAlign: "left", padding: "8px 12px", border: "none", borderTop: "1px solid #f1f5f9", background: "transparent", cursor: "pointer", fontSize: "14px" }}
                            >
                              {nomeT}
                            </button>
                          ))
                        ) : (
                          <p style={{ margin: 0, padding: "8px 12px", fontSize: "13px", color: "#64748b" }}>Nenhuma turma encontrada</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CAMPO ALUNO COM AUTOCOMPLETE + TOGGLE LIST */}
                  <div ref={buscaAlunoRef} style={{ position: "relative" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span>Aluno *</span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="text"
                          required
                          autoComplete="off"
                          value={atestado.aluno}
                          onFocus={() => setListaAlunosAberta(true)}
                          onChange={(e) => {
                            setAtestado({ ...atestado, aluno: e.target.value, alunoId: "" });
                            setListaAlunosAberta(true);
                          }}
                          placeholder="Pesquisar nome ou matrícula..."
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => setListaAlunosAberta((prev) => !prev)}
                          aria-label="Alternar lista de alunos"
                          style={{ padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer" }}
                        >
                          {listaAlunosAberta ? "▲" : "▼"}
                        </button>
                      </div>
                    </label>

                    {listaAlunosAberta && (
                      <div
                        role="listbox"
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 25,
                          maxHeight: "190px",
                          overflowY: "auto",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          marginTop: "4px",
                          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)"
                        }}
                      >
                        {alunosSugeridos.length > 0 ? (
                          alunosSugeridos.map((aluno) => (
                            <button
                              key={aluno.id}
                              type="button"
                              onClick={() => selecionarAlunoAtestado(aluno)}
                              style={{
                                width: "100%",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                textAlign: "left",
                                padding: "9px 12px",
                                border: "none",
                                borderBottom: "1px solid #f1f5f9",
                                background: atestado.alunoId === aluno.id ? "#f5f3ff" : "transparent",
                                cursor: "pointer",
                                fontSize: "14px"
                              }}
                            >
                              <span>{aluno.nome}</span>
                              <small style={{ color: "#64748b" }}>
                                {aluno.turma} {aluno.matricula ? `• ${aluno.matricula}` : ""}
                              </small>
                            </button>
                          ))
                        ) : (
                          <p style={{ margin: 0, padding: "10px 12px", fontSize: "13px", color: "#64748b" }}>
                            Nenhum aluno encontrado
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="ce-form-dates">
                    <label>
                      Início *
                      <input required type="date" value={atestado.inicio} onChange={(e) => setAtestado({ ...atestado, inicio: e.target.value })} />
                    </label>
                    <label>
                      Término *
                      <input required type="date" value={atestado.fim} min={atestado.inicio} onChange={(e) => setAtestado({ ...atestado, fim: e.target.value })} />
                    </label>
                  </div>

                  <label>
                    Atestado (PDF, PNG ou JPG, até 5 MB) *
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                      required
                      onChange={(e) => setArquivoAtestado(e.target.files?.[0] || null)}
                    />
                  </label>

                  <label>
                    Observação (sem diagnóstico)
                    <textarea
                      value={atestado.observacao}
                      onChange={(e) => setAtestado({ ...atestado, observacao: e.target.value })}
                      rows="3"
                    />
                  </label>

                  {erro && <p role="alert" className="ce-error">{erro}</p>}
                  {mensagem && <p role="status" className="ce-success">{mensagem}</p>}

                  <div className="ce-form-actions">
                    <button type="button" className="ce-btn-outline" onClick={fecharPainel} disabled={salvandoAtestado}>
                      Cancelar
                    </button>
                    <button className="ce-btn-primary" type="submit" disabled={salvandoAtestado}>
                      {salvandoAtestado ? "Registrando..." : "Registrar"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={salvarEvento} className="ce-form">
                  <label>
                    Título do evento
                    <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Jogos interclasse" />
                  </label>
                  <label>
                    Descrição (opcional)
                    <textarea rows="3" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva o evento..." />
                  </label>
                  <div>
                    <span className="ce-label">Tipo de evento</span>
                    <div className="ce-type-grid">
                      {TIPOS.map((tipo) => (
                        <button type="button" key={tipo} className={form.tipo === tipo ? "selecionado" : ""} onClick={() => setForm({ ...form, tipo })}>
                          {tipo}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="ce-label">Datas do evento</span>
                    <div className="ce-segments">
                      {[["dia", "Dia específico"], ["periodo", "Período"], ["alternados", "Dias alternados"]].map(([modo, rotulo]) => (
                        <button type="button" key={modo} className={form.modo === modo ? "ativo" : ""} onClick={() => setForm({ ...form, modo })}>
                          {rotulo}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.modo === "alternados" ? (
                    <div>
                      <p className="ce-info">Marque as datas desejadas clicando no calendário abaixo.</p>
                      <div className="ce-picker-days">
                        {calendarioDoMes(mes)
                          .filter((d) => d.noMes)
                          .map((d) => (
                            <button
                              type="button"
                              key={d.data}
                              className={form.alternados.includes(d.data) ? "marcado" : ""}
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  alternados: prev.alternados.includes(d.data)
                                    ? prev.alternados.filter((x) => x !== d.data)
                                    : [...prev.alternados, d.data].sort()
                                }))
                              }
                            >
                              {d.numero}
                            </button>
                          ))}
                      </div>
                      <small>{form.alternados.length} dia(s) selecionado(s). Navegue entre os meses para incluir outras datas.</small>
                    </div>
                  ) : (
                    <div className="ce-form-dates">
                      <label>
                        {form.modo === "dia" ? "Data" : "Data de início"}
                        <input required type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
                      </label>
                      {form.modo === "periodo" && (
                        <label>
                          Data de término
                          <input required type="date" min={form.inicio} value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} />
                        </label>
                      )}
                    </div>
                  )}
                  <div>
                    <span className="ce-label">Abono de faltas</span>
                    <p className="ce-info">Defina se o evento justifica ausências.</p>
                    <label className="ce-radio">
                      <input type="radio" name="abono" checked={form.abono === "nenhum"} onChange={() => setForm({ ...form, abono: "nenhum" })} /> Não abonar
                    </label>
                    <label className="ce-radio">
                      <input type="radio" name="abono" checked={form.abono === "escola"} onChange={() => setForm({ ...form, abono: "escola" })} /> Toda a escola
                    </label>
                    <label className="ce-radio">
                      <input type="radio" name="abono" checked={form.abono === "especificos"} onChange={() => setForm({ ...form, abono: "especificos" })} /> Turmas específicas
                    </label>
                    {form.abono === "especificos" && (
                      <label>
                        Turma
                        <select required value={form.publico} onChange={(e) => setForm({ ...form, publico: e.target.value })}>
                          <option value="">Selecione uma turma...</option>
                          {turmas.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name} ({t.shift})
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <div>
                    <span className="ce-label">Cor no calendário</span>
                    <div className="ce-colors">
                      {CORES.map((cor) => (
                        <button
                          type="button"
                          key={cor}
                          className={cor === form.cor ? "selecionada" : ""}
                          onClick={() => setForm({ ...form, cor })}
                          aria-label={`Selecionar cor ${cor}`}
                          style={{ backgroundColor: cor }}
                        />
                      ))}
                    </div>
                  </div>
                  {erro && <p className="ce-error" role="alert">{erro}</p>}
                  {mensagem && <p className="ce-success" role="status">{mensagem}</p>}
                  <div className="ce-form-actions">
                    <button type="button" className="ce-btn-outline" onClick={fecharPainel}>Cancelar</button>
                    <button type="submit" className="ce-btn-primary">Salvar evento</button>
                  </div>
                </form>
              )}
            </aside>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}