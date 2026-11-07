import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import api from "../../services/api" // Conexão com o backend

const initial = {
  nome: "", inep: "", rede: "Estadual", municipio: "", uf: "PE",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "",
  gestor: "", cargoGestor: "", email: "", telefone: "", status: "Pendente"
}

export default function AdminNovaEscola() {
  const [dados, setDados] = useState(initial)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function update(event) {
    setDados((anterior) => ({ ...anterior, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    
    try {
      // 1. Criar a Escola primeiro enviando TODOS os dados do formulário
      const respostaEscola = await api.post("/escolas", {
        nome: dados.nome,
        inep: dados.inep,
        rede: dados.rede,
        status: dados.status,
        cep: dados.cep,
        logradouro: dados.logradouro,
        numero: dados.numero,
        complemento: dados.complemento,
        bairro: dados.bairro,
        municipio: dados.municipio,
        uf: dados.uf,
        telefone: dados.telefone
      })
      
      const escolaCriada = respostaEscola.data;

      // 2. Se o usuário preencheu o nome do gestor, cria o utilizador e vincula a escola
      if (dados.gestor && dados.gestor.trim() !== "") {
        await api.post("/users", {
          name: dados.gestor,
          email: dados.email || `${dados.nome.replace(/\s+/g, '').toLowerCase()}@gestor.com`, // email gerado se estiver vazio
          telefone: dados.telefone, // <-- Telefone agora é repassado para o perfil do Gestor
          password: "123", // Password padrão para os novos gestores trocarem no primeiro acesso
          role: "MANAGER",
          escolaId: escolaCriada.id // Vincula o ID da escola acabada de criar
        })
      }
      
      navigate("/admin/escolas")
    } catch (error) {
      console.error("Erro ao salvar escola e gestor:", error)
      alert("Falha ao cadastrar a escola e o gestor. Verifique o console.")
    } finally {
      setLoading(false)
    }
  }

  function field(label, name, required = false, type = "text") {
    return (
      <label key={name}>
        {label}{required && " *"}
        <input type={type} name={name} value={dados[name]} onChange={update} required={required} disabled={loading} />
      </label>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-heading">
        <div>
          <h1>Cadastrar nova escola</h1>
          <p>Dados institucionais, endereço completo e responsável pelo acesso.</p>
        </div>
      </div>
      <form onSubmit={submit} className="admin-panel admin-form">
        <h3>Dados da instituição</h3>
        <div className="admin-form-grid">
          {field("Nome da escola", "nome", true)}
          {field("Código INEP", "inep")}
          <label>Rede de ensino
            <select name="rede" value={dados.rede} onChange={update} disabled={loading}>
              {["Estadual", "Municipal", "Federal", "Privada"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>Situação inicial
            <select name="status" value={dados.status} onChange={update} disabled={loading}>
              <option>Pendente</option><option>Ativa</option>
            </select>
          </label>
        </div>
        
        <h3>Endereço da escola</h3>
        <div className="admin-form-grid">
          {field("CEP", "cep", false)}
          {field("Logradouro (rua/avenida)", "logradouro", false)}
          {field("Número", "numero", false)}
          {field("Complemento", "complemento")}
          {field("Bairro", "bairro", false)}
          {field("Município", "municipio", true)}
          <label>Estado (UF)
            <input name="uf" maxLength={2} value={dados.uf} onChange={update} disabled={loading} />
          </label>
        </div>
        
        <h3>Gestor responsável</h3>
        <div className="admin-form-grid">
          {field("Nome completo", "gestor", false)}
          {field("Cargo", "cargoGestor", false)}
          {field("E-mail institucional", "email", false, "email")}
          {field("Telefone", "telefone", false, "tel")}
        </div>
        
        <div className="admin-actions">
          <Link className="admin-btn secondary" to="/admin/escolas">Cancelar</Link>
          <button className="admin-btn" type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar escola"}
          </button>
        </div>
      </form>
    </div>
  )
}