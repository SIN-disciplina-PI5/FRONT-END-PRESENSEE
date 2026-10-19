import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import DashboardLayout from "../layouts/DashboardLayout";
import { alunos, NOMES_TURMAS, intervencoes } from "../data/diarioMock";
import "../styles/Relatorios.css";

const TIPOS = [
  { id: "frequencia", nome: "Frequência por turma" },
  { id: "risco", nome: "Risco de evasão" },
  { id: "faltas", nome: "Histórico de faltas" },
  { id: "cadastro", nome: "Cadastro de alunos" },
  { id: "acompanhamento", nome: "Acompanhamento escolar" },
  { id: "intervencoes", nome: "Histórico de intervenções" },
];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const media = (itens) => itens.length ? Math.round(itens.reduce((s, n) => s + Number(n), 0) / itens.length) : 0;
const risco = (f) => Number(f) >= 90 ? "Baixo" : Number(f) >= 75 ? "Médio" : "Alto";
const corFreq = (f) => Number(f) >= 90 ? "ok" : Number(f) >= 75 ? "atencao" : "risco";
const formatar = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "") ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : d || "—";
const limparPdf = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "-");
const textoSeguroCSV = (valor) => {
  const txt = String(valor ?? "");
  // Evita que dados textuais sejam interpretados como fórmulas em planilhas.
  const seguro = /^[\s]*[=+@-]/.test(txt) ? `'${txt}` : txt;
  return `"${seguro.replace(/"/g, '""')}"`;
};

function Icone({ tipo, size = 20 }) {
  const paths = {
    relatorio: <><path d="M4 4h10l4 4v12H4z"/><path d="M14 4v4h4M8 13h6M8 17h6"/></>,
    pessoas: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    calendario: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    chevron: <path d="m6 9 6 6 6-6"/>,
    excel: <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8l5 8M13 8l-5 8M15 8h3M15 12h3M15 16h3"/></>,
    alerta: <><path d="M12 3v11"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[tipo]}</svg>;
}

