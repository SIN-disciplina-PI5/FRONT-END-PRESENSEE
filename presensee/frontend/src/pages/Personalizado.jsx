import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import DashboardLayout from "../layouts/DashboardLayout";
import { useGraficos } from "../context/GraficosContext";
import GraficoRenderer from "../components/GraficoRenderer";
import "../styles/Personalizado.css";

const OPCOES_TIPO = [
  { id: "linha", nome: "Linha", icone: "∿" },
  { id: "barras", nome: "Barras", icone: "☰" },
  { id: "area", nome: "Área", icone: "◭" },
  { id: "dispersao", nome: "Dispersão", icone: "⁘" },
  { id: "pizza", nome: "Pizza", icone: "◔" },
  { id: "colunas", nome: "Colunas", icone: "ılı" },
];

const NOMES_TIPO = {
  linha: "Linha",
  barras: "Barras",
  area: "Área",
  dispersao: "Dispersão",
  pizza: "Pizza",
  colunas: "Colunas",
};

const TAMANHOS = [
  { valor: "pequeno", rotulo: "P", nome: "Pequeno (1 col)" },
  { valor: "medio", rotulo: "M", nome: "Médio (2 cols)" },
  { valor: "grande", rotulo: "G", nome: "Grande (Largura total)" },
];

