import { useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import api from "../../services/api"
import EscolaDetalhesModal from "../components/EscolaDetalhesModal"
import "../styles/admin.css"

export default function AdminEscolas() {
  const [escolas, setEscolas] = useState([])
  const [busca, setBusca] = useState("")
  const [excluir, setExcluir] = useState(null)
  const [detalhes, setDetalhes] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const filtrosValidos = ["Todas", "Ativa", "Pendente", "Bloqueada"]
  const statusUrl = searchParams.get("status")
  const filtro = filtrosValidos.includes(statusUrl) ? statusUrl : "Todas"

  useEffect(() => {
    carregarEscolas()
  }, [])

  async function carregarEscolas() {
    try {
      const response = await api.get("/escolas")
      setEscolas(response.data)
    } catch (error) {
      console.error("Erro ao buscar escolas:", error)
    }
  }

  function alterarFiltro(novoFiltro) {
    setSearchParams(novoFiltro === "Todas" ? {} : { status: novoFiltro })
  }

  async function status(id, novoStatus) {
    try {
      await api.patch(`/escolas/${id}/status`, { status: novoStatus })
      carregarEscolas()
    } catch (error) {
      console.error("Erro ao alterar status:", error)
    }
  }

  async function confirmarExclusao() {
    if (!excluir) return
    try {
      await api.delete(`/escolas/${excluir.id}`)
      setExcluir(null)
      setDetalhes(null)
      carregarEscolas() 
    } catch (error) {
      console.error("Erro ao excluir escola:", error)
    }
  }

  const lista = escolas.filter((escola) => {
    const correspondeStatus = filtro === "Todas" || escola.status === filtro
    const correspondeBusca = [escola.nome, escola.municipio, escola.rede]
      .join(" ")
      .toLowerCase()
      .includes(busca.toLowerCase())
    return correspondeStatus && correspondeBusca
  })

  return (
    <div className="admin-page">
      <div className="admin-heading">
        <div>
          <h1>Escolas</h1>
          <p>Cadastre e gerencie instituições vinculadas ao projeto.</p>
        </div>
        <Link className="admin-btn" to="/admin/escolas/nova">
          + Nova escola
        </Link>
      </div>

      <section className="admin-panel admin-list-panel">
        <div className="admin-filters">
          <input
            aria-label="Pesquisar escolas"
            placeholder="Buscar escola ou município..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
          <select
            aria-label="Filtrar por situação"
            value={filtro}
            onChange={(event) => alterarFiltro(event.target.value)}
          >
            {filtrosValidos.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Escola</th>
                <th>Município</th>
                <th>Rede</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((escola) => (
                <tr key={escola.id}>
                  <td>
                    <button
                      type="button"
                      className="admin-link-button"
                      onClick={() => setDetalhes(escola)}
                    >
                      {escola.nome}
                    </button>
                  </td>
                  <td>{escola.municipio}</td>
                  <td>{escola.rede}</td>
                  <td>
                    <span className={`admin-badge ${escola.status.toLowerCase()}`}>
                      {escola.status}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-outline-btn"
                        onClick={() => setDetalhes(escola)}
                      >
                        Detalhes
                      </button>
                      <select
                        aria-label={`Alterar situação de ${escola.nome}`}
                        value={escola.status}
                        onChange={(event) => status(escola.id, event.target.value)}
                      >
                        <option value="Ativa">Ativa</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Bloqueada">Bloqueada</option>
                      </select>
                      <button
                        type="button"
                        className="admin-delete-button"
                        onClick={() => setExcluir(escola)}
                        title="Excluir escola"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!lista.length && (
            <p className="admin-empty">Nenhuma escola encontrada.</p>
          )}
        </div>
      </section>

      {detalhes && (
        <EscolaDetalhesModal
          escola={detalhes}
          onClose={() => setDetalhes(null)}
        />
      )}

      {excluir && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setExcluir(null)
          }}
        >
          <div className="admin-modal" role="alertdialog">
            <h2>Excluir escola?</h2>
            <p>
              Deseja excluir <strong>{excluir.nome}</strong>? Esta ação é definitiva e será registrada na auditoria.
            </p>
            <div className="admin-actions">
              <button
                type="button"
                className="admin-btn secondary"
                onClick={() => setExcluir(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={confirmarExclusao}
              >
                Sim, excluir escola
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}