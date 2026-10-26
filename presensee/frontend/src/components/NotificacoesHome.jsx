import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../services/auth";
import { ALUNOS_INICIAIS } from "../pages/Alunos";
import { useComunicadosNotificacoes } from "./ComunicadosNotificacoes";
import "../styles/NotificacoesHome.css";
import "../styles/ComunicadosNotificacoes.css";

const EXEMPLOS = [
    { id: "demo-alerta-1", titulo: "Faltas consecutivas", estudante: "Gabriel Soares", matricula: "006", descricao: "O estudante acumulou 4 faltas consecutivas.", nivel: "alto", quando: "Hoje" },
    { id: "demo-alerta-2", titulo: "Frequência em atenção", estudante: "Pedro Henrique", matricula: "005", descricao: "A frequência do estudante está abaixo do esperado.", nivel: "medio", quando: "Ontem" },
    { id: "demo-alerta-3", titulo: "Acompanhamento recomendado", estudante: "Marcos Heitor", matricula: "003", descricao: "Revise os indicadores de presença deste estudante.", nivel: "medio", quando: "Esta semana" }
];

const ETIQUETAS = { alto: "Alto risco", medio: "Atenção", baixo: "Informativo" };

function IconeSino() {
    return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>;
}

export default function NotificacoesHome({ notificacoes }) {
    const navigate = useNavigate();
    const areaRef = useRef(null);
    const isDemo = getToken() === "token-demo";
    const fonte = Array.isArray(notificacoes) ? notificacoes : isDemo ? EXEMPLOS : [];
    const alertas = fonte.map((alerta) => {
        const matricula = String(alerta.matricula ?? alerta.alunoId ?? "").trim();
        const aluno = ALUNOS_INICIAIS.find((item) =>
            (matricula && String(item.matricula) === matricula) ||
            (!matricula && alerta.estudante && item.nome.toLocaleLowerCase("pt-BR") === String(alerta.estudante).toLocaleLowerCase("pt-BR"))
        );
        return { ...alerta, matricula: aluno?.matricula ?? null, estudante: aluno?.nome ?? alerta.estudante };
    });
    const [aberto, setAberto] = useState(false);
    const [lidos, setLidos] = useState([]);
    const [comunicadoAberto, setComunicadoAberto] = useState(null);
    const { comunicados, lidos: comunicadosLidos, marcarLido } = useComunicadosNotificacoes();
    const naoLidosAlertas = alertas.filter((alerta) => !lidos.includes(alerta.id)).length;
    const naoLidosComunicados = comunicados.filter((item) => !comunicadosLidos.includes(item.id)).length;
    const naoLidos = naoLidosAlertas + naoLidosComunicados;

    useEffect(() => {
        if (!aberto) return undefined;
        const fecharFora = (evento) => { if (!areaRef.current?.contains(evento.target)) { setAberto(false); setComunicadoAberto(null); } };
        const fecharEscape = (evento) => { if (evento.key === "Escape") { setAberto(false); setComunicadoAberto(null); } };
        document.addEventListener("pointerdown", fecharFora);
        document.addEventListener("keydown", fecharEscape);
        return () => { document.removeEventListener("pointerdown", fecharFora); document.removeEventListener("keydown", fecharEscape); };
    }, [aberto]);

    function visualizarAlerta(alerta) {
        setLidos((anterior) => [...new Set([...anterior, alerta.id])]);
        setAberto(false);
        if (alerta.matricula !== undefined && alerta.matricula !== null && String(alerta.matricula).trim()) {
            navigate(`/alunos/${encodeURIComponent(String(alerta.matricula))}`);
        } else {
            navigate("/alunos");
        }
    }

    function visualizarComunicado(item) {
        marcarLido(item.id);
        setComunicadoAberto(item);
    }

    function marcarTodas() {
        setLidos(alertas.map((a) => a.id));
        comunicados.forEach((item) => marcarLido(item.id));
    }

    return (
        <div className="pnot-root" ref={areaRef}>
            <button type="button" className={`pnot-trigger ${aberto ? "pnot-trigger--active" : ""}`} onClick={() => setAberto((anterior) => !anterior)} aria-label={`Notificações, ${naoLidos} não lidas`} aria-expanded={aberto} aria-haspopup="dialog" title="Notificações"><IconeSino />{naoLidos > 0 && <span className="pnot-count">{naoLidos > 9 ? "9+" : naoLidos}</span>}</button>
            {aberto && <section className="pnot-popover" role="dialog" aria-label="Notificações">
                <div className="pnot-heading"><div><h2>Notificações</h2><p>{naoLidos ? `${naoLidos} notificação${naoLidos === 1 ? "" : "ões"} não lida${naoLidos === 1 ? "" : "s"}` : "Tudo em dia"}</p></div><button type="button" className="pnot-close" onClick={() => { setAberto(false); setComunicadoAberto(null); }} aria-label="Fechar notificações">×</button></div>
                <div className="pnot-list">
                    {comunicadoAberto ? <div className="pnot-comunicado-detalhe"><button type="button" onClick={() => setComunicadoAberto(null)}>← Voltar</button><strong>{comunicadoAberto.titulo}</strong><small>{comunicadoAberto.tipo} · {new Date(comunicadoAberto.inicio || comunicadoAberto.publicadoEm || comunicadoAberto.criadoEm).toLocaleDateString("pt-BR")}</small><p>{comunicadoAberto.mensagem}</p></div> : <>
                        {comunicados.length > 0 && <div className="pnot-grupo-titulo">Comunicados da administração</div>}
                        {comunicados.map((item) => <button type="button" key={`comunicado-${item.id}`} className={`pnot-item ${comunicadosLidos.includes(item.id) ? "pnot-item--read" : ""}`} onClick={() => visualizarComunicado(item)}><span className={`pnot-level pnot-level--${item.tipo === "Urgente" ? "alto" : item.tipo === "Manutenção" ? "medio" : "baixo"}`} aria-hidden="true" /><span className="pnot-content"><span className="pnot-item-top"><strong>{item.titulo}</strong></span><span className="pnot-student">{item.tipo}</span><span className="pnot-description">{item.mensagem}</span><span className="pnot-level-name">Comunicado oficial</span></span>{!comunicadosLidos.includes(item.id) && <span className="pnot-unread" aria-label="Não lida" />}</button>)}
                        {alertas.length > 0 && <div className="pnot-grupo-titulo">Alertas de estudantes</div>}
                        {alertas.map((alerta) => <button type="button" key={alerta.id} className={`pnot-item ${lidos.includes(alerta.id) ? "pnot-item--read" : ""}`} onClick={() => visualizarAlerta(alerta)}><span className={`pnot-level pnot-level--${alerta.nivel || "baixo"}`} aria-hidden="true" /><span className="pnot-content"><span className="pnot-item-top"><strong>{alerta.titulo}</strong><small>{alerta.quando || ""}</small></span><span className="pnot-student">{alerta.estudante}</span><span className="pnot-description">{alerta.descricao}</span><span className="pnot-level-name">{ETIQUETAS[alerta.nivel] || "Informativo"}</span></span>{!lidos.includes(alerta.id) && <span className="pnot-unread" aria-label="Não lida" />}</button>)}
                        {comunicados.length === 0 && alertas.length === 0 && <div className="pnot-empty"><strong>Nenhuma notificação por enquanto</strong><p>Os comunicados e alertas aparecerão aqui quando estiverem disponíveis.</p></div>}
                    </>}
                </div>
                {!comunicadoAberto && (alertas.length > 0 || comunicados.length > 0) && <div className="pnot-footer"><button type="button" onClick={marcarTodas} disabled={naoLidos === 0}>Marcar todas como lidas</button></div>}
            </section>}
        </div>
    );
}
