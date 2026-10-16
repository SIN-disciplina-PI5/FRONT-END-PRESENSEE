import { useEffect, useId, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"

import DashboardLayout from "../layouts/DashboardLayout"
import { IconAlunos, IconAlertas, MascotAvatar } from "../components/Icons"
import api from "../services/api"
import { getToken, getUsuario } from "../services/auth"
import "../styles/Dashboard.css"

const DADOS_DEMONSTRACAO = {
  totalAlunos: 350,
  alunosRisco: 20,
  alunosAltoRisco: 7,
  taxaFrequenciaGeral: 95,
  alertasAbertos: 5
}

const EVOLUCAO_DEMONSTRACAO = [
  { periodo: "Abr", risco: 31 },
  { periodo: "Mai", risco: 56 },
  { periodo: "Jun", risco: 59 },
  { periodo: "Jul", risco: 85 },
  { periodo: "Ago", risco: 93 }
]

const FREQUENCIA_SEMANAL_DEMONSTRACAO = [
  { dia: "Seg", frequencia: 88 },
  { dia: "Ter", frequencia: 92 },
  { dia: "Qua", frequencia: 85 },
  { dia: "Qui", frequencia: 87 },
  { dia: "Sex", frequencia: 80 }
]

// Substituir pela frequência por turma retornada pela API quando disponível.
// A paginação aceita qualquer quantidade de turmas, não apenas seis.
const FREQUENCIA_TURMAS_DEMONSTRACAO = [
  { turma: "1A", frequencia: 92 },
  { turma: "1B", frequencia: 87 },
  { turma: "1C", frequencia: 90 },
  { turma: "2A", frequencia: 85 },
  { turma: "2B", frequencia: 90 },
  { turma: "2C", frequencia: 86 },
  { turma: "3A", frequencia: 82 },
  { turma: "3B", frequencia: 88 },
  { turma: "3C", frequencia: 84 }
]

const CORES_RISCO = {
  alto: "#f23b4b",
  medio: "#ffaf17",
  baixo: "#11ba7a"
}

const TURMAS_POR_PAGINA = 6

function obterMesAtual() {
  const texto = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric"
  }).format(new Date())

  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function IconCalendario() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18" />
    </svg>
  )
}

function Indicador({ rotulo, valor, tipo, variacao, positivo, icone }) {
  return (
    <article className={`pd-indicador pd-indicador--${tipo}`}>
      <div className="pd-indicador-icone">{icone}</div>

      <div className="pd-indicador-conteudo">
        <strong>{valor}</strong>
        <span>{rotulo}</span>
      </div>

      {variacao && (
        <div className="pd-indicador-variacao">
          <strong className={positivo ? "pd-variacao-positiva" : "pd-variacao-negativa"}>
            {variacao}
          </strong>
          <small>em relação ao mês anterior</small>
        </div>
      )}
    </article>
  )
}

function CabecalhoPainel({ titulo, descricao, children }) {
  return (
    <div className="pd-painel-cabecalho">
      <div className="pd-painel-titulos">
        <h2>{titulo}</h2>
        <p>{descricao}</p>
      </div>
      {children}
    </div>
  )
}

function TooltipGrafico({ active, payload, label, unidade = "%" }) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="pd-tooltip">
      {label && <strong>{label}</strong>}
      <span>{payload[0].value}{unidade}</span>
    </div>
  )
}

