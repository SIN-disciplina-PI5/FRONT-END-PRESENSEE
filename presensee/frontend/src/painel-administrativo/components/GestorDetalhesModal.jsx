import AdminModal from "./AdminModal"

const show = (value) => value === null || value === undefined || value === "" ? "Não informado" : value
export default function GestorDetalhesModal({ escola, onClose }) {
  if (!escola) return null
  const gestor = (escola.usuarios || []).find((u) => u.perfil?.toLowerCase().includes("gestor") && u.nome === escola.gestor)
  const cargo = gestor?.cargo || escola.cargoGestor
  const dataInicio = gestor?.criadoEm || escola.gestorCriadoEm
  const dataValida = dataInicio && !Number.isNaN(new Date(dataInicio).getTime())
  return (
    <AdminModal title="Informações do gestor" onClose={onClose}>
      <div className="admin-manager-hero"><div className="admin-manager-avatar">{escola.gestor?.charAt(0)?.toUpperCase() || "G"}</div><div><h3>{show(escola.gestor)}</h3><p>Gestor escolar • {escola.nome}</p></div></div>
      <dl className="admin-detail-grid">
        <div><dt>Instituição</dt><dd>{escola.nome}</dd></div>
        <div><dt>Cargo</dt><dd>{show(cargo)}</dd></div>
        <div><dt>E-mail</dt><dd>{show(gestor?.email || escola.email)}</dd></div>
        <div><dt>Telefone</dt><dd>{show(gestor?.telefone || escola.telefone)}</dd></div>
        <div><dt>Início no PresenSee</dt><dd>{dataValida ? new Date(dataInicio).toLocaleDateString("pt-BR") : "Não informado"}</dd></div>
        <div><dt>Status da escola</dt><dd>{show(escola.status)}</dd></div>
      </dl>    </AdminModal>
  )
}
