import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import "../styles/NovoAluno.css";

function NovoAluno() {
  const navigate = useNavigate();
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState({
    nome: "",
    matricula: "",
    turmaId: "",
    email: "",
    dataNascimento: ""
  });
  const [foto, setFoto] = useState(null);

  useEffect(() => {
    async function carregarTurmas() {
      try {
        const response = await api.get("/turmas"); // Ajuste para "/classes" se a rota for em inglês
        setTurmas(response.data);
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
    setLoading(true);

    try {
      // Usamos FormData para suportar o envio do arquivo (foto) para o Cloudinary
      const formData = new FormData();
      formData.append("name", dados.nome);
      formData.append("registration", dados.matricula);
      formData.append("classId", dados.turmaId);
      if (dados.email) formData.append("email", dados.email);
      if (dados.dataNascimento) formData.append("birthDate", dados.dataNascimento);
      if (foto) formData.append("photo", foto);

      // Ajuste para "/students" caso a rota do seu backend seja em inglês
      await api.post("/alunos", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      navigate("/alunos");
    } catch (error) {
      console.error("Erro ao salvar aluno:", error);
      alert("Falha ao cadastrar o aluno. Verifique o console.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div style={{ padding: "2rem" }}>
        <h1>Cadastrar Aluno</h1>
        <p style={{ marginBottom: "2rem", color: "#666" }}>
          Preencha os dados e selecione uma foto para o reconhecimento facial.
        </p>

        <form className="student-form" onSubmit={submeterFormulario} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "500px" }}>
          <input
            type="text"
            name="nome"
            placeholder="Nome completo *"
            value={dados.nome}
            onChange={atualizarCampo}
            required
            disabled={loading}
          />

          <input
            type="text"
            name="matricula"
            placeholder="Matrícula *"
            value={dados.matricula}
            onChange={atualizarCampo}
            required
            disabled={loading}
          />

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
              <option key={turma.id} value={turma.id}>
                {turma.nome || turma.name}
              </option>
            ))}
          </select>

          <input
            type="email"
            name="email"
            placeholder="Email (Opcional)"
            value={dados.email}
            onChange={atualizarCampo}
            disabled={loading}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "14px", color: "#555" }}>Data de Nascimento</label>
            <input
              type="date"
              name="dataNascimento"
              value={dados.dataNascimento}
              onChange={atualizarCampo}
              disabled={loading}
            />
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