function GraficoFrequencia({ dados, eixo = "dia" }) {
  if (!dados.length) {
    return <p className="pd-sem-dados">Sem dados disponíveis.</p>
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={dados}
        margin={{ top: 23, right: 4, bottom: 0, left: 4 }}
        barCategoryGap="10%"
      >
        <XAxis dataKey={eixo} axisLine={false} tickLine={false} />
        <YAxis hide domain={[0, 100]} />
        <Tooltip content={<TooltipGrafico />} cursor={false} />
        <Bar
          dataKey="frequencia"
          className="pd-barra"
          fill="#633df2"
          radius={[6, 6, 0, 0]}
          isAnimationActive
          animationDuration={850}
          maxBarSize={64}
          label={{
            position: "top",
            formatter: (valor) => `${valor}%`,
            fontSize: 12,
            fontWeight: 700,
            fill: "#141a37"
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

function Dashboard() {
  const [usuario, setUsuario] = useState(() => getUsuario())
  const [avatar, setAvatar] = useState(() => localStorage.getItem("avatarUsuario") || "")
  const [dados, setDados] = useState(null)
  const [evolucao, setEvolucao] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")
  const [mesesExibidos, setMesesExibidos] = useState(4)
  const [filtroTurma, setFiltroTurma] = useState("Todas")
  const [paginaTurmas, setPaginaTurmas] = useState(0)
  const [frequenciaPorTurma, setFrequenciaPorTurma] = useState(FREQUENCIA_TURMAS_DEMONSTRACAO)
  const idGradiente = useId().replace(/:/g, "")

  const demonstracao = getToken() === "token-demo"

  useEffect(() => {
    setUsuario(getUsuario())
    setAvatar(localStorage.getItem("avatarUsuario") || "")

    if (demonstracao) {
      setDados(DADOS_DEMONSTRACAO)
      setEvolucao(EVOLUCAO_DEMONSTRACAO)
      setCarregando(false)
      return
    }

    let ativo = true

    Promise.allSettled([
      api.get("/dashboard/resumo"),
      api.get("/dashboard/evolucao-risco")
    ]).then(([resultadoResumo, resultadoEvolucao]) => {
      if (!ativo) {
        return
      }

      if (resultadoResumo.status === "fulfilled") {
        setDados(resultadoResumo.value.data)

        // Se a API fornecer as turmas da escola, usamos a lista completa.
        // Caso contrário, mantém-se o conjunto ilustrativo já usado no frontend.
        if (Array.isArray(resultadoResumo.value.data?.frequenciaPorTurma)) {
          setFrequenciaPorTurma(resultadoResumo.value.data.frequenciaPorTurma)
        }
      } else {
        setErro("Não foi possível carregar os dados do dashboard.")
      }

      if (
        resultadoEvolucao.status === "fulfilled" &&
        Array.isArray(resultadoEvolucao.value.data)
      ) {
        setEvolucao(resultadoEvolucao.value.data)
      }

      setCarregando(false)
    })

    return () => {
      ativo = false
    }
  }, [demonstracao])

  const frequenciaGeral = Math.max(
    0,
    Math.min(100, Number(dados?.taxaFrequenciaGeral) || 0)
  )

  const distribuicao = useMemo(() => {
    const alto = Math.max(0, Number(dados?.alunosAltoRisco) || 0)
    const atencao = Math.max(0, Number(dados?.alunosRisco) || 0)
    const total = Math.max(0, Number(dados?.totalAlunos) || 0)
    const medio = atencao
    const baixo = Math.max(0, total - alto - medio)

    return [
      { nome: "Alto", valor: alto, cor: CORES_RISCO.alto },
      { nome: "Médio", valor: medio, cor: CORES_RISCO.medio },
      { nome: "Baixo", valor: baixo, cor: CORES_RISCO.baixo }
    ]
  }, [dados])

  const evolucaoVisivel = evolucao.slice(-mesesExibidos)

  const anosDisponiveis = useMemo(() => {
    const anos = new Set(frequenciaPorTurma.map(({ turma }) => String(turma).charAt(0)))
    return [...anos].filter((ano) => /\d/.test(ano)).sort()
  }, [frequenciaPorTurma])

  const turmasFiltradas = frequenciaPorTurma.filter(({ turma }) => {
    return filtroTurma === "Todas" || String(turma).startsWith(filtroTurma)
  })

  const totalPaginas = Math.max(1, Math.ceil(turmasFiltradas.length / TURMAS_POR_PAGINA))
  const paginaAtual = Math.min(paginaTurmas, totalPaginas - 1)
  const turmasVisiveis = turmasFiltradas.slice(
    paginaAtual * TURMAS_POR_PAGINA,
    (paginaAtual + 1) * TURMAS_POR_PAGINA
  )

  function alterarFiltroTurma(valor) {
    setFiltroTurma(valor)
    setPaginaTurmas(0)
  }

  return (
    <DashboardLayout>
      <div className="pd-dashboard">
        <header className="pd-cabecalho">
          <div className="pd-usuario">
            <div className="pd-avatar">
              {avatar ? (
                <img src={avatar} alt="Foto do usuário" />
              ) : (
                <MascotAvatar size={55} />
              )}
            </div>

            <div>
              <h1>E aí, {usuario?.nome || "Visitante"}!</h1>
              <p>Aqui está um resumo da sua escola hoje.</p>
            </div>
          </div>

          <div className="pd-mes-atual" aria-label={`Mês atual: ${obterMesAtual()}`}>
            <IconCalendario />
            <span>{obterMesAtual()}</span>
          </div>
        </header>

        {carregando ? (
          <p className="pd-aviso">Carregando dashboard...</p>
        ) : erro ? (
          <div className="dashboard-error" role="alert">{erro}</div>
        ) : (
          <>
            <div className="pd-indicadores">
              <Indicador
                rotulo="Alunos"
                valor={dados?.totalAlunos ?? 0}
                tipo="alunos"
                variacao={demonstracao ? "↑ +5%" : null}
                positivo
                icone={<IconAlunos />}
              />
              <Indicador
                rotulo="Em atenção"
                valor={dados?.alunosRisco ?? 0}
                tipo="atencao"
                variacao={demonstracao ? "↑ +8%" : null}
                positivo={false}
                icone={<IconAlertas />}
              />
              <Indicador
                rotulo="Alto risco"
                valor={dados?.alunosAltoRisco ?? 0}
                tipo="risco"
                variacao={demonstracao ? "↓ −12%" : null}
                positivo
                icone={<IconAlertas />}
              />
            </div>

            <div className="pd-grade-principal">
              <section className="pd-painel pd-evolucao">
                <CabecalhoPainel
                  titulo="Evolução do risco de evasão"
                  descricao="Acompanhe a média de risco dos estudantes ao longo do tempo."
                >
                  <label className="pd-seletor-periodo">
                    <IconCalendario />
                    <span className="pd-acessivel">Período do gráfico de risco</span>
                    <select
                      value={mesesExibidos}
                      onChange={(evento) => setMesesExibidos(Number(evento.target.value))}
                    >
                      <option value={4}>Últimos 4 meses</option>
                      <option value={6}>Últimos 6 meses</option>
                    </select>
                  </label>
                </CabecalhoPainel>

                <div className="pd-grafico-evolucao">
                  {evolucaoVisivel.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={evolucaoVisivel}
                        margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id={idGradiente} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#633df2" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#633df2" stopOpacity={0.015} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#e9e8f2" vertical={false} />
                        <XAxis dataKey="periodo" axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                        <Tooltip content={<TooltipGrafico />} />
                        <Area
                          type="monotone"
                          dataKey="risco"
                          stroke="#633df2"
                          strokeWidth={2.5}
                          fill={`url(#${idGradiente})`}
                          dot={{ r: 4, fill: "#633df2", strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                          isAnimationActive
                          animationDuration={900}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="pd-sem-dados">
                      Ainda não há dados suficientes para exibir a evolução.
                    </p>
                  )}
                </div>
              </section>

              <section className="pd-painel pd-frequencia">
                <CabecalhoPainel
                  titulo="Frequência Geral"
                  descricao="Percentual de presença dos estudantes."
                />

                <div className="pd-grafico-circular">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { valor: frequenciaGeral },
                          { valor: 100 - frequenciaGeral }
                        ]}
                        dataKey="valor"
                        cx="50%"
                        cy="50%"
                        innerRadius="80%"
                        outerRadius="96%"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                        isAnimationActive
                        animationDuration={1000}
                      >
                        <Cell fill="#11bb77" />
                        <Cell fill="#e1f2e9" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pd-grafico-circular-rotulo">
                    <strong>{frequenciaGeral}%</strong>
                    <span>de presença</span>
                  </div>
                </div>
              </section>
            </div>

            <div className="pd-grade-inferior">
              <section className="pd-painel pd-painel-pequeno">
                <CabecalhoPainel
                  titulo="Frequência por dia da semana"
                  descricao="Média de presença dos estudantes."
                />
                <div className="pd-grafico-inferior">
                  <GraficoFrequencia dados={FREQUENCIA_SEMANAL_DEMONSTRACAO} />
                </div>
              </section>

              <section className="pd-painel pd-painel-pequeno">
                <CabecalhoPainel
                  titulo="Distribuição de risco"
                  descricao="Quantidade de estudantes por nível de risco."
                />
                <div className="pd-distribuicao">
                  <div className="pd-donut">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distribuicao}
                          dataKey="valor"
                          nameKey="nome"
                          innerRadius="61%"
                          outerRadius="88%"
                          startAngle={90}
                          endAngle={-270}
                          stroke="none"
                          isAnimationActive
                          animationDuration={900}
                        >
                          {distribuicao.map((nivel) => (
                            <Cell key={nivel.nome} fill={nivel.cor} />
                          ))}
                        </Pie>
                        <Tooltip content={<TooltipGrafico unidade=" alunos" />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="pd-legenda-risco">
                    {distribuicao.map((nivel) => (
                      <div className="pd-legenda-linha" key={nivel.nome}>
                        <span className={`pd-legenda-bolinha pd-legenda-${nivel.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`} />
                        <span>{nivel.nome}</span>
                        <strong>{nivel.valor}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="pd-painel pd-painel-pequeno">
                <CabecalhoPainel
                  titulo="Frequência média por turma"
                  descricao="Média de presença dos estudantes por turma."
                >
                  <label className="pd-seletor-periodo pd-seletor-turmas">
                    <span className="pd-acessivel">Filtrar turmas por ano</span>
                    <select
                      value={filtroTurma}
                      onChange={(evento) => alterarFiltroTurma(evento.target.value)}
                    >
                      <option value="Todas">Todas as turmas</option>
                      {anosDisponiveis.map((ano) => (
                        <option value={ano} key={ano}>{ano}º ano</option>
                      ))}
                    </select>
                  </label>
                </CabecalhoPainel>

                <div className="pd-turmas-conteudo">
                  <button
                    type="button"
                    className="pd-seta"
                    aria-label="Turmas anteriores"
                    disabled={paginaAtual === 0}
                    onClick={() => setPaginaTurmas(paginaAtual - 1)}
                  >
                    ‹
                  </button>

                  <div className="pd-grafico-inferior pd-grafico-turmas">
                    <GraficoFrequencia dados={turmasVisiveis} eixo="turma" />
                  </div>

                  <button
                    type="button"
                    className="pd-seta"
                    aria-label="Próximas turmas"
                    disabled={paginaAtual === totalPaginas - 1}
                    onClick={() => setPaginaTurmas(paginaAtual + 1)}
                  >
                    ›
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default Dashboard
