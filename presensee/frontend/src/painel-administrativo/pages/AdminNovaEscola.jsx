import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { saveEscola } from "../services/adminDemo"

const initial = {
  nome: "", inep: "", rede: "Estadual", municipio: "", uf: "PE",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "",
  gestor: "", cargoGestor: "", email: "", telefone: "", status: "Pendente"
}

export default function AdminNovaEscola() {
  const [dados, setDados] = useState(initial)
  const navigate = useNavigate()

  function update(event) {
    setDados((anterior) => ({ ...anterior, [event.target.name]: event.target.value }))
  }

  function submit(event) {
    event.preventDefault()
    saveEscola(dados)
    navigate("/admin/escolas")
  }

  function field(label, name, required = false, type = "text") {
    return (
      <label key={name}>
        {label}{required && " *"}
        <input type={type} name={name} value={dados[name]} onChange={update} required={required} />
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
            <select name="rede" value={dados.rede} onChange={update}>
              {["Estadual", "Municipal", "Federal", "Privada"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>Situação inicial
            <select name="status" value={dados.status} onChange={update}>
              <option>Pendente</option><option>Ativa</option>
            </select>
          </label>
        </div>
        <h3>Endereço da escola</h3>
        <div className="admin-form-grid">
          {field("CEP", "cep", true)}
          {field("Logradouro (rua/avenida)", "logradouro", true)}
          {field("Número", "numero", true)}
          {field("Complemento", "complemento")}
          {field("Bairro", "bairro", true)}
          {field("Município", "municipio", true)}
          <label>Estado (UF) *
            <input name="uf" maxLength={2} value={dados.uf} onChange={update} required />
          </label>
        </div>
        <h3>Gestor responsável</h3>
        <div className="admin-form-grid">
          {field("Nome completo", "gestor", true)}
          {field("Cargo", "cargoGestor", true)}
          {field("E-mail institucional", "email", true, "email")}
          {field("Telefone", "telefone", false, "tel")}
        </div>
        <div className="admin-actions">
          <Link className="admin-btn secondary" to="/admin/escolas">Cancelar</Link>
          <button className="admin-btn" type="submit">Salvar escola</button>
        </div>
      </form>
    </div>
  )
}
