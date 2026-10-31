import { useEffect, useMemo, useState } from "react";
import { Megaphone, Plus, Search, Pencil, Trash2, Send, Archive, X, Eye, Clock3 } from "lucide-react";
import { getEscolas } from "../services/adminDemo";
import { getComunicados, salvarComunicados, TIPOS_COMUNICADO } from "../services/comunicadosDemo";
import "../../styles/Alunos.css";
import "../styles/admin.css";
import "../styles/AdminComunicados.css";

const VAZIO = { titulo: "", mensagem: "", tipo: "Informativo", publico: "Todas as escolas", escolas: [], inicio: "", fim: "" };
const FORMATADOR = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function formatarData(valor) {
    if (!valor) return "—";
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? "—" : FORMATADOR.format(data);
}

function situação(comunicado) {
    if (comunicado.status === "Arquivado") return "Arquivado";
    if (comunicado.status === "Rascunho") return "Rascunho";
    const agora = Date.now();
    if (comunicado.inicio && new Date(comunicado.inicio).getTime() > agora) return "Agendado";
    if (comunicado.fim && new Date(comunicado.fim).getTime() < agora) return "Expirado";
    return "Publicado";
}

function dateLocal(valor) {
    if (!valor) return "";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "";
    const dois = (n) => String(n).padStart(2, "0");
    return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}T${dois(data.getHours())}:${dois(data.getMinutes())}`;
}

function ModalComunicado({ registro, escolas, onClose, onSave }) {
    const [dados, setDados] = useState(() => registro ? {
        titulo: registro.titulo,
        mensagem: registro.mensagem,
        tipo: registro.tipo,
        publico: registro.publico,
        escolas: registro.escolas || [],
        inicio: dateLocal(registro.inicio),
        fim: dateLocal(registro.fim)
    } : { ...VAZIO });
    const [erro, setErro] = useState("");
    function alterar(campo, valor) {
        setDados((atual) => ({ ...atual, [campo]: valor }));
        setErro("");
    }
    function enviar(status) {
        if (!dados.titulo.trim() || !dados.mensagem.trim()) {
            setErro("Informe um título e uma mensagem.");
            return;
        }
        if (dados.publico === "Escolas específicas" && dados.escolas.length === 0) {
            setErro("Selecione pelo menos uma escola destinatária.");
            return;
        }
        if (dados.inicio && dados.fim && new Date(dados.fim) <= new Date(dados.inicio)) {
            setErro("A data de encerramento deve ser posterior ao início.");
            return;
        }
        onSave({ ...dados, titulo: dados.titulo.trim(), mensagem: dados.mensagem.trim(), inicio: dados.inicio ? new Date(dados.inicio).toISOString() : "", fim: dados.fim ? new Date(dados.fim).toISOString() : "", status }, registro?.id);
    }
    return (
        <div className="comunicados-overlay" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onClose(); }}>
            <section className="comunicados-modal" role="dialog" aria-modal="true" aria-labelledby="comunicados-modal-titulo">
                <header className="comunicados-modal-topo">
                    <div><h2 id="comunicados-modal-titulo">{registro ? "Editar comunicado" : "Novo comunicado"}</h2><p>Defina a mensagem e quais escolas devem recebê-la.</p></div>
                    <button type="button" className="comunicados-icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
                </header>
                <div className="comunicados-modal-conteudo">
                    <label>Título<input maxLength={120} value={dados.titulo} onChange={(e) => alterar("titulo", e.target.value)} placeholder="Assunto do comunicado" /></label>
                    <label>Mensagem<textarea rows={6} maxLength={5000} value={dados.mensagem} onChange={(e) => alterar("mensagem", e.target.value)} placeholder="Escreva o comunicado para as escolas..." /></label>
                    <div className="comunicados-form-grid">
                        <label>Categoria<select value={dados.tipo} onChange={(e) => alterar("tipo", e.target.value)}>{TIPOS_COMUNICADO.map((tipo) => <option key={tipo}>{tipo}</option>)}</select></label>
                        <label>Destinatários<select value={dados.publico} onChange={(e) => alterar("publico", e.target.value)}><option>Todas as escolas</option><option>Escolas específicas</option></select></label>
                    </div>
                    {dados.publico === "Escolas específicas" && <fieldset className="comunicados-escolas"><legend>Selecionar escolas</legend>{escolas.map((escola) => <label key={escola.id}><input type="checkbox" checked={dados.escolas.includes(String(escola.id))} onChange={(e) => alterar("escolas", e.target.checked ? [...dados.escolas, String(escola.id)] : dados.escolas.filter((id) => id !== String(escola.id)))} />{escola.nome}</label>)}{escolas.length === 0 && <p>Nenhuma escola cadastrada.</p>}</fieldset>}
                    <div className="comunicados-form-grid">
                        <label>Publicar a partir de (opcional)<input type="datetime-local" value={dados.inicio} onChange={(e) => alterar("inicio", e.target.value)} /></label>
                        <label>Expira em (opcional)<input type="datetime-local" value={dados.fim} onChange={(e) => alterar("fim", e.target.value)} /></label>
                    </div>
                    {erro && <p className="comunicados-erro" role="alert">{erro}</p>}
                </div>
                <footer className="comunicados-modal-rodape"><button type="button" className="comunicados-secundario" onClick={onClose}>Cancelar</button><button type="button" className="comunicados-secundario" onClick={() => enviar("Rascunho")}>Salvar rascunho</button><button type="button" className="comunicados-primario" onClick={() => enviar("Publicado")}><Send size={16} />{dados.inicio && new Date(dados.inicio).getTime() > Date.now() ? "Agendar" : "Publicar"}</button></footer>
            </section>
        </div>
    );
}

export default function AdminComunicados() {
    const [comunicados, setComunicados] = useState(getComunicados);
    const [escolas] = useState(getEscolas);
    const [busca, setBusca] = useState("");
    const [status, setStatus] = useState("Todos");
    const [tipo, setTipo] = useState("Todos");
    const [pagina, setPagina] = useState(1);
    const [modal, setModal] = useState(null);
    const [excluir, setExcluir] = useState(null);
    const [agora, setAgora] = useState(Date.now());
    useEffect(() => { salvarComunicados(comunicados); }, [comunicados]);
    useEffect(() => { const timer = setInterval(() => setAgora(Date.now()), 60000); return () => clearInterval(timer); }, []);
    const filtrados = useMemo(() => comunicados.filter((c) => {
        const termo = busca.toLocaleLowerCase("pt-BR");
        return [c.titulo, c.mensagem, c.tipo].join(" ").toLocaleLowerCase("pt-BR").includes(termo) && (status === "Todos" || situação(c) === status) && (tipo === "Todos" || c.tipo === tipo);
    }).sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)), [comunicados, busca, status, tipo, agora]);
    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / 10));
    const visiveis = filtrados.slice((Math.min(pagina, totalPaginas) - 1) * 10, Math.min(pagina, totalPaginas) * 10);
    const indicadores = useMemo(() => ({ total: comunicados.length, publicados: comunicados.filter((c) => situação(c) === "Publicado").length, agendados: comunicados.filter((c) => situação(c) === "Agendado").length, rascunhos: comunicados.filter((c) => situação(c) === "Rascunho").length }), [comunicados, agora]);
    function salvar(dados, id) {
        const instante = new Date().toISOString();
        setComunicados((lista) => id ? lista.map((c) => c.id === id ? { ...c, ...dados, alteradoEm: instante, publicadoEm: dados.status === "Publicado" ? instante : c.publicadoEm } : c) : [{ ...dados, id: crypto.randomUUID(), criadoEm: instante, alteradoEm: instante, publicadoEm: dados.status === "Publicado" ? instante : "" }, ...lista]);
        setModal(null);
    }
    function alterarStatus(id, novoStatus) {
        setComunicados((lista) => lista.map((c) => c.id === id ? { ...c, status: novoStatus, alteradoEm: new Date().toISOString(), publicadoEm: novoStatus === "Publicado" ? new Date().toISOString() : c.publicadoEm } : c));
    }
    return (
        <div className="alunos-page admin-comunicados-page">
            <header className="alunos-header comunicados-header"><div><h1>Comunicados</h1><p>Publique avisos e atualizações nas notificações das escolas.</p></div><button className="comunicados-primario" type="button" onClick={() => setModal({ tipo: "novo" })}><Plus size={18} /> Novo comunicado</button></header>
            <section className="alunos-resumo comunicados-resumo">
                {[{ titulo: "Total de comunicados", valor: indicadores.total, classe: "total", icone: Megaphone }, { titulo: "Publicados", valor: indicadores.publicados, classe: "baixo", icone: Eye }, { titulo: "Agendados", valor: indicadores.agendados, classe: "medio", icone: Clock3 }, { titulo: "Rascunhos", valor: indicadores.rascunhos, classe: "alto", icone: Pencil }].map(({ titulo, valor, classe, icone: Icone }) => <div key={titulo} className={`alunos-resumo-card ${classe}`}><span className="alunos-resumo-icone"><Icone size={25} /></span><div><strong>{valor}</strong><b>{titulo}</b></div></div>)}
            </section>
            <section className="alunos-filtros-panel comunicados-filtros"><label className="alunos-busca"><span className="alunos-search-icon"><Search size={19} /></span><input className="search-aluno" type="search" placeholder="Buscar comunicado..." value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} /></label><div className="alunos-filtro"><label htmlFor="comunicados-status">Situação</label><select id="comunicados-status" value={status} onChange={(e) => { setStatus(e.target.value); setPagina(1); }}>{["Todos", "Publicado", "Agendado", "Rascunho", "Expirado", "Arquivado"].map((s) => <option key={s}>{s}</option>)}</select></div><div className="alunos-filtro"><label htmlFor="comunicados-tipo">Categoria</label><select id="comunicados-tipo" value={tipo} onChange={(e) => { setTipo(e.target.value); setPagina(1); }}>{["Todos", ...TIPOS_COMUNICADO].map((s) => <option key={s}>{s}</option>)}</select></div></section>
            <section className="alunos-tabela-panel"><div className="comunicados-lista-topo"><div><h2>Comunicados cadastrados</h2><p>Gerencie os avisos publicados e programados.</p></div><span>{filtrados.length} registros</span></div><div className="alunos-tabela-scroll"><table className="students-table comunicados-tabela"><thead><tr><th>Comunicado</th><th>Destinatários</th><th>Categoria</th><th>Situação</th><th>Publicação</th><th>Ações</th></tr></thead><tbody>{visiveis.map((c) => <tr key={c.id}><td><div className="comunicados-identificacao"><strong>{c.titulo}</strong><small>{c.mensagem}</small></div></td><td>{c.publico === "Todas as escolas" ? c.publico : `${c.escolas.length} escola(s)`}</td><td>{c.tipo}</td><td><span className={`comunicados-status comunicados-status-${situação(c).toLowerCase()}`}>{situação(c)}</span></td><td>{formatarData(c.inicio || c.publicadoEm || c.criadoEm)}</td><td><div className="comunicados-acoes"><button type="button" title="Editar" aria-label={`Editar ${c.titulo}`} onClick={() => setModal({ tipo: "editar", registro: c })}><Pencil size={17} /></button>{c.status !== "Arquivado" && <button type="button" title="Arquivar" aria-label={`Arquivar ${c.titulo}`} onClick={() => alterarStatus(c.id, "Arquivado")}><Archive size={17} /></button>}{c.status !== "Publicado" && c.status !== "Arquivado" && <button type="button" title="Publicar" aria-label={`Publicar ${c.titulo}`} onClick={() => alterarStatus(c.id, "Publicado")}><Send size={17} /></button>}<button type="button" title="Excluir" aria-label={`Excluir ${c.titulo}`} onClick={() => setExcluir(c)}><Trash2 size={17} /></button></div></td></tr>)}{visiveis.length === 0 && <tr><td colSpan={6} className="alunos-vazio">Nenhum comunicado encontrado.</td></tr>}</tbody></table></div><footer className="alunos-paginacao"><span>Mostrando {visiveis.length} de {filtrados.length} comunicados</span><div className="alunos-paginas"><button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>‹</button><strong>{Math.min(pagina, totalPaginas)}</strong><span>de {totalPaginas}</span><button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}>›</button></div></footer></section>
            {modal && <ModalComunicado key={modal.registro?.id || "novo"} registro={modal.registro} escolas={escolas} onClose={() => setModal(null)} onSave={salvar} />}
            {excluir && <div className="comunicados-overlay"><div className="comunicados-confirmacao" role="alertdialog" aria-modal="true"><h2>Excluir comunicado?</h2><p>Esta ação removerá o comunicado das notificações demonstrativas.</p><div><button type="button" className="comunicados-secundario" onClick={() => setExcluir(null)}>Cancelar</button><button type="button" className="comunicados-primario" onClick={() => { setComunicados((lista) => lista.filter((c) => c.id !== excluir.id)); setExcluir(null); }}>Excluir</button></div></div></div>}
        </div>
    );
}
