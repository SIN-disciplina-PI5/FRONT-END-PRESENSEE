import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import "../styles/NovoAluno.css";

function NovoAluno() {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState([]);
  const [filtroTurma, setFiltroTurma] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState({
    nome: "",
    matricula: "",
    turmaId: "",
    email: "",
    dataNascimento: "",
    responsavelNome: "",
    responsavelTelefone: "",
  });
  const [foto, setFoto] = useState(null);

  useEffect(() => {
    async function carregarTurmas() {
      try {
        const response = await api.get("/classes");
        setTurmas(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Erro ao carregar turmas:", error);
      }
    }
    carregarTurmas();
  }, []);

  function atualizarCampo(event) {
    setDados({ ...dados, [event.target.name]: event.target.value });
  }

  function atualizarFoto(event) {
    if (event.target.files && event.target.files[0]) {
      setFoto(event.target.files[0]);
    }
  }

  const turmasFiltradas = turmas.filter((t) => {
    const texto = `${t.name || t.nome} ${t.course || t.curso || ""} ${t.shift || t.turno || ""}`.toLowerCase();
    return texto.includes(filtroTurma.trim().toLowerCase());
  });

  async function submeterFormulario(event) {
    event.preventDefault();
    setErro("");

    if (!dados.nome.trim() || !dados.matricula.trim() || !dados.turmaId) {
      setErro("Preencha os campos obrigatórios: Nome completo, Matrícula e Turma.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: dados.nome.trim(),
        registration: dados.matricula.trim(),
        classId: dados.turmaId,
        email: dados.email.trim() || undefined,
        birthDate: dados.dataNascimento ? new Date(dados.dataNascimento).toISOString() : undefined,
        guardianName: dados.responsavelNome.trim() || undefined,
        guardianPhone: dados.responsavelTelefone.trim() || undefined,
      };

      const response = await api.post("/students", payload);
      const alunoCriado = response.data;
      const alunoId = alunoCriado.id || alunoCriado._id;

      if (foto && alunoId) {
        try {
          const formData = new FormData();
          formData.append("photo", foto);

          await api.patch(`/students/${alunoId}/biometry`, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
        } catch (photoError) {
          console.error("Aluno criado, mas falha ao enviar foto:", photoError);
          alert("Aluno cadastrado, mas houve um erro ao enviar a foto facial. Você pode anexá-la depois.");
        }
      }

      navigate("/alunos");
    } catch (error) {
      console.error("Erro ao salvar aluno:", error);
      const msgApi = error.response?.data?.error || "Falha ao cadastrar o aluno. Verifique os dados informados.";
      setErro(msgApi);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div style={{ padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "640px", marginBottom: "0.5rem" }}>
          <h1 style={{ margin: 0 }}>Cadastrar Aluno</h1>
          <button
            type="button"
            onClick={() => navigate("/alunos")}
            style={{ background: "transparent", border: "none", color: "#633df2", fontWeight: 600, cursor: "pointer" }}
          >
            ← Voltar
          </button>
        </div>
        <p style={{ marginBottom: "1.5rem", color: "#666" }}>
          Os campos marcados com <strong>*</strong> são obrigatórios. Os demais são opcionais e podem ser preenchidos depois.
        </p>

        {erro && (
          <div style={{ maxWidth: "640px", padding: "12px 16px", marginBottom: "1rem", borderRadius: "8px", background: "#fee2e2", color: "#b91c1c", fontSize: "14px" }}>
            {erro}
          </div>
        )}

        <form className="student-form" onSubmit={submeterFormulario} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "640px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600 }}>Nome completo *</label>
            <input
              type="text"
              name="nome"
              placeholder="Ex: Ana Beatriz Silva"
              value={dados.nome}
              onChange={atualizarCampo}
              required
              disabled={loading}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600 }}>Matrícula *</label>
            <input
              type="text"
              name="matricula"
              placeholder="Ex: 20260015"
              value={dados.matricula}
              onChange={atualizarCampo}
              required
              disabled={loading}
            />
          </div>

          {/* TOGGLE LIST PADRONIZADO DE TURMAS (IGUAL À CRIAÇÃO DE TURMAS) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: 600 }}>Turma *</span>
              {turmas.length > 6 && (
                <input
                  type="text"
                  value={filtroTurma}
                  onChange={(e) => setFiltroTurma(e.target.value)}
                  placeholder="Filtrar turma..."
                  style={{ padding: "5px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />
              )}
            </div>

            <div
              role="radiogroup"
              aria-label="Selecionar turma do aluno"
              style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}
            >
              {turmasFiltradas.map((turma) => {
                const id = turma.id || turma._id;
                const ativo = String(dados.turmaId) === String(id);
                const nome = turma.name || turma.nome;
                const curso = turma.course || turma.curso || "Ensino Médio";
                const turno = turma.shift || turma.turno || "";

                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    disabled={loading}
                    onClick={() => {
                      setDados({ ...dados, turmaId: id });
                      setErro("");
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: ativo ? "2px solid #633df2" : "1.5px solid #cbd5e1",
                      backgroundColor: ativo ? "#633df2" : "#ffffff",
                      color: ativo ? "#ffffff" : "#1e293b",
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: ativo ? "0 4px 12px rgba(99, 61, 242, 0.25)" : "none",
                    }}
                  >
                    <strong style={{ fontSize: "14px" }}>{nome}</strong>
                    <span style={{ fontSize: "11px", opacity: ativo ? 0.9 : 0.7 }}>
                      {curso}{turno ? ` · ${turno}` : ""}
                    </span>
                  </button>
                );
              })}

              {turmasFiltradas.length === 0 && (
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Nenhuma turma encontrada. Cadastre uma turma primeiro.
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "14px", color: "#555" }}>E-mail do estudante (Opcional)</label>
            <input
              type="email"
              name="email"
              placeholder="aluno@escola.com"
              value={dados.email}
              onChange={atualizarCampo}
              disabled={loading}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "14px", color: "#555" }}>Data de Nascimento (Opcional)</label>
            <input
              type="date"
              name="dataNascimento"
              value={dados.dataNascimento}
              onChange={atualizarCampo}
              disabled={loading}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "14px", color: "#555" }}>Nome do Responsável (Opcional)</label>
              <input
                type="text"
                name="responsavelNome"
                placeholder="Nome do responsável"
                value={dados.responsavelNome}
                onChange={atualizarCampo}
                disabled={loading}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "14px", color: "#555" }}>Telefone do Responsável (Opcional)</label>
              <input
                type="tel"
                name="responsavelTelefone"
                placeholder="(81) 99999-9999"
                value={dados.responsavelTelefone}
                onChange={atualizarCampo}
                disabled={loading}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "14px", color: "#555" }}>Foto para Reconhecimento Facial (Opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={atualizarFoto}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "1rem",
              padding: "12px",
              background: "#633df2",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Salvando..." : "Salvar Aluno"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default NovoAluno;