import { useState, useEffect } from "react"
import AdminIcon from "../components/AdminIcons"
import "../styles/admin.css"

export default function AdminPerfil() {
  const [perfil, setPerfil] = useState({
    nome: "Carregando...",
    email: "",
    telefone: "",
    cargo: "Superadministrador",
    avatar: ""
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Carrega o usuário real salvo pelo sistema de login do back-end
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario") || "{}")
    setPerfil({
      id: usuarioLogado.id || "",
      nome: usuarioLogado.name || "Superadmin",
      email: usuarioLogado.email || "admin@presensee.com",
      telefone: usuarioLogado.telefone || "",
      cargo: usuarioLogado.role === "SUPERADMIN" ? "Superadministrador" : (usuarioLogado.role || "Gestor"),
      avatar: usuarioLogado.avatar || ""
    })
  }, [])

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

  async function save(e) {
    e.preventDefault()
    
    // Atualiza a sessão local para refletir no menu e cabeçalho
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario") || "{}")
    const usuarioAtualizado = { 
      ...usuarioLogado, 
      name: perfil.nome, 
      email: perfil.email,
      avatar: perfil.avatar 
    }
    
    localStorage.setItem("usuario", JSON.stringify(usuarioAtualizado))
    window.dispatchEvent(new Event("admin-profile-updated"))
    setSaved(true)

    console.warn("Nota: Para persistir estas alterações no Neon DB, será necessário criar a rota PATCH /users/:id no back-end futuramente.")
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
            <h2>{perfil.nome}</h2>
            <p>{perfil.cargo} • PresenSee</p>
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
              <input value={perfil.cargo} readOnly disabled />
            </label>
          </div>
          <p className="admin-hint">Dados vinculados à sua sessão atual. Alterações de credenciais exigirão endpoint específico na API.</p>
          <div className="admin-actions">
            {saved && <span className="admin-save-success" role="status">Sessão atualizada!</span>}
            <button className="admin-btn" type="submit">Salvar alterações</button>
          </div>
        </form>
      </section>
    </div>
  )
}