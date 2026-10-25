import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import api from "../../services/api"
import GestorDetalhesModal from "../components/GestorDetalhesModal"

export default function AdminGestores() {
  const [gestores, setGestores] = useState([])
  const [selecionado, setSelecionado] = useState(null)

  useEffect(() => {
    carregarGestores()
  }, [])

  async function carregarGestores() {
    try {
      const response = await api.get("/users")
      setGestores(response.data)
    } catch (error) {
      console.error("Erro ao buscar gestores:", error)
    }
  }

  function abrirModal(user) {
    setSelecionado({
      id: user.id,
      gestor: user.name,
      cargoGestor: user.role === "MANAGER" ? "Gestor(a)" : user.role,
      email: user.email,
      nome: user.escola?.nome || "Sem escola vinculada",
      status: user.escola?.status || "N/A",
      telefone: "Não informado" 
    })
  }

  return (
    <div className="admin-page">
      <div className="admin-heading">
        <div>
          <h1>Gestores escolares</h1>
          <p>Selecione um gestor para visualizar seu perfil e contatos.</p>
        </div>
        <Link className="admin-btn" to="/admin/gestores/novo">
          + Novo gestor
        </Link>
      </div>
      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Responsável</th>
                <th>Escola</th>
                <th>E-mail</th>
                <th>Situação da Escola</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {gestores.map((gestor) => (
                <tr key={gestor.id}>
                  <td>
                    <button className="admin-link-button" onClick={() => abrirModal(gestor)}>
                      {gestor.name}
                    </button>
                  </td>
                  <td>{gestor.escola?.nome || "Sem escola"}</td>
                  <td>{gestor.email}</td>
                  <td>
                    <span className={`admin-badge ${(gestor.escola?.status || "pendente").toLowerCase()}`}>
                      {gestor.escola?.status || "N/A"}
                    </span>
                  </td>
                  <td>
                    <button className="admin-outline-btn" onClick={() => abrirModal(gestor)}>
                      Ver perfil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!gestores.length && (
            <p className="admin-empty" style={{ textAlign: "center", padding: "20px" }}>
              Nenhum gestor encontrado.
            </p>
          )}
        </div>
      </section>
      
      {selecionado && (
        <GestorDetalhesModal escola={selecionado} onClose={() => setSelecionado(null)} />
      )}
    </div>
  )
}