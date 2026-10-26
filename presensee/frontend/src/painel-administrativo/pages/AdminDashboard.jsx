import { useNavigate } from "react-router-dom";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {
    IconHome,
    IconAlertas,
    IconCalendario,
    MascotAvatar
} from "../../components/Icons";
import AdminIcon from "../components/AdminIcons";
import { getEscolas } from "../services/adminDemo";
import { carregarChamados } from "../services/chamadosDemo";
import "../../styles/Dashboard.css";
import "../styles/admin.css";
import "../styles/AdminDashboard.css";

const CORES_STATUS = {
    ativas: "#11ba7a",
    pendentes: "#ffaf17",
    bloqueadas: "#f23b4b"
};

const CORES_REDE = ["#633df2", "#22b8a8", "#f4ad38", "#6185df", "#de6a98", "#9099aa"];

function obterMesAtual() {
    const texto = new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric"
    }).format(new Date());

    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obterPerfil() {
    try {
        return JSON.parse(localStorage.getItem("adminPerfilDemo")) || {};
    } catch {
        return {};
    }
}

function agregarPorCampo(escolas, campo) {
    const contagem = new Map();

    escolas.forEach((escola) => {
        const nome = String(escola[campo] || "Não informado").trim() || "Não informado";
        contagem.set(nome, (contagem.get(nome) || 0) + 1);
    });

    return [...contagem.entries()]
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, "pt-BR"));
}

function obterSerieChamados(chamados, quantidade = 6) {
    const referencia = new Date();
    const inicioMes = new Date(referencia.getFullYear(), referencia.getMonth(), 1);

    return Array.from({ length: quantidade }, (_, indice) => {
        const mes = new Date(inicioMes.getFullYear(), inicioMes.getMonth() - (quantidade - 1 - indice), 1);
        const ano = mes.getFullYear();
        const numeroMes = mes.getMonth();
        const nome = mes.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
        const doMes = (valor) => {
            if (!valor) return false;
            const data = new Date(valor);
            return !Number.isNaN(data.getTime()) && data.getFullYear() === ano && data.getMonth() === numeroMes;
        };

        return {
            nome: `${nome}/${String(ano).slice(-2)}`,
            abertos: chamados.filter((item) => doMes(item.criadoEm)).length,
            resolvidos: chamados.filter((item) => doMes(item.resolvidoEm)).length
        };
    });
}

function Indicador({ rotulo, valor, tipo, icone, onClick }) {
    return (
        <button
            type="button"
            className={`pd-indicador pd-indicador--${tipo} ad-indicador`}
            onClick={onClick}
        >
            <div className="pd-indicador-icone">{icone}</div>
            <div className="pd-indicador-conteudo">
                <strong>{valor}</strong>
                <span>{rotulo}</span>
            </div>
        </button>
    );
}

function CabecalhoPainel({ titulo, descricao }) {
    return (
        <div className="pd-painel-cabecalho">
            <div className="pd-painel-titulos">
                <h2>{titulo}</h2>
                <p>{descricao}</p>
            </div>
        </div>
    );
}

function TooltipGrafico({ active, payload, label, unidade = "escolas" }) {
    if (!active || !payload?.length) return null;

    return (
        <div className="pd-tooltip ad-tooltip">
            {label && <strong>{label}</strong>}
            {payload.map((item, indice) => (
                <span key={`${item.name}-${indice}`}>
                    {item.name && payload.length > 1 ? `${item.name}: ` : ""}
                    {item.value} {unidade}
                </span>
            ))}
        </div>
    );
}

