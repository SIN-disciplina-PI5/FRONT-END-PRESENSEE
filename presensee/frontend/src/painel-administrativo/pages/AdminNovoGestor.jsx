import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import api from "../../services/api"
import "../styles/admin.css"

export default function AdminNovoGestor() {
  const [dados, setDados] = useState({
    name: "",
    email: "",
    password: "",
    escolaId: ""
  })
  const [escolas, setEscolas] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    async function carregarEscolas() {
      try {
        const response = await api.get("/escolas")
        setEscolas(response.data)
      } catch (error) {
        console.error("Erro ao carregar escolas:", error)
      }
    }
    carregarEscolas()
  }, [])

  function update(event) {
    setDados((anterior) => ({ ...anterior, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    
    try {
      await api.post("/users", {
        name: dados.name,
        email: dados.email,
        password: dados.password,
        role: "MANAGER",
        escolaId: dados.escolaId || null
      })
      navigate("/admin/gestores")
    } catch (error) {
      console.error("Erro ao salvar gestor:", error)
      alert("Falha ao cadastrar o gestor. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-heading">
        <div>
          <h1>Cadastrar novo gestor</h1>
          <p>Crie o acesso para diretores ou coordenadores e vincule-os a uma escola.</p>
        </div>
      </div>
      
      <form onSubmit={submit} className="admin-panel admin-form">
        <h3>Credenciais de Acesso</h3>
        <div className="admin-form-grid">
          <label>Nome completo *
            <input type="text" name="name" value={dados.name} onChange={update} required disabled={loading} />
          </label>
          <label>E-mail institucional *
            <input type="email" name="email" value={dados.email} onChange={update} required disabled={loading} />
          </label>
          <label>Senha provisória *
            <input type="password" name="password" value={dados.password} onChange={update} required disabled={loading} minLength={6} />
          </label>
          <label>Vincular a uma Escola
            <select name="escolaId" value={dados.escolaId} onChange={update} disabled={loading}>
              <option value="">Selecione uma escola (Opcional)</option>
              {escolas.map((escola) => (
                <option key={escola.id} value={escola.id}>
                  {escola.nome} ({escola.municipio})
                </option>
              ))}
            </select>
          </label>
        </div>
        
        <div className="admin-actions">
          <Link className="admin-btn secondary" to="/admin/gestores">Cancelar</Link>
          <button className="admin-btn" type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar gestor"}
          </button>
        </div>
      </form>
    </div>
  )
}