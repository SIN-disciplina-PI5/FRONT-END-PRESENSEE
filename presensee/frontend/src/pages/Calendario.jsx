import { useMemo, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { MascotAvatar } from "../components/Icons";
import "../styles/Calendario.css";

const STORAGE_KEY = "presensee_calendario_demo_v1";
const CORES = ["#633df2", "#17b989", "#3187f4", "#fa667c", "#e9af32", "#f59c52"];
const TIPOS = ["Evento externo", "Pedagógico", "Esportivo", "Outro"];
const DEMO = [
  { id: "e1", titulo: "Formação de professores", descricao: "Encontro de formação", tipo: "Pedagógico", datas: ["2026-10-02"], cor: CORES[0], abono: "nenhum", publico: "Toda a escola" },
  { id: "e2", titulo: "Jogos interclasse", descricao: "Competição esportiva entre turmas", tipo: "Esportivo", datas: ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"], cor: CORES[1], abono: "escola", publico: "Toda a escola" },
  { id: "e3", titulo: "Reunião pedagógica", descricao: "Reunião de professores", tipo: "Pedagógico", datas: ["2026-10-13"], cor: CORES[2], abono: "nenhum", publico: "Toda a escola" },
  { id: "e4", titulo: "Feira de Ciências", descricao: "Evento de ciências", tipo: "Evento externo", datas: gerarIntervalo("2026-10-16", "2026-10-24"), cor: CORES[0], abono: "escola", publico: "Toda a escola" },
  { id: "e5", titulo: "Simulado ENEM", descricao: "Simulado preparatório", tipo: "Pedagógico", datas: gerarIntervalo("2026-10-27", "2026-10-30"), cor: CORES[3], abono: "nenhum", publico: "Turmas específicas" }
];

function parseData(valor) {
  return new Date(`${valor}T12:00:00`);
}

function dataISO(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
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
  return ordenadas.length === 1 ? formatarData(ordenadas[0]) : `${formatarData(ordenadas[0])} – ${formatarData(ordenadas.at(-1))}${ordenadas.length > 2 && gerarIntervalo(ordenadas[0], ordenadas.at(-1)).length !== ordenadas.length ? ` (${ordenadas.length} dias)` : ""}`;
}

function lerEventos() {
  try {
    const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(salvo) ? salvo : DEMO;
  } catch {
    return DEMO;
  }
}

const MODELO = {
  titulo: "", descricao: "", tipo: "Evento externo", modo: "periodo", inicio: "2026-10-16", fim: "2026-10-24",
  alternados: [], cor: CORES[0], abono: "escola", publico: "", alunoIds: ""
};

function IconeCalendario() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></svg>;
}

function calendarioDoMes(mes) {
  const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1, 12);
  const inicio = new Date(primeiro);
  inicio.setDate(inicio.getDate() - inicio.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const data = new Date(inicio);
    data.setDate(inicio.getDate() + index);
    return { data: dataISO(data), numero: data.getDate(), noMes: data.getMonth() === mes.getMonth() };
  });
}

