import { useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, Bar, BarChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import DashboardLayout from "../layouts/DashboardLayout";
import { IconAlunos, IconAlertas, MascotAvatar } from "../components/Icons";
import { getUsuario } from "../services/auth";
import { obterIndicadoresEscolares } from "../services/indicadoresEscolares";
import NotificacoesHome from "../components/NotificacoesHome";
import "../styles/Dashboard.css";

const CORES_RISCO = { alto: "#f23b4b", medio: "#ffaf17", baixo: "#11ba7a" };
const TURMAS_POR_PAGINA = 6;

function obterMesAtual() {
  const texto = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function IconCalendario() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18" />
    </svg>
  );
}

function Indicador({ rotulo, valor, tipo, icone }) {
  return (
    <article className={`pd-indicador pd-indicador--${tipo}`}>
      <div className="pd-indicador-icone">{icone}</div>
      <div className="pd-indicador-conteudo"><strong>{valor}</strong><span>{rotulo}</span></div>
    </article>
  );
}

function CabecalhoPainel({ titulo, descricao, children }) {
  return (
    <div className="pd-painel-cabecalho">
      <div className="pd-painel-titulos"><h2>{titulo}</h2><p>{descricao}</p></div>
      {children}
    </div>
  );
}

function TooltipGrafico({ active, payload, label, unidade = "%" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="pd-tooltip">
      {label && <strong>{label}</strong>}
      <span>{payload[0].value}{unidade}</span>
    </div>
  );
}

