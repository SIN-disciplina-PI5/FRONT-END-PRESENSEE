import DashboardLayout from "../layouts/DashboardLayout";
import "../styles/Relatorios.css";
import { jsPDF } from "jspdf";

// Dados demonstrativos: substituir pela API quando estiver pronta.
const resumo = [
  { titulo: "Frequência Geral", valor: "87%" },
  { titulo: "Total de Alunos", valor: "120" },
  { titulo: "Alunos em Risco", valor: "12" },
];

const turmas = [
  { turma: "1º Ano A", alunos: 35, frequencia: 92 },
  { turma: "2º Ano B", alunos: 32, frequencia: 87 },
  { turma: "3º Ano A", alunos: 30, frequencia: 78 },
];

function nivelFrequencia(valor) {
  if (valor >= 90) return "ok";
  if (valor >= 80) return "atencao";
  return "risco";
}

function Relatorios() {
  function handleGerarExcel() {
    const linhas = [
      ["Relatório de Frequência - PresenSee"],
      ["Gerado em", new Date().toLocaleString("pt-BR")],
      [],
      ["Resumo"],
      ...resumo.map((item) => [item.titulo, item.valor]),
      [],
      ["Frequência por Turma"],
      ["Turma", "Alunos", "Frequência"],
      ...turmas.map((item) => [
        item.turma,
        item.alunos,
        `${item.frequencia}%`,
      ]),
    ];

    // Protege campos com ponto e vírgula, aspas ou quebras de linha.
    const csv = linhas
      .map((linha) =>
        linha
          .map((valor) => {
            const texto = String(valor ?? "");
            return `"${texto.replace(/"/g, '""')}"`;
          })
          .join(";")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "relatorio-frequencia.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleGerarPDF() {
    const doc = new jsPDF();
    const margem = 15;
    let y = 20;

    // A fonte padrão do PDF tem suporte limitado a caracteres acentuados.
    // Normalizamos o texto para evitar caracteres corrompidos.
    const normalizarTexto = (texto) =>
      String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    function adicionarTitulo(texto, tamanho = 16) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(tamanho);
      doc.text(normalizarTexto(texto), margem, y);
      y += tamanho * 0.6;
    }

    function adicionarTexto(texto, tamanho = 11) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(tamanho);

      const linhas = doc.splitTextToSize(
        normalizarTexto(texto),
        180
      );

      if (y + linhas.length * 6 > 280) {
        doc.addPage();
        y = 20;
      }

      doc.text(linhas, margem, y);
      y += linhas.length * 6;
    }

    adicionarTitulo("PresenSee - Relatorio de Frequencia", 16);
    y += 4;

    adicionarTexto(
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`
    );

    y += 5;
    adicionarTitulo("Resumo", 13);
    y += 3;

    resumo.forEach((item) => {
      adicionarTexto(`${item.titulo}: ${item.valor}`);
    });

    y += 6;
    adicionarTitulo("Frequencia por Turma", 13);
    y += 3;

    // Cabeçalho da tabela.
    doc.setFillColor(17, 24, 39);
    doc.rect(margem, y - 5, 180, 10, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    doc.text("Turma", margem + 3, y + 1);
    doc.text("Alunos", margem + 75, y + 1);
    doc.text("Frequencia", margem + 125, y + 1);

    y += 13;

    // Linhas da tabela.
    turmas.forEach((item, index) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(245, 243, 250);
        doc.rect(margem, y - 5, 180, 10, "F");
      }

      doc.setTextColor(36, 33, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(normalizarTexto(item.turma), margem + 3, y + 1);
      doc.text(String(item.alunos), margem + 75, y + 1);
      doc.text(`${item.frequencia}%`, margem + 125, y + 1);

      y += 11;
    });

    // Rodapé em todas as páginas.
    const totalPaginas = doc.getNumberOfPages();

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      doc.setPage(pagina);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);

      doc.text(
        `PresenSee - Pagina ${pagina} de ${totalPaginas}`,
        margem,
        290
      );
    }

    doc.save("relatorio-frequencia.pdf");
  }

  return (
    <DashboardLayout>
      <main className="relatorios-page">
        <div className="report-header">
          <div>
            <h1>Relatórios</h1>
        
          </div>

          <div className="report-actions">
            <button
              className="report-button report-button--excel"
              onClick={handleGerarExcel}
            >
              <span aria-hidden="true">▤</span>
              Exportar Excel
            </button>

            <button
              className="report-button report-button--pdf"
              onClick={handleGerarPDF}
            >
              <span aria-hidden="true">▧</span>
              Exportar PDF
            </button>
          </div>
        </div>

        <section className="report-cards">
          {resumo.map((item, index) => (
            <article className="report-card" key={item.titulo}>
              <div className="report-card-top">
                <h3>{item.titulo}</h3>
                <span className={`report-card-icon report-card-icon--${index}`}>
                  {index === 0 ? "%" : index === 1 ? "A" : "!"}
                </span>
              </div>

              <p>{item.valor}</p>
            </article>
          ))}
        </section>

        <section className="report-table-container">
          <div className="report-section-header">
            <div>
              <h2>Frequência por Turma</h2>
            </div>

            <span className="report-count">
              {turmas.length} turmas
            </span>
          </div>

          <div className="report-table-scroll">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Turma</th>
                  <th>Alunos</th>
                  <th>Frequência</th>
                </tr>
              </thead>

              <tbody>
                {turmas.map((item) => (
                  <tr key={item.turma}>
                    <td className="report-turma-name">
                      {item.turma}
                    </td>

                    <td>{item.alunos}</td>

                    <td>
                      <div className="report-frequency">
                        <span
                          className={`report-badge report-badge--${nivelFrequencia(
                            item.frequencia
                          )}`}
                        >
                          {item.frequencia}%
                        </span>

                        <div className="report-frequency-bar">
                          <div
                            className={`report-frequency-fill report-frequency-fill--${nivelFrequencia(
                              item.frequencia
                            )}`}
                            style={{
                              width: `${item.frequencia}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}

export default Relatorios;