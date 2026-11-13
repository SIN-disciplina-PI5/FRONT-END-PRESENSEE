import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import "../styles/NovoAluno.css";

function NovoAluno() {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState({
    nome: "",
    matricula: "",
    turmaId: "",
    email: "",
    dataNascimento: "",
    responsavelNome: "",
    responsavelTelefone: ""
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
        guardianPhone: dados.responsavelTelefone.trim() || undefined
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
              "Content-Type": "multipart/form-data"
            }
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "520px", marginBottom: "0.5rem" }}>
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
          <div style={{ maxWidth: "520px", padding: "12px 16px", marginBottom: "1rem", borderRadius: "8px", background: "#fee2e2", color: "#b91c1c", fontSize: "14px" }}>
            {erro}
          </div>
        )}

        <form className="student-form" onSubmit={submeterFormulario} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "520px" }}>
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

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600 }}>Turma *</label>
            <select
              name="turmaId"
              value={dados.turmaId}
              onChange={atualizarCampo}
              required
              disabled={loading}
              style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ccc" }}
            >
              <option value="">Selecione a Turma *</option>
              {turmas.map((turma) => (
                <option key={turma.id || turma._id} value={turma.id || turma._id}>
                  {turma.nome || turma.name}
                </option>
              ))}
            </select>
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
              cursor: loading ? "not-allowed" : "pointer"
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