function GraficoFrequencia({ dados, eixo = "dia", campo = "frequencia", unidade = "%" }) {
  if (!dados.length) return <p className="pd-sem-dados">Sem dados disponíveis.</p>;
  const valores = dados.map((item) => Number(item[campo]) || 0);
  const maximo = campo === "frequencia" ? 100 : Math.max(1, ...valores) + 2;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} margin={{ top: 23, right: 4, bottom: 0, left: 4 }} barCategoryGap="10%">
        <XAxis dataKey={eixo} axisLine={false} tickLine={false} />
        <YAxis hide domain={[0, maximo]} />
        <Tooltip content={<TooltipGrafico unidade={unidade} />} cursor={false} />
        <Bar dataKey={campo} className="pd-barra" fill="#633df2" radius={[6, 6, 0, 0]}
          isAnimationActive animationDuration={850} maxBarSize={64}
          label={{ position: "top", formatter: (valor) => `${valor}${unidade}`, fontSize: 12, fontWeight: 700, fill: "#141a37" }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Dashboard() {
  const usuario = getUsuario();
  const avatar = localStorage.getItem("avatarUsuario") || "";
  const dados = useMemo(() => obterIndicadoresEscolares(), []);
  const [filtroTurma, setFiltroTurma] = useState("Todas");
  const [paginaTurmas, setPaginaTurmas] = useState(0);
  const [mesesExibidos, setMesesExibidos] = useState(4);

  const distribuicao = [
    { nome: "Alto", valor: dados.alunosAltoRisco, cor: CORES_RISCO.alto },
    { nome: "Médio", valor: dados.alunosRisco, cor: CORES_RISCO.medio },
    { nome: "Baixo", valor: dados.alunosBaixoRisco, cor: CORES_RISCO.baixo },
  ];

  const frequenciaPorTurma = dados.turmas;
  const anosDisponiveis = [...new Set(frequenciaPorTurma.map(({ turma }) => String(turma).charAt(0)))].sort();
  const turmasFiltradas = frequenciaPorTurma.filter(({ turma }) => filtroTurma === "Todas" || turma.startsWith(filtroTurma));
  const totalPaginas = Math.max(1, Math.ceil(turmasFiltradas.length / TURMAS_POR_PAGINA));
  const paginaAtual = Math.min(paginaTurmas, totalPaginas - 1);
  const turmasVisiveis = turmasFiltradas.slice(paginaAtual * TURMAS_POR_PAGINA, (paginaAtual + 1) * TURMAS_POR_PAGINA);

  function alterarFiltroTurma(valor) {
    setFiltroTurma(valor);
    setPaginaTurmas(0);
  }


  return (
    <DashboardLayout>
      <div className="pd-dashboard">
        <header className="pd-cabecalho">
          <div className="pd-usuario">
            <div className="pd-avatar">
              {avatar ? <img src={avatar} alt="Foto do usuário" /> : <MascotAvatar size={55} />}
            </div>
            <div><h1>E aí, {usuario?.nome || "Visitante"}!</h1><p>Aqui está um resumo da sua escola hoje.</p></div>
          </div>
          <div className="pnot-header-actions">
            <NotificacoesHome />
            <div className="pd-mes-atual" aria-label={`Mês atual: ${obterMesAtual()}`}>
              <IconCalendario /><span>{obterMesAtual()}</span>
            </div>
          </div>
        </header>

        <div className="pd-indicadores">
          <Indicador rotulo="Alunos" valor={dados.totalAlunos} tipo="alunos" icone={<IconAlunos />} />
          <Indicador rotulo="Em atenção" valor={dados.alunosRisco} tipo="atencao" icone={<IconAlertas />} />
          <Indicador rotulo="Alto risco" valor={dados.alunosAltoRisco} tipo="risco" icone={<IconAlertas />} />
        </div>

        <div className="pd-grade-principal">
          <section className="pd-painel pd-evolucao">
            <CabecalhoPainel titulo="Evolução do risco de evasão" descricao="Acompanhe a média de risco dos estudantes ao longo do tempo.">
              <label className="pd-seletor-periodo">
                <span className="pd-acessivel">Período do gráfico de risco</span>
                <select value={mesesExibidos} onChange={(evento) => setMesesExibidos(Number(evento.target.value))}>
                  <option value={3}>Últimos 3 meses</option>
                  <option value={6}>Últimos 6 meses</option>
                  <option value={12}>Últimos 12 meses</option>
                </select>
              </label>
            </CabecalhoPainel>
            <div className="pd-grafico-evolucao">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dados.evolucaoRisco.slice(-mesesExibidos)} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pdRiscoDemo" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#633df2" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#633df2" stopOpacity={0.015} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e9e8f2" vertical={false} />
                  <XAxis dataKey="periodo" axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                  <Tooltip content={<TooltipGrafico />} />
                  <Area type="monotone" dataKey="risco" stroke="#633df2" strokeWidth={2.5}
                    fill="url(#pdRiscoDemo)" dot={{ r: 4, fill: "#633df2", strokeWidth: 0 }}
                    activeDot={{ r: 6 }} isAnimationActive animationDuration={900} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="pd-painel pd-frequencia">
            <CabecalhoPainel titulo="Frequência Geral" descricao="Média de frequência dos estudantes." />
            <div className="pd-grafico-circular">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ valor: dados.taxaFrequenciaGeral }, { valor: 100 - dados.taxaFrequenciaGeral }]}
                    dataKey="valor" cx="50%" cy="50%" innerRadius="80%" outerRadius="96%"
                    startAngle={90} endAngle={-270} stroke="none" isAnimationActive animationDuration={1000}>
                    <Cell fill="#11bb77" /><Cell fill="#e1f2e9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pd-grafico-circular-rotulo">
                <strong>{dados.taxaFrequenciaGeral}%</strong><span>de presença</span>
              </div>
            </div>
          </section>
        </div>

        <div className="pd-grade-inferior">
          <section className="pd-painel pd-painel-pequeno">
            <CabecalhoPainel titulo="Frequência por dia da semana"
              descricao="Média de presença dos estudantes." />
            <div className="pd-grafico-inferior">
              <GraficoFrequencia dados={dados.frequenciaPorSemana} />
            </div>
          </section>

          <section className="pd-painel pd-painel-pequeno">
            <CabecalhoPainel titulo="Distribuição de risco" descricao="Quantidade de estudantes por nível de risco." />
            <div className="pd-distribuicao">
              <div className="pd-donut">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distribuicao} dataKey="valor" nameKey="nome" innerRadius="61%" outerRadius="88%"
                      startAngle={90} endAngle={-270} stroke="none" isAnimationActive animationDuration={900}>
                      {distribuicao.map((nivel) => <Cell key={nivel.nome} fill={nivel.cor} />)}
                    </Pie>
                    <Tooltip content={<TooltipGrafico unidade=" alunos" />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="pd-legenda-risco">
                {distribuicao.map((nivel) => (
                  <div className="pd-legenda-linha" key={nivel.nome}>
                    <span className={`pd-legenda-bolinha pd-legenda-${nivel.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`} />
                    <span>{nivel.nome}</span><strong>{nivel.valor}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="pd-painel pd-painel-pequeno">
            <CabecalhoPainel titulo="Frequência média por turma" descricao="Média de presença dos estudantes por turma.">
              <label className="pd-seletor-periodo pd-seletor-turmas">
                <span className="pd-acessivel">Filtrar turmas por ano</span>
                <select value={filtroTurma} onChange={(evento) => alterarFiltroTurma(evento.target.value)}>
                  <option value="Todas">Todas as turmas</option>
                  {anosDisponiveis.map((ano) => <option value={ano} key={ano}>{ano}º ano</option>)}
                </select>
              </label>
            </CabecalhoPainel>
            <div className="pd-turmas-conteudo">
              <button type="button" className="pd-seta" aria-label="Turmas anteriores" disabled={paginaAtual === 0}
                onClick={() => setPaginaTurmas(paginaAtual - 1)}>‹</button>
              <div className="pd-grafico-inferior pd-grafico-turmas">
                <GraficoFrequencia dados={turmasVisiveis} eixo="turma" />
              </div>
              <button type="button" className="pd-seta" aria-label="Próximas turmas"
                disabled={paginaAtual === totalPaginas - 1} onClick={() => setPaginaTurmas(paginaAtual + 1)}>›</button>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
