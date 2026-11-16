import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import "../styles/Turmas.css";

function Turmas() {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);

  const [turmaEditando, setTurmaEditando] = useState(null);
  const [formEdicao, setFormEdicao] = useState({ nome: "", curso: "", turno: "Manhã" });
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState("");

  async function carregarTurmas() {
    setLoading(true);
    try {
      const response = await api.get("/classes");

      const turmasFormatadas = response.data.map((turma) => ({
        id: turma.id || turma._id,
        nome: turma.name || turma.nome || "Sem Nome",
        curso: turma.course || turma.curso || "Ensino Médio",
        alunos: turma._count?.students || turma.students?.length || turma.alunos || 0,
        turno: turma.shift || turma.turno || "Manhã",
        frequencia: turma.attendanceRate || turma.frequencia || 100,
        atencao: turma.attentionStudents || turma.atencao || 0,
        altoRisco: turma.highRiskStudents || turma.altoRisco || 0,
      }));

      setTurmas(turmasFormatadas);
    } catch (error) {
      console.error("Erro ao buscar turmas:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarTurmas();
  }, []);

  function abrirTurma(turma) {
    setTurmaSelecionada(turma);
  }

  function fecharTurma() {
    setTurmaSelecionada(null);
  }

  function abrirEdicao(turma, e) {
    if (e) e.stopPropagation();
    setTurmaSelecionada(null);
    setErroEdicao("");
    setTurmaEditando(turma);
    setFormEdicao({
      nome: turma.nome,
      curso: turma.curso,
      turno: turma.turno,
    });
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    if (!turmaEditando) return;
    setErroEdicao("");
    setSalvandoEdicao(true);

    try {
      await api.patch(`/classes/${turmaEditando.id}`, {
        name: formEdicao.nome.trim(),
        course: formEdicao.curso.trim(),
        shift: formEdicao.turno,
      });
      setTurmaEditando(null);
      await carregarTurmas();
    } catch (error) {
      setErroEdicao(error.response?.data?.error || "Não foi possível atualizar a turma.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function excluirTurma(turma, e) {
    if (e) e.stopPropagation();
    const confirmar = window.confirm(
      `Deseja realmente excluir a turma "${turma.nome}" (${turma.curso})?`
    );
    if (!confirmar) return;

    try {
      await api.delete(`/classes/${turma.id}`);
      if (turmaSelecionada?.id === turma.id) setTurmaSelecionada(null);
      await carregarTurmas();
    } catch (error) {
      alert(error.response?.data?.error || "Não foi possível excluir a turma.");
    }
  }

  return (
    <DashboardLayout>
      <div className="turmas-page">
        <div className="turmas-header">
          <div>
            <h1>Turmas</h1>
            <p>Consulte, edite e acompanhe os indicadores de todas as turmas.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span className="turmas-total">{turmas.length} turmas cadastradas</span>
            <button
              className="admin-btn"
              onClick={() => navigate("/turmas/nova")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: "#633df2",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              + Nova Turma
            </button>
          </div>
        </div>

        <div className="turmas-tabela-container">
          <table className="classes-table">
            <thead>
              <tr>
                <th>Turma</th>
                <th>Curso / Modalidade</th>
                <th>Alunos</th>
                <th>Turno</th>
                <th>Frequência</th>
                <th>Em atenção</th>
                <th>Alto risco</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "20px" }}>
                    Carregando turmas...
                  </td>
                </tr>
              ) : turmas.length > 0 ? (
                turmas.map((turma) => (
                  <tr
                    key={turma.id || turma.nome}
                    onClick={() => abrirTurma(turma)}
                    className="turma-row"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        abrirTurma(turma);
                      }
                    }}
                    aria-label={`Ver detalhes da turma ${turma.nome}`}
                  >
                    <td className="turma-nome">{turma.nome}</td>
                    <td>{turma.curso}</td>
                    <td>{turma.alunos}</td>
                    <td>{turma.turno}</td>
                    <td>
                      <div className="turma-frequencia">
                        <span>{turma.frequencia}%</span>
                        <div className="turma-frequencia-barra">
                          <div
                            className={`turma-frequencia-preenchimento ${
                              turma.frequencia < 75
                                ? "frequencia-baixa"
                                : turma.frequencia < 90
                                ? "frequencia-media"
                                : "frequencia-alta"
                            }`}
                            style={{ width: `${turma.frequencia}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="turma-indicador atencao">{turma.atencao}</span>
                    </td>
                    <td>
                      <span className="turma-indicador alto-risco">{turma.altoRisco}</span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={(e) => abrirEdicao(turma, e)}
                          title="Editar turma"
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => excluirTurma(turma, e)}
                          title="Excluir turma"
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                            color: "#b91c1c",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "20px" }}>
                    Nenhuma turma cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL DE DETALHES DA TURMA */}
        {turmaSelecionada && (
          <div className="student-modal-overlay" onClick={fecharTurma}>
            <div
              className="student-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="turma-modal-titulo"
            >
              <button className="student-modal-close" onClick={fecharTurma} aria-label="Fechar detalhes da turma">
                ×
              </button>
              <div className="student-modal-header">
                <div>
                  <h2 id="turma-modal-titulo">{turmaSelecionada.nome}</h2>
                  <span>
                    {turmaSelecionada.curso} · {turmaSelecionada.turno}
                  </span>
                </div>
              </div>
              <div className="student-modal-stats">
                <div>
                  <strong>{turmaSelecionada.alunos}</strong>
                  <span>Alunos</span>
                </div>
                <div>
                  <strong>{turmaSelecionada.frequencia}%</strong>
                  <span>Frequência média</span>
                </div>
                <div>
                  <strong>{turmaSelecionada.atencao}</strong>
                  <span>Em atenção</span>
                </div>
                <div>
                  <strong>{turmaSelecionada.altoRisco}</strong>
                  <span>Alto risco</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button
                  className="turma-alunos-button"
                  style={{ flex: 1 }}
                  onClick={() => navigate("/alunos", { state: { turmaId: turmaSelecionada.id, turma: turmaSelecionada.nome } })}
                >
                  Ver alunos da turma
                </button>
                <button
                  type="button"
                  onClick={() => abrirEdicao(turmaSelecionada)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE EDIÇÃO DA TURMA */}
        {turmaEditando && (
          <div className="student-modal-overlay" onClick={() => setTurmaEditando(null)}>
            <div
              className="student-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Editar turma"
            >
              <button
                className="student-modal-close"
                onClick={() => setTurmaEditando(null)}
                aria-label="Fechar edição"
              >
                ×
              </button>
              <h2 style={{ marginTop: 0 }}>Editar Turma</h2>
              <form onSubmit={salvarEdicao} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "14px", fontWeight: 600 }}>
                  Nome da Turma *
                  <input
                    type="text"
                    value={formEdicao.nome}
                    onChange={(e) => setFormEdicao({ ...formEdicao, nome: e.target.value })}
                    required
                    style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "14px", fontWeight: 600 }}>
                  Curso / Modalidade *
                  <input
                    type="text"
                    list="edit-cursos-list"
                    value={formEdicao.curso}
                    onChange={(e) => setFormEdicao({ ...formEdicao, curso: e.target.value })}
                    required
                    style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                  <datalist id="edit-cursos-list">
                    <option value="Ensino Fundamental" />
                    <option value="Ensino Médio" />
                    <option value="Técnico em Informática" />
                    <option value="Técnico em Enfermagem" />
                    <option value="Técnico em Administração" />
                  </datalist>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "14px", fontWeight: 600 }}>
                  Turno *
                  <select
                    value={formEdicao.turno}
                    onChange={(e) => setFormEdicao({ ...formEdicao, turno: e.target.value })}
                    style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                    <option value="Integral">Integral</option>
                  </select>
                </label>

                {erroEdicao && (
                  <p style={{ color: "#b91c1c", background: "#fee2e2", padding: "8px 12px", borderRadius: "6px", fontSize: "13px", margin: 0 }}>
                    {erroEdicao}
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setTurmaEditando(null)}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvandoEdicao}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "#633df2", color: "#fff", fontWeight: 600, cursor: "pointer" }}
                  >
                    {salvandoEdicao ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Turmas;