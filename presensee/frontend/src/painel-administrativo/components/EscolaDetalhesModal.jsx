import AdminModal from "./AdminModal"

const show = (value) => value === null || value === undefined || value === "" ? "Não informado" : value
const fmt = (date) => date ? new Date(date).toLocaleDateString("pt-BR") : "Não informado"

export default function EscolaDetalhesModal({ escola, onClose }) {
  if (!escola) return null
  const usuarios = Array.isArray(escola.usuarios) ? escola.usuarios : []
  const gestores = usuarios.filter((u) => /gestor/i.test(u.perfil || ""))
  const monitores = usuarios.filter((u) => /monitor/i.test(u.perfil || ""))
  const endereco = [escola.logradouro, escola.numero, escola.complemento, escola.bairro, escola.municipio, escola.uf].filter(Boolean).join(", ")
  return (
    <AdminModal title={escola.nome} onClose={onClose}>
      <div className="admin-detail-summary">
        <div><small>Usuários vinculados</small><strong>{usuarios.length ? usuarios.length : "—"}</strong></div>
        <div><small>Monitores</small><strong>{usuarios.length ? monitores.length : "—"}</strong></div>
        <div><small>Alunos cadastrados</small><strong>{escola.totalAlunos ?? "—"}</strong></div>
      </div>
      <h3>Informações institucionais</h3>
      <dl className="admin-detail-grid">
        <div><dt>Rede</dt><dd>{show(escola.rede)}</dd></div>
        <div><dt>Código INEP</dt><dd>{show(escola.inep)}</dd></div>
        <div><dt>Status</dt><dd>{show(escola.status)}</dd></div>
        <div><dt>Cadastro no PresenSee</dt><dd>{fmt(escola.criadoEm)}</dd></div>
      </dl>
      <h3>Localização</h3>
      <dl className="admin-detail-grid">
        <div><dt>Endereço</dt><dd>{show(endereco)}</dd></div>
        <div><dt>CEP</dt><dd>{show(escola.cep)}</dd></div>
        <div><dt>Cidade / UF</dt><dd>{show([escola.municipio, escola.uf].filter(Boolean).join(" / "))}</dd></div>
      </dl>
      {endereco && <a className="admin-map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`} target="_blank" rel="noreferrer">Visualizar endereço no mapa ↗</a>}
      <h3>Contato institucional</h3>
      <dl className="admin-detail-grid">
        <div><dt>Gestor responsável</dt><dd>{show(escola.gestor)}</dd></div>
        <div><dt>E-mail</dt><dd>{show(escola.email)}</dd></div>
        <div><dt>Telefone</dt><dd>{show(escola.telefone)}</dd></div>
      </dl>
      <h3>Usuários associados</h3>
      {usuarios.length ? (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nome</th><th>Perfil</th><th>E-mail</th><th>Início</th></tr></thead><tbody>
          {usuarios.map((u, index) => <tr key={u.id || index}><td>{show(u.nome)}</td><td>{show(u.perfil)}</td><td>{show(u.email)}</td><td>{fmt(u.criadoEm)}</td></tr>)}
        </tbody></table></div>
      ) : (<p className="admin-hint">Nenhum usuário vinculado a esta escola.</p>)}
    </AdminModal>
  )
}
