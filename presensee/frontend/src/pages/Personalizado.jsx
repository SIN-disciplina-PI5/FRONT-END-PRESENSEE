import DashboardLayout from "../layouts/DashboardLayout";
import { useGraficos } from "../context/GraficosContext";
import "../styles/Personalizado.css";
import GraficoRenderer from "../components/GraficoRenderer";

export default function Personalizado() {
  const { graficos, removerGrafico } = useGraficos();

  return (
    <DashboardLayout>
      <div className="pers-page">
        <header className="pers-header">
          <h1>Personalizado</h1>
          <p>Gráficos criados com o assistente de IA aparecem aqui.</p>
        </header>

        {graficos.length === 0 ? (
          <div className="pers-vazio">
            <strong>Nenhum gráfico ainda</strong>
            <span>
              Converse com o assistente e peça um gráfico. Depois clique em
              "Adicionar no Dashboard".
            </span>
          </div>
        ) : (
          <div className="pers-grid">
            {graficos.map((g) => (
              <article key={g.id} className="pers-card">
                <button
                  type="button"
                  className="pers-remover"
                  onClick={() => removerGrafico(g.id)}
                  aria-label={`Remover gráfico ${g.titulo}`}
                >
                  ×
                </button>
                <h3>{g.titulo}</h3>
                {g.subtitulo && <p className="pers-sub">{g.subtitulo}</p>}

                {}
                
                <GraficoRenderer grafico={g} />
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}