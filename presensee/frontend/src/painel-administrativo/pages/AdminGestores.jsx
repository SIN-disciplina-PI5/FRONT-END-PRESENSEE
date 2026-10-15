import { useState } from "react"
import { getEscolas } from "../services/adminDemo"
import GestorDetalhesModal from "../components/GestorDetalhesModal"

export default function AdminGestores() {
  const escolas = getEscolas()
  const [selecionado, setSelecionado] = useState(null)
  return (
    <div className="admin-page">
      <div className="admin-heading"><div><h1>Gestores escolares</h1><p>Selecione um gestor para visualizar seu perfil e contatos.</p></div></div>
      <section className="admin-panel">
        <div className="admin-table-wrap"><table className="admin-table">
          <thead><tr><th>Responsável</th><th>Escola</th><th>E-mail</th><th>Situação</th><th>Ações</th></tr></thead>
          <tbody>{escolas.map((escola) => (
            <tr key={escola.id}>
              <td><button className="admin-link-button" onClick={() => setSelecionado(escola)}>{escola.gestor}</button></td>
              <td>{escola.nome}</td><td>{escola.email}</td>
              <td><span className={`admin-badge ${escola.status.toLowerCase()}`}>{escola.status}</span></td>
              <td><button className="admin-outline-btn" onClick={() => setSelecionado(escola)}>Ver perfil</button></td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
      <GestorDetalhesModal escola={selecionado} onClose={() => setSelecionado(null)} />
    </div>
  )
}
