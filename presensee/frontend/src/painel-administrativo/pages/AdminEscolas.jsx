import { useState } from "react"
import { Link } from "react-router-dom"
import { changeStatus, deleteEscola, getEscolas } from "../services/adminDemo"
import "../styles/admin.css"

export default function AdminEscolas({ modo = "escolas" }) {
  const [escolas, setEscolas] = useState(getEscolas())
  const [busca, setBusca] = useState("")
  const [filtro, setFiltro] = useState("Todas")
  const [excluir, setExcluir] = useState(null)

  function status(id, novoStatus) {
    changeStatus(id, novoStatus)
    setEscolas(getEscolas())
  }

  function confirmarExclusao() {
    if (!excluir) return
    deleteEscola(excluir.id)
    setEscolas(getEscolas())
    setExcluir(null)
  }

  const lista = escolas.filter((escola) =>
    (filtro === "Todas" || escola.status === filtro) &&
    [escola.nome, escola.municipio, escola.gestor]
      .join(" ")
      .toLowerCase()
      .includes(busca.toLowerCase())
  )

  return (
    <div className="admin-page">
      <div className="admin-heading">
        <div>
          <h1>{modo === "acessos" ? "Controle de acessos" : "Escolas"}</h1>
          <p>{modo === "acessos" ? "Libere ou suspenda o acesso institucional." : "Cadastre e gerencie instituições vinculadas ao projeto."}</p>
        </div>
        <Link className="admin-btn" to="/admin/escolas/nova">+ Nova escola</Link>
      </div>

      <section className="admin-panel admin-list-panel">
        <div className="admin-filters">
          <input
            aria-label="Pesquisar escolas"
            placeholder="Buscar escola, município ou gestor..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
          <select aria-label="Filtrar por situação" value={filtro} onChange={(event) => setFiltro(event.target.value)}>
            {["Todas", "Ativa", "Pendente", "Bloqueada"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Escola</th><th>Município</th><th>Rede</th><th>Gestor</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {lista.map((escola) => (
                <tr key={escola.id}>
                  <td><strong>{escola.nome}</strong>{escola.inep && <small>INEP: {escola.inep}</small>}</td>
                  <td>{escola.municipio}</td>
                  <td>{escola.rede}</td>
                  <td>{escola.gestor}</td>
                  <td><span className={`admin-badge ${escola.status.toLowerCase()}`}>{escola.status}</span></td>
                  <td>
                    <div className="admin-row-actions">
                      <select
                        aria-label={`Alterar situação de ${escola.nome}`}
                        value={escola.status}
                        onChange={(event) => status(escola.id, event.target.value)}
                      >
                        <option>Ativa</option><option>Pendente</option><option>Bloqueada</option>
                      </select>
                      <button
                        className="admin-delete-button"
                        type="button"
                        onClick={() => setExcluir(escola)}
                        aria-label={`Excluir ${escola.nome}`}
                        title="Excluir escola"
                      >Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!lista.length && <p className="admin-empty">Nenhuma escola encontrada.</p>}
        </div>
      </section>

      {excluir && (
        <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setExcluir(null) }}>
          <div className="admin-modal" role="alertdialog" aria-modal="true" aria-labelledby="admin-delete-title" aria-describedby="admin-delete-description">
            <h2 id="admin-delete-title">Excluir escola?</h2>
            <p id="admin-delete-description">Deseja excluir <strong>{excluir.nome}</strong>? Esta ação remove a instituição dos dados demonstrativos deste navegador e será registrada na auditoria.</p>
            <div className="admin-actions">
              <button type="button" className="admin-btn secondary" onClick={() => setExcluir(null)}>Cancelar</button>
              <button type="button" className="admin-btn admin-btn-danger" onClick={confirmarExclusao}>Sim, excluir escola</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
