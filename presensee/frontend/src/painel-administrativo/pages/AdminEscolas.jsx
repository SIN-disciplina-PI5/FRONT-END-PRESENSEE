import { useState } from "react"
import { Link } from "react-router-dom"
import { changeStatus, getEscolas } from "../services/adminDemo"

export default function AdminEscolas({ modo = "escolas" }) {
  const [escolas, setEscolas] = useState(getEscolas())
  const [busca, setBusca] = useState("")
  const [filtro, setFiltro] = useState("Todas")

  // ALTERAR STATUS DA ESCOLA

  function status(id, s) {
    changeStatus(id, s)
    setEscolas(getEscolas())
  }

  // FILTRAR ESCOLAS

  const lista = escolas.filter(
    (e) =>
      (filtro === "Todas" || e.status === filtro) &&
      [e.nome, e.municipio, e.gestor]
        .join(" ")
        .toLowerCase()
        .includes(busca.toLowerCase())
  )

  return (
    <div className="admin-page">

      {/* CABEÇALHO */}

      <div className="admin-heading">
        <div>
          <h1>
            {modo === "acessos"
              ? "Controle de acessos"
              : "Escolas"}
          </h1>

          <p>
            {modo === "acessos"
              ? "Libere ou suspenda o acesso institucional."
              : "Cadastre e gerencie instituições vinculadas ao projeto."}
          </p>
        </div>

        <Link
          className="admin-btn"
          to="/admin/escolas/nova"
        >
          + Nova escola
        </Link>
      </div>

      {/* PAINEL DE ESCOLAS */}

      <section className="admin-panel">

        {/* FILTROS */}

        <div className="admin-filters">
          <input
            placeholder="Buscar escola, município ou gestor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            {[
              "Todas",
              "Ativa",
              "Pendente",
              "Bloqueada"
            ].map((x) => (
              <option key={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        {/* TABELA DE ESCOLAS */}

        <div className="admin-table-wrap">
          <table className="admin-table">

            <thead>
              <tr>
                <th>Escola</th>
                <th>Município</th>
                <th>Rede</th>
                <th>Gestor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {lista.map((e) => (
                <tr key={e.id}>

                  {/* ESCOLA */}

                  <td>
                    <strong>{e.nome}</strong>

                    <small>
                      {e.inep && `INEP: ${e.inep}`}
                    </small>
                  </td>

                  {/* MUNICÍPIO */}

                  <td>{e.municipio}</td>

                  {/* REDE DE ENSINO */}

                  <td>{e.rede}</td>

                  {/* GESTOR */}

                  <td>{e.gestor}</td>

                  {/* STATUS */}

                  <td>
                    <span
                      className={`admin-badge ${e.status.toLowerCase()}`}
                    >
                      {e.status}
                    </span>
                  </td>

                  {/* ALTERAR STATUS */}

                  <td>
                    <select
                      aria-label={`Alterar situação de ${e.nome}`}
                      value={e.status}
                      onChange={(ev) =>
                        status(e.id, ev.target.value)
                      }
                    >
                      <option>Ativa</option>
                      <option>Pendente</option>
                      <option>Bloqueada</option>
                    </select>
                  </td>

                </tr>
              ))}
            </tbody>

          </table>

          {/* NENHUMA ESCOLA ENCONTRADA */}

          {!lista.length && (
            <p>Nenhuma escola encontrada.</p>
          )}

        </div>
      </section>
    </div>
  )
}