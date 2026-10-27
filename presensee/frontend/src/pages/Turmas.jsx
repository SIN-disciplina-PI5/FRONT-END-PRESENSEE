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

  useEffect(() => {
    async function carregarTurmas() {
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
          altoRisco: turma.highRiskStudents || turma.altoRisco || 0
        }));
        
        setTurmas(turmasFormatadas);
      } catch (error) {
        console.error("Erro ao buscar turmas:", error);
      } finally {
        setLoading(false);
      }
    }

    carregarTurmas();
  }, []);

  function abrirTurma(turma) {
    setTurmaSelecionada(turma);
  }

  function fecharTurma() {
    setTurmaSelecionada(null);
  }

  return (
    <DashboardLayout>
      <div className="turmas-page">
        <div className="turmas-header">
          <div>
            <h1>Turmas</h1>
            <p>Consulte as turmas e acompanhe seus indicadores.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="turmas-total">{turmas.length} turmas cadastradas</span>
            <button 
              className="admin-btn" 
              onClick={() => navigate("/turmas/nova")}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#633df2', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
            >
              + Nova Turma
            </button>
          </div>
        </div>
        
        <div className="turmas-tabela-container">
          <table className="classes-table">
            <thead>
              <tr>
                <th>Turma</th><th>Curso</th><th>Alunos</th><th>Turno</th>
                <th>Frequência</th><th>Em atenção</th><th>Alto risco</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Carregando turmas...</td></tr>
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
                                : turma.frequencia < 90 ? "frequencia-media" : "frequencia-alta"
                            }`}
                            style={{ width: `${turma.frequencia}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td><span className="turma-indicador atencao">{turma.atencao}</span></td>
                    <td><span className="turma-indicador alto-risco">{turma.altoRisco}</span></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Nenhuma turma cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        {turmaSelecionada && (
          <div className="student-modal-overlay" onClick={fecharTurma}>
            <div
              className="student-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="turma-modal-titulo"
            >
              <button className="student-modal-close" onClick={fecharTurma} aria-label="Fechar detalhes da turma">×</button>
              <div className="student-modal-header">
                <div>
                  <h2 id="turma-modal-titulo">{turmaSelecionada.nome}</h2>
                  <span>{turmaSelecionada.curso} · {turmaSelecionada.turno}</span>
                </div>
              </div>
              <div className="student-modal-stats">
                <div><strong>{turmaSelecionada.alunos}</strong><span>Alunos</span></div>
                <div><strong>{turmaSelecionada.frequencia}%</strong><span>Frequência média</span></div>
                <div><strong>{turmaSelecionada.atencao}</strong><span>Em atenção</span></div>
                <div><strong>{turmaSelecionada.altoRisco}</strong><span>Alto risco</span></div>
              </div>
              <button
                className="turma-alunos-button"
                onClick={() => navigate("/alunos", { state: { turma: turmaSelecionada.nome } })}
              >
                Ver alunos da turma
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Turmas;