export default function Calendario() {
  const [eventos, setEventos] = useState(lerEventos);
  const [mes, setMes] = useState(() => new Date(2026, 9, 1));
  const [visao, setVisao] = useState("mes");
  const [diaSelecionado, setDiaSelecionado] = useState("2026-10-16");
  const [painel, setPainel] = useState("evento");
  const [form, setForm] = useState(MODELO);
  const [editando, setEditando] = useState(null);
  const [pesquisa, setPesquisa] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [atestado, setAtestado] = useState({ aluno: "", turma: "", inicio: "", fim: "", observacao: "" });
  const [arquivoAtestado, setArquivoAtestado] = useState(null);
  const [atestados, setAtestados] = useState([]);

  const tituloMes = mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const dias = useMemo(() => calendarioDoMes(mes), [mes]);
  const eventosMes = useMemo(() => eventos.filter((evento) => evento.datas.some((data) => data.startsWith(dataISO(mes).slice(0, 7)))), [eventos, mes]);
  const eventosFiltrados = useMemo(() => eventosMes.filter((evento) =>
    (!filtroTipo || evento.tipo === filtroTipo) &&
    `${evento.titulo} ${evento.descricao}`.toLowerCase().includes(pesquisa.trim().toLowerCase())
  ).sort((a, b) => a.datas[0].localeCompare(b.datas[0])), [eventosMes, filtroTipo, pesquisa]);

  function atualizarEventos(lista) {
    setEventos(lista);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)); } catch { setMensagem("Sem espaço no navegador para guardar os eventos."); }
  }

  function mudarMes(direcao) {
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
    setForm({ ...MODELO, ...evento, inicio: ordenadas[0], fim: ordenadas.at(-1), modo: evento.modo || (evento.datas.length === 1 ? "dia" : "periodo"), alternados: evento.datas });
    setPainel("evento");
    setErro("");
  }

  function salvarEvento(e) {
    e.preventDefault();
    setErro("");
    const datas = form.modo === "dia" ? [form.inicio] : form.modo === "periodo" ? gerarIntervalo(form.inicio, form.fim) : [...new Set(form.alternados)].sort();
    if (!form.titulo.trim()) return setErro("Informe um título para o evento.");
    if (!datas.length) return setErro("Selecione as datas do evento. O período deve ter até 366 dias.");
    if (form.abono === "especificos" && !form.publico.trim()) return setErro("Informe quais alunos ou turmas terão as faltas abonadas.");
    const evento = {
      id: editando || (globalThis.crypto?.randomUUID?.() ?? `evento-${Date.now()}`),
      titulo: form.titulo.trim(), descricao: form.descricao.trim(), tipo: form.tipo,
      modo: form.modo, datas, cor: form.cor, abono: form.abono,
      publico: form.abono === "especificos" ? form.publico.trim() : "Toda a escola"
    };
    atualizarEventos(editando ? eventos.map((item) => item.id === editando ? evento : item) : [...eventos, evento]);
    setMes(parseData(datas[0]));
    setDiaSelecionado(datas[0]);
    setEditando(evento.id);
    setMensagem("Evento salvo neste navegador (modo demonstração).");
  }

  function excluirEvento(evento) {
    if (!window.confirm(`Excluir o evento “${evento.titulo}”?`)) return;
    atualizarEventos(eventos.filter((item) => item.id !== evento.id));
    if (editando === evento.id) novoEvento();
  }

  function salvarAtestado(e) {
    e.preventDefault();
    setErro("");
    if (!atestado.aluno.trim() || !atestado.inicio || !atestado.fim || atestado.fim < atestado.inicio) {
      return setErro("Informe o aluno e um período válido.");
    }
    if (!arquivoAtestado) return setErro("Selecione o documento do atestado.");
    if (arquivoAtestado.size > 5 * 1024 * 1024) return setErro("O arquivo deve ter no máximo 5 MB.");
    if (!["application/pdf", "image/png", "image/jpeg"].includes(arquivoAtestado.type)) return setErro("Use PDF, PNG ou JPG.");
    // Não armazenar o documento ou dados médicos no localStorage.
    setAtestados((lista) => [...lista, { ...atestado, id: Date.now(), arquivo: arquivoAtestado.name, status: "Pendente" }]);
    setAtestado({ aluno: "", turma: "", inicio: "", fim: "", observacao: "" });
    setArquivoAtestado(null);
    e.currentTarget.reset();
    setMensagem("Justificativa registrada apenas nesta sessão. A aprovação e o abono dependem do backend.");
  }

  const linhas = visao === "semana" ? (() => {
    const posicao = dias.findIndex((d) => d.data === diaSelecionado);
    const inicio = posicao < 0 ? 0 : Math.floor(posicao / 7) * 7;
    return [dias.slice(inicio, inicio + 7)];
  })() : Array.from({ length: 6 }, (_, i) => dias.slice(i * 7, i * 7 + 7));

  return (
    <DashboardLayout>
      <main className="ce-page">
        <header className="ce-header">
          <div className="ce-heading">
            <div><h1>Calendário Escolar</h1><p>Gerencie eventos escolares e defina se as faltas serão abonadas.</p></div>
          </div>
          <div className="ce-top-actions">
            <button type="button" className="ce-btn-primary" onClick={novoEvento}>+ Novo evento</button>
            <button type="button" className="ce-btn-outline" onClick={() => { setPainel("atestado"); setErro(""); setMensagem(""); }}>+ Justificar falta</button>
          </div>
        </header>

        <div className="ce-layout">
          <div className="ce-left">
            <section className="ce-card ce-calendar" aria-label="Calendário escolar">
              <div className="ce-toolbar">
                <div className="ce-nav"><button onClick={() => mudarMes(-1)} aria-label="Mês anterior">‹</button><button onClick={() => mudarMes(1)} aria-label="Próximo mês">›</button><button onClick={() => { const agora = new Date(); setMes(new Date(agora.getFullYear(), agora.getMonth(), 1)); setDiaSelecionado(dataISO(agora)); }}>Hoje</button></div>
                <h2>{tituloMes}</h2>
                <div className="ce-view-switch" aria-label="Visualização do calendário">{[["mes", "Mês"], ["semana", "Semana"], ["lista", "Lista"]].map(([v, label]) => <button type="button" key={v} className={visao === v ? "ativo" : ""} onClick={() => setVisao(v)}>{label}</button>)}</div>
              </div>
              {visao === "lista" ? <div className="ce-list-calendar">{eventosMes.length ? [...eventosMes].sort((a, b) => a.datas[0].localeCompare(b.datas[0])).map((e) => <button key={e.id} className="ce-list-event" onClick={() => editarEvento(e)}><span className="ce-cor" style={{ backgroundColor: e.cor }} /><strong>{e.titulo}</strong><span>{resumoDatas(e.datas)}</span></button>) : <p>Nenhum evento neste mês.</p>}</div> : <div className="ce-calendar-scroll"><div className="ce-weekdays">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <span key={d}>{d}</span>)}</div><div className="ce-weeks">{linhas.map((semana, index) => <div className="ce-week" key={`${semana[0].data}-${index}`}>{semana.map((dia) => { const eventosDia = eventos.filter((e) => e.datas.includes(dia.data)); return <button key={dia.data} type="button" className={`ce-day ${!dia.noMes ? "ce-day-out" : ""} ${diaSelecionado === dia.data ? "ce-selected" : ""}`} onClick={() => { setDiaSelecionado(dia.data); setForm((antigo) => ({ ...antigo, inicio: dia.data, fim: dia.data })); }} aria-label={`${formatarData(dia.data)} — ${eventosDia.length} eventos`}><span className="ce-day-number">{dia.numero}</span><span className="ce-day-events">{eventosDia.slice(0, 2).map((evento) => <span className="ce-event-chip" key={evento.id} style={{ backgroundColor: `${evento.cor}20`, color: evento.cor, borderLeftColor: evento.cor }} title={evento.titulo} onClick={(e) => { e.stopPropagation(); editarEvento(evento); }}>{evento.titulo}</span>)}{eventosDia.length > 2 && <small>+{eventosDia.length - 2} eventos</small>}</span></button>; })}</div>)}</div></div>}
              <p className="ce-hint">Selecione uma data ou clique em um evento para editar. Eventos de vários dias aparecem em todas as datas abrangidas.</p>
            </section>

            <section className="ce-card ce-list-section"><div className="ce-list-head"><div><h2>Eventos do mês</h2><p>Eventos cadastrados em {tituloMes}.</p></div><div className="ce-list-filters"><input value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} placeholder="Buscar evento..." aria-label="Buscar evento" /><select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} aria-label="Filtrar tipo"><option value="">Todos os tipos</option>{TIPOS.map((tipo) => <option key={tipo}>{tipo}</option>)}</select></div></div><div className="ce-table-scroll"><table className="ce-table"><thead><tr><th>Evento</th><th>Período</th><th>Tipo</th><th>Abono</th><th>Público</th><th>Ações</th></tr></thead><tbody>{eventosFiltrados.map((e) => <tr key={e.id}><td><span className="ce-event-title"><i className="ce-cor" style={{ backgroundColor: e.cor }} />{e.titulo}</span></td><td>{resumoDatas(e.datas)}</td><td><span className="ce-pill ce-type">{e.tipo}</span></td><td><span className={`ce-pill ${e.abono === "nenhum" ? "ce-no" : "ce-yes"}`}>{e.abono === "nenhum" ? "Não" : "Sim"}</span></td><td>{e.publico}</td><td><div className="ce-row-actions"><button type="button" onClick={() => editarEvento(e)}>Editar</button><button type="button" onClick={() => excluirEvento(e)} aria-label={`Excluir ${e.titulo}`}>Excluir</button></div></td></tr>)}{!eventosFiltrados.length && <tr><td colSpan="6" className="ce-empty">Nenhum evento encontrado.</td></tr>}</tbody></table></div></section>
          </div>

          <aside className="ce-card ce-form-panel">
            <div className="ce-form-heading"><h2>{painel === "atestado" ? "Justificativa médica" : editando ? "Editar evento" : "Novo evento"}</h2><button type="button" onClick={() => { setPainel("fechado"); setErro(""); }} aria-label="Fechar painel">×</button></div>
            {painel === "fechado" ? <div className="ce-closed"><IconeCalendario /><p>Escolha “Novo evento” ou “Justificar falta” para começar.</p><button className="ce-btn-primary" onClick={novoEvento}>Novo evento</button></div> : painel === "atestado" ? <form onSubmit={salvarAtestado} className="ce-form"><p className="ce-info">A justificativa será analisada. O atestado não gera abono automático.</p><label>Aluno<input required value={atestado.aluno} onChange={(e) => setAtestado({ ...atestado, aluno: e.target.value })} placeholder="Nome ou matrícula" /></label><label>Turma<input value={atestado.turma} onChange={(e) => setAtestado({ ...atestado, turma: e.target.value })} placeholder="Ex.: 1A" /></label><div className="ce-form-dates"><label>Início<input required type="date" value={atestado.inicio} onChange={(e) => setAtestado({ ...atestado, inicio: e.target.value })} /></label><label>Término<input required type="date" value={atestado.fim} min={atestado.inicio} onChange={(e) => setAtestado({ ...atestado, fim: e.target.value })} /></label></div><label>Atestado (PDF, PNG ou JPG, até 5 MB)<input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" required onChange={(e) => setArquivoAtestado(e.target.files?.[0] || null)} /></label><label>Observação (sem diagnóstico)<textarea value={atestado.observacao} onChange={(e) => setAtestado({ ...atestado, observacao: e.target.value })} rows="3" /></label><p className="ce-info">Os documentos não são enviados nem armazenados nesta demonstração.</p>{erro && <p role="alert" className="ce-error">{erro}</p>}{mensagem && <p role="status" className="ce-success">{mensagem}</p>}<div className="ce-form-actions"><button type="button" className="ce-btn-outline" onClick={novoEvento}>Cancelar</button><button className="ce-btn-primary" type="submit">Registrar</button></div>{atestados.length > 0 && <div className="ce-atestados"><h3>Registros desta sessão</h3>{atestados.map((a) => <p key={a.id}><strong>{a.aluno}</strong> · {resumoDatas(gerarIntervalo(a.inicio, a.fim))} · {a.status}</p>)}</div>}</form> : <form onSubmit={salvarEvento} className="ce-form"><label>Título do evento<input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Jogos interclasse" /></label><label>Descrição (opcional)<textarea rows="3" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva o evento..." /></label><div><span className="ce-label">Tipo de evento</span><div className="ce-type-grid">{TIPOS.map((tipo) => <button type="button" key={tipo} className={form.tipo === tipo ? "selecionado" : ""} onClick={() => setForm({ ...form, tipo })}>{tipo}</button>)}</div></div><div><span className="ce-label">Datas do evento</span><div className="ce-segments">{[["dia", "Dia específico"], ["periodo", "Período"], ["alternados", "Dias alternados"]].map(([modo, rotulo]) => <button type="button" key={modo} className={form.modo === modo ? "ativo" : ""} onClick={() => setForm({ ...form, modo })}>{rotulo}</button>)}</div></div>{form.modo === "alternados" ? <div><p className="ce-info">Marque as datas desejadas clicando no calendário abaixo.</p><div className="ce-picker-days">{calendarioDoMes(mes).filter((d) => d.noMes).map((d) => <button type="button" key={d.data} className={form.alternados.includes(d.data) ? "marcado" : ""} onClick={() => setForm((prev) => ({ ...prev, alternados: prev.alternados.includes(d.data) ? prev.alternados.filter((x) => x !== d.data) : [...prev.alternados, d.data].sort() }))}>{d.numero}</button>)}</div><small>{form.alternados.length} dia(s) selecionado(s). Navegue entre os meses para incluir outras datas.</small></div> : <div className="ce-form-dates"><label>{form.modo === "dia" ? "Data" : "Data de início"}<input required type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></label>{form.modo === "periodo" && <label>Data de término<input required type="date" min={form.inicio} value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} /></label>}</div>}<div><span className="ce-label">Abono de faltas</span><p className="ce-info">Defina se o evento justifica ausências.</p><label className="ce-radio"><input type="radio" name="abono" checked={form.abono === "nenhum"} onChange={() => setForm({ ...form, abono: "nenhum" })} /> Não abonar</label><label className="ce-radio"><input type="radio" name="abono" checked={form.abono === "escola"} onChange={() => setForm({ ...form, abono: "escola" })} /> Toda a escola</label><label className="ce-radio"><input type="radio" name="abono" checked={form.abono === "especificos"} onChange={() => setForm({ ...form, abono: "especificos" })} /> Turmas ou alunos específicos</label>{form.abono === "especificos" && <label>Turmas ou alunos<input required value={form.publico} onChange={(e) => setForm({ ...form, publico: e.target.value })} placeholder="Ex.: 1A, 2B, matrícula 003" /><small>Campo provisório; seleção pelo cadastro real depende da API.</small></label>}</div><div><span className="ce-label">Cor no calendário</span><div className="ce-colors">{CORES.map((cor) => <button type="button" key={cor} className={cor === form.cor ? "selecionada" : ""} onClick={() => setForm({ ...form, cor })} aria-label={`Selecionar cor ${cor}`} style={{ backgroundColor: cor }} />)}</div></div>{erro && <p className="ce-error" role="alert">{erro}</p>}{mensagem && <p className="ce-success" role="status">{mensagem}</p>}<div className="ce-form-actions"><button type="button" className="ce-btn-outline" onClick={novoEvento}>Cancelar</button><button type="submit" className="ce-btn-primary">Salvar evento</button></div></form>}
          </aside>
        </div>
      </main>
    </DashboardLayout>
  );
}
