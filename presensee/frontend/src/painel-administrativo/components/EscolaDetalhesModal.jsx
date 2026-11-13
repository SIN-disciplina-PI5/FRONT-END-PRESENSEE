import AdminModal from "./AdminModal"

const show = (value) => value === null || value === undefined || value === "" ? "Não informado" : value
const fmt = (date) => date ? new Date(date).toLocaleDateString("pt-BR") : "Não informado"

export default function EscolaDetalhesModal({ escola, onClose }) {
  if (!escola) return null

  // Correção 1: A API devolve o array de utilizadores como 'users'
  const usuarios = Array.isArray(escola.users) ? escola.users : (Array.isArray(escola.usuarios) ? escola.usuarios : [])
  
  // Correção 2: Identificar o gestor usando a propriedade 'role'
  const gestorPrincipal = usuarios.find((u) => u.role === "MANAGER" || u.role === "GESTOR" || u.perfil === "MANAGER") || null;
  
  const endereco = [escola.logradouro, escola.numero, escola.complemento, escola.bairro, escola.municipio, escola.uf].filter(Boolean).join(", ")
  
  return (
    <AdminModal title={escola.nome} onClose={onClose}>
      <div className="admin-detail-summary">
        <div><small>Usuários vinculados</small><strong>{usuarios.length ? usuarios.length : "—"}</strong></div>
        <div><small>Alunos cadastrados</small><strong>{escola.totalAlunos ?? "—"}</strong></div>
      </div>
      
      <h3>Informações institucionais</h3>
      <dl className="admin-detail-grid">
        <div><dt>Rede</dt><dd>{show(escola.rede)}</dd></div>
        <div><dt>Código INEP</dt><dd>{show(escola.inep)}</dd></div>
        <div><dt>Status</dt><dd>{show(escola.status)}</dd></div>
        {/* Correção 3: O campo de data que a API envia é createdAt */}
        <div><dt>Cadastro no PresenSee</dt><dd>{fmt(escola.createdAt || escola.criadoEm)}</dd></div>
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
        {/* Correção 4: Extrair os dados de contacto diretamente do utilizador gestor encontrado */}
        <div>
          <dt>Gestor responsável</dt>
          <dd>{show(gestorPrincipal ? (gestorPrincipal.name || gestorPrincipal.nome) : escola.gestorNome)}</dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{show(gestorPrincipal ? gestorPrincipal.email : escola.email)}</dd>
        </div>
        <div>
          <dt>Telefone</dt>
          <dd>{show(escola.telefone)}</dd>
        </div>
      </dl>
      
      <h3>Usuários associados</h3>
      {usuarios.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Perfil</th>
                <th>E-mail</th>
                <th>Início</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, index) => (
                <tr key={u.id || index}>
                  {/* Correção 5: Mapeamento de name, role e createdAt do utilizador */}
                  <td>{show(u.name || u.nome)}</td>
                  <td>{show(u.role || u.perfil)}</td>
                  <td>{show(u.email)}</td>
                  <td>{fmt(u.createdAt || u.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="admin-hint">Nenhum usuário vinculado a esta escola.</p>
      )}
    </AdminModal>
  )
}