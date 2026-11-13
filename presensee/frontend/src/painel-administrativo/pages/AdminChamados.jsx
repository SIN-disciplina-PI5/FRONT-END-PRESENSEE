import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Bell, CheckCircle2, Clock3, Headset, MessageCircle, Paperclip, Search, Send, X } from "lucide-react";
import api from "../../services/api";
import "../../styles/Alunos.css";
import "../styles/admin.css";
import "../styles/AdminChamados.css";

// --- CONSTANTES MOVIDAS DO DEMO PARA CÁ ---
const STATUS = ["Aberto", "Em atendimento", "Resolvido", "Encerrado", "Cancelado"];
const PRIORIDADES = ["Baixa", "Normal", "Alta", "Crítica"];
const CATEGORIAS = ["Problema técnico", "Dúvida", "Acesso", "Sugestão", "Outros"];
const RESPONSAVEIS = ["Não atribuído", "Suporte N1", "Suporte N2", "Infraestrutura", "Desenvolvimento"];

const MAX_ARQUIVO = 600 * 1024;
const FORMATOS = ["image/png", "image/jpeg", "image/webp", "application/pdf", "text/plain"];

// --- FUNÇÕES UTILITÁRIAS ---
const ativos = (chamado) => !["Resolvido", "Encerrado", "Cancelado"].includes(chamado.status);
const formatoClasse = (texto) => String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-");

