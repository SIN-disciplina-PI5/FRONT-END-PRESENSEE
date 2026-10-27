import { useEffect } from "react";

// Função local para formatar datas, substituindo a do mock
const formatarData = (data) => {
  if (!data) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(data)) {
    return `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
  }
  return data;
};

function AlunoModal({ aluno, onClose }) {
  // Fecha o modal ao apertar Esc
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onClose]);

  if (!aluno) return null;

  // Garantia de arrays para evitar quebra se a API não enviar os campos
  const responsaveis = aluno.responsaveis || [];
  const historicoFaltas = aluno.historicoFaltas || [];
  const totalFaltas = aluno.faltas ?? historicoFaltas.length ?? 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="aluno-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aluno-modal-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="aluno-modal-fechar"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>

        <h2 id="aluno-modal-titulo">
          {aluno.nomeCompleto || aluno.nome || aluno.name || "Aluno"}
        </h2>

        <p className="aluno-modal-sub">
          {aluno.turma || aluno.class || "Turma não informada"} · Matrícula {aluno.matricula || aluno.id || aluno._id || "S/N"}
        </p>

        <section>
          <h3>Responsáveis</h3>
          {responsaveis.length > 0 ? (
            <ul className="aluno-modal-lista">
              {responsaveis.map((resp, index) => (
                <li key={index}>
                  <span>
                    <strong>{resp.nome || "Não informado"}</strong> {resp.parentesco ? `(${resp.parentesco})` : ""}
                  </span>
                  <small>{resp.telefone || "Sem contato"}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="diario-vazio">Nenhum responsável cadastrado.</p>
          )}
        </section>

        <section>
          <h3>
            Histórico de faltas
            <small>{totalFaltas} no total</small>
          </h3>
          {historicoFaltas.length > 0 ? (
            <ul className="aluno-modal-lista">
              {historicoFaltas.map((falta, index) => (
                <li key={index}>
                  <span>{formatarData(falta.data)}</span>
                  <small className={falta.justificada ? "justificada" : "sem-justificativa"}>
                    {falta.justificada ? "Justificada" : "Sem justificativa"}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="diario-vazio">Nenhuma falta registrada.</p>
          )}
        </section>

        <section>
          <h3>Observações</h3>
          <p>
            {aluno.observacoes || "Nenhuma observação registrada."}
          </p>
        </section>

        <section className="aluno-modal-resultados">
          <div>
            <h3>Resultado esperado</h3>
            <p>{aluno.resultadoEsperado || "Não definido"}</p>
          </div>
          <div>
            <h3>Resultado obtido</h3>
            <p>{aluno.resultadoObtido || "Não definido"}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AlunoModal;