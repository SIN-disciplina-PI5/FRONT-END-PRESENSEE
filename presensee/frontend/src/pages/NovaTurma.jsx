import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import "../painel-administrativo/styles/admin.css";

const ANOS = [
  { valor: "1", rotulo: "1º Ano" },
  { valor: "2", rotulo: "2º Ano" },
  { valor: "3", rotulo: "3º Ano" },
];

const LETRAS = ["A", "B", "C", "D", "E"];

export default function NovaTurma() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [anoSelecionado, setAnoSelecionado] = useState("1");
  const [letraSelecionada, setLetraSelecionada] = useState("A");
  const [dados, setDados] = useState({
    curso: "Ensino Médio",
    turno: "Manhã",
  });

  const nomeTurmaGerado = `${anoSelecionado}º Ano ${letraSelecionada}`;

  function atualizarCampo(event) {
    setDados({ ...dados, [event.target.name]: event.target.value });
    setErro("");
  }

  async function submeterFormulario(event) {
    event.preventDefault();
    setErro("");

    if (!anoSelecionado || !letraSelecionada) {
      setErro("Selecione o ano e a letra da turma para continuar.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: nomeTurmaGerado,
        course: dados.curso,
        shift: dados.turno,
        year: new Date().getFullYear(),
      };

      await api.post("/classes", payload);
      navigate("/turmas");
    } catch (error) {
      console.error("Erro ao cadastrar turma:", error);
      const msgApi = error.response?.data?.error || "Falha ao criar a turma. Verifique se ela já existe ou tente novamente.";
      setErro(msgApi);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="admin-page" style={{ padding: "2rem" }}>
        <div className="admin-heading">
          <div>
            <h1>Cadastrar Nova Turma</h1>
            <p>Selecione o ano, a turma, o curso e o turno para vincular os estudantes.</p>
          </div>
        </div>

        <form onSubmit={submeterFormulario} className="admin-panel admin-form">
          <h3>Detalhes da Turma</h3>

          {/* SELETOR TOGGLE LIST: ANO E LETRA */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginBottom: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600 }}>Ano / Série *</span>
              <div
                role="radiogroup"
                aria-label="Selecionar ano da turma"
                style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}
              >
                {ANOS.map((ano) => {
                  const ativo = anoSelecionado === ano.valor;
                  return (
                    <button
                      key={ano.valor}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      disabled={loading}
                      onClick={() => {
                        setAnoSelecionado(ano.valor);
                        setErro("");
                      }}
                      style={{
                        padding: "10px 20px",
                        borderRadius: "10px",
                        border: ativo ? "2px solid #633df2" : "1.5px solid #cbd5e1",
                        backgroundColor: ativo ? "#633df2" : "#ffffff",
                        color: ativo ? "#ffffff" : "#334155",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: ativo ? "0 4px 12px rgba(99, 61, 242, 0.25)" : "none",
                      }}
                    >
                      {ano.rotulo}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600 }}>Turma *</span>
              <div
                role="radiogroup"
                aria-label="Selecionar letra da turma"
                style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}
              >
                {LETRAS.map((letra) => {
                  const ativo = letraSelecionada === letra;
                  return (
                    <button
                      key={letra}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      disabled={loading}
                      onClick={() => {
                        setLetraSelecionada(letra);
                        setErro("");
                      }}
                      style={{
                        width: "46px",
                        height: "44px",
                        borderRadius: "10px",
                        border: ativo ? "2px solid #633df2" : "1.5px solid #cbd5e1",
                        backgroundColor: ativo ? "#633df2" : "#ffffff",
                        color: ativo ? "#ffffff" : "#334155",
                        fontWeight: 700,
                        fontSize: "15px",
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: ativo ? "0 4px 12px rgba(99, 61, 242, 0.25)" : "none",
                      }}
                    >
                      {letra}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PRÉ-VISUALIZAÇÃO DA TURMA SELECIONADA */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "10px",
                backgroundColor: "#f5f3ff",
                border: "1px solid #ddd6fe",
                color: "#5b21b6",
                fontSize: "14px",
                width: "fit-content",
              }}
            >
              <span>Turma selecionada:</span>
              <strong>{nomeTurmaGerado}</strong>
            </div>
          </div>

          <div className="admin-form-grid">
            <label>
              Curso *
              <select name="curso" value={dados.curso} onChange={atualizarCampo} disabled={loading}>
                <option value="Ensino Médio">Ensino Médio</option>
                <option value="Ensino Fundamental">Ensino Fundamental</option>
                <option value="Técnico">Ensino Técnico</option>
              </select>
            </label>

            <label>
              Turno *
              <select name="turno" value={dados.turno} onChange={atualizarCampo} disabled={loading}>
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
                <option value="Integral">Integral</option>
              </select>
            </label>
          </div>

          {erro && (
            <p
              role="alert"
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "#fee2e2",
                color: "#b91c1c",
                fontSize: "14px",
              }}
            >
              {erro}
            </p>
          )}

          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn secondary"
              onClick={() => navigate("/turmas")}
              disabled={loading}
            >
              Cancelar
            </button>
            <button className="admin-btn" type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Turma"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}