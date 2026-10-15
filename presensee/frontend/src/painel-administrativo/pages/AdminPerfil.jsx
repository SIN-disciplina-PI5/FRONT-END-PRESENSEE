import { useState } from "react"
import AdminIcon from "../components/AdminIcons"
import "../styles/admin.css"

const defaults = { nome: "Superadmin", email: "admin@presensee.demo", telefone: "", cargo: "Superadministrador", avatar: "" }

export default function AdminPerfil() {
  const [perfil, setPerfil] = useState(() => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem("adminPerfilDemo") || "{}") } }
    catch { return defaults }
  })
  const [saved, setSaved] = useState(false)

  function change(field, value) {
    setPerfil((p) => ({ ...p, [field]: value }))
    setSaved(false)
  }

  function selectAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/") || file.size > 1_000_000) {
      alert("Escolha uma imagem de até 1 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => change("avatar", String(reader.result))
    reader.readAsDataURL(file)
  }

  function save(e) {
    e.preventDefault()
    localStorage.setItem("adminPerfilDemo", JSON.stringify(perfil))
    window.dispatchEvent(new Event("admin-profile-updated"))
    setSaved(true)
  }

  return (
    <div className="admin-page admin-profile-page">
      <div className="admin-heading">
        <div>
          <h1>Meu Perfil</h1>
          <p>Consulte e personalize as informações exibidas no painel administrativo.</p>
        </div>
      </div>

      <section className="admin-panel admin-profile-panel">
        <div className="admin-profile-header">
          <span className="admin-profile-photo">
            {perfil.avatar ? <img src={perfil.avatar} alt="Foto de perfil" /> : <AdminIcon name="user" size={50} />}
          </span>
          <div>
            <h2>{perfil.nome || "Superadmin"}</h2>
            <p>Superadministrador • PresenSee</p>
            <label className="admin-avatar-upload">
              <AdminIcon name="camera" size={16} /> Alterar foto
              <input type="file" accept="image/*" onChange={selectAvatar} hidden />
            </label>
          </div>
        </div>

        <form onSubmit={save} className="admin-form">
          <h3>Informações do administrador</h3>
          <div className="admin-form-grid">
            <label>Nome completo
              <input value={perfil.nome} onChange={(e) => change("nome", e.target.value)} required />
            </label>
            <label>E-mail de contato
              <input type="email" value={perfil.email} onChange={(e) => change("email", e.target.value)} required />
            </label>
            <label>Telefone
              <input type="tel" value={perfil.telefone} onChange={(e) => change("telefone", e.target.value)} placeholder="(81) 99999-9999" />
            </label>
            <label>Função
              <input value={perfil.cargo} readOnly />
            </label>
          </div>
          <p className="admin-hint">Dados salvos apenas neste navegador para demonstração. A alteração de e-mail aqui não modifica as credenciais de login.</p>
          <div className="admin-actions">
            {saved && <span className="admin-save-success" role="status">Perfil atualizado!</span>}
            <button className="admin-btn" type="submit">Salvar alterações</button>
          </div>
        </form>
      </section>
    </div>
  )
}
