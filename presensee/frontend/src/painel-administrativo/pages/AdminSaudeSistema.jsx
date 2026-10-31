import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Database, HardDrive, HeartPulse, RefreshCw, Server, ShieldCheck, Cpu, BrainCircuit, ScanFace, FileBarChart, ClipboardList, LogIn, ChevronDown, ChevronUp } from "lucide-react";
import { fetchSystemHealth, getOverallState, HEALTH_INTERVAL, HEALTH_URL, loadHistory, saveHistory, SERVICE_NAMES, summaryStats } from "../services/saudeSistema";
import "../../styles/Alunos.css";
import "../styles/admin.css";
import "../styles/AdminSaudeSistema.css";

const ICONS = { api: Server, database: Database, biometric: ScanFace, ai: BrainCircuit, server: Cpu, login: LogIn, attendance: ClipboardList, reports: FileBarChart, interventions: ShieldCheck };
const GROUPS = [
    { title: "Infraestrutura e serviços", keys: ["api", "database", "server"] },
    { title: "Módulos especializados", keys: ["biometric", "ai"] },
    { title: "Operações críticas", keys: ["login", "attendance", "reports", "interventions"] }
];
const STATES = {
    operational: "Operacional",
    degraded: "Atenção",
    down: "Falha",
    unknown: "Não monitorado"
};

