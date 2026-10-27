import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import "../painel-administrativo/styles/admin.css";

export default function NovaTurma() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState({
    nome: "",
    curso: "Ensino Médio",
    turno: "Manhã"
  });

  function atualizarCampo(event) {
    setDados({ ...dados, [event.target.name]: event.target.value });
  }

  async function submeterFormulario(event) {
    event.preventDefault();
    setLoading(true);
    
    try {
      // Mapeamento do payload com o campo 'year' exigido pelo Prisma no back-end
      const payload = {
        name: dados.nome,
        course: dados.curso,
        shift: dados.turno,
        year: new Date().getFullYear() 
      };

      await api.post("/classes", payload);
      navigate("/turmas");
    } catch (error) {
      console.error("Erro ao cadastrar turma:", error);
      alert("Falha ao criar a turma. Verifique o console para mais detalhes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="admin-page" style={{ padding: '2rem' }}>
        <div className="admin-heading">
          <div>
            <h1>Cadastrar Nova Turma</h1>
            <p>Adicione uma nova turma à sua escola para poder vincular alunos a ela.</p>
          </div>
        </div>
        
        <form onSubmit={submeterFormulario} className="admin-panel admin-form">
          <h3>Detalhes da Turma</h3>
          <div className="admin-form-grid">
            <label>
              Nome da Turma *
              <input 
                type="text" 
                name="nome" 
                placeholder="Ex: 1º Ano A" 
                value={dados.nome} 
                onChange={atualizarCampo} 
                required 
                disabled={loading} 
              />
            </label>
            
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