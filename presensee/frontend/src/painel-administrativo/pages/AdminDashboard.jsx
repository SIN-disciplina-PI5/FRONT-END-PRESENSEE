import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import api from "../../services/api"
import "../styles/admin.css"

export default function AdminDashboard() {
  const [escolas, setEscolas] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    async function carregarDashboard() {
      try {
        const response = await api.get("/escolas")
        setEscolas(response.data)
      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error)
      }
    }
    carregarDashboard()
  }, [])

  const ativos = escolas.filter((e) => e.status === "Ativa").length
  const pendentes = escolas.filter((e) => e.status === "Pendente").length
  const bloqueadas = escolas.filter((e) => e.status === "Bloqueada").length

  const data = [
    { name: "Ativas", value: ativos, color: "#20c96b" },
    { name: "Pendentes", value: pendentes, color: "#f6b63e" },
    { name: "Bloqueadas", value: bloqueadas, color: "#ef6473" }
  ].filter((item) => item.value > 0)

  // Distribuição ilustrativa para o gráfico de linha (baseada no total real)
  const chartData = [
    { name: "Jan", n: 0 },
    { name: "Fev", n: Math.floor(escolas.length / 4) },
    { name: "Mar", n: Math.floor(escolas.length / 2) },
    { name: "Abr", n: escolas.length }
  ]

  return (
    <div className="admin-page">
      <div className="admin-heading">
        <div>
          <h1>Olá, Superadmin!</h1>
          <p>Visão geral da rede de escolas do PresenSee.</p>
        </div>
      </div>

      <h2 className="admin-section-title">Visão Geral</h2>
      <div className="admin-stats">
        {[
          ["Escolas cadastradas", escolas.length, "◈", "Todas"],
          ["Escolas ativas", ativos, "✓", "Ativa"],
          ["Aguardando ativação", pendentes, "!", "Pendente"],
          ["Bloqueadas", bloqueadas, "⊘", "Bloqueada"]
        ].map(([title, value, icon, filtro], i) => (
          <article
            className="admin-stat"
            key={title}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/admin/escolas?status=${filtro}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                navigate(`/admin/escolas?status=${filtro}`)
              }
            }}
            style={{ cursor: "pointer" }}
          >
            <div className={`admin-stat-icon i${i}`}>
              {icon}
            </div>
            <strong>{value}</strong>
            <span>{title}</span>
          </article>
        ))}
      </div>

      <div className="admin-grid">
        <section className="admin-panel admin-feature-chart">
          <h3>Evolução das escolas cadastradas</h3>
          <div className="admin-chart">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 12, right: 14, left: -12, bottom: 2 }}>
                <XAxis dataKey="name" stroke="rgba(255,255,255,.8)" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="rgba(255,255,255,.8)" tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="n" name="Escolas" stroke="#fdcb6e" strokeWidth={3} dot={{ r: 5, fill: "#fdcb6e" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <small>Distribuição ilustrativa para o protótipo, baseada no total real.</small>
        </section>

        <section className="admin-panel admin-status-chart">
          <h3>Status das escolas</h3>
          <ResponsiveContainer width="100%" height={255}>
            <PieChart>
              <Pie
                data={data.length ? data : [{ name: "Sem dados", value: 1, color: "#e2e2ea" }]}
                dataKey="value"
                nameKey="name"
                innerRadius={72}
                outerRadius={100}
                stroke="none"
              >
                {(data.length ? data : [{ name: "Sem dados", color: "#e2e2ea" }]).map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="admin-legend">
            {data.map((item) => (
              <span key={item.name} style={{ color: item.color }}>
                ● {item.name}: {item.value}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}