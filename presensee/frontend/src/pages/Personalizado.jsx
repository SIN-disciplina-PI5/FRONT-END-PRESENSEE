import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import DashboardLayout from "../layouts/DashboardLayout";
import { useGraficos } from "../context/GraficosContext";
import GraficoRenderer from "../components/GraficoRenderer";
import api from "../services/api";
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

const ALCAS_REDIMENSIONAMENTO = [
  { direcao: "top", titulo: "Arraste para ajustar a altura pelo topo" },
  { direcao: "right", titulo: "Arraste para ajustar a largura pela direita" },
  { direcao: "bottom", titulo: "Arraste para ajustar a altura pela base" },
  { direcao: "left", titulo: "Arraste para ajustar a largura pela esquerda" },
  { direcao: "top-left", titulo: "Arraste para ajustar largura e altura" },
  { direcao: "top-right", titulo: "Arraste para ajustar largura e altura" },
  { direcao: "bottom-right", titulo: "Arraste para ajustar largura e altura" },
  { direcao: "bottom-left", titulo: "Arraste para ajustar largura e altura" },
];

// Quantos gráficos são atualizados ao mesmo tempo (evita sobrecarregar o /chat)
const ATUALIZACOES_SIMULTANEAS = 3;
const ESPACO_GRAFICOS = 20;
const LARGURA_MINIMA_GRAFICO = 220;

// Dispersão usa pontos { x, y }; os demais tipos usam { nome, valor }
const formatoDoTipo = (tipo) => (tipo === "dispersao" ? "xy" : "nomevalor");

function formatoDosDados(dados) {
  const primeiro = dados[0];
  return primeiro && typeof primeiro === "object" && "x" in primeiro && "y" in primeiro
    ? "xy"
    : "nomevalor";
}

// Refaz a pergunta que originou o gráfico e devolve a versão atual dele
async function buscarGraficoAtualizado(grafico) {
  const res = await api.post("/chat", {
    mensagem: grafico.promptOriginal || grafico.titulo,
    historico: [],
  });

  const novo = res.data?.grafico;
  if (!novo || !Array.isArray(novo.dados) || novo.dados.length === 0) {
    throw new Error("O assistente não retornou dados para este gráfico.");
  }
  return novo;
}

