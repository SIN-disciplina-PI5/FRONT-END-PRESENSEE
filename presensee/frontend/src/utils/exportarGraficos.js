import { jsPDF } from "jspdf";

// Cores fixas (tema claro). PDF/Excel têm fundo branco, mesmo com o app no modo escuro.
const CORES_VARIAVEIS = {
  "--color-text-muted": "#6b6b78",
  "--color-text": "#1a1a1a",
  "--color-border": "#e2e2ea",
  "--color-dark": "#111827",
  "--color-primary": "#633df2",
};
const COR_PADRAO = "#6b6b78";
const FONTE_GRAFICO = "Arial, Helvetica, sans-serif";

function resolverVariaveisCSS(valor) {
  if (typeof valor !== "string" || !valor.includes("var(")) return valor;
  return valor.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g, (_, nome, reserva) => {
    return CORES_VARIAVEIS[nome] || (reserva ? reserva.trim() : COR_PADRAO);
  });
}

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível converter o gráfico em imagem."));
    img.src = url;
  });
}

// Devolve { dataUrl, base64, largura, altura } ou null (gráfico sem <svg>, ex.: "Sem dados")
export async function capturarGraficoPNG(idGrafico, { escala = 2 } = {}) {
  const card = document.querySelector(`[data-grafico-id="${String(idGrafico).replace(/"/g, '\\"')}"]`);
  const svg = card?.querySelector("[data-grafico-renderer] svg.recharts-surface");
  if (!svg) return null;

  const caixa = svg.getBoundingClientRect();
  const largura = Math.round(caixa.width);
  const altura = Math.round(caixa.height);
  if (largura < 10 || altura < 10) return null;

  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(largura));
  clone.setAttribute("height", String(altura));
  if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${largura} ${altura}`);
  clone.setAttribute("style", `font-family: ${FONTE_GRAFICO};`);

  // Troca var(--cor) por cores reais (fora da página as variáveis CSS não existem)
  [clone, ...clone.querySelectorAll("*")].forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.value.includes("var(")) el.setAttribute(attr.name, resolverVariaveisCSS(attr.value));
    });
  });

  // Fundo branco (senão o PNG sai transparente)
  const fundo = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  fundo.setAttribute("width", "100%");
  fundo.setAttribute("height", "100%");
  fundo.setAttribute("fill", "#ffffff");
  clone.insertBefore(fundo, clone.firstChild);

  const svgTexto = new XMLSerializer().serializeToString(clone);
  const img = await carregarImagem(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgTexto)}`);

  const canvas = document.createElement("canvas");
  canvas.width = largura * escala;
  canvas.height = altura * escala;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/png");
  return { dataUrl, base64: dataUrl.split(",")[1], largura, altura };
}

// Se algum gráfico falhar, fica null e a exportação segue só com os valores dele
export async function capturarTodos(graficos) {
  const imagens = new Map();
  for (const g of graficos) {
    try {
      imagens.set(g.id, await capturarGraficoPNG(g.id));
    } catch (erro) {
      console.error(`Erro ao capturar o gráfico "${g.titulo}":`, erro);
      imagens.set(g.id, null);
    }
  }
  return imagens;
}

const semAcento = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const valorDoPonto = (d) => ({ rotulo: d.nome ?? d.x ?? "", valor: d.valor ?? d.y ?? "" });

