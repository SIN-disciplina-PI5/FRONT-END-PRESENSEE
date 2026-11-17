
import DashboardLayout from "../layouts/DashboardLayout";
import { useGraficos } from "../context/GraficosContext";
import "../styles/Personalizado.css";
import GraficoRenderer from "../components/GraficoRenderer";

const TAMANHOS = [
  { valor: "pequeno", rotulo: "P", nome: "Pequeno" },
  { valor: "medio", rotulo: "M", nome: "Médio" },
  { valor: "grande", rotulo: "G", nome: "Grande" },
];

const ALTURAS = {
  pequeno: 180,
  medio: 250,
  grande: 340,
};

export default function Personalizado() {
  const {
    graficos,
    removerGrafico,
    alterarTamanhoGrafico,
  } = useGraficos();

  return (
    <DashboardLayout>
      <div className="pers-page">
        <header className="pers-header">
          <h1>Personalizado</h1>
          <p>
            Gráficos criados com o assistente de IA aparecem aqui.
          </p>
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
            {graficos.map((g) => {
              const tamanho = g.tamanho || "pequeno";

              return (
                <article
                  key={g.id}
                  className={`pers-card pers-${tamanho}`}
                >
                  <button
                    type="button"
                    className="pers-remover"
                    onClick={() => removerGrafico(g.id)}
                    aria-label={`Remover gráfico ${g.titulo}`}
                  >
                    ×
                  </button>

                  <h3>{g.titulo}</h3>

                  {g.subtitulo && (
                    <p className="pers-sub">{g.subtitulo}</p>
                  )}

                  <div className="pers-controles">
                    <span>Tamanho:</span>

                    <div
                      className="pers-tamanhos"
                      role="group"
                      aria-label={`Tamanho do gráfico ${g.titulo}`}
                    >
                      {TAMANHOS.map((opcao) => (
                        <button
                          key={opcao.valor}
                          type="button"
                          className={`pers-tamanho ${
                            tamanho === opcao.valor ? "ativo" : ""
                          }`}
                          onClick={() =>
                            alterarTamanhoGrafico(g.id, opcao.valor)
                          }
                          aria-label={`${opcao.nome}`}
                          aria-pressed={tamanho === opcao.valor}
                          title={opcao.nome}
                        >
                          {opcao.rotulo}
                        </button>
                      ))}
                    </div>
                  </div>

                  <GraficoRenderer
                    grafico={g}
                    altura={ALTURAS[tamanho] || ALTURAS.pequeno}
                  />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
