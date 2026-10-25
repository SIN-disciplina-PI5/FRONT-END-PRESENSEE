import { useState, useEffect } from "react"
import api from "../../services/api"

export default function AdminAuditoria() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    async function carregarLogs() {
      try {
        // Rota preparada para o futuro; atualmente falhará silenciosamente
        const response = await api.get("/logs")
        setLogs(response.data)
      } catch (error) {
        console.warn("Rota de auditoria ainda não implementada no back-end.")
      }
    }
    carregarLogs()
  }, [])

  return (
    <div className="admin-page">
      <div className="admin-heading">
        <div>
          <h1>Auditoria</h1>
          <p>Histórico de ações administrativas realizadas no sistema.</p>
        </div>
      </div>
      
      <section className="admin-panel">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Ação</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td>{l.data}</td>
                  <td>{l.acao}</td>
                  <td>{l.responsavel || "Superadmin"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {!logs.length && (
            <p className="admin-empty" style={{ textAlign: "center", padding: "20px" }}>
              Nenhuma ação registrada ou rota de auditoria pendente.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}