export default function Personalizado() {
  const {
    graficos,
    removerGrafico,
    alterarTamanhoGrafico,
    atualizarGrafico,
    moverGrafico,
  } = useGraficos();

  // ID do gráfico ativado por duplo clique
  const [editandoId, setEditandoId] = useState(null);
  const [tipoTemp, setTipoTemp] = useState("linha");
  const [colunasTemp, setColunasTemp] = useState(1);
  const [alturaTemp, setAlturaTemp] = useState(220);

  // Estado para arrastar cards no grid
  const [arrastandoCardId, setArrastandoCardId] = useState(null);
  const [sobreCardId, setSobreCardId] = useState(null);

  // Estado para painel flutuante móvel "Editar tipo de gráfico"
  const [posPainel, setPosPainel] = useState({ x: 24, y: 120 });
  const arrastePainelRef = useRef(null);

  // Menu exportar e notificações
  const [menuExportarAberto, setMenuExportarAberto] = useState(false);
  const [avisoTopo, setAvisoTopo] = useState("");
  const gridRef = useRef(null);

  const graficoEditando = graficos.find((g) => g.id === editandoId) || null;

  // Ativa edição no duplo clique
  function ativarEdicao(grafico) {
    setEditandoId(grafico.id);
    setTipoTemp(grafico.tipo || "colunas");
    setColunasTemp(grafico.colunas || 1);
    setAlturaTemp(grafico.altura || 220);
  }

  function sairEdicao() {
    setEditandoId(null);
  }

  // Fecha edição com ESC
  useEffect(() => {
    if (!editandoId) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") sairEdicao();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editandoId]);

  function salvarEdicao() {
    if (!graficoEditando) return;
    const tamanhoEquivalente =
      colunasTemp === 3 ? "grande" : colunasTemp === 2 ? "medio" : "pequeno";

    atualizarGrafico(graficoEditando.id, {
      tipo: tipoTemp,
      colunas: colunasTemp,
      altura: alturaTemp,
      tamanho: tamanhoEquivalente,
    });
    sairEdicao();
    mostrarAviso("Alterações salvas!");
  }

  function mostrarAviso(msg) {
    setAvisoTopo(msg);
    setTimeout(() => setAvisoTopo(""), 3000);
  }

  // Arrastar o painel flutuante "Editar tipo de gráfico" pela tela
  function iniciarArrastePainel(e) {
    if (e.target.closest("button")) return;
    const inicioX = e.clientX - posPainel.x;
    const inicioY = e.clientY - posPainel.y;
    arrastePainelRef.current = { inicioX, inicioY };

    function aoMover(ev) {
      if (!arrastePainelRef.current) return;
      const maxX = Math.max(12, window.innerWidth - 290);
      const maxY = Math.max(12, window.innerHeight - 360);
      const novoX = Math.min(maxX, Math.max(12, ev.clientX - arrastePainelRef.current.inicioX));
      const novoY = Math.min(maxY, Math.max(12, ev.clientY - arrastePainelRef.current.inicioY));
      setPosPainel({ x: novoX, y: novoY });
    }

    function aoSoltar() {
      arrastePainelRef.current = null;
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
    }

    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
  }

  // Redimensionamento interativo por arraste na alça do card (largura/colunas + altura)
  function iniciarRedimensionamento(e, grafico, direcao) {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const alturaInicial = grafico.id === editandoId ? alturaTemp : grafico.altura || 220;
    const colunasInicial = grafico.id === editandoId ? colunasTemp : grafico.colunas || 1;
    const larguraGrid = gridRef.current?.offsetWidth || 1000;
    const larguraColuna = larguraGrid / 3;

    function aoMover(ev) {
      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;

      if (direcao === "xy" || direcao === "x") {
        const deltaCols = Math.round(deltaX / (larguraColuna * 0.55));
        const novasColunas = Math.min(3, Math.max(1, colunasInicial + deltaCols));
        setColunasTemp(novasColunas);
        atualizarGrafico(grafico.id, {
          colunas: novasColunas,
          tamanho: novasColunas === 3 ? "grande" : novasColunas === 2 ? "medio" : "pequeno",
        });
      }

      if (direcao === "xy" || direcao === "y") {
        const novaAltura = Math.min(560, Math.max(160, Math.round(alturaInicial + deltaY)));
        setAlturaTemp(novaAltura);
        atualizarGrafico(grafico.id, { altura: novaAltura });
      }
    }

    function aoSoltar() {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
    }

    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
  }

  function abrirChatIA() {
    const fab = document.querySelector(".chat-fab");
    if (fab) fab.click();
  }

  async function compartilharPainel() {
    const resumo = graficos
      .map(
        (g) =>
          `• ${g.titulo} (${NOMES_TIPO[g.tipo] || g.tipo}): ` +
          (g.dados || []).map((d) => `${d.nome ?? d.x}: ${d.valor ?? d.y}`).join(", ")
      )
      .join("\n");

    const textoCompartilhar = `PresenSee — Dashboard Personalizado\n\n${
      resumo || "Nenhum gráfico criado ainda."
    }`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "PresenSee — Gráficos Personalizados",
          text: textoCompartilhar,
        });
      } else {
        await navigator.clipboard.writeText(textoCompartilhar);
        mostrarAviso("Resumo copiado para compartilhar!");
      }
    } catch {
      /* cancelado */
    }
  }

  function exportarCSV() {
    setMenuExportarAberto(false);
    if (graficos.length === 0) return;

    const linhas = [["PresenSee — Dashboard Personalizado"], []];
    graficos.forEach((g) => {
      linhas.push([g.titulo, `Tipo: ${NOMES_TIPO[g.tipo] || g.tipo}`]);
      linhas.push(["Rótulo / X", "Valor / Y"]);
      (g.dados || []).forEach((d) => {
        linhas.push([d.nome ?? d.x ?? "", d.valor ?? d.y ?? ""]);
      });
      linhas.push([]);
    });

    const csv = linhas
      .map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");

    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `presensee-personalizado-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportarPDF() {
    setMenuExportarAberto(false);
    if (graficos.length === 0) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let y = 20;

    doc.setFillColor(99, 61, 242);
    doc.rect(0, 0, 210, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(28, 31, 59);
    doc.text("PresenSee - Graficos Personalizados", 14, y);
    y += 10;

    graficos.forEach((g) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(99, 61, 242);
      doc.text(
        String(g.titulo || "Grafico").normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        14,
        y
      );
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 65, 85);
      (g.dados || []).forEach((d) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        const linha = `- ${d.nome ?? d.x}: ${d.valor ?? d.y}`;
        doc.text(linha.normalize("NFD").replace(/[\u0300-\u036f]/g, ""), 18, y);
        y += 5;
      });
      y += 6;
    });

    doc.save(`presensee-personalizado-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <DashboardLayout>
      <div
        className="pers-page"
        onClick={(e) => {
          // Clicar fora de um card ou do painel encerra o modo de edição
          if (
            editandoId &&
            !e.target.closest(".pers-card") &&
            !e.target.closest(".pers-floating-editor")
          ) {
            sairEdicao();
          }
        }}
      >
        <header className="pers-header pers-header-flex">
          <div>
            <h1>Personalizado</h1>
            <p>
              Dê <strong>duplo clique</strong> em qualquer gráfico para editar o tipo, mover de lugar ou ajustar largura e altura.
            </p>
          </div>

          <div className="pers-acoes-topo">
            {avisoTopo && <span className="pers-toast">{avisoTopo}</span>}

            <button type="button" className="pers-btn-sec" onClick={abrirChatIA}>
              + Perguntar à IA
            </button>

            <button
              type="button"
              className="pers-btn-sec"
              onClick={compartilharPainel}
              disabled={graficos.length === 0}
            >
              ↑ Compartilhar
            </button>

            <div className="pers-export-wrap">
              <button
                type="button"
                className="pers-btn-pri"
                onClick={() => setMenuExportarAberto((v) => !v)}
                disabled={graficos.length === 0}
              >
                Exportar ▾
              </button>
              {menuExportarAberto && (
                <div className="pers-export-menu">
                  <button type="button" onClick={exportarPDF}>
                    Exportar PDF
                  </button>
                  <button type="button" onClick={exportarCSV}>
                    Exportar Excel (CSV)
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAINEL MÓVEL FLUTUANTE "Editar tipo de gráfico" (abre no duplo clique) */}
        {graficoEditando && (
          <aside
            className="pers-floating-editor"
            style={{ left: `${posPainel.x}px`, top: `${posPainel.y}px` }}
            role="dialog"
            aria-label="Editar tipo de gráfico"
          >
            <div
              className="pers-floating-topo"
              onPointerDown={iniciarArrastePainel}
              title="Arraste para mover este painel"
            >
              <strong>Editar tipo de gráfico</strong>
              <button
                type="button"
                className="pers-floating-fechar"
                onClick={sairEdicao}
                aria-label="Fechar editor"
              >
                ×
              </button>
            </div>

            <div className="pers-floating-prompt">
              {graficoEditando.promptOriginal || graficoEditando.titulo}
            </div>

            <div className="pers-floating-label">Tipo de gráfico sugerido</div>
            <div className="pers-tipos-grid">
              {OPCOES_TIPO.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  className={`pers-tipo-btn ${tipoTemp === op.id ? "ativo" : ""}`}
                  onClick={() => {
                    setTipoTemp(op.id);
                    atualizarGrafico(graficoEditando.id, { tipo: op.id });
                  }}
                >
                  <span className="pers-tipo-icone">{op.icone}</span>
                  <span>{op.nome}</span>
                </button>
              ))}
            </div>

            <div className="pers-floating-dimensoes">
              <div>
                <span>Largura ({colunasTemp}x)</span>
                <div className="pers-cols-btns">
                  {[1, 2, 3].map((col) => (
                    <button
                      key={col}
                      type="button"
                      className={colunasTemp === col ? "ativo" : ""}
                      onClick={() => {
                        setColunasTemp(col);
                        atualizarGrafico(graficoEditando.id, {
                          colunas: col,
                          tamanho: col === 3 ? "grande" : col === 2 ? "medio" : "pequeno",
                        });
                      }}
                    >
                      {col}x
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span>Altura ({alturaTemp}px)</span>
                <input
                  type="range"
                  min="160"
                  max="540"
                  step="10"
                  value={alturaTemp}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setAlturaTemp(val);
                    atualizarGrafico(graficoEditando.id, { altura: val });
                  }}
                />
              </div>
            </div>

            <button type="button" className="pers-btn-salvar" onClick={salvarEdicao}>
              Salvar
            </button>
          </aside>
        )}

        {graficos.length === 0 ? (
          <div className="pers-vazio">
            <strong>Nenhum gráfico ainda</strong>
            <span>
              Converse com o assistente e peça um gráfico. Depois clique em
              "Adicionar no Dashboard".
            </span>
          </div>
        ) : (
          <div className="pers-grid" ref={gridRef}>
            {graficos.map((g) => {
              const emEdicao = g.id === editandoId;
              const tamanho = g.tamanho || "pequeno";
              const colunas = emEdicao ? colunasTemp : g.colunas || 1;
              const alturaAtual = emEdicao ? alturaTemp : g.altura || 220;
              const tipoAtual = emEdicao ? tipoTemp : g.tipo;

              return (
                <article
                  key={g.id}
                  onDoubleClick={() => ativarEdicao(g)}
                  draggable={emEdicao}
                  onDragStart={() => setArrastandoCardId(g.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (arrastandoCardId && arrastandoCardId !== g.id) {
                      setSobreCardId(g.id);
                    }
                  }}
                  onDragLeave={() => setSobreCardId(null)}
                  onDrop={() => {
                    moverGrafico(arrastandoCardId, g.id);
                    setArrastandoCardId(null);
                    setSobreCardId(null);
                  }}
                  onDragEnd={() => {
                    setArrastandoCardId(null);
                    setSobreCardId(null);
                  }}
                  title={
                    emEdicao
                      ? "Modo de edição ativo: arraste para mover ou puxe as bordas para redimensionar"
                      : "Dê duplo clique para editar"
                  }
                  className={`pers-card pers-col-${colunas} ${
                    emEdicao ? "pers-card--editavel" : ""
                  } ${sobreCardId === g.id ? "pers-card--drop-target" : ""}`}
                >
                  <button
                    type="button"
                    className="pers-remover"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (emEdicao) sairEdicao();
                      removerGrafico(g.id);
                    }}
                    aria-label={`Remover gráfico ${g.titulo}`}
                  >
                    ×
                  </button>

                  <div className="pers-card-header">
                    <h3>{g.titulo}</h3>
                    <span className="pers-tipo-badge">
                      {NOMES_TIPO[tipoAtual] || tipoAtual}
                    </span>
                    {emEdicao && (
                      <span className="pers-edit-badge" title="Arraste o card para mover">
                        ✥ Editando
                      </span>
                    )}
                  </div>

                  {g.subtitulo && <p className="pers-sub">{g.subtitulo}</p>}

                  {/* Controles rápidos P / M / G visíveis no modo edição */}
                  {emEdicao && (
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
                            onClick={() => {
                              alterarTamanhoGrafico(g.id, opcao.valor);
                              setColunasTemp(
                                opcao.valor === "grande" ? 3 : opcao.valor === "medio" ? 2 : 1
                              );
                              setAlturaTemp(
                                opcao.valor === "grande" ? 360 : opcao.valor === "medio" ? 270 : 200
                              );
                            }}
                            title={opcao.nome}
                          >
                            {opcao.rotulo}
                          </button>
                        ))}
                      </div>
                      <small style={{ marginLeft: "auto", color: "#633df2", fontWeight: 600 }}>
                        {colunas} col · {alturaAtual}px
                      </small>
                    </div>
                  )}

                  <GraficoRenderer
                    grafico={{ ...g, tipo: tipoAtual }}
                    altura={alturaAtual}
                  />

                  {/* Alças de redimensionamento interativo (aparecem no duplo clique) */}
                  {emEdicao && (
                    <>
                      <div
                        className="pers-resize-handle pers-resize-right"
                        onPointerDown={(e) => iniciarRedimensionamento(e, g, "x")}
                        title="Arraste para alterar a largura"
                      />
                      <div
                        className="pers-resize-handle pers-resize-bottom"
                        onPointerDown={(e) => iniciarRedimensionamento(e, g, "y")}
                        title="Arraste para alterar a altura"
                      />
                      <div
                        className="pers-resize-handle pers-resize-corner"
                        onPointerDown={(e) => iniciarRedimensionamento(e, g, "xy")}
                        title="Arraste para alterar largura e altura"
                      >
                        ↘
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}