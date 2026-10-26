import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Bell, CheckCircle2, Clock3, Headset, MessageCircle, Paperclip, Search, Send, X } from "lucide-react";
import { CHAMADOS_KEY, STATUS, PRIORIDADES, CATEGORIAS, RESPONSAVEIS, carregarChamados, prazoChamado, dataTexto, registrarAlteracao } from "../services/chamadosDemo";
import "../../styles/Alunos.css";
import "../styles/admin.css";
import "../styles/AdminChamados.css";

const MAX_ARQUIVO = 600 * 1024;
const FORMATOS = ["image/png", "image/jpeg", "image/webp", "application/pdf", "text/plain"];
const ativos = (chamado) => !["Resolvido", "Encerrado"].includes(chamado.status);
const formatoClasse = (texto) => String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-");

function ModalChamado({ chamado, onClose, onChange, onNotificacaoLida }) {
  const [texto, setTexto] = useState("");
  const [interno, setInterno] = useState(false);
  const [arquivo, setArquivo] = useState(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState("conversa");

  useEffect(() => {
    function fechar(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", fechar);
    return () => document.removeEventListener("keydown", fechar);
  }, [onClose]);

  async function selecionarArquivo(event) {
    const selecionado = event.target.files?.[0];
    event.target.value = "";
    if (!selecionado) return;
    if (!FORMATOS.includes(selecionado.type) || selecionado.size > MAX_ARQUIVO) {
      setErro("Use PNG, JPG, WEBP, PDF ou TXT com até 600 KB.");
      return;
    }
    try {
      const data = await new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(leitor.result);
        leitor.onerror = reject;
        leitor.readAsDataURL(selecionado);
      });
      setArquivo({ id: crypto.randomUUID(), nome: selecionado.name, tipo: selecionado.type, tamanho: selecionado.size, data });
      setErro("");
    } catch {
      setErro("Não foi possível ler o arquivo.");
    }
  }

  function enviar(event) {
    event.preventDefault();
    if (!texto.trim() && !arquivo) return;
    const mensagem = {
      id: crypto.randomUUID(), autor: "Suporte PresenSee", data: new Date().toISOString(),
      texto: texto.trim(), interno, anexos: arquivo ? [arquivo] : []
    };
    onChange(chamado.id, { mensagem });
    setTexto("");
    setArquivo(null);
    setErro("");
  }

  function baixar(anexo) {
    const link = document.createElement("a");
    link.href = anexo.data;
    link.download = anexo.nome;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const prazo = prazoChamado(chamado);
  return (
    <div className="chamados-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="chamado-titulo" className="chamados-modal chamados-modal-avancado">
        <header className="chamados-modal-header">
          <div><span className="chamados-identificador">{chamado.id}</span><h2 id="chamado-titulo">{chamado.titulo}</h2></div>
          <button className="chamados-fechar" type="button" aria-label="Fechar" onClick={onClose}><X size={19}/></button>
        </header>
        <div className="chamados-modal-scroll">
          <div className="chamados-modal-informacoes">
            {[["Escola", chamado.escola], ["Solicitante", chamado.solicitante], ["Categoria", chamado.categoria], ["Abertura", dataTexto(chamado.criadoEm)], ["Última atualização", dataTexto(chamado.atualizadoEm)], ["SLA demonstrativo", prazo.texto]].map(([rotulo, valor]) => <div key={rotulo}><span>{rotulo}</span><strong>{valor}</strong></div>)}
          </div>
          <div className="chamados-modal-controles chamados-controles-3">
            <label>Status<select value={chamado.status} onChange={(e) => onChange(chamado.id, { status: e.target.value })}>{STATUS.map((v) => <option key={v}>{v}</option>)}</select></label>
            <label>Prioridade<select value={chamado.prioridade} onChange={(e) => onChange(chamado.id, { prioridade: e.target.value })}>{PRIORIDADES.map((v) => <option key={v}>{v}</option>)}</select></label>
            <label>Responsável<select value={chamado.responsavel} onChange={(e) => onChange(chamado.id, { responsavel: e.target.value })}>{[...new Set([...RESPONSAVEIS, chamado.responsavel])].map((v) => <option key={v}>{v}</option>)}</select></label>
          </div>
          <div className="chamados-modal-secao"><h3>Descrição do chamado</h3><p>{chamado.descricao}</p></div>
          <div className="chamados-abas" role="tablist" aria-label="Informações do atendimento">
            {[['conversa', 'Conversa'], ['historico', 'Histórico'], ['notificacoes', 'Notificações'], ['avaliacao', 'Avaliação']].map(([id, label]) => <button type="button" role="tab" aria-selected={aba === id} className={aba === id ? "ativo" : ""} key={id} onClick={() => setAba(id)}>{label}</button>)}
          </div>
          {aba === "conversa" && <>
            <div className="chamados-mensagens">
              {chamado.mensagens.length === 0 && <p className="chamados-sem-mensagens">Nenhuma mensagem registrada.</p>}
              {chamado.mensagens.map((m) => <article key={m.id} className={`chamados-mensagem ${m.interno ? "chamados-nota-interna" : ""}`}>
                <div className="chamados-mensagem-cabecalho"><strong>{m.autor}{m.interno ? " · Nota interna" : ""}</strong><time>{dataTexto(m.data)}</time></div>
                {m.texto && <p>{m.texto}</p>}
                {(m.anexos || []).map((a) => <button key={a.id} className="chamados-anexo" type="button" onClick={() => baixar(a)}><Paperclip size={14}/>{a.nome}</button>)}
              </article>)}
            </div>
            <form className="chamados-resposta" onSubmit={enviar}>
              <label htmlFor="chamados-texto">{interno ? "Nova nota interna" : "Nova resposta"}</label>
              <textarea id="chamados-texto" rows={3} maxLength={3000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={interno ? "Nota visível apenas ao suporte..." : "Escreva sua resposta..."}/>
              <label className="chamados-checkbox"><input type="checkbox" checked={interno} onChange={(e) => setInterno(e.target.checked)}/> Nota interna (não destinada ao solicitante)</label>
              <div className="chamados-resposta-acoes">
                <label className="chamados-anexar"><Paperclip size={15}/> Anexar arquivo<input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.txt" onChange={selecionarArquivo}/></label>
                {arquivo && <span className="chamados-arquivo-nome">{arquivo.nome} <button type="button" aria-label="Remover anexo" onClick={() => setArquivo(null)}>×</button></span>}
                <button type="submit" disabled={!texto.trim() && !arquivo}><Send size={15}/> Registrar</button>
              </div>
              {erro && <span role="alert" className="chamados-erro">{erro}</span>}
            </form>
          </>}
          {aba === "historico" && <div className="chamados-historico">
            {[{ id: "criacao", texto: "Chamado aberto", data: chamado.criadoEm, autor: chamado.solicitante }, ...chamado.historico].map((evento) => <div key={evento.id}><strong>{evento.texto}</strong><span>{evento.autor} · {dataTexto(evento.data)}</span></div>)}
          </div>}
          {aba === "notificacoes" && <div className="chamados-notificacoes">
            {chamado.notificacoes.length === 0 && <p>Nenhuma notificação.</p>}
            {chamado.notificacoes.map((n) => <div key={n.id} className={n.lida ? "" : "nao-lida"}><Bell size={16}/><span>{n.texto}<small>{dataTexto(n.data)}</small></span>{!n.lida && <button type="button" onClick={() => onNotificacaoLida(chamado.id, n.id)}>Marcar lida</button>}</div>)}
          </div>}
          {aba === "avaliacao" && <div className="chamados-avaliacao">
            {!['Resolvido', 'Encerrado'].includes(chamado.status) ? <p>Finalize o atendimento para habilitar a avaliação.</p> : <div className="chamados-estrelas">{[1,2,3,4,5].map((n) => <button type="button" key={n} className={n <= (chamado.avaliacao || 0) ? "ativo" : ""} aria-label={`${n} estrelas`} onClick={() => onChange(chamado.id, { avaliacao: n })}>★</button>)}</div>}
          </div>}
        </div>
      </section>
    </div>
  );
}

export default function AdminChamados() {
  const [chamados, setChamados] = useState(carregarChamados);
  const [erroPersistencia, setErroPersistencia] = useState("");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("Todos");
  const [prioridade, setPrioridade] = useState("Todas");
  const [categoria, setCategoria] = useState("Todas");
  const [escola, setEscola] = useState("Todas");
  const [responsavel, setResponsavel] = useState("Todos");
  const [sla, setSla] = useState("Todos");
  const [somenteCriticosAtivos, setSomenteCriticosAtivos] = useState(false);
  const [ordem, setOrdem] = useState("atualizados");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [agora] = useState(() => Date.now());

  useEffect(() => {
    try {
      localStorage.setItem(CHAMADOS_KEY, JSON.stringify(chamados));
    } catch {
      setErroPersistencia("Armazenamento do navegador cheio ou indisponível. Algumas alterações não serão preservadas.");
    }
  }, [chamados]);

  const escolas = useMemo(() => [...new Set(chamados.map((c) => c.escola))].sort((a,b) => a.localeCompare(b, "pt-BR")), [chamados]);
  const selecionado = chamados.find((c) => c.id === selecionadoId);
  const indicadores = {
    abertos: chamados.filter((c) => c.status === "Aberto").length,
    atendimento: chamados.filter((c) => c.status === "Em atendimento").length,
    criticos: chamados.filter((c) => c.prioridade === "Crítica" && ativos(c)).length,
    atrasados: chamados.filter((c) => prazoChamado(c, agora).estado === "atrasado").length,
    resolvidos: chamados.filter((c) => c.status === "Resolvido").length
  };

  const filtrados = useMemo(() => chamados.filter((c) => {
    const texto = [c.id, c.titulo, c.descricao, c.escola, c.solicitante, c.categoria, c.responsavel].join(" ").toLocaleLowerCase("pt-BR");
    return texto.includes(busca.trim().toLocaleLowerCase("pt-BR")) &&
      (status === "Todos" || c.status === status) &&
      (prioridade === "Todas" || c.prioridade === prioridade) &&
      (categoria === "Todas" || c.categoria === categoria) &&
      (escola === "Todas" || c.escola === escola) &&
      (responsavel === "Todos" || c.responsavel === responsavel) &&
      (sla === "Todos" || prazoChamado(c, agora).estado === sla) &&
      (!somenteCriticosAtivos || (c.prioridade === "Crítica" && ativos(c)));
  }), [chamados, busca, status, prioridade, categoria, escola, responsavel, sla, somenteCriticosAtivos, agora]);

  const ordenados = useMemo(() => [...filtrados].sort((a, b) => {
    const campo = ordem === "antigos" || ordem === "recentes" ? "criadoEm" : "atualizadoEm";
    return (ordem === "antigos" ? 1 : -1) * (new Date(a[campo]).getTime() - new Date(b[campo]).getTime());
  }), [filtrados, ordem]);
  const paginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
  const atual = Math.min(pagina, paginas);
  const visiveis = ordenados.slice((atual - 1) * porPagina, atual * porPagina);

  function filtro(setter, valor) { setter(valor); setPagina(1); }
  function limpar() { setBusca(""); setStatus("Todos"); setPrioridade("Todas"); setCategoria("Todas"); setEscola("Todas"); setResponsavel("Todos"); setSla("Todos"); setSomenteCriticosAtivos(false); setPagina(1); }
  function card(tipo) {
    limpar();
    if (tipo === "abertos") setStatus("Aberto");
    if (tipo === "atendimento") setStatus("Em atendimento");
    if (tipo === "criticos") setSomenteCriticosAtivos(true);
    if (tipo === "atrasados") setSla("atrasado");
    if (tipo === "resolvidos") setStatus("Resolvido");
  }
  function mudar(id, dados) { setChamados((atualLista) => registrarAlteracao(atualLista, id, dados)); }
  function marcarLida(id, avisoId) { setChamados((lista) => lista.map((c) => c.id === id ? { ...c, notificacoes: c.notificacoes.map((n) => n.id === avisoId ? { ...n, lida: true } : n) } : c)); }

  return <div className="alunos-page admin-chamados-page">
    <header className="alunos-header"><div className="alunos-header-usuario"><div><h1>Central de Suporte</h1><p>Acompanhe e gerencie os chamados das instituições do PresenSee.</p></div></div></header>
    {erroPersistencia && <p className="chamados-erro" role="alert">{erroPersistencia}</p>}
    <section className="chamados-indicadores" aria-label="Indicadores de suporte">
      {[
        ["abertos", "Chamados abertos", MessageCircle],
        ["atendimento", "Em atendimento", Headset],
        ["criticos", "Críticos ativos", AlertCircle],
        ["atrasados", "Fora do prazo", Clock3],
        ["resolvidos", "Resolvidos", CheckCircle2]
      ].map(([tipo, titulo, Icon]) => <button key={tipo} type="button" className={`chamados-indicador ${tipo}`} onClick={() => card(tipo)}><span className="chamados-indicador-icone"><Icon size={23}/></span><div><strong>{indicadores[tipo]}</strong><span>{titulo}</span></div></button>)}
    </section>
    <section className="alunos-filtros-panel chamados-filtros" aria-label="Filtros de chamados">
      <label className="alunos-busca"><span className="alunos-search-icon"><Search size={19}/></span><input type="search" className="search-aluno" value={busca} placeholder="Buscar chamado, instituição ou solicitante..." onChange={(e) => filtro(setBusca, e.target.value)}/></label>
      {[
        ["Status", status, setStatus, ["Todos", ...STATUS]],
        ["Prioridade", prioridade, setPrioridade, ["Todas", ...PRIORIDADES]],
        ["Categoria", categoria, setCategoria, ["Todas", ...CATEGORIAS]],
        ["Escola", escola, setEscola, ["Todas", ...escolas]],
        ["Responsável", responsavel, setResponsavel, ["Todos", ...RESPONSAVEIS]],
        ["Prazo", sla, setSla, ["Todos", "em-dia", "proximo", "atrasado", "finalizado"]]
      ].map(([titulo, valor, setter, opcoes]) => <div className="alunos-filtro" key={titulo}><label>{titulo}</label><select value={valor} onChange={(e) => filtro(setter, e.target.value)}>{opcoes.map((op) => <option key={op} value={op}>{({"em-dia":"Em dia",proximo:"Próximo do prazo",atrasado:"Atrasado",finalizado:"Finalizado",Todos:"Todos",Todas:"Todas"})[op] || op}</option>)}</select></div>)}
      <button type="button" className="chamados-limpar" onClick={limpar}>Limpar filtros</button>
    </section>
    <section className="alunos-tabela-panel">
      <div className="chamados-tabela-titulo"><div><h2>Chamados recebidos</h2><p>Solicitações e últimas movimentações</p></div><label><Clock3 size={16}/><select value={ordem} onChange={(e) => filtro(setOrdem, e.target.value)}><option value="atualizados">Atualizados recentemente</option><option value="recentes">Abertos recentemente</option><option value="antigos">Mais antigos</option></select></label></div>
      <div className="alunos-tabela-scroll"><table className="students-table chamados-tabela"><thead><tr><th>Chamado</th><th>Escola</th><th>Responsável</th><th>Prioridade</th><th>Status</th><th>Prazo</th><th>Atualização</th><th>Ações</th></tr></thead><tbody>
        {visiveis.map((c) => { const prazo = prazoChamado(c, agora); return <tr key={c.id}>
          <td><div className="chamados-tabela-identificacao"><small>{c.id} · {c.categoria}</small><button type="button" onClick={() => setSelecionadoId(c.id)}>{c.titulo}</button><span>{c.solicitante}</span></div></td>
          <td>{c.escola}</td><td>{c.responsavel}</td><td><span className={`chamados-badge prioridade-${formatoClasse(c.prioridade)}`}>{c.prioridade}</span></td><td><span className={`chamados-badge status-${formatoClasse(c.status)}`}>{c.status}</span></td>
          <td><span className={`chamados-prazo ${prazo.estado}`}>{prazo.texto}</span></td><td className="chamados-data">{dataTexto(c.atualizadoEm)}</td><td><button type="button" className="chamados-ver" onClick={() => setSelecionadoId(c.id)}>Ver chamado</button></td>
        </tr>; })}
        {visiveis.length === 0 && <tr><td colSpan={8} className="alunos-vazio">Nenhum chamado encontrado.</td></tr>}
      </tbody></table></div>
      <footer className="alunos-paginacao"><span>Mostrando {visiveis.length} de {filtrados.length} chamados</span><div className="alunos-paginas"><button type="button" disabled={atual <= 1} onClick={() => setPagina(atual - 1)} aria-label="Anterior">‹</button><strong>{atual}</strong><span>de {paginas}</span><button type="button" disabled={atual >= paginas} onClick={() => setPagina(atual + 1)} aria-label="Próxima">›</button></div><label className="alunos-por-pagina">Itens por página<select value={porPagina} onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }}>{[10,20,50].map((n) => <option value={n} key={n}>{n}</option>)}</select></label></footer>
    </section>
    {selecionado && <ModalChamado key={selecionado.id} chamado={selecionado} onClose={() => setSelecionadoId(null)} onChange={mudar} onNotificacaoLida={marcarLida}/>}
  </div>;
}
