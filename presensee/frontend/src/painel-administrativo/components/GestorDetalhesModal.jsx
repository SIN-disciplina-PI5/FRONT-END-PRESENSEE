import AdminModal from "./AdminModal";

const show = (value) => (value === null || value === undefined || value === "" ? "Não informado" : value);

export default function GestorDetalhesModal({ gestor, onClose }) {
  if (!gestor) return null;

  const nomeExibicao = gestor.nome || gestor.name;
  const dataInicio = gestor.createdAt || gestor.criadoEm;
  const dataValida = dataInicio && !Number.isNaN(new Date(dataInicio).getTime());
  const perfilFormatado = gestor.role === "MANAGER" ? "Gestor Escolar" : show(gestor.role);

  return (
    <AdminModal title="Informações do gestor" onClose={onClose}>
      <div className="admin-manager-hero">
        <div className="admin-manager-avatar">
          {nomeExibicao?.charAt(0)?.toUpperCase() || "G"}
        </div>
        <div>
          <h3>{show(nomeExibicao)}</h3>
          <p>Gestor escolar • {show(gestor.escolaNome)}</p>
        </div>
      </div>
      <dl className="admin-detail-grid">
        <div><dt>Instituição vinculada</dt><dd>{show(gestor.escolaNome)}</dd></div>
        <div><dt>Perfil de Acesso</dt><dd>{perfilFormatado}</dd></div>
        <div><dt>E-mail</dt><dd>{show(gestor.email)}</dd></div>
        <div><dt>Telefone</dt><dd>{show(gestor.telefone)}</dd></div>
        <div>
          <dt>Início no PresenSee</dt>
          <dd>{dataValida ? new Date(dataInicio).toLocaleDateString("pt-BR") : "Não informado"}</dd>
        </div>
        <div><dt>Status de Acesso</dt><dd>{show(gestor.status || "Pendente")}</dd></div>
      </dl>
      <p style={{ marginTop: "16px", fontSize: "12px", color: "#64748b" }}>
        * Este gestor está vinculado à instituição acima. Para remover o acesso definitivamente, exclua a escola correspondente na aba <strong>Escolas</strong>.
      </p>
    </AdminModal>
  );
}