export function gerarPDF({ graficos, imagens, nomesTipo, nomeArquivo }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const MARGEM = 14, LIMITE_Y = 297 - 18;
  const AREA_IMG_LARGURA = 210 - MARGEM * 2, AREA_IMG_ALTURA = 90;
  let y = 20;
  const garantirEspaco = (altura) => {
    if (y + altura > LIMITE_Y) { doc.addPage(); y = 20; }
  };

  doc.setFillColor(99, 61, 242);
  doc.rect(0, 0, 210, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(28, 31, 59);
  doc.text("PresenSee - Graficos Personalizados", MARGEM, y);
  y += 10;

  graficos.forEach((g) => {
    const imagem = imagens.get(g.id);
    garantirEspaco(imagem ? 18 + 40 : 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(99, 61, 242);
    doc.text(semAcento(g.titulo || "Grafico"), MARGEM, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 125, 145);
    doc.text(`Tipo: ${semAcento(nomesTipo[g.tipo] || g.tipo)}`, MARGEM, y);
    y += 5;

    if (imagem) {
      const prop = Math.min(AREA_IMG_LARGURA / imagem.largura, AREA_IMG_ALTURA / imagem.altura);
      const w = imagem.largura * prop, h = imagem.altura * prop;
      garantirEspaco(h + 4);
      doc.addImage(imagem.dataUrl, "PNG", MARGEM, y, w, h, undefined, "FAST");
      y += h + 4;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 65, 85);
    (g.dados || []).forEach((d) => {
      garantirEspaco(5);
      const { rotulo, valor } = valorDoPonto(d);
      doc.text(semAcento(`- ${rotulo}: ${valor}`), MARGEM + 4, y);
      y += 5;
    });
    y += 8;
  });

  doc.save(nomeArquivo);
}

export async function gerarExcel({ graficos, imagens, nomesTipo, nomeArquivo }) {
  // Carrega o exceljs só quando o usuário exporta (não pesa no carregamento do app)
  const modulo = await import("exceljs");
  const ExcelJS = modulo.default || modulo;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PresenSee";
  workbook.created = new Date();
  const planilha = workbook.addWorksheet("Personalizado", { views: [{ showGridLines: false }] });
  planilha.columns = [{ width: 34 }, { width: 18 }, { width: 3 }];

  const ALTURA_LINHA_PX = 20, LARGURA_MAX_IMG = 560, COR_ROXA = "FF633DF2";

  const titulo = planilha.getCell("A1");
  titulo.value = "PresenSee — Dashboard Personalizado";
  titulo.font = { bold: true, size: 16, color: { argb: "FF1C1F3B" } };
  let linha = 3;

  graficos.forEach((g) => {
    const inicio = linha;

    const celulaTitulo = planilha.getCell(`A${linha}`);
    celulaTitulo.value = g.titulo || "Gráfico";
    celulaTitulo.font = { bold: true, size: 13, color: { argb: COR_ROXA } };
    linha += 1;

    planilha.getCell(`A${linha}`).value = `Tipo: ${nomesTipo[g.tipo] || g.tipo}`;
    planilha.getCell(`A${linha}`).font = { italic: true, color: { argb: "FF787D91" } };
    linha += 1;

    ["Rótulo / X", "Valor / Y"].forEach((texto, i) => {
      const c = planilha.getCell(linha, i + 1);
      c.value = texto;
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_ROXA } };
    });
    linha += 1;

    (g.dados || []).forEach((d) => {
      const { rotulo, valor } = valorDoPonto(d);
      planilha.getCell(linha, 1).value = rotulo;
      const numero = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
      planilha.getCell(linha, 2).value = valor !== "" && Number.isFinite(numero) ? numero : valor;
      linha += 1;
    });

    // Gráfico ao lado da tabela; reserva linhas para a imagem não invadir o próximo bloco
    let linhasDaImagem = 0;
    const imagem = imagens.get(g.id);
    if (imagem) {
      const prop = Math.min(1, LARGURA_MAX_IMG / imagem.largura);
      const largura = Math.round(imagem.largura * prop);
      const altura = Math.round(imagem.altura * prop);
      const imageId = workbook.addImage({ base64: imagem.base64, extension: "png" });
      planilha.addImage(imageId, { tl: { col: 3, row: inicio - 1 }, ext: { width: largura, height: altura } });
      linhasDaImagem = Math.ceil(altura / ALTURA_LINHA_PX) + 1;
    }
    linha = Math.max(linha, inicio + linhasDaImagem) + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}