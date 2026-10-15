import { Link } from "react-router-dom"
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"

import { getEscolas } from "../services/adminDemo"
import "../styles/admin.css"

export default function AdminDashboard() {
  const escolas = getEscolas()

  const ativos = escolas.filter(
    (e) => e.status === "Ativa"
  ).length

  const pendentes = escolas.filter(
    (e) => e.status === "Pendente"
  ).length

  const bloqueadas = escolas.filter(
    (e) => e.status === "Bloqueada"
  ).length

  const data = [
    {
      name: "Ativas",
      value: ativos,
      color: "#20c96b"
    },
    {
      name: "Pendentes",
      value: pendentes,
      color: "#f6b63e"
    },
    {
      name: "Bloqueadas",
      value: bloqueadas,
      color: "#ef6473"
    }
  ].filter((x) => x.value)

  return (
    <div className="admin-page">

      {/* CABEÇALHO */}

      <div className="admin-heading">
        <div>
          <h1>Olá, Superadmin!</h1>
          <p>
            Visão geral das escolas cadastradas no PresenSee.
          </p>
        </div>

        <Link
          className="admin-btn"
          to="/admin/escolas/nova"
        >
          + Nova escola
        </Link>
      </div>

      {/* CARDS DE ESTATÍSTICAS */}

      <div className="admin-stats">
        {[
          ["Escolas cadastradas", escolas.length, "◈"],
          ["Escolas ativas", ativos, "✓"],
          ["Aguardando ativação", pendentes, "!"],
          ["Bloqueadas", bloqueadas, "⊘"]
        ].map(([title, value, icon], i) => (
          <article
            className="admin-stat"
            key={title}
          >
            <div className={`admin-stat-icon i${i}`}>
              {icon}
            </div>

            <strong>{value}</strong>
            <span>{title}</span>
          </article>
        ))}
      </div>

      {/* GRÁFICOS */}

      <div className="admin-grid">

        {/* GRÁFICO DE EVOLUÇÃO */}

        <section className="admin-panel">
          <h3>Visão das escolas</h3>

          <div className="admin-chart">
            <ResponsiveContainer width="100%" height={235}>
              <LineChart
                data={[
                  {
                    name: "Jan",
                    n: 0
                  },
                  {
                    name: "Fev",
                    n: Math.floor(escolas.length / 4)
                  },
                  {
                    name: "Mar",
                    n: Math.floor(escolas.length / 2)
                  },
                  {
                    name: "Abr",
                    n: escolas.length
                  }
                ]}
              >
                <XAxis dataKey="name" />

                <YAxis allowDecimals={false} />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="n"
                  stroke="#633df2"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <small>
            Distribuição ilustrativa para o protótipo.
          </small>
        </section>

        {/* GRÁFICO DE STATUS */}

        <section className="admin-panel">
          <h3>Status das escolas</h3>

          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie
                data={
                  data.length
                    ? data
                    : [
                        {
                          name: "Sem dados",
                          value: 1,
                          color: "#eee"
                        }
                      ]
                }
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={84}
              >
                {(
                  data.length
                    ? data
                    : [{ color: "#eee" }]
                ).map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.color}
                  />
                ))}
              </Pie>

              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          {/* LEGENDA */}

          <div className="admin-legend">
            {data.map((d) => (
              <span
                key={d.name}
                style={{ color: d.color }}
              >
                ● {d.name}: {d.value}
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* TABELA DE ESCOLAS CADASTRADAS */}

      <section className="admin-panel">

        <div className="admin-heading">
          <h3>Escolas cadastradas</h3>

          <Link to="/admin/escolas">
            Ver todas →
          </Link>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Instituição</th>
              <th>Município</th>
              <th>Gestor</th>
              <th>Situação</th>
            </tr>
          </thead>

          <tbody>
            {escolas.slice(-5).map((e) => (
              <tr key={e.id}>
                <td>{e.nome}</td>
                <td>{e.municipio}</td>
                <td>{e.gestor}</td>

                <td>
                  <span
                    className={`admin-badge ${e.status.toLowerCase()}`}
                  >
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </section>

    </div>
  )
}