export default function Relatorios() {
  const [tipo, setTipo] = useState("frequencia");
  const [turmaFiltro, setTurmaFiltro] = useState("Todas as turmas");
  const hoje = new Date();
  const [periodo, setPeriodo] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`);
  const opcoesPeriodo = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const dia = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const chave = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}`;
    return { chave, label: `${MESES[dia.getMonth()]} de ${dia.getFullYear()}` };
  }), []);
  const descricaoPeriodo = opcoesPeriodo.find((p) => p.chave === periodo)?.label || periodo;
  const estudantes = useMemo(() => alunos.filter((a) =>
    Number.isFinite(Number(a.frequencia)) && (turmaFiltro === "Todas as turmas" || a.turma === turmaFiltro)
  ), [turmaFiltro]);
  const faltasPeriodo = useMemo(() => estudantes.flatMap((a) => (a.historicoFaltas || [])
    .filter((f) => String(f.data || "").startsWith(periodo))
    .map((f) => ({ aluno: a, ...f }))), [estudantes, periodo]);
  const intervencoesPeriodo = useMemo(() => intervencoes
    .filter((i) => String(i.data || "").startsWith(periodo))
    .filter((i) => estudantes.some((a) => a.id === i.alunoId))
    .map((i) => ({ ...i, aluno: estudantes.find((a) => a.id === i.alunoId) })), [estudantes, periodo]);
  const turmas = useMemo(() => NOMES_TURMAS
    .filter((t) => turmaFiltro === "Todas as turmas" || t === turmaFiltro)
    .map((nome) => {
      const lista = estudantes.filter((a) => a.turma === nome);
      const faltas = faltasPeriodo.filter((f) => f.aluno.turma === nome);
      const acoes = intervencoesPeriodo.filter((i) => i.aluno.turma === nome);
      return { turma: nome, alunos: lista.length, frequencia: media(lista.map((a) => a.frequencia)),
        baixo: lista.filter((a) => risco(a.frequencia) === "Baixo").length,
        medio: lista.filter((a) => risco(a.frequencia) === "Médio").length,
        alto: lista.filter((a) => risco(a.frequencia) === "Alto").length,
        faltas: faltas.length, justificadas: faltas.filter((f) => f.justificada).length,
        intervencoes: acoes.length, comPendencias: lista.filter((a) => a.pendencias?.length).length };
    }), [estudantes, faltasPeriodo, intervencoesPeriodo, turmaFiltro]);
  const resumo = [
    { titulo: "Frequência Geral", valor: `${media(estudantes.map((a) => a.frequencia))}%`, icone: "%", classe: "frequencia" },
    { titulo: "Total de Alunos", valor: estudantes.length, icone: "pessoas", classe: "alunos" },
    { titulo: "Alunos em Risco", valor: estudantes.filter((a) => Number(a.frequencia) < 90).length, icone: "alerta", classe: "risco" },
  ];
  const colunas = {
    frequencia: ["Turma", "Alunos", "Frequência"],
    risco: ["Turma", "Médio risco", "Alto risco"],
    faltas: ["Turma", "Faltas no período", "Justificadas"],
    cadastro: ["Turma", "Alunos", "Frequência"],
    acompanhamento: ["Turma", "Com pendências", "Em risco"],
    intervencoes: ["Turma", "Intervenções no período", "Alunos"],
  }[tipo];
  const linhasResumo = turmas.map((t) => {
    switch (tipo) {
      case "risco": return [t.turma, t.medio, t.alto];
      case "faltas": return [t.turma, t.faltas, t.justificadas];
      case "acompanhamento": return [t.turma, t.comPendencias, t.medio + t.alto];
      case "intervencoes": return [t.turma, t.intervencoes, t.alunos];
      default: return [t.turma, t.alunos, `${t.frequencia}%`];
    }
  });
  const titulo = TIPOS.find((t) => t.id === tipo)?.nome || "Relatório";

  // O arquivo exportado inclui todas as linhas individuais, além do resumo exibido na tela.
  function montarRelatorio() {
    const secoes = [];
    const adicionar = (nome, cabecalho, linhas) => secoes.push({ nome, cabecalho, linhas });
    adicionar("Resumo por turma", colunas, linhasResumo);
    const linhaAluno = (a) => [a.matricula, a.nomeCompleto || a.nome, a.turma, `${a.frequencia}%`, risco(a.frequencia),
      a.faltas ?? "", a.status || "", a.email || "", a.telefone || "",
      (a.responsaveis || []).map((r) => `${r.nome} (${r.parentesco}): ${r.telefone || ""}`).join(" | ")];
    const cabAluno = ["Matrícula", "Nome completo", "Turma", "Frequência atual", "Risco atual", "Total de faltas", "Situação", "E-mail", "Contato", "Responsáveis e telefones"];
    const alunosOrdenados = [...estudantes].sort((a, b) => a.turma.localeCompare(b.turma, "pt-BR", { numeric: true }) || a.nome.localeCompare(b.nome));
    adicionar("Dados individuais dos alunos (situação atual)", cabAluno, alunosOrdenados.map(linhaAluno));
    if (["frequencia", "risco", "acompanhamento", "cadastro"].includes(tipo)) {
      adicionar("Acompanhamento individual", ["Matrícula", "Aluno", "Turma", "Risco atual", "Observações", "Resultado esperado", "Resultado obtido", "Pendências"],
        alunosOrdenados.map((a) => [a.matricula, a.nomeCompleto || a.nome, a.turma, risco(a.frequencia), a.observacoes || "", a.resultadoEsperado || "", a.resultadoObtido || "", (a.pendencias || []).join(" | ")]));
    }
    if (["faltas", "frequencia", "acompanhamento"].includes(tipo)) {
      adicionar(`Faltas registradas em ${descricaoPeriodo}`, ["Data", "Matrícula", "Aluno", "Turma", "Justificada"],
        [...faltasPeriodo].sort((a, b) => b.data.localeCompare(a.data)).map((f) =>
          [formatar(f.data), f.aluno.matricula, f.aluno.nomeCompleto || f.aluno.nome, f.aluno.turma, f.justificada ? "Sim" : "Não"]));
    }
    if (["intervencoes", "acompanhamento", "risco"].includes(tipo)) {
      adicionar(`Intervenções registradas em ${descricaoPeriodo}`, ["Data", "Matrícula", "Aluno", "Turma", "Tipo", "Descrição"],
        [...intervencoesPeriodo].sort((a, b) => b.data.localeCompare(a.data)).map((i) =>
          [formatar(i.data), i.aluno.matricula, i.aluno.nomeCompleto || i.aluno.nome, i.aluno.turma, i.tipo, i.descricao || ""]));
    }
    return secoes;
  }

  function exportarExcel() {
    const secoes = montarRelatorio();
    const linhas = [
      ["PresenSee — " + titulo], ["Turma", turmaFiltro], ["Período de registros", descricaoPeriodo],
      ["Indicadores de frequência e risco", "Situação atual do mock; não são séries históricas mensais"],
      ["Gerado em", new Date().toLocaleString("pt-BR")], [],
      ...resumo.map((r) => [r.titulo, r.valor]), [],
    ];
    secoes.forEach((s) => { linhas.push([s.nome], s.cabecalho, ...(s.linhas.length ? s.linhas : [["Nenhum registro no período"]]), []); });
    const csv = linhas.map((linha) => linha.map(textoSeguroCSV).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `presensee-${tipo}-${periodo}.csv`;
    document.body.appendChild(link);
    link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportarPDF() {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const largura = 297, margem = 13, rodape = 196;
    let y = 18;
    const inicioPagina = () => {
      doc.setFillColor(96, 61, 228); doc.rect(0, 0, largura, 7, "F");
      doc.setTextColor(28, 31, 59); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
      doc.text("PresenSee - " + limparPdf(titulo), margem, 17);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(95, 100, 125);
      doc.text(limparPdf(`${turmaFiltro} | ${descricaoPeriodo} | Dados demonstrativos`), margem, 24);
      y = 32;
    };
    inicioPagina();
    doc.setFontSize(10); doc.setTextColor(45, 48, 75);
    const resumoLinha = resumo.map((r) => `${limparPdf(r.titulo)}: ${r.valor}`).join("      |      ");
    doc.text(resumoLinha, margem, y); y += 7;
    doc.setFontSize(8); doc.setTextColor(95, 100, 120);
    doc.text("Frequencia e risco: situacao atual. Periodo aplicado a faltas e intervencoes registradas.", margem, y); y += 11;
    const larguraColunas = (quantidade) => (largura - margem * 2) / quantidade;
    const blocoTabela = (secao) => {
      if (y > rodape - 20) { doc.addPage(); inicioPagina(); }
      doc.setTextColor(60, 40, 145); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text(limparPdf(secao.nome), margem, y); y += 7;
      const colWidth = larguraColunas(secao.cabecalho.length);
      const cabe = () => {
        if (y > rodape - 12) { doc.addPage(); inicioPagina(); }
        doc.setFillColor(238, 235, 249); doc.rect(margem, y - 4, largura - 2 * margem, 8, "F");
        doc.setTextColor(35, 33, 80); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
        secao.cabecalho.forEach((valor, i) => doc.text(doc.splitTextToSize(limparPdf(valor), colWidth - 3).slice(0, 1), margem + i * colWidth + 1, y));
        y += 8;
      };
      cabe();
      const valores = secao.linhas.length ? secao.linhas : [["Nenhum registro no período"]];
      valores.forEach((linha, index) => {
        const celulas = secao.cabecalho.map((_, i) => doc.splitTextToSize(limparPdf(linha[i] ?? ""), colWidth - 3).slice(0, 3));
        const altura = Math.max(7, Math.max(...celulas.map((c) => c.length)) * 3.6 + 2);
        if (y + altura > rodape) { doc.addPage(); inicioPagina(); cabe(); }
        if (index % 2 === 0) { doc.setFillColor(249, 248, 252); doc.rect(margem, y - 3.5, largura - 2 * margem, altura, "F"); }
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(45, 45, 65);
        celulas.forEach((c, i) => doc.text(c, margem + i * colWidth + 1, y));
        y += altura;
      });
      y += 10;
    };
    montarRelatorio().forEach(blocoTabela);
    for (let p = 1; p <= doc.getNumberOfPages(); p++) {
      doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(115, 116, 132);
      doc.text(`PresenSee - Pagina ${p} de ${doc.getNumberOfPages()}`, margem, 204);
    }
    doc.save(`presensee-${tipo}-${periodo}.pdf`);
  }

  return (
    <DashboardLayout>
      <main className="relatorios-page">
        <header className="report-header">
          <h1>Relatórios</h1>
          <p>Gere relatórios detalhados a partir dos dados da escola.</p>
        </header>
        <section className="report-filtros" aria-label="Configuração do relatório">
          <label className="report-filtro"><span>Tipo de relatório</span><div className="report-select-wrap">
            <Icone tipo="relatorio" /><select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select><Icone tipo="chevron" size={18}/></div></label>
          <label className="report-filtro"><span>Turma</span><div className="report-select-wrap">
            <Icone tipo="pessoas" /><select value={turmaFiltro} onChange={(e) => setTurmaFiltro(e.target.value)}>
              {["Todas as turmas", ...NOMES_TURMAS].map((n) => <option key={n} value={n}>{n}</option>)}
            </select><Icone tipo="chevron" size={18}/></div></label>
          <label className="report-filtro"><span>Período</span><div className="report-select-wrap">
            <Icone tipo="calendario" /><select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              {opcoesPeriodo.map((p) => <option key={p.chave} value={p.chave}>{p.label}</option>)}
            </select><Icone tipo="chevron" size={18}/></div></label>
          <div className="report-actions">
            <button type="button" className="report-button report-button--excel" onClick={exportarExcel}><Icone tipo="excel" size={17}/> Exportar Excel</button>
            <button type="button" className="report-button report-button--pdf" onClick={exportarPDF}><Icone tipo="relatorio" size={17}/> Exportar PDF</button>
          </div>
        </section>
        <section className="report-cards" aria-label="Resumo escolar">
          {resumo.map((item) => <article className="report-card" key={item.titulo}>
            <div className={`report-card-icon report-card-icon--${item.classe}`}>
              {item.icone === "%" ? <strong>%</strong> : <Icone tipo={item.icone} size={26}/>}
            </div><div className="report-card-dados"><h3>{item.titulo}</h3><p>{item.valor}</p></div>
          </article>)}
        </section>
        <section className="report-table-container">
          <div className="report-section-header"><h2>{titulo}</h2></div>
          <p className="report-contexto">{["faltas", "intervencoes"].includes(tipo)
            ? `Registros de ${descricaoPeriodo}. Exportações incluem os detalhes por aluno e data.`
            : "Indicadores atuais. Na exportação, os registros datados são filtrados pelo período selecionado."}</p>
          <div className="report-table-scroll"><table className="report-table"><thead><tr>
            {colunas.map((c) => <th key={c}>{c}</th>)}
          </tr></thead><tbody>{turmas.map((t, index) => (
            <tr key={t.turma}><td className="report-turma-name">{t.turma}</td>
              <td>{linhasResumo[index][1]}</td>
              <td>{["frequencia", "cadastro"].includes(tipo) ? <div className="report-frequency">
                <span className={`report-badge report-badge--${corFreq(t.frequencia)}`}>{t.frequencia}%</span>
                <div className="report-frequency-bar" role="progressbar" aria-label={`Frequência de ${t.turma}`} aria-valuenow={t.frequencia} aria-valuemin={0} aria-valuemax={100}>
                  <span className={`report-frequency-fill report-frequency-fill--${corFreq(t.frequencia)}`} style={{width: `${t.frequencia}%`}}/>
                </div></div> : linhasResumo[index][2]}</td>
            </tr>))}</tbody></table></div>
        </section>
      </main>
    </DashboardLayout>
  );
}
