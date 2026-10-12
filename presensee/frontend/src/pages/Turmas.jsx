import DashboardLayout from "../layouts/DashboardLayout";
import "../styles/Turmas.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Turmas() {
  const navigate = useNavigate();
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);

  function abrirTurma(turma) {
    setTurmaSelecionada(turma);
  }

  function fecharTurma() {
    setTurmaSelecionada(null);
  }

  const turmas = [
    {
      nome: "1º Ano A",
      curso: "Ensino Médio",
      alunos: 35,
      turno: "Manhã",
      frequencia: 91,
      atencao: 3,
      altoRisco: 1,
    },
    {
      nome: "2º Ano B",
      curso: "Ensino Médio",
      alunos: 32,
      turno: "Tarde",
      frequencia: 84,
      atencao: 5,
      altoRisco: 2,
    },
    {
      nome: "3º Ano A",
      curso: "Ensino Médio",
      alunos: 30,
      turno: "Manhã",
      frequencia: 78,
      atencao: 6,
      altoRisco: 4,
    },
  ];

  return (
    <DashboardLayout>
      <div className="turmas-page">
        <div className="turmas-header">
          <div>
            <h1>Turmas</h1>
            <p>Consulte as turmas e acompanhe seus indicadores.</p>
          </div>

          <span className="turmas-total">
            {turmas.length} turmas cadastradas
          </span>
        </div>

        <div className="turmas-tabela-container">
          <table className="classes-table">
            <thead>
              <tr>
                <th>Turma</th>
                <th>Curso</th>
                <th>Alunos</th>
                <th>Turno</th>
                <th>Frequência</th>
                <th>Em atenção</th>
                <th>Alto risco</th>
              </tr>
            </thead>

            <tbody>
              {turmas.map((turma) => (
                <tr
                  key={turma.nome}
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
                            turma.frequencia < 80
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
                    <span className="turma-indicador atencao">
                      {turma.atencao}
                    </span>
                  </td>

                  <td>
                    <span className="turma-indicador alto-risco">
                      {turma.altoRisco}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {turmaSelecionada && (
          <div
            className="student-modal-overlay"
            onClick={fecharTurma}
          >
            <div
              className="student-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="turma-modal-titulo"
            >
              <button
                className="student-modal-close"
                onClick={fecharTurma}
                aria-label="Fechar detalhes da turma"
              >
                ×
              </button>

              <div className="student-modal-header">
                <div>
                  <h2 id="turma-modal-titulo">
                    {turmaSelecionada.nome}
                  </h2>

                  <span>
                    {turmaSelecionada.curso} • {turmaSelecionada.turno}
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

              <button
                className="turma-alunos-button"
                onClick={() =>
                  navigate("/alunos", {
                    state: { turma: turmaSelecionada.nome },
                  })
                }
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