function dataTexto(dataString) {
  if (!dataString) return "Não disponível";
  const data = new Date(dataString);
  return isNaN(data.getTime()) ? "Data inválida" : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function prazoChamado(chamado, agora = Date.now()) {
  if (!ativos(chamado)) return { estado: "finalizado", texto: "Finalizado" };
  
  const limitesHoras = { "Baixa": 72, "Normal": 48, "Alta": 24, "Crítica": 4 };
  const horasLimite = limitesHoras[chamado.prioridade] || 48;
  const criadoEm = new Date(chamado.criadoEm || chamado.createdAt || agora).getTime();
  const limiteTempo = criadoEm + (horasLimite * 60 * 60 * 1000);
  const faltamHoras = (limiteTempo - agora) / (1000 * 60 * 60);

  if (faltamHoras < 0) return { estado: "atrasado", texto: `Atrasado há ${Math.abs(Math.floor(faltamHoras))}h` };
  if (faltamHoras <= 2) return { estado: "proximo", texto: `Vence em ${Math.floor(faltamHoras)}h` };
  return { estado: "em-dia", texto: `Prazo: ${Math.floor(faltamHoras)}h` };
}

// --- COMPONENTE MODAL ---
function ModalChamado({ chamado, onClose, onChange, onNotificacaoLida }) {
  const [texto, setTexto] = useState("");
  const [interno, setInterno] = useState(false);
  const [arquivo, setArquivo] = useState(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState("conversa");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    function fechar(event) { if (event.key === "Escape") onClose(); }
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

  async function enviar(event) {
    event.preventDefault();
    if (!texto.trim() && !arquivo) return;
    
    setEnviando(true);
    const mensagem = {
      id: crypto.randomUUID(), autor: "Suporte PresenSee", data: new Date().toISOString(),
      texto: texto.trim(), interno, anexos: arquivo ? [arquivo] : []
    };
    
    await onChange(chamado.id, { novaMensagem: mensagem });
    
    setTexto("");
    setArquivo(null);
    setErro("");
    setEnviando(false);
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
  const mensagens = chamado.mensagens || [];
  const historico = chamado.historico || [];
  const notificacoes = chamado.notificacoes || [];

  return (
    <div className="chamados-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="chamado-titulo" className="chamados-modal chamados-modal-avancado">
        <header className="chamados-modal-header">
          <div><span className="chamados-identificador">{chamado.id || "N/A"}</span><h2 id="chamado-titulo">{chamado.titulo}</h2></div>
          <button className="chamados-fechar" type="button" aria-label="Fechar" onClick={onClose}><X size={19}/></button>
        </header>
        <div className="chamados-modal-scroll">
          <div className="chamados-modal-informacoes">
            {[
              ["Escola", chamado.escola], ["Solicitante", chamado.solicitante], 
              ["Categoria", chamado.categoria], ["Abertura", dataTexto(chamado.criadoEm || chamado.createdAt)], 
              ["Última atualização", dataTexto(chamado.atualizadoEm || chamado.updatedAt)], ["SLA demonstrativo", prazo.texto]
            ].map(([rotulo, valor]) => <div key={rotulo}><span>{rotulo}</span><strong>{valor || "N/A"}</strong></div>)}
          </div>
          <div className="chamados-modal-controles chamados-controles-3">
            <label>Status<select value={chamado.status} onChange={(e) => onChange(chamado.id, { status: e.target.value })}>{STATUS.map((v) => <option key={v}>{v}</option>)}</select></label>
            <label>Prioridade<select value={chamado.prioridade} onChange={(e) => onChange(chamado.id, { prioridade: e.target.value })}>{PRIORIDADES.map((v) => <option key={v}>{v}</option>)}</select></label>
            <label>Responsável<select value={chamado.responsavel} onChange={(e) => onChange(chamado.id, { responsavel: e.target.value })}>{[...new Set([...RESPONSAVEIS, chamado.responsavel])].filter(Boolean).map((v) => <option key={v}>{v}</option>)}</select></label>
          </div>
          <div className="chamados-modal-secao"><h3>Descrição do chamado</h3><p>{chamado.descricao}</p></div>
          <div className="chamados-abas" role="tablist" aria-label="Informações do atendimento">
            {[['conversa', 'Conversa'], ['historico', 'Histórico'], ['notificacoes', 'Notificações'], ['avaliacao', 'Avaliação']].map(([id, label]) => <button type="button" role="tab" aria-selected={aba === id} className={aba === id ? "ativo" : ""} key={id} onClick={() => setAba(id)}>{label}</button>)}
          </div>
          
          {aba === "conversa" && <>
            <div className="chamados-mensagens">
              {mensagens.length === 0 && <p className="chamados-sem-mensagens">Nenhuma mensagem registrada.</p>}
              {mensagens.map((m) => <article key={m.id} className={`chamados-mensagem ${m.interno ? "chamados-nota-interna" : ""}`}>
                <div className="chamados-mensagem-cabecalho"><strong>{m.autor}{m.interno ? " · Nota interna" : ""}</strong><time>{dataTexto(m.data)}</time></div>
                {m.texto && <p>{m.texto}</p>}
                {(m.anexos || []).map((a) => <button key={a.id} className="chamados-anexo" type="button" onClick={() => baixar(a)}><Paperclip size={14}/>{a.nome}</button>)}
              </article>)}
            </div>
            <form className="chamados-resposta" onSubmit={enviar}>
              <label htmlFor="chamados-texto">{interno ? "Nova nota interna" : "Nova resposta"}</label>
              <textarea id="chamados-texto" rows={3} maxLength={3000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={interno ? "Nota visível apenas ao suporte..." : "Escreva sua resposta..."} disabled={enviando}/>
              <label className="chamados-checkbox"><input type="checkbox" checked={interno} onChange={(e) => setInterno(e.target.checked)} disabled={enviando}/> Nota interna (não destinada ao solicitante)</label>
              <div className="chamados-resposta-acoes">
                <label className="chamados-anexar"><Paperclip size={15}/> Anexar arquivo<input type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.txt" onChange={selecionarArquivo} disabled={enviando}/></label>
                {arquivo && <span className="chamados-arquivo-nome">{arquivo.nome} <button type="button" aria-label="Remover anexo" onClick={() => setArquivo(null)}>×</button></span>}
                <button type="submit" disabled={(!texto.trim() && !arquivo) || enviando}><Send size={15}/> {enviando ? "Enviando..." : "Registrar"}</button>
              </div>
              {erro && <span role="alert" className="chamados-erro">{erro}</span>}
            </form>
          </>}

          {aba === "historico" && <div className="chamados-historico">
            {[{ id: "criacao", texto: "Chamado aberto", data: chamado.criadoEm || chamado.createdAt, autor: chamado.solicitante }, ...historico].map((evento) => <div key={evento.id}><strong>{evento.texto}</strong><span>{evento.autor} · {dataTexto(evento.data)}</span></div>)}
          </div>}

          {aba === "notificacoes" && <div className="chamados-notificacoes">
            {notificacoes.length === 0 && <p>Nenhuma notificação.</p>}
            {notificacoes.map((n) => <div key={n.id} className={n.lida ? "" : "nao-lida"}><Bell size={16}/><span>{n.texto}<small>{dataTexto(n.data)}</small></span>{!n.lida && <button type="button" onClick={() => onNotificacaoLida(chamado.id, n.id)}>Marcar lida</button>}</div>)}
          </div>}

          {aba === "avaliacao" && <div className="chamados-avaliacao">
            {!['Resolvido', 'Encerrado'].includes(chamado.status) ? <p>Finalize o atendimento para habilitar a avaliação.</p> : <div className="chamados-estrelas">{[1,2,3,4,5].map((n) => <button type="button" key={n} className={n <= (chamado.avaliacao || 0) ? "ativo" : ""} aria-label={`${n} estrelas`} onClick={() => onChange(chamado.id, { avaliacao: n })}>★</button>)}</div>}
          </div>}
        </div>
      </section>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function AdminChamados() {
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroApi, setErroApi] = useState("");
  
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

  // CARREGAR DADOS DA API
  useEffect(() => {
    async function buscarChamados() {
      try {
        setCarregando(true);
        // O ideal é usar /api/chamados. Se o backend ainda não tiver, esta requisição retornará Vazia/Erro até criarmos.
        const resposta = await api.get("/chamados");
        setChamados(Array.isArray(resposta.data) ? resposta.data : []);
        setErroApi("");
      } catch (error) {
        console.error("Erro ao buscar chamados:", error);
        setErroApi("A rota /api/chamados não foi encontrada ou falhou. Verifique se ela foi criada no back-end.");
      } finally {
        setCarregando(false);
      }
    }
    buscarChamados();
  }, []);

  const escolas = useMemo(() => [...new Set(chamados.map((c) => c.escola))].filter(Boolean).sort((a,b) => a.localeCompare(b, "pt-BR")), [chamados]);
  const selecionado = chamados.find((c) => c.id === selecionadoId);
  const indicadores = {
    abertos: chamados.filter((c) => c.status === "Aberto").length,
    atendimento: chamados.filter((c) => c.status === "Em atendimento").length,
    criticos: chamados.filter((c) => c.prioridade === "Crítica" && ativos(c)).length,
    atrasados: chamados.filter((c) => prazoChamado(c, agora).estado === "atrasado").length,
    resolvidos: chamados.filter((c) => c.status === "Resolvido").length
  };

  const filtrados = useMemo(() => chamados.filter((c) => {
    const texto = [c.id, c.titulo, c.descricao, c.escola, c.solicitante, c.categoria, c.responsavel].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
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
    const campoA = a.atualizadoEm || a.updatedAt || a.criadoEm || a.createdAt;
    const campoB = b.atualizadoEm || b.updatedAt || b.criadoEm || b.createdAt;
    const campoA_C = a.criadoEm || a.createdAt;
    const campoB_C = b.criadoEm || b.createdAt;
    
    const valorA = ordem === "antigos" || ordem === "recentes" ? campoA_C : campoA;
    const valorB = ordem === "antigos" || ordem === "recentes" ? campoB_C : campoB;
    
    return (ordem === "antigos" ? 1 : -1) * (new Date(valorA || 0).getTime() - new Date(valorB || 0).getTime());
  }), [filtrados, ordem]);

  const paginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
  const atual = Math.min(pagina, paginas);
  const visiveis = ordenados.slice((atual - 1) * porPagina, atual * porPagina);

  function filtroOp(setter, valor) { setter(valor); setPagina(1); }
  function limpar() { setBusca(""); setStatus("Todos"); setPrioridade("Todas"); setCategoria("Todas"); setEscola("Todas"); setResponsavel("Todos"); setSla("Todos"); setSomenteCriticosAtivos(false); setPagina(1); }
  
  function card(tipo) {
    limpar();
    if (tipo === "abertos") setStatus("Aberto");
    if (tipo === "atendimento") setStatus("Em atendimento");
    if (tipo === "criticos") setSomenteCriticosAtivos(true);
    if (tipo === "atrasados") setSla("atrasado");
    if (tipo === "resolvidos") setStatus("Resolvido");
  }

  async function atualizarChamadoNaApi(id, dados) {
    try {
      // Faz o PATCH para a API real
      await api.patch(`/chamados/${id}`, dados);
      
      // Atualiza o estado local simulando o comportamento da API para reflexão instantânea
      setChamados((lista) => lista.map((c) => {
        if (c.id !== id) return c;
        const chamadoAtualizado = { ...c, ...dados, atualizadoEm: new Date().toISOString() };
        
        if (dados.novaMensagem) {
          chamadoAtualizado.mensagens = [...(c.mensagens || []), dados.novaMensagem];
          const acaoHist = { id: crypto.randomUUID(), texto: "Nova interação", data: new Date().toISOString(), autor: dados.novaMensagem.autor };
          chamadoAtualizado.historico = [...(c.historico || []), acaoHist];
        }
        return chamadoAtualizado;
      }));
    } catch (error) {
      console.error("Erro ao atualizar chamado:", error);
      alert("Não foi possível atualizar o chamado na API.");
    }
  }

  function marcarLida(id, avisoId) { 
    // Em uma versão avançada, faríamos um PATCH para as notificações também
    setChamados((lista) => lista.map((c) => c.id === id ? { ...c, notificacoes: (c.notificacoes || []).map((n) => n.id === avisoId ? { ...n, lida: true } : n) } : c)); 
  }

  if (carregando) {
    return <div className="alunos-page admin-chamados-page" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>Carregando chamados...</div>;
  }

  return <div className="alunos-page admin-chamados-page">
    <header className="alunos-header"><div className="alunos-header-usuario"><div><h1>Central de Suporte</h1><p>Acompanhe e gerencie os chamados das instituições do PresenSee.</p></div></div></header>
    
    {erroApi && <p className="chamados-erro" style={{ padding: '15px', background: '#ffe7e9', color: '#d9233a', borderRadius: '8px', marginBottom: '20px' }} role="alert">{erroApi}</p>}
    
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
      <label className="alunos-busca"><span className="alunos-search-icon"><Search size={19}/></span><input type="search" className="search-aluno" value={busca} placeholder="Buscar chamado, instituição ou solicitante..." onChange={(e) => filtroOp(setBusca, e.target.value)}/></label>
      {[
        ["Status", status, setStatus, ["Todos", ...STATUS]],
        ["Prioridade", prioridade, setPrioridade, ["Todas", ...PRIORIDADES]],
        ["Categoria", categoria, setCategoria, ["Todas", ...CATEGORIAS]],
        ["Escola", escola, setEscola, ["Todas", ...escolas]],
        ["Responsável", responsavel, setResponsavel, ["Todos", ...RESPONSAVEIS]],
        ["Prazo", sla, setSla, ["Todos", "em-dia", "proximo", "atrasado", "finalizado"]]
      ].map(([titulo, valor, setter, opcoes]) => <div className="alunos-filtro" key={titulo}><label>{titulo}</label><select value={valor} onChange={(e) => filtroOp(setter, e.target.value)}>{opcoes.map((op) => <option key={op} value={op}>{({"em-dia":"Em dia",proximo:"Próximo do prazo",atrasado:"Atrasado",finalizado:"Finalizado",Todos:"Todos",Todas:"Todas"})[op] || op}</option>)}</select></div>)}
      <button type="button" className="chamados-limpar" onClick={limpar}>Limpar filtros</button>
    </section>
    <section className="alunos-tabela-panel">
      <div className="chamados-tabela-titulo"><div><h2>Chamados recebidos</h2><p>Solicitações e últimas movimentações</p></div><label><Clock3 size={16}/><select value={ordem} onChange={(e) => filtroOp(setOrdem, e.target.value)}><option value="atualizados">Atualizados recentemente</option><option value="recentes">Abertos recentemente</option><option value="antigos">Mais antigos</option></select></label></div>
      <div className="alunos-tabela-scroll"><table className="students-table chamados-tabela"><thead><tr><th>Chamado</th><th>Escola</th><th>Responsável</th><th>Prioridade</th><th>Status</th><th>Prazo</th><th>Atualização</th><th>Ações</th></tr></thead><tbody>
        {visiveis.map((c) => { const prazo = prazoChamado(c, agora); return <tr key={c.id}>
          <td><div className="chamados-tabela-identificacao"><small>{c.id} · {c.categoria}</small><button type="button" onClick={() => setSelecionadoId(c.id)}>{c.titulo}</button><span>{c.solicitante}</span></div></td>
          <td>{c.escola}</td><td>{c.responsavel || "Não atribuído"}</td><td><span className={`chamados-badge prioridade-${formatoClasse(c.prioridade)}`}>{c.prioridade}</span></td><td><span className={`chamados-badge status-${formatoClasse(c.status)}`}>{c.status}</span></td>
          <td><span className={`chamados-prazo ${prazo.estado}`}>{prazo.texto}</span></td><td className="chamados-data">{dataTexto(c.atualizadoEm || c.updatedAt)}</td><td><button type="button" className="chamados-ver" onClick={() => setSelecionadoId(c.id)}>Ver chamado</button></td>
        </tr>; })}
        {visiveis.length === 0 && <tr><td colSpan={8} className="alunos-vazio">Nenhum chamado encontrado.</td></tr>}
      </tbody></table></div>
      <footer className="alunos-paginacao"><span>Mostrando {visiveis.length} de {filtrados.length} chamados</span><div className="alunos-paginas"><button type="button" disabled={atual <= 1} onClick={() => setPagina(atual - 1)} aria-label="Anterior">‹</button><strong>{atual}</strong><span>de {paginas}</span><button type="button" disabled={atual >= paginas} onClick={() => setPagina(atual + 1)} aria-label="Próxima">›</button></div><label className="alunos-por-pagina">Itens por página<select value={porPagina} onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }}>{[10,20,50].map((n) => <option value={n} key={n}>{n}</option>)}</select></label></footer>
    </section>
    {selecionado && <ModalChamado key={selecionado.id} chamado={selecionado} onClose={() => setSelecionadoId(null)} onChange={atualizarChamadoNaApi} onNotificacaoLida={marcarLida}/>}
  </div>;
}