function dateText(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

function Metric({ label, value, detail, Icon = Activity }) {
    return (
        <article className="saude-metric">
            <span className="saude-metric-icon"><Icon size={21} /></span>
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{detail}</small>
        </article>
    );
}

function Service({ service, open, onToggle }) {
    const Icon = ICONS[service.key] || Activity;
    return (
        <article className={`saude-service saude-status-${service.status}`}>
            <button type="button" className="saude-service-main" onClick={onToggle} aria-expanded={open}>
                <span className="saude-service-icon"><Icon size={21} /></span>
                <span className="saude-service-text"><strong>{service.name}</strong><small>{service.detail || "Sem informações adicionais"}</small></span>
                <span className={`saude-chip saude-chip-${service.status}`}>{STATES[service.status]}</span>
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {open && <div className="saude-service-detail">
                <span>Latência: <strong>{service.latencyMs == null ? "Não medida" : `${service.latencyMs} ms`}</strong></span>
                <span>Erros: <strong>{service.errorRatePercent == null ? "Não medidos" : `${service.errorRatePercent.toFixed(1)}%`}</strong></span>
                <span>Última avaliação: <strong>{dateText(service.checkedAt)}</strong></span>
                <span>HTTP: <strong>{service.code ?? "—"}</strong></span>
            </div>}
        </article>
    );
}

export default function AdminSaudeSistema() {
    const [snapshot, setSnapshot] = useState(null);
    const [history, setHistory] = useState(loadHistory);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState({});
    const [page, setPage] = useState(1);
    const [period, setPeriod] = useState("24h");
    const abortRef = useRef(null);
    const busyRef = useRef(false);

    const verify = useCallback(async () => {
        if (busyRef.current) return;
        busyRef.current = true;
        setLoading(true);
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const result = await fetchSystemHealth(controller.signal);
            if (!result || controller.signal.aborted) return;
            setSnapshot(result);
            if (!result.configurationMissing) {
                setHistory((prev) => [{ ...result, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }, ...prev].slice(0, 250));
            }
        } finally {
            busyRef.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        verify();
        const timer = window.setInterval(verify, HEALTH_INTERVAL);
        return () => {
            clearInterval(timer);
            abortRef.current?.abort();
        };
    }, [verify]);

    useEffect(() => {
        saveHistory(history);
    }, [history]);

    const current = getOverallState(snapshot);
    const services = useMemo(() => Object.keys(SERVICE_NAMES).map((key) => snapshot?.services?.find((s) => s.key === key) || { key, name: SERVICE_NAMES[key], status: "unknown", detail: "Aguardando diagnóstico do backend" }), [snapshot]);
    const now = Date.now();
    const filteredHistory = history.filter((item) => {
        if (period === "todos") return true;
        const hours = period === "24h" ? 24 : 168;
        return new Date(item.timestamp).getTime() >= now - hours * 3600000;
    });
    const stats = summaryStats(filteredHistory);
    const pages = Math.max(1, Math.ceil(filteredHistory.length / 10));
    const pageNow = Math.min(page, pages);
    const entries = filteredHistory.slice((pageNow - 1) * 10, pageNow * 10);
    const affected = services.filter((item) => item.status === "down" || item.status === "degraded");
    const issues = snapshot?.issues || [];
    const server = snapshot?.metrics || {};
    const limitLabel = (value) => value == null ? "Não disponível" : `${value.toFixed(1)}%`;

    return (
        <div className="alunos-page admin-saude-page">
            <header className="alunos-header saude-header">
                <div><h1>Saúde do Sistema</h1><p>Disponibilidade, desempenho e diagnóstico dos serviços do PresenSee.</p></div>
                <button className="saude-refresh" type="button" onClick={verify} disabled={loading}><RefreshCw size={17} className={loading ? "saude-spinning" : ""} />{loading ? "Verificando..." : "Verificar agora"}</button>
            </header>
            <section className={`saude-overall saude-overall-${current.status}`}>
                <HeartPulse size={27} />
                <div><h2>O sistema está funcionando?</h2><strong>{current.label}</strong><p>{snapshot?.configurationMissing ? "Configure VITE_SYSTEM_HEALTH_URL para iniciar o diagnóstico." : snapshot?.error || "Status consolidado dos serviços informados pelo backend."}</p></div>
                <span>Última verificação: {dateText(snapshot?.timestamp)}</span>
            </section>
            <section className="saude-section">
                <div className="saude-section-heading"><h2>Está funcionando bem?</h2><p>Indicadores medidos pela consulta de diagnóstico e histórico disponível neste navegador.</p></div>
                <div className="saude-metrics">
                    <Metric Icon={CheckCircle2} label="Respostas válidas" value={stats.availability == null ? "—" : `${stats.availability.toFixed(1)}%`} detail="Taxa de consultas de diagnóstico bem-sucedidas" />
                    <Metric Icon={Clock3} label="Latência média" value={stats.averageLatency == null ? "—" : `${stats.averageLatency} ms`} detail="Tempo médio das consultas" />
                    <Metric Icon={AlertTriangle} label="Verificações com falha" value={String(stats.failed)} detail="Consultas falhas ou serviços indisponíveis" />
                    <Metric Icon={Activity} label="Verificações registradas" value={String(stats.checks)} detail="Histórico local limitado a 250 entradas" />
                </div>
            </section>
            <section className="saude-section">
                <div className="saude-section-heading"><h2>Recursos do servidor</h2><p>CPU, memória e armazenamento reportados pelo backend.</p></div>
                <div className="saude-resource-grid">
                    {[{ label: "CPU", value: server.cpuPercent, Icon: Cpu }, { label: "Memória", value: server.memoryPercent, Icon: Server }, { label: "Armazenamento", value: server.diskPercent, Icon: HardDrive }].map(({ label, value, Icon }) => <div className="saude-resource" key={label}><div className="saude-resource-head"><Icon size={18} /><strong>{label}</strong><span>{limitLabel(value)}</span></div><div className="saude-meter"><div style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }} className={value >= 90 ? "critical" : value >= 75 ? "warning" : ""} /></div><small>{value == null ? "Métrica não disponibilizada pela API" : value >= 90 ? "Uso crítico" : value >= 75 ? "Uso elevado" : "Dentro dos limites indicativos"}</small></div>)}
                </div>
            </section>
            <section className="saude-section">
                <div className="saude-section-heading"><h2>O que está causando o problema?</h2><p>Serviços afetados e causas identificadas pelo diagnóstico técnico.</p></div>
                <div className="saude-diagnosis">
                    {snapshot?.configurationMissing ? <p>Nenhum diagnóstico disponível: configure o endpoint seguro no frontend e implemente as verificações no backend.</p> : !snapshot?.received ? <p>{snapshot?.error || "Não foi possível confirmar a situação dos serviços."} Uma falha de conexão no navegador também pode ser causada por CORS ou rede.</p> : affected.length === 0 && issues.length === 0 ? <p>{services.some((s) => s.status === "unknown") ? "Não há falhas declaradas, mas existem serviços sem monitoramento suficiente." : "Nenhuma falha informada pelo diagnóstico atual."}</p> : <>
                        {affected.map((item) => <div className="saude-issue" key={item.key}><AlertTriangle size={17} /><div><strong>{item.name} — {STATES[item.status]}</strong><p>{item.detail || "Verifique os registros técnicos do serviço."}</p></div></div>)}
                        {issues.map((issue) => <div className="saude-issue" key={`${issue.id}-${issue.service}`}><AlertTriangle size={17} /><div><strong>{issue.title}</strong><p>{issue.detail}</p></div></div>)}
                    </>}
                </div>
            </section>
            {GROUPS.map((group) => <section className="saude-section" key={group.title}><div className="saude-section-heading"><h2>{group.title}</h2><p>Clique em um serviço para visualizar os detalhes da última verificação.</p></div><div className="saude-services">{group.keys.map((key) => <Service key={key} service={services.find((s) => s.key === key)} open={!!expanded[key]} onToggle={() => setExpanded((old) => ({ ...old, [key]: !old[key] }))} />)}</div></section>)}
            <section className="saude-section">
                <div className="saude-section-heading saude-history-heading"><div><h2>Histórico de verificações</h2><p>Registros do navegador atual, não representam monitoramento contínuo.</p></div><label>Período<select value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); }}><option value="24h">Últimas 24 horas</option><option value="7d">Últimos 7 dias</option><option value="todos">Todos</option></select></label></div>
                <div className="alunos-tabela-scroll"><table className="students-table saude-history-table"><thead><tr><th>Data</th><th>Estado</th><th>Latência</th><th>HTTP</th><th>Diagnóstico</th></tr></thead><tbody>{entries.map((item) => { const state = getOverallState(item); return <tr key={item.id}><td>{dateText(item.timestamp)}</td><td><span className={`saude-chip saude-chip-${state.status}`}>{state.label}</span></td><td>{item.requestLatencyMs == null ? "—" : `${item.requestLatencyMs} ms`}</td><td>{item.httpStatus ?? "—"}</td><td>{item.error || item.services?.filter((service) => ["down", "degraded"].includes(service.status)).map((s) => s.name).join(", ") || "Sem falhas informadas"}</td></tr>; })}{!entries.length && <tr><td colSpan={5} className="saude-empty">Nenhuma verificação registrada neste período.</td></tr>}</tbody></table></div>
                <footer className="alunos-paginacao"><span>{filteredHistory.length} verificações</span><div className="alunos-paginas"><button type="button" disabled={pageNow <= 1} onClick={() => setPage(pageNow - 1)}>‹</button><strong>{pageNow}</strong><span>de {pages}</span><button type="button" disabled={pageNow >= pages} onClick={() => setPage(pageNow + 1)}>›</button></div></footer>
            </section>
            <p className="saude-note">Os resultados dependem de um endpoint de diagnóstico autenticado. Não coloque credenciais, strings de conexão, logs sensíveis ou dados de estudantes nas respostas de monitoramento.</p>
        </div>
    );
}
