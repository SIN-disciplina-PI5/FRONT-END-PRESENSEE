import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import DashboardLayout from "../layouts/DashboardLayout";
import { useGraficos } from "../context/GraficosContext";
import GraficoRenderer from "../components/GraficoRenderer";
import api from "../services/api";
import { capturarTodos, gerarExcel, gerarPDF } from "../utils/exportarGraficos";
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
const ESPACO_CANVAS = 24;
const ALTURA_EXTRA_CARD = 150;
const ALTURA_MINIMA_GRAFICO = 160;
const ALTURA_MAXIMA_GRAFICO = 560;

// Dispersão usa pontos { x, y }; os demais tipos usam { nome, valor }
const formatoDoTipo = (tipo) => (tipo === "dispersao" ? "xy" : "nomevalor");

function retangulosSeSobrepoem(a, b) {
  return (
    a.left < b.left + b.width + ESPACO_CANVAS &&
    a.left + a.width + ESPACO_CANVAS > b.left &&
    a.top < b.top + b.height + ESPACO_CANVAS &&
    a.top + a.height + ESPACO_CANVAS > b.top
  );
}

function buscarPosicaoLivre(
  retangulo,
  ocupados,
  larguraCanvas,
  alturaMaxima,
  topoMinimo = 0
) {
  if (
    retangulo.width > larguraCanvas ||
    retangulo.height > alturaMaxima - topoMinimo
  ) {
    return null;
  }
  const maxLeft = Math.max(0, larguraCanvas - retangulo.width);
  const maxTop = Math.max(topoMinimo, alturaMaxima - retangulo.height);
  const candidatos = [
    { left: retangulo.left, top: retangulo.top },
    { left: 0, top: topoMinimo },
    { left: maxLeft, top: topoMinimo },
    { left: 0, top: maxTop },
    { left: maxLeft, top: maxTop },
  ];
  ocupados.forEach((ocupado) => {
    const direita = ocupado.left + ocupado.width + ESPACO_CANVAS;
    const esquerda = ocupado.left - retangulo.width - ESPACO_CANVAS;
    const abaixo = ocupado.top + ocupado.height + ESPACO_CANVAS;
    const acima = ocupado.top - retangulo.height - ESPACO_CANVAS;
    candidatos.push(
      { left: direita, top: retangulo.top },
      { left: esquerda, top: retangulo.top },
      { left: retangulo.left, top: abaixo },
      { left: retangulo.left, top: acima },
      { left: 0, top: abaixo },
      { left: maxLeft, top: abaixo },
      { left: direita, top: ocupado.top },
      { left: esquerda, top: ocupado.top }
    );
  });

  let melhor = null;
  let menorDistancia = Infinity;
  const vistos = new Set();
  for (const posicao of candidatos) {
    const candidato = {
      ...retangulo,
      left: Math.min(maxLeft, Math.max(0, posicao.left)),
      top: Math.min(maxTop, Math.max(topoMinimo, posicao.top)),
    };
    const chave = `${Math.round(candidato.left)}:${Math.round(candidato.top)}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    if (ocupados.some((ocupado) => retangulosSeSobrepoem(candidato, ocupado))) continue;

    const distancia =
      Math.abs(candidato.left - retangulo.left) + Math.abs(candidato.top - retangulo.top);
    if (distancia < menorDistancia) {
      melhor = candidato;
      menorDistancia = distancia;
    }
  }
  return melhor;
}

function planejarLayout(
  retanguloPrincipal,
  vizinhos,
  larguraCanvas,
  alturaMaxima,
  topoVisivel,
  fundoVisivel
) {
  const principal = {
    ...retanguloPrincipal,
    left: Math.min(
      Math.max(0, larguraCanvas - retanguloPrincipal.width),
      Math.max(0, retanguloPrincipal.left)
    ),
    top: Math.min(
      Math.max(0, alturaMaxima - retanguloPrincipal.height),
      Math.max(0, retanguloPrincipal.top)
    ),
  };
  const ocupados = [principal];
  const resultado = new Map([[principal.id, principal]]);
  const ordenados = [...vizinhos].sort((a, b) => a.top - b.top || a.left - b.left);

  ordenados.forEach((vizinho) => {
    const jaLivre = (
      vizinho.left >= 0 &&
      vizinho.left + vizinho.width <= larguraCanvas &&
      vizinho.top >= 0 &&
      vizinho.top + vizinho.height <= alturaMaxima &&
      !ocupados.some((ocupado) => retangulosSeSobrepoem(vizinho, ocupado))
    );
    if (jaLivre) {
      ocupados.push(vizinho);
      resultado.set(vizinho.id, vizinho);
      return;
    }

    const larguraMinima = Math.min(LARGURA_MINIMA_GRAFICO, larguraCanvas);
    const alturaMinimaGrafico = Math.min(
      ALTURA_MINIMA_GRAFICO,
      Math.max(1, alturaMaxima - vizinho.chromeHeight)
    );
    const escalaMinima = Math.max(
      larguraMinima / Math.max(1, vizinho.width),
      alturaMinimaGrafico / Math.max(1, vizinho.chartHeight)
    );
    let posicao = null;

    for (let escala = 1; escala > escalaMinima; escala -= 0.05) {
      const chartHeight = Math.max(
        alturaMinimaGrafico,
        Math.round(vizinho.chartHeight * escala)
      );
      const candidato = {
        ...vizinho,
        width: Math.max(larguraMinima, vizinho.width * escala),
        chartHeight,
        height: vizinho.chromeHeight + chartHeight,
      };
      posicao = buscarPosicaoLivre(
        candidato,
        ocupados,
        larguraCanvas,
        fundoVisivel,
        topoVisivel
      );
      if (posicao) break;
    }

    if (!posicao) {
      for (let escala = 1; escala > escalaMinima; escala -= 0.05) {
        const chartHeight = Math.max(
          alturaMinimaGrafico,
          Math.round(vizinho.chartHeight * escala)
        );
        const candidato = {
          ...vizinho,
          width: Math.max(larguraMinima, vizinho.width * escala),
          chartHeight,
          height: vizinho.chromeHeight + chartHeight,
        };
        posicao = buscarPosicaoLivre(candidato, ocupados, larguraCanvas, alturaMaxima);
        if (posicao) break;
      }
    }

    if (!posicao) {
      const candidatoMinimo = {
        ...vizinho,
        width: larguraMinima,
        chartHeight: alturaMinimaGrafico,
        height: vizinho.chromeHeight + alturaMinimaGrafico,
      };
      posicao = buscarPosicaoLivre(candidatoMinimo, ocupados, larguraCanvas, alturaMaxima);
    }

    if (!posicao) {
      const topo = Math.max(...ocupados.map((ocupado) => ocupado.top + ocupado.height)) + ESPACO_CANVAS;
      posicao = {
        ...vizinho,
        left: 0,
        top: Math.min(Math.max(0, alturaMaxima - vizinho.height), topo),
      };
      posicao = buscarPosicaoLivre(
        {
          ...posicao,
          width: larguraMinima,
          chartHeight: alturaMinimaGrafico,
          height: vizinho.chromeHeight + alturaMinimaGrafico,
        },
        ocupados,
        larguraCanvas,
        alturaMaxima
      ) || posicao;
    }

    if (!posicao || ocupados.some((ocupado) => retangulosSeSobrepoem(posicao, ocupado))) {
      posicao = {
        ...vizinho,
        left: 0,
        top: 0,
        width: larguraMinima,
        chartHeight: alturaMinimaGrafico,
        height: vizinho.chromeHeight + alturaMinimaGrafico,
      };
      posicao.top =
        Math.max(...ocupados.map((ocupado) => ocupado.top + ocupado.height)) + ESPACO_CANVAS;
    }

    ocupados.push(posicao);
    resultado.set(vizinho.id, posicao);
  });

  return resultado;
}

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
  } = useGraficos();

  // ID do gráfico ativado por duplo clique
  const [editandoId, setEditandoId] = useState(null);
  const [tipoTemp, setTipoTemp] = useState("linha");
  const [colunasTemp, setColunasTemp] = useState(1);
  const [alturaTemp, setAlturaTemp] = useState(220);

  // Estado do gráfico que está sendo movido no canvas
  const [arrastandoCardId, setArrastandoCardId] = useState(null);
  const [alturaViewport, setAlturaViewport] = useState(600);

  // Estado para painel flutuante móvel "Editar tipo de gráfico"
  const [posPainel, setPosPainel] = useState({ x: 24, y: 120 });
  const arrastePainelRef = useRef(null);

  // Menu exportar e notificações
  const [menuExportarAberto, setMenuExportarAberto] = useState(false);
  const [avisoTopo, setAvisoTopo] = useState("");
  const [avisoErro, setAvisoErro] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [graficoParaRemover, setGraficoParaRemover] = useState(null);
  const avisoTimerRef = useRef(null);
  const gridRef = useRef(null);

  const graficoEditando = graficos.find((g) => g.id === editandoId) || null;
  const posicionamentoPronto =
    graficos.length > 0 &&
    graficos.every((g) => Number.isFinite(g.posX) && Number.isFinite(g.posY));

  let finalPadrao = 0;
  graficos.forEach((g) => {
    if (Number.isFinite(g.posY)) {
      finalPadrao = Math.max(finalPadrao, g.posY + (g.altura || 220) + ALTURA_EXTRA_CARD + ESPACO_CANVAS);
    }
  });

  const posicoesGrafico = new Map();
  graficos.forEach((g) => {
    const posY = Number.isFinite(g.posY) ? g.posY : finalPadrao;
    posicoesGrafico.set(g.id, {
      x: Number.isFinite(g.posX) ? g.posX : 0,
      y: posY,
    });
    if (!Number.isFinite(g.posY)) {
      finalPadrao = posY + (g.altura || 220) + ALTURA_EXTRA_CARD + ESPACO_CANVAS;
    }
  });

  const alturaConteudoCanvas = Math.max(
    alturaViewport +
      graficos.reduce(
        (total, g) =>
          total + (g.alturaPreferida || g.altura || 220) + ALTURA_EXTRA_CARD + ESPACO_CANVAS,
        ESPACO_CANVAS
      ),
    ...graficos.map((g) => {
      const posicao = posicoesGrafico.get(g.id);
      return (
        posicao.y +
        (g.alturaPreferida || g.altura || 220) +
        ALTURA_EXTRA_CARD +
        ESPACO_CANVAS
      );
    })
  );

  useLayoutEffect(() => {
    if (graficos.length === 0 || !gridRef.current) return undefined;

    const medirAlturaDisponivel = () => {
      const topoCanvas = gridRef.current?.getBoundingClientRect().top || 0;
      const alturaDisponivel = window.innerHeight - topoCanvas - 24;
      setAlturaViewport(Math.max(120, Math.min(900, alturaDisponivel)));
    };

    medirAlturaDisponivel();
    window.addEventListener("resize", medirAlturaDisponivel);
    return () => window.removeEventListener("resize", medirAlturaDisponivel);
  }, [graficos.length]);

  useLayoutEffect(() => {
    const canvas = gridRef.current;
    if (!canvas || graficos.length === 0) return;

    const posicionados = graficos.filter(
      (g) => Number.isFinite(g.posX) && Number.isFinite(g.posY)
    );
    const pendentes = graficos.filter(
      (g) => !Number.isFinite(g.posX) || !Number.isFinite(g.posY)
    );
    if (pendentes.length === 0) return;

    const elementos = Array.from(canvas.querySelectorAll("[data-grafico-id]"));
    const elementoDoGrafico = (id) =>
      elementos.find((elemento) => elemento.dataset.graficoId === String(id));

    if (posicionados.length === 0) {
      const caixaCanvas = canvas.getBoundingClientRect();
      const larguraCanvas = canvas.clientWidth || 1;
      pendentes.forEach((g) => {
        const elemento = elementoDoGrafico(g.id);
        if (!elemento) return;
        const caixa = elemento.getBoundingClientRect();
        atualizarGrafico(g.id, {
          posX: Math.max(0, (caixa.left - caixaCanvas.left) / larguraCanvas),
          posY: Math.max(0, caixa.top - caixaCanvas.top),
        });
      });
      return;
    }

    let proximaPosicaoY = posicionados.reduce((fim, g) => {
      const elemento = elementoDoGrafico(g.id);
      const altura = elemento?.getBoundingClientRect().height || (g.altura || 220) + ALTURA_EXTRA_CARD;
      return Math.max(fim, g.posY + altura + ESPACO_CANVAS);
    }, 0);

    pendentes.forEach((g) => {
      atualizarGrafico(g.id, {
        posX: 0,
        posY: proximaPosicaoY,
      });
      const elemento = elementoDoGrafico(g.id);
      proximaPosicaoY +=
        (elemento?.getBoundingClientRect().height || (g.altura || 220) + ALTURA_EXTRA_CARD) +
        ESPACO_CANVAS;
    });
  }, [graficos, atualizarGrafico]);

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

  function medirLayoutCards(canvas) {
    const caixaCanvas = canvas.getBoundingClientRect();
    return Array.from(canvas.querySelectorAll("[data-grafico-id]"))
      .map((elemento) => {
        const grafico = graficos.find(
          (item) => String(item.id) === elemento.dataset.graficoId
        );
        if (!grafico) return null;
        const caixa = elemento.getBoundingClientRect();
        const chartHeightAtual = grafico.altura || 220;
        const chromeHeight = Math.max(0, caixa.height - chartHeightAtual);
        const chartHeight = Number.isFinite(grafico.alturaPreferida)
          ? grafico.alturaPreferida
          : chartHeightAtual;
        const larguraPreferida = Number.isFinite(grafico.larguraPreferida)
          ? Math.min(
              canvas.clientWidth,
              Math.max(
                Math.min(LARGURA_MINIMA_GRAFICO, canvas.clientWidth),
                grafico.larguraPreferida * (canvas.clientWidth + ESPACO_GRAFICOS) -
                  ESPACO_GRAFICOS
              )
            )
          : caixa.width;
        return {
          id: grafico.id,
          left: caixa.left - caixaCanvas.left + canvas.scrollLeft,
          top: caixa.top - caixaCanvas.top + canvas.scrollTop,
          width: larguraPreferida,
          height: chromeHeight + chartHeight,
          chartHeight,
          chromeHeight,
          larguraAtual: caixa.width,
          alturaAtual: chartHeightAtual,
          alturaCardAtual: caixa.height,
        };
      })
      .filter(Boolean);
  }

  function aplicarLayoutPreview(canvas, layout, idPrincipal, empilhado) {
    layout.forEach((retangulo, id) => {
      if (empilhado && id !== idPrincipal) return;
      const card = Array.from(canvas.querySelectorAll("[data-grafico-id]")).find(
        (elemento) => elemento.dataset.graficoId === String(id)
      );
      if (!card) return;

      if (empilhado) {
        card.style.setProperty("--pers-order", String(Math.round(retangulo.top)));
      } else {
        card.style.left = `${retangulo.left}px`;
        card.style.top = `${retangulo.top}px`;
        card.style.setProperty("--pers-card-width", `${retangulo.width}px`);
        card.style.setProperty("--pers-order", String(Math.round(retangulo.top)));
      }

      const renderer = card.querySelector("[data-grafico-renderer] > div");
      if (renderer) renderer.style.height = `${retangulo.chartHeight}px`;
    });
  }

  function salvarLayout(
    layout,
    layoutInicial,
    larguraCanvas,
    idPrincipal,
    empilhado,
    modo
  ) {
    layout.forEach((retangulo, id) => {
      if (empilhado && id !== idPrincipal) return;
      const graficoSalvo = graficos.find((item) => item.id === id);
      const retanguloInicial = layoutInicial.find((item) => item.id === id);
      const altura = Math.min(
        ALTURA_MAXIMA_GRAFICO,
        Math.max(ALTURA_MINIMA_GRAFICO, Math.round(retangulo.chartHeight))
      );
      const alteracoes = {
        posY: retangulo.top,
        altura,
      };

      if (!empilhado) {
        const proporcao = Math.min(
          1,
          Math.max(
            0,
            (retangulo.width + ESPACO_GRAFICOS) / (larguraCanvas + ESPACO_GRAFICOS)
          )
        );
        const colunas = Math.min(3, Math.max(1, Math.round(proporcao * 3)));
        alteracoes.posX = retangulo.left / larguraCanvas;
        alteracoes.largura = proporcao;
        alteracoes.colunas = colunas;
        alteracoes.tamanho = colunas === 3 ? "grande" : colunas === 2 ? "medio" : "pequeno";
        const card = Array.from(gridRef.current?.querySelectorAll("[data-grafico-id]") || [])
          .find((elemento) => elemento.dataset.graficoId === String(id));
        if (card) {
          const posX = retangulo.left / larguraCanvas;
          card.style.left = `min(${
            Math.min(Math.max(0, posX), Math.max(0, 1 - proporcao)) * 100
          }%, calc(100% - var(--pers-card-width)))`;
          card.style.top = `${retangulo.top}px`;
          card.style.setProperty(
            "--pers-card-width",
            `calc(${proporcao * 100}% - ${(1 - proporcao) * ESPACO_GRAFICOS}px)`
          );
        }
      }

      if (id === idPrincipal && modo === "redimensionar") {
        alteracoes.alturaPreferida = altura;
        if (!empilhado) alteracoes.larguraPreferida = alteracoes.largura;
      } else {
        if (!Number.isFinite(graficoSalvo?.alturaPreferida)) {
          alteracoes.alturaPreferida = retanguloInicial?.alturaAtual || altura;
        }
        if (!empilhado && !Number.isFinite(graficoSalvo?.larguraPreferida)) {
          const larguraPreferida = Number.isFinite(retanguloInicial?.larguraAtual)
            ? retanguloInicial.larguraAtual
            : retangulo.width;
          alteracoes.larguraPreferida =
            (larguraPreferida + ESPACO_GRAFICOS) / (larguraCanvas + ESPACO_GRAFICOS);
        }
      }

      atualizarGrafico(id, alteracoes);
      if (id === idPrincipal && id === editandoId) {
        setAlturaTemp(altura);
        if (!empilhado) {
          setColunasTemp(alteracoes.colunas);
        }
      }
    });
  }

  function iniciarAjusteGrafico(e, grafico, modo, direcao) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = gridRef.current;
    const card = e.currentTarget.closest(".pers-card");
    if (!canvas || !card) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const empilhado = window.matchMedia("(max-width: 1024px)").matches;
    const larguraCanvas = canvas.clientWidth || 1;
    const layoutInicial = medirLayoutCards(canvas);
    const principalInicial = layoutInicial.find((item) => item.id === grafico.id);
    if (!principalInicial) return;
    principalInicial.width = principalInicial.larguraAtual;
    principalInicial.height = principalInicial.alturaCardAtual;
    principalInicial.chartHeight = principalInicial.alturaAtual;
    principalInicial.chromeHeight = Math.max(
      0,
      principalInicial.alturaCardAtual - principalInicial.alturaAtual
    );
    const caixaCanvas = canvas.getBoundingClientRect();
    const deslocamentoX = e.clientX - card.getBoundingClientRect().left;
    const deslocamentoY = e.clientY - card.getBoundingClientRect().top;
    const pointerId = e.pointerId;
    const posXInicial = principalInicial.left;
    const posYInicial = principalInicial.top;
    const larguraInicial = principalInicial.width;
    const alturaGraficoInicial = principalInicial.chartHeight;
    const alturaInicial = principalInicial.height;
    const redimensionaLargura = modo === "redimensionar" &&
      (direcao.includes("left") || direcao.includes("right"));
    const redimensionaAltura = modo === "redimensionar" &&
      (direcao.includes("top") || direcao.includes("bottom"));
    const fatorX = direcao?.includes("left") ? -1 : 1;
    const fatorY = direcao?.includes("top") ? -1 : 1;
    const alturaMaximaCanvas = Math.max(
      alturaConteudoCanvas,
      canvas.scrollTop +
        canvas.clientHeight +
        layoutInicial.reduce(
          (total, item) => total + item.height + ESPACO_CANVAS,
          ESPACO_CANVAS
        )
    );
    setArrastandoCardId(grafico.id);

    function calcularLayout(ev) {
      const principal = { ...principalInicial };
      if (modo === "mover") {
        principal.left = ev.clientX - caixaCanvas.left - deslocamentoX + canvas.scrollLeft;
        principal.top = ev.clientY - caixaCanvas.top - deslocamentoY + canvas.scrollTop;
      } else {
        if (redimensionaLargura) {
          const larguraMaxima = direcao.includes("left")
            ? Math.min(larguraCanvas, larguraInicial + posXInicial)
            : Math.min(larguraCanvas, larguraCanvas - posXInicial);
          const larguraMinima = Math.min(LARGURA_MINIMA_GRAFICO, larguraMaxima);
          principal.width = Math.min(
            larguraMaxima,
            Math.max(
              larguraMinima,
              larguraInicial + (ev.clientX - e.clientX) * fatorX
            )
          );
          if (direcao.includes("left")) {
            principal.left = posXInicial + larguraInicial - principal.width;
          }
        }
        if (redimensionaAltura) {
          const alturaMaxima = direcao.includes("top")
            ? Math.min(ALTURA_MAXIMA_GRAFICO, alturaGraficoInicial + posYInicial)
            : ALTURA_MAXIMA_GRAFICO;
          principal.chartHeight = Math.min(
            alturaMaxima,
            Math.max(
              ALTURA_MINIMA_GRAFICO,
              alturaGraficoInicial + (ev.clientY - e.clientY) * fatorY
            )
          );
          principal.height = principal.chromeHeight + principal.chartHeight;
          if (direcao.includes("top")) {
            principal.top = posYInicial + alturaInicial - principal.height;
          }
        }
      }

      const alturaMaxima = Math.max(
        alturaMaximaCanvas,
        alturaConteudoCanvas + Math.max(0, principal.height - alturaInicial)
      );
      if (empilhado) {
        principal.left = 0;
        principal.top = Math.min(
          Math.max(0, alturaMaxima - principal.height),
          Math.max(0, principal.top)
        );
        return new Map([[grafico.id, principal]]);
      }

      return planejarLayout(
        principal,
        layoutInicial.filter((item) => item.id !== grafico.id),
        larguraCanvas,
        alturaMaxima,
        canvas.scrollTop,
        canvas.scrollTop + canvas.clientHeight
      );
    }

    function atualizarPreview(ev) {
      const layout = calcularLayout(ev);
      aplicarLayoutPreview(canvas, layout, grafico.id, empilhado);
      return layout;
    }

    let ultimoEvento = e;
    let frameId = null;
    function aoMover(ev) {
      if (ev.pointerId !== pointerId) return;
      ultimoEvento = ev;
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        atualizarPreview(ultimoEvento);
      });
    }

    function aoSoltar(ev) {
      if (ev.pointerId !== pointerId) return;
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      const layout = atualizarPreview(ev);
      salvarLayout(layout, layoutInicial, larguraCanvas, grafico.id, empilhado, modo);
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
      window.removeEventListener("pointercancel", aoSoltar);
      setArrastandoCardId(null);
    }

    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
    window.addEventListener("pointercancel", aoSoltar);
  }

  function iniciarRedimensionamento(e, grafico, direcao) {
    iniciarAjusteGrafico(e, grafico, "redimensionar", direcao);
  }

  function iniciarMovimentoGrafico(e, grafico) {
    iniciarAjusteGrafico(e, grafico, "mover");
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

  const dataArquivo = () => new Date().toISOString().slice(0, 10);

  async function exportarPDF() {
    setMenuExportarAberto(false);
    if (graficos.length === 0 || exportando) return;
    setExportando(true);
    try {
      const imagens = await capturarTodos(graficos);
      gerarPDF({ graficos, imagens, nomesTipo: NOMES_TIPO, nomeArquivo: `presensee-personalizado-${dataArquivo()}.pdf` });
      mostrarAviso("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      mostrarAviso("Não foi possível exportar o PDF. Tente novamente.", 5000, true);
    } finally {
      setExportando(false);
    }
  }

  async function exportarExcel() {
    setMenuExportarAberto(false);
    if (graficos.length === 0 || exportando) return;
    setExportando(true);
    try {
      const imagens = await capturarTodos(graficos);
      await gerarExcel({ graficos, imagens, nomesTipo: NOMES_TIPO, nomeArquivo: `presensee-personalizado-${dataArquivo()}.xlsx` });
      mostrarAviso("Excel exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      mostrarAviso("Não foi possível exportar o Excel. Tente novamente.", 5000, true);
    } finally {
      setExportando(false);
    }
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
              Dê <strong>duplo clique</strong> no gráfico para ativar a edição. Depois arraste o
              cabeçalho para posicioná-lo e as bordas para redimensionar.
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
              <button type="button" className="pers-btn-pri"
                onClick={() => setMenuExportarAberto((v) => !v)}
                disabled={graficos.length === 0 || exportando} aria-busy={exportando}>
                {exportando ? "Exportando…" : "Exportar ▾"}
              </button>
              {menuExportarAberto && (
                <div className="pers-export-menu">
                  <button type="button" onClick={exportarPDF}>Exportar PDF (com gráficos)</button>
                  <button type="button" onClick={exportarExcel}>Exportar Excel (com gráficos)</button>
                  <button type="button" onClick={exportarCSV}>Somente valores (CSV)</button>
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
          <div
            className={`pers-grid${posicionamentoPronto ? " pers-grid--canvas" : ""}`}
            ref={gridRef}
            style={posicionamentoPronto ? { height: `${alturaViewport}px` } : undefined}
          >
            {graficos.map((g) => {
              const emEdicao = g.id === editandoId;
              const colunas = emEdicao ? colunasTemp : g.colunas || 1;
              const alturaAtual = Math.min(
                ALTURA_MAXIMA_GRAFICO,
                Math.max(
                  ALTURA_MINIMA_GRAFICO,
                  emEdicao ? alturaTemp : g.altura || 220
                )
              );
              const tipoAtual = emEdicao ? tipoTemp : g.tipo;
              const posicao = posicoesGrafico.get(g.id);
              const proporcaoLargura = Math.min(
                1,
                Math.max(0, Number.isFinite(g.largura) ? g.largura : colunas / 3)
              );
              const alturaCardEstimado = alturaAtual + ALTURA_EXTRA_CARD;
              const topoCard = Math.min(
                Math.max(0, alturaConteudoCanvas - alturaCardEstimado),
                Math.max(0, posicao.y)
              );
              const larguraPersonalizada = Number.isFinite(g.largura)
                ? `calc(${proporcaoLargura * 100}% - ${
                    (1 - proporcaoLargura) * ESPACO_GRAFICOS
                  }px)`
                : undefined;
              const estiloCard = {
                ...(larguraPersonalizada
                  ? {
                      "--pers-card-basis": larguraPersonalizada,
                      "--pers-card-width": larguraPersonalizada,
                    }
                  : {}),
                ...(posicionamentoPronto
                  ? {
                      left: `min(${
                        Math.min(
                          Math.max(0, posicao.x),
                          Math.max(0, 1 - proporcaoLargura)
                        ) * 100
                      }%, calc(100% - var(--pers-card-width)))`,
                      top: `${topoCard}px`,
                      "--pers-order": Math.round(topoCard),
                    }
                  : {}),
              };

              return (
                <article
                  key={g.id}
                  data-grafico-id={g.id}
                  onDoubleClick={() => ativarEdicao(g)}
                  title={
                    emEdicao
                      ? "Modo de edição ativo: arraste o cabeçalho para mover e as bordas para redimensionar"
                      : "Dê duplo clique para editar"
                  }
                  className={`pers-card pers-col-${colunas}${
                    Number.isFinite(g.largura) ? " pers-card--custom-size" : ""
                  } ${
                    emEdicao ? "pers-card--editavel" : ""
                  } ${arrastandoCardId === g.id ? "pers-card--movendo" : ""}`}
                  style={estiloCard}
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

                  <div
                    className={`pers-card-header${emEdicao ? " pers-card-header--movel" : ""}`}
                    onPointerDown={
                      emEdicao ? (e) => iniciarMovimentoGrafico(e, g) : undefined
                    }
                  >
                    <h3>{g.titulo}</h3>
                    <span className="pers-tipo-badge">
                      {NOMES_TIPO[tipoAtual] || tipoAtual}
                    </span>
                    {emEdicao && (
                      <span className="pers-edit-badge" title="Arraste o cabeçalho para posicionar">
                        ✥ Editando
                      </span>
                    )}
                  </div>

                  {g.subtitulo && <p className="pers-sub">{g.subtitulo}</p>}

                  <div className="pers-chart-shell" data-grafico-renderer>
                    <GraficoRenderer
                      grafico={{ ...g, tipo: tipoAtual }}
                      altura={alturaAtual}
                    />
                  </div>

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