export default function Personalizado() {
  const {
    graficos,
    removerGrafico,
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
  const [avisoErro, setAvisoErro] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [graficoParaRemover, setGraficoParaRemover] = useState(null);
  const avisoTimerRef = useRef(null);
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
      if (e.key === "Escape" && !graficoParaRemover) sairEdicao();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editandoId, graficoParaRemover]);

  useEffect(() => {
    if (!graficoParaRemover) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setGraficoParaRemover(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [graficoParaRemover]);

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

  function confirmarRemocao() {
    if (!graficoParaRemover) return;
    if (graficoParaRemover.id === editandoId) sairEdicao();
    removerGrafico(graficoParaRemover.id);
    setGraficoParaRemover(null);
  }

  function mostrarAviso(msg, duracao = 3000, erro = false) {
    clearTimeout(avisoTimerRef.current);
    setAvisoTopo(msg);
    setAvisoErro(erro);
    avisoTimerRef.current = setTimeout(() => setAvisoTopo(""), duracao);
  }

  // Evita setState/timer pendente se o usuário sair da página
  useEffect(() => () => clearTimeout(avisoTimerRef.current), []);

  // Recarrega os dados de todos os gráficos a partir do que está cadastrado agora
  async function atualizarGraficos() {
    if (atualizando || graficos.length === 0) return;
    setAtualizando(true);

    const alvos = [...graficos];
    let sucessos = 0;
    let falhas = 0;
    let proximo = 0;

    async function trabalhador() {
      while (proximo < alvos.length) {
        const g = alvos[proximo++];
        try {
          const novo = await buscarGraficoAtualizado(g);

          // Mantém o tipo escolhido pelo usuário, a menos que os novos dados
          // venham num formato que esse tipo não consegue desenhar.
          const compativel = formatoDoTipo(g.tipo) === formatoDosDados(novo.dados);
          const tipo = compativel ? g.tipo : novo.tipo || g.tipo;

          atualizarGrafico(g.id, {
            dados: novo.dados,
            tipo,
            eixoX: novo.eixoX ?? g.eixoX,
            eixoY: novo.eixoY ?? g.eixoY,
            ...(novo.subtitulo ? { subtitulo: novo.subtitulo } : {}),
          });
          if (g.id === editandoId && tipo !== g.tipo) setTipoTemp(tipo);
          sucessos++;
        } catch (error) {
          console.error(`Erro ao atualizar o gráfico "${g.titulo}":`, error);
          falhas++;
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(ATUALIZACOES_SIMULTANEAS, alvos.length) }, trabalhador)
    );
    setAtualizando(false);

    if (falhas === 0) {
      mostrarAviso(sucessos === 1 ? "Gráfico atualizado!" : `${sucessos} gráficos atualizados!`);
    } else if (sucessos === 0) {
      mostrarAviso("Não foi possível atualizar agora. Tente novamente em instantes.", 5000, true);
    } else {
      mostrarAviso(
        `${sucessos} de ${alvos.length} gráficos atualizados. Tente novamente para os demais.`,
        5000,
        true
      );
    }
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

  // Redimensiona o card continuamente; o renderer acompanha o novo tamanho do contêiner.
  function iniciarRedimensionamento(e, grafico, direcao) {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const card = e.currentTarget.closest(".pers-card");
    const larguraContainer = gridRef.current?.clientWidth || 1000;
    const larguraInicial = card?.getBoundingClientRect().width || larguraContainer / 3;
    const startX = e.clientX;
    const startY = e.clientY;
    const alturaInicial = grafico.id === editandoId ? alturaTemp : grafico.altura || 220;
    const redimensionaLargura = direcao.includes("left") || direcao.includes("right");
    const redimensionaAltura = direcao.includes("top") || direcao.includes("bottom");
    const fatorX = direcao.includes("left") ? -1 : 1;
    const fatorY = direcao.includes("top") ? -1 : 1;

    function aoMover(ev) {
      if (ev.pointerId !== e.pointerId) return;

      const alteracoes = {};
      if (redimensionaLargura) {
        const larguraMinima = Math.min(LARGURA_MINIMA_GRAFICO, larguraContainer);
        const novaLargura = Math.min(
          larguraContainer,
          Math.max(larguraMinima, larguraInicial + (ev.clientX - startX) * fatorX)
        );
        const proporcao = Math.min(
          1,
          Math.max(0, (novaLargura + ESPACO_GRAFICOS) / (larguraContainer + ESPACO_GRAFICOS))
        );
        const novasColunas = Math.min(3, Math.max(1, Math.round(proporcao * 3)));
        setColunasTemp(novasColunas);
        alteracoes.largura = proporcao;
        alteracoes.colunas = novasColunas;
        alteracoes.tamanho =
          novasColunas === 3 ? "grande" : novasColunas === 2 ? "medio" : "pequeno";
      }

      if (redimensionaAltura) {
        const novaAltura = Math.min(
          560,
          Math.max(160, Math.round(alturaInicial + (ev.clientY - startY) * fatorY))
        );
        setAlturaTemp(novaAltura);
        alteracoes.altura = novaAltura;
      }

      atualizarGrafico(grafico.id, alteracoes);
    }

    function aoSoltar(ev) {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
      window.removeEventListener("pointercancel", aoSoltar);
    }

    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
    window.addEventListener("pointercancel", aoSoltar);
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
            {avisoTopo && (
              <span
                className={`pers-toast${avisoErro ? " pers-toast--erro" : ""}`}
                role="status"
              >
                {avisoTopo}
              </span>
            )}

            <button
              type="button"
              className="pers-btn-sec"
              onClick={atualizarGraficos}
              disabled={graficos.length === 0 || atualizando}
              aria-busy={atualizando}
              title="Recarrega os dados dos gráficos com as informações mais recentes"
            >
              <span
                className={`pers-atualizar-icone${atualizando ? " girando" : ""}`}
                aria-hidden="true"
              >
                ↻
              </span>{" "}
              {atualizando ? "Atualizando…" : "Atualizar"}
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
              const colunas = emEdicao ? colunasTemp : g.colunas || 1;
              const alturaAtual = emEdicao ? alturaTemp : g.altura || 220;
              const tipoAtual = emEdicao ? tipoTemp : g.tipo;

              return (
                <article
                  key={g.id}
                  onDoubleClick={() => ativarEdicao(g)}
                  draggable={emEdicao}
                  onDragStart={(e) => {
                    if (e.target.closest(".pers-resize-handle")) {
                      e.preventDefault();
                      return;
                    }
                    setArrastandoCardId(g.id);
                  }}
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
                  className={`pers-card pers-col-${colunas}${
                    Number.isFinite(g.largura) ? " pers-card--custom-size" : ""
                  } ${
                    emEdicao ? "pers-card--editavel" : ""
                  } ${sobreCardId === g.id ? "pers-card--drop-target" : ""}`}
                  style={
                    Number.isFinite(g.largura)
                      ? {
                          "--pers-card-basis": `calc(${g.largura * 100}% - ${
                            (1 - g.largura) * ESPACO_GRAFICOS
                          }px)`,
                        }
                      : undefined
                  }
                >
                  <button
                    type="button"
                    className="pers-remover"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGraficoParaRemover(g);
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

                  <GraficoRenderer
                    grafico={{ ...g, tipo: tipoAtual }}
                    altura={alturaAtual}
                  />

                  {/* Bordas e cantos interativos para redimensionar o gráfico */}
                  {emEdicao && (
                    ALCAS_REDIMENSIONAMENTO.map(({ direcao, titulo }) => (
                      <div
                        key={direcao}
                        className={`pers-resize-handle pers-resize-${direcao}`}
                        onPointerDown={(e) => iniciarRedimensionamento(e, g, direcao)}
                        title={titulo}
                        aria-hidden="true"
                      />
                    ))
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {graficoParaRemover && (
        <div
          className="pers-confirmacao-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGraficoParaRemover(null);
          }}
        >
          <section
            className="pers-confirmacao-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="pers-confirmacao-titulo"
            aria-describedby="pers-confirmacao-descricao"
          >
            <h2 id="pers-confirmacao-titulo">Tem certeza que quer excluir o gráfico?</h2>
            <p id="pers-confirmacao-descricao">
              O gráfico <strong>{graficoParaRemover.titulo}</strong> será removido do dashboard.
            </p>
            <div className="pers-confirmacao-acoes">
              <button
                type="button"
                className="pers-confirmacao-cancelar"
                onClick={() => setGraficoParaRemover(null)}
                autoFocus
              >
                Não, manter gráfico
              </button>
              <button
                type="button"
                className="pers-confirmacao-excluir"
                onClick={confirmarRemocao}
              >
                Sim, excluir
              </button>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}