function GraficoVazio({ texto }) {
    return <div className="ad-grafico-vazio">{texto}</div>;
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const escolas = getEscolas();
    const chamados = carregarChamados();
    const perfil = obterPerfil();

    const ativos = escolas.filter((escola) => escola.status === "Ativa").length;
    const pendentes = escolas.filter((escola) => escola.status === "Pendente").length;
    const bloqueadas = escolas.filter((escola) => escola.status === "Bloqueada").length;
    const total = escolas.length;
    const primeiroNome = (perfil.nome || "Superadmin").trim().split(/\s+/)[0];

    const distribuicao = [
        { nome: "Ativas", valor: ativos, cor: CORES_STATUS.ativas },
        { nome: "Pendentes", valor: pendentes, cor: CORES_STATUS.pendentes },
        { nome: "Bloqueadas", valor: bloqueadas, cor: CORES_STATUS.bloqueadas }
    ];
    const distribuicaoGrafico = distribuicao.filter((item) => item.valor > 0);
    const municipios = agregarPorCampo(escolas, "municipio");
    const redes = agregarPorCampo(escolas, "rede");
    const serieChamados = obterSerieChamados(chamados);
    const possuiChamados = serieChamados.some((item) => item.abertos > 0 || item.resolvidos > 0);

    const chartData = [
        { name: "Jan", n: 0 },
        { name: "Fev", n: Math.floor(total / 4) },
        { name: "Mar", n: Math.floor(total / 2) },
        { name: "Abr", n: total }
    ];

    function navegarParaEscolas(status) {
        navigate(`/admin/escolas?status=${encodeURIComponent(status)}`);
    }

    return (
        <div className="admin-page pd-dashboard ad-dashboard">
            <header className="pd-cabecalho">
                <div className="pd-usuario">
                    <div className="pd-avatar">
                        {perfil.avatar ? (
                            <img src={perfil.avatar} alt="Foto do administrador" />
                        ) : (
                            <MascotAvatar size={62} />
                        )}
                    </div>
                    <div>
                        <h1>E aí, {primeiroNome}!</h1>
                        <p>Aqui está um resumo da rede de escolas do PresenSee.</p>
                    </div>
                </div>
                <div className="pd-mes-atual">
                    <IconCalendario />
                    <span>{obterMesAtual()}</span>
                </div>
            </header>

            <div className="pd-indicadores ad-indicadores">
                <Indicador rotulo="Escolas cadastradas" valor={total} tipo="alunos" icone={<AdminIcon name="school" size={28} />} onClick={() => navegarParaEscolas("Todas")} />
                <Indicador rotulo="Escolas ativas" valor={ativos} tipo="ativas" icone={<IconHome />} onClick={() => navegarParaEscolas("Ativa")} />
                <Indicador rotulo="Aguardando ativação" valor={pendentes} tipo="atencao" icone={<IconAlertas />} onClick={() => navegarParaEscolas("Pendente")} />
                <Indicador rotulo="Escolas bloqueadas" valor={bloqueadas} tipo="risco" icone={<IconAlertas />} onClick={() => navegarParaEscolas("Bloqueada")} />
            </div>

            <div className="pd-grade-principal ad-grade-principal">
                <section className="pd-painel pd-evolucao">
                    <CabecalhoPainel titulo="Evolução das escolas cadastradas" descricao="Acompanhe o crescimento da rede de escolas." />
                    <div className="pd-grafico-evolucao ad-grafico-evolucao">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="adEvolucaoEscolas" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#633df2" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#633df2" stopOpacity={0.015} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#e9e8f2" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} domain={[0, "auto"]} axisLine={false} tickLine={false} />
                                <Tooltip content={<TooltipGrafico />} />
                                <Area type="monotone" dataKey="n" name="Escolas" stroke="#633df2" strokeWidth={2.5} fill="url(#adEvolucaoEscolas)" dot={{ r: 4, fill: "#633df2", strokeWidth: 0 }} activeDot={{ r: 6 }} isAnimationActive animationDuration={900} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="ad-grafico-observacao">Evolução ilustrativa para o protótipo, sem histórico real de cadastros.</p>
                </section>

                <section className="pd-painel pd-frequencia">
                    <CabecalhoPainel titulo="Status das escolas" descricao="Distribuição das instituições por situação." />
                    <div className="pd-grafico-circular ad-grafico-circular">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={distribuicaoGrafico.length ? distribuicaoGrafico : [{ nome: "Sem dados", valor: 1, cor: "#e2e2ea" }]} dataKey="valor" nameKey="nome" cx="50%" cy="50%" innerRadius="76%" outerRadius="96%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive animationDuration={1000}>
                                    {(distribuicaoGrafico.length ? distribuicaoGrafico : [{ nome: "Sem dados", cor: "#e2e2ea" }]).map((item) => <Cell key={item.nome} fill={item.cor} />)}
                                </Pie>
                                <Tooltip content={<TooltipGrafico />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pd-grafico-circular-rotulo">
                            <strong>{total}</strong>
                            <span>escolas</span>
                        </div>
                    </div>
                    <div className="ad-legenda-status">
                        {distribuicao.map((item) => (
                            <div className="ad-legenda-item" key={item.nome}>
                                <span className="pd-legenda-bolinha" style={{ backgroundColor: item.cor }} />
                                <span>{item.nome}</span>
                                <strong>{item.valor}</strong>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className="ad-grade-secundaria">
                <section className="pd-painel ad-painel-compacto">
                    <CabecalhoPainel titulo="Escolas por município" descricao="Distribuição das instituições por localização." />
                    {municipios.length ? (
                        <div className="ad-grafico-menor">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={municipios} layout="vertical" margin={{ top: 2, right: 18, left: 10, bottom: 2 }}>
                                    <CartesianGrid stroke="#e9e8f2" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="nome" width={92} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<TooltipGrafico />} />
                                    <Bar dataKey="valor" name="Escolas" fill="#633df2" radius={[0, 5, 5, 0]} maxBarSize={23} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <GraficoVazio texto="Nenhuma escola cadastrada." />}
                </section>

                <section className="pd-painel ad-painel-compacto">
                    <CabecalhoPainel titulo="Chamados abertos × resolvidos" descricao="Solicitações criadas e resolvidas nos últimos seis meses." />
                    {possuiChamados ? (
                        <div className="ad-grafico-menor">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={serieChamados} margin={{ top: 8, right: 8, left: -26, bottom: 0 }}>
                                    <CartesianGrid stroke="#e9e8f2" vertical={false} />
                                    <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                                    <Tooltip content={<TooltipGrafico unidade="chamados" />} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey="abertos" name="Abertos no mês" fill="#633df2" radius={[4, 4, 0, 0]} maxBarSize={22} />
                                    <Bar dataKey="resolvidos" name="Resolvidos no mês" fill="#11ba7a" radius={[4, 4, 0, 0]} maxBarSize={22} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <GraficoVazio texto="Sem chamados registrados nos últimos seis meses." />}
                </section>

                <section className="pd-painel ad-painel-compacto">
                    <CabecalhoPainel titulo="Escolas por rede de ensino" descricao="Distribuição por rede estadual, municipal, federal e privada." />
                    {redes.length ? (
                        <div className="ad-grafico-menor">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={redes} dataKey="valor" nameKey="nome" cx="50%" cy="44%" innerRadius="47%" outerRadius="74%" stroke="none" paddingAngle={2}>
                                        {redes.map((item, index) => <Cell key={item.nome} fill={CORES_REDE[index % CORES_REDE.length]} />)}
                                    </Pie>
                                    <Tooltip content={<TooltipGrafico />} />
                                    <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: 10 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : <GraficoVazio texto="Nenhuma escola cadastrada." />}
                </section>
            </div>
        </div>
    );
}
