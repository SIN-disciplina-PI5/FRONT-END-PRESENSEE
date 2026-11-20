import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "../styles/MascoteAssistente.css";
import ChatAssistente from "./ChatAssistente";
import MascoteRig from "./MascoteRig";

const POSICAO_INICIAL = { x: 88, y: 89 };
const MENSAGENS_CLIQUE = [
  "Oi! Precisa de ajuda?",
  "Estou de olho nas frequências! 👀",
  "Tudo certo por aqui!",
  "Posso te ajudar com alguma coisa?",
  "Você está trabalhando bastante hoje!",
];
const MENSAGENS_ESPONTANEAS = [
  "Ei, não esquece de verificar os alunos em risco!",
  "Tudo certo por aqui!",
  "Estou de olho nas frequências! 👀",
  "Você está trabalhando bastante hoje!",
];

function reducerEstado(estado, evento) {
  switch (evento) {
    case "WALKING":
    case "RUNNING":
    case "LOOKING":
    case "CURIOUS":
    case "DOUBTFUL":
    case "SURPRISED":
    case "HAPPY":
    case "CLIMBING":
    case "JUMPING":
    case "SITTING":
    case "INTERACTING":
      return estado === "dragged" || estado === "chatting" ? estado : evento.toLowerCase();
    case "INICIAR_ARRASTO":
      return "dragged";
    case "FINALIZAR_ARRASTO":
      return "interacting";
    case "CLOSE_CHAT":
    case "RECUPERAR":
      return "idle";
    case "ABRIR_CONVERSA":
      return "chatting";
    default:
      return estado;
  }
}

function obterChavePreferencias() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    const identificador = usuario.id || usuario._id || usuario.email || "padrao";
    return `presensee_mascote_${encodeURIComponent(String(identificador).toLowerCase())}`;
  } catch (error) {
    console.error("Não foi possível identificar as preferências do mascote:", error);
    return "presensee_mascote_padrao";
  }
}

function carregarPreferencias(chave) {
  const padrao = {
    movimentoAutomatico: true,
    mensagensEspontaneas: true,
    posicao: POSICAO_INICIAL,
  };

  try {
    const salvo = localStorage.getItem(chave);
    if (!salvo) return padrao;

    const preferencias = JSON.parse(salvo);
    return {
      ...padrao,
      ...preferencias,
      posicao:
        Number.isFinite(preferencias?.posicao?.x) &&
        Number.isFinite(preferencias?.posicao?.y)
          ? {
              x: Math.min(100, Math.max(0, preferencias.posicao.x)),
              y: Math.min(100, Math.max(0, preferencias.posicao.y)),
            }
          : POSICAO_INICIAL,
    };
  } catch (error) {
    console.error("Não foi possível carregar as preferências do mascote:", error);
    return padrao;
  }
}

function limitar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}

function obterDimensoes(compacto) {
  return compacto ? DIMENSOES_COMPACTO : DIMENSOES_PADRAO;
}

const DIMENSOES_COMPACTO = { largura: 106, altura: 103 };
const DIMENSOES_PADRAO = { largura: 136, altura: 132 };

function converterParaPixels(posicao, viewport, dimensoes) {
  const maxX = Math.max(0, viewport.largura - dimensoes.largura);
  const maxY = Math.max(0, viewport.altura - dimensoes.altura);
  return {
    x: (posicao.x / 100) * maxX,
    y: (posicao.y / 100) * maxY,
  };
}

function converterParaPercentual(x, y, viewport, dimensoes) {
  const maxX = Math.max(0, viewport.largura - dimensoes.largura);
  const maxY = Math.max(0, viewport.altura - dimensoes.altura);
  return {
    x: maxX ? limitar((x / maxX) * 100, 0, 100) : 0,
    y: maxY ? limitar((y / maxY) * 100, 0, 100) : 0,
  };
}

function coletarSuperficies() {
  const seletor = [
    "[data-mascote-surface]",
    ".pd-indicadores",
    ".pd-painel",
    ".pd-grafico-evolucao",
    ".pd-grafico-circular",
    ".pd-grafico-inferior",
    "article",
    ".card",
    "[class*='-card']",
  ].join(",");

  return Array.from(document.querySelectorAll(seletor))
    .filter((elemento) => {
      if (elemento.closest(".mascote-flutuante, .chat-janela, nav, aside, [role='dialog']")) {
        return false;
      }
      const estilo = window.getComputedStyle(elemento);
      const retangulo = elemento.getBoundingClientRect();
      return (
        estilo.display !== "none" &&
        estilo.visibility !== "hidden" &&
        Number(estilo.opacity) !== 0 &&
        retangulo.width >= 170 &&
        retangulo.height >= 48 &&
        retangulo.bottom > 0 &&
        retangulo.top < window.innerHeight
      );
    })
    .map((elemento, indice) => {
      const retangulo = elemento.getBoundingClientRect();
      return {
        id:
          elemento.getAttribute("data-mascote-surface") ||
          elemento.className?.baseVal ||
          `${elemento.className || "surface"}-${indice}`,
        elemento,
        kind: `${elemento.className?.baseVal || elemento.className || ""}`.toLowerCase(),
        left: retangulo.left,
        top: retangulo.top,
        right: retangulo.right,
        bottom: retangulo.bottom,
        width: retangulo.width,
        height: retangulo.height,
      };
    });
}

function mesmaGeometriaSuperficies(atuais, novas) {
  return (
    atuais.length === novas.length &&
    atuais.every((superficie, indice) => {
      const proxima = novas[indice];
      return (
        superficie.id === proxima.id &&
        Math.abs(superficie.left - proxima.left) < 2 &&
        Math.abs(superficie.top - proxima.top) < 2 &&
        Math.abs(superficie.width - proxima.width) < 2 &&
        Math.abs(superficie.height - proxima.height) < 2
      );
    })
  );
}

function colisaoComAcao(x, y, dimensoes, elementos, mascote) {
  const margem = 8;
  const caixa = {
    left: x + margem,
    right: x + dimensoes.largura - margem,
    top: y + 6,
    bottom: y + dimensoes.altura - 8,
  };
  return elementos.some((elemento) => {
    if (mascote?.contains(elemento)) return false;
    const retangulo = elemento.getBoundingClientRect();
    return (
      retangulo.width > 0 &&
      retangulo.height > 0 &&
      caixa.left < retangulo.right &&
      caixa.right > retangulo.left &&
      caixa.top < retangulo.bottom &&
      caixa.bottom > retangulo.top
    );
  });
}

function useMovimentoReduzido() {
  const [reduzido, setReduzido] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );

  useEffect(() => {
    const consulta = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!consulta) return undefined;

    const atualizar = () => setReduzido(consulta.matches);
    consulta.addEventListener("change", atualizar);
    return () => consulta.removeEventListener("change", atualizar);
  }, []);

  return reduzido;
}

export default function MascoteAssistente() {
  const location = useLocation();
  const [chavePreferencias] = useState(obterChavePreferencias);
  const [preferencias, setPreferencias] = useState(() => carregarPreferencias(chavePreferencias));
  const [viewport, setViewport] = useState(() => ({
    largura: window.innerWidth,
    altura: window.innerHeight,
  }));
  const [estado, despachar] = useReducer(reducerEstado, "idle");
  const [mensagem, setMensagem] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);
  const [conversaAberta, setConversaAberta] = useState(false);
  const [modo, setModo] = useState("normal");
  const [cursorProximo, setCursorProximo] = useState(false);
  const [plataformas, setPlataformas] = useState([]);
  const [duracaoMovimento, setDuracaoMovimento] = useState(1600);
  const [sentido, setSentido] = useState(1);
  const compacto = viewport.largura <= 600;
  const dimensoes = obterDimensoes(compacto);
  const posicaoPixels = converterParaPixels(preferencias.posicao, viewport, dimensoes);
  const mascoteRef = useRef(null);
  const rigRef = useRef(null);
  const posicaoRef = useRef(posicaoPixels);
  const arrastoRef = useRef(null);
  const ignorarCliqueRef = useRef(false);
  const cliqueAnteriorRef = useRef(0);
  const cliquesRapidosRef = useRef(0);
  const indiceMensagemRef = useRef(0);
  const ultimaMensagemEspontaneaRef = useRef(0);
  const ultimaReacaoMouseRef = useRef(0);
  const ultimaPosicaoMouseRef = useRef(null);
  const ultimoPonteiroRef = useRef(null);
  const framePonteiroRef = useRef(0);
  const cursorProximoRef = useRef(false);
  const fugaTimerRef = useRef(null);
  const duracaoEstadoRef = useRef(1600);
  const timerMensagemRef = useRef(null);
  const timerOcultarRef = useRef(null);
  const caminhoAnteriorRef = useRef(location.pathname);
  const reduzido = useMovimentoReduzido();

  useEffect(() => {
    if (!arrastoRef.current) posicaoRef.current = posicaoPixels;
  }, [posicaoPixels]);

  useEffect(() => {
    try {
      localStorage.setItem(chavePreferencias, JSON.stringify(preferencias));
    } catch (error) {
      console.error("Não foi possível salvar as preferências do mascote:", error);
    }
  }, [chavePreferencias, preferencias]);

  useEffect(() => {
    const atualizarViewport = () =>
      setViewport({ largura: window.innerWidth, altura: window.innerHeight });
    window.addEventListener("resize", atualizarViewport);
    return () => window.removeEventListener("resize", atualizarViewport);
  }, []);

  useEffect(() => {
    let frame = 0;
    const elementosObservados = new Set();
    const observadorTamanho = window.ResizeObserver
      ? new ResizeObserver(() => agendarLeitura())
      : null;
    const observadorDom = new MutationObserver(() => agendarLeitura());

    function lerSuperficies() {
      frame = 0;
      const novas = coletarSuperficies();
      const encontrados = new Set(novas.map(({ elemento }) => elemento));
      elementosObservados.forEach((elemento) => {
        if (encontrados.has(elemento)) return;
        observadorTamanho?.unobserve(elemento);
        elementosObservados.delete(elemento);
      });
      encontrados.forEach((elemento) => {
        if (elementosObservados.has(elemento)) return;
        observadorTamanho?.observe(elemento);
        elementosObservados.add(elemento);
      });

      setPlataformas((atuais) =>
        mesmaGeometriaSuperficies(atuais, novas) ? atuais : novas
      );
    }

    function agendarLeitura() {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(lerSuperficies);
    }

    observadorDom.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", agendarLeitura, true);
    agendarLeitura();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observadorDom.disconnect();
      observadorTamanho?.disconnect();
      window.removeEventListener("scroll", agendarLeitura, true);
    };
  }, [location.pathname, viewport.altura, viewport.largura]);

  useEffect(
    () => () => {
      window.clearTimeout(timerMensagemRef.current);
      window.clearTimeout(timerOcultarRef.current);
      window.clearTimeout(fugaTimerRef.current);
      if (framePonteiroRef.current) cancelAnimationFrame(framePonteiroRef.current);
    },
    []
  );

  const mostrarMensagem = useCallback((texto, espontanea = false) => {
    if (espontanea) {
      if (Date.now() - ultimaMensagemEspontaneaRef.current < 90000) return;
      ultimaMensagemEspontaneaRef.current = Date.now();
    }

    window.clearTimeout(timerMensagemRef.current);
    setMensagem(texto);
    timerMensagemRef.current = window.setTimeout(() => setMensagem(""), 4200);
  }, []);

  const escolherDestino = useCallback((afastarDe = null) => {
    const atual = posicaoRef.current;
    const maxX = Math.max(0, viewport.largura - dimensoes.largura);
    const maxY = Math.max(0, viewport.altura - dimensoes.altura);
    const acoes = Array.from(
      document.querySelectorAll("button, a, input, select, textarea, [role='dialog'], [aria-modal='true']")
    );
    const candidatos = [];

    function adicionar(x, y, tipo) {
      const destinoX = limitar(x, 8, maxX);
      const destinoY = limitar(y, 8, maxY);
      if (Math.hypot(destinoX - atual.x, destinoY - atual.y) < 70) return;
      if (colisaoComAcao(destinoX, destinoY, dimensoes, acoes, mascoteRef.current)) return;
      candidatos.push({ x: destinoX, y: destinoY, tipo });
    }

    plataformas.forEach((plataforma) => {
      const esquerda = Math.max(8, plataforma.left + 12);
      const direita = Math.min(maxX, plataforma.right - dimensoes.largura - 12);
      const topo = plataforma.top - dimensoes.altura * 0.78;
      if (direita <= esquerda || topo < 8 || topo > maxY) return;

      for (let tentativa = 0; tentativa < 3; tentativa += 1) {
        adicionar(
          esquerda + Math.random() * (direita - esquerda),
          topo,
          plataforma.kind
        );
      }
    });

    if (!candidatos.length) {
      const chao = Math.max(8, maxY - (compacto ? 8 : 18));
      for (let tentativa = 0; tentativa < 10; tentativa += 1) {
        adicionar(12 + Math.random() * Math.max(1, maxX - 24), chao, "chao");
      }
    }

    if (!candidatos.length) return null;
    if (afastarDe) {
      candidatos.sort(
        (a, b) =>
          Math.hypot(b.x - afastarDe.x, b.y - afastarDe.y) -
          Math.hypot(a.x - afastarDe.x, a.y - afastarDe.y)
      );
      return candidatos[Math.floor(Math.random() * Math.min(3, candidatos.length))];
    }
    return candidatos[Math.floor(Math.random() * candidatos.length)];
  }, [compacto, dimensoes, plataformas, viewport]);

  const viajarAte = useCallback((destino, estadoForcado) => {
    if (!destino) return false;
    const atual = posicaoRef.current;
    const distanciaX = destino.x - atual.x;
    const distanciaY = destino.y - atual.y;
    const distancia = Math.hypot(distanciaX, distanciaY);
    if (distancia < 60) return false;

    const proximoEstado =
      estadoForcado ||
      (Math.abs(distanciaY) > 120
        ? Math.random() < 0.5
          ? "CLIMBING"
          : "JUMPING"
        : distancia > (compacto ? 180 : 300)
          ? "RUNNING"
          : "WALKING");
    const velocidade = proximoEstado === "RUNNING" ? 205 : 135;
    const duracao = limitar((distancia / velocidade) * 1000, 900, 4200);
    const posicao = converterParaPercentual(destino.x, destino.y, viewport, dimensoes);

    setSentido(distanciaX < 0 ? -1 : 1);
    setDuracaoMovimento(duracao);
    duracaoEstadoRef.current = duracao + 550;
    posicaoRef.current = { x: destino.x, y: destino.y };
    setPreferencias((atualPreferencias) => ({ ...atualPreferencias, posicao }));
    despachar(proximoEstado);

    if (
      destino.tipo?.includes("grafico") &&
      preferencias.mensagensEspontaneas &&
      Math.random() < 0.3
    ) {
      mostrarMensagem("Hmm, esse gráfico está interessante!", true);
    }
    return true;
  }, [
    compacto,
    dimensoes,
    mostrarMensagem,
    preferencias.mensagensEspontaneas,
    viewport,
  ]);

  const animar = useCallback((proximoEstado, duracao = 1500) => {
    duracaoEstadoRef.current = duracao;
    despachar(proximoEstado);
  }, []);

  const atualizarOlhar = useCallback((ponteiro) => {
    const retangulo = mascoteRef.current?.getBoundingClientRect();
    if (!ponteiro || !retangulo) return;

    const diferencaX = ponteiro.x - (retangulo.left + retangulo.width / 2);
    const diferencaY = ponteiro.y - (retangulo.top + retangulo.height / 2);
    rigRef.current?.style.setProperty(
      "--olhar-x",
      `${limitar(diferencaX / 18, -5, 5)}px`
    );
    rigRef.current?.style.setProperty(
      "--olhar-y",
      `${limitar(diferencaY / 18, -4, 4)}px`
    );
    rigRef.current?.style.setProperty(
      "--inclinacao-cabeca",
      `${limitar(diferencaX / 26, -8, 8)}deg`
    );

    const perto = Math.hypot(diferencaX, diferencaY) < 180;
    if (perto !== cursorProximoRef.current) {
      cursorProximoRef.current = perto;
      setCursorProximo(perto);
    }
  }, []);

  useEffect(() => {
    if (conversaAberta || menuAberto || modo !== "normal" || reduzido) return undefined;

    function processarPonteiro(evento) {
      if (evento.pointerType === "touch" || arrastoRef.current) return;
      ultimoPonteiroRef.current = { x: evento.clientX, y: evento.clientY };
      if (framePonteiroRef.current) return;

      framePonteiroRef.current = requestAnimationFrame(() => {
        framePonteiroRef.current = 0;
        if (arrastoRef.current) return;
        const ponteiro = ultimoPonteiroRef.current;
        atualizarOlhar(ponteiro);

        const agora = Date.now();
        const anterior = ultimaPosicaoMouseRef.current;
        const velocidade =
          ponteiro && anterior && agora > anterior.tempo
            ? Math.hypot(ponteiro.x - anterior.x, ponteiro.y - anterior.y) /
              (agora - anterior.tempo)
            : 0;
        if (ponteiro) {
          ultimaPosicaoMouseRef.current = {
            ...ponteiro,
            tempo: agora,
          };
        }

        const retangulo = mascoteRef.current?.getBoundingClientRect();
        const distancia = retangulo && ponteiro
          ? Math.hypot(
              ponteiro.x - (retangulo.left + retangulo.width / 2),
              ponteiro.y - (retangulo.top + retangulo.height / 2)
            )
          : Infinity;
        if (
          distancia < 72 &&
          velocidade > 1.1 &&
          agora - ultimaReacaoMouseRef.current > 4500
        ) {
          ultimaReacaoMouseRef.current = agora;
          animar("SURPRISED", 650);
          if (preferencias.mensagensEspontaneas) {
            mostrarMensagem("Uau, que susto! 😳", true);
          }
          window.clearTimeout(fugaTimerRef.current);
          fugaTimerRef.current = window.setTimeout(() => {
            if (arrastoRef.current || conversaAberta || modo !== "normal") return;
            viajarAte(escolherDestino(ponteiro), "RUNNING");
          }, 420);
        }
      });
    }

    function afastarPonteiro() {
      ultimoPonteiroRef.current = null;
      ultimaPosicaoMouseRef.current = null;
      cursorProximoRef.current = false;
      setCursorProximo(false);
      rigRef.current?.style.setProperty("--olhar-x", "0px");
      rigRef.current?.style.setProperty("--olhar-y", "0px");
      rigRef.current?.style.setProperty("--inclinacao-cabeca", "0deg");
    }

    window.addEventListener("pointermove", processarPonteiro, { passive: true });
    window.addEventListener("blur", afastarPonteiro);
    return () => {
      window.removeEventListener("pointermove", processarPonteiro);
      window.removeEventListener("blur", afastarPonteiro);
      if (framePonteiroRef.current) cancelAnimationFrame(framePonteiroRef.current);
      framePonteiroRef.current = 0;
    };
  }, [
    animar,
    atualizarOlhar,
    conversaAberta,
    escolherDestino,
    menuAberto,
    modo,
    preferencias.mensagensEspontaneas,
    reduzido,
    mostrarMensagem,
    viajarAte,
  ]);

  useEffect(() => {
    if (!ultimoPonteiroRef.current) return undefined;
    const frame = requestAnimationFrame(() => atualizarOlhar(ultimoPonteiroRef.current));
    return () => cancelAnimationFrame(frame);
  }, [atualizarOlhar, posicaoPixels.x, posicaoPixels.y]);

  const alterarPreferencia = (chave, valor) => {
    setPreferencias((atual) => ({ ...atual, [chave]: valor }));
  };

  const abrirConversa = useCallback(() => {
    setConversaAberta(true);
    setMenuAberto(false);
    window.clearTimeout(timerMensagemRef.current);
    setMensagem("");
    setCursorProximo(false);
    cursorProximoRef.current = false;
    rigRef.current?.style.setProperty("--olhar-x", "0px");
    rigRef.current?.style.setProperty("--olhar-y", "0px");
    rigRef.current?.style.setProperty("--inclinacao-cabeca", "0deg");
    despachar("ABRIR_CONVERSA");
  }, []);

  const fecharConversa = useCallback(() => {
    setConversaAberta(false);
    despachar("CLOSE_CHAT");
  }, []);

  useEffect(() => {
    if (!conversaAberta && !menuAberto && modo === "normal") return undefined;

    const aoTeclar = (evento) => {
      if (evento.key === "Escape") setMenuAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [conversaAberta, menuAberto, modo]);

  useEffect(() => {
    if (["idle", "dragged", "chatting"].includes(estado)) {
      return undefined;
    }

    const duracao = Math.max(
      850,
      duracaoEstadoRef.current || (estado === "sitting" ? 2600 : 1500)
    );
    const timer = window.setTimeout(() => despachar("RECUPERAR"), duracao);
    return () => window.clearTimeout(timer);
  }, [estado]);

  useEffect(() => {
    if (!preferencias.movimentoAutomatico || reduzido || conversaAberta || menuAberto || modo !== "normal") {
      return undefined;
    }

    let timer;
    function agendar(proximoIntervalo = 4200 + Math.random() * 7600) {
      timer = window.setTimeout(explorar, proximoIntervalo);
    }

    function explorar() {
      const elementoAtivo = document.activeElement;
      const digitando = elementoAtivo?.matches?.("input, textarea, select, [contenteditable='true']");
      const ocupado =
        document.hidden ||
        digitando ||
        arrastoRef.current ||
        document.querySelector('[aria-modal="true"], [role="dialog"]');
      if (ocupado || estado !== "idle") {
        agendar(5200);
        return;
      }

      const escolha = Math.random();
      if (escolha < 0.68) {
        const destino = escolherDestino();
        if (!viajarAte(destino)) animar("LOOKING", 1700);
      } else if (escolha < 0.8) {
        animar("SITTING", 2700);
      } else if (escolha < 0.9) {
        animar("CURIOUS", 1600);
      } else if (escolha < 0.96) {
        animar("DOUBTFUL", 1800);
      } else {
        animar("HAPPY", 1800);
      }

      if (Math.random() < 0.12 && preferencias.mensagensEspontaneas) {
        const indice = Math.floor(Math.random() * MENSAGENS_ESPONTANEAS.length);
        mostrarMensagem(MENSAGENS_ESPONTANEAS[indice], true);
      }
    }

    agendar();

    return () => window.clearTimeout(timer);
  }, [
    animar,
    escolherDestino,
    viajarAte,
    estado,
    conversaAberta,
    preferencias.movimentoAutomatico,
    menuAberto,
    modo,
    mostrarMensagem,
    preferencias.mensagensEspontaneas,
    reduzido,
    viewport,
  ]);

  useEffect(() => {
    if (caminhoAnteriorRef.current === location.pathname) return;
    caminhoAnteriorRef.current = location.pathname;
    if (modo !== "normal" || conversaAberta || menuAberto) return;

    animar("LOOKING", 1700);
    if (!preferencias.mensagensEspontaneas) return;
    if (location.pathname.includes("intervencao")) {
      mostrarMensagem("Ei, não esquece de verificar os alunos em risco!", true);
    } else if (location.pathname.includes("frequencia") || location.pathname.includes("alunos")) {
      mostrarMensagem("Estou de olho nas frequências! 👀", true);
    } else if (Math.random() < 0.45) {
      mostrarMensagem("Tudo certo por aqui!", true);
    }
  }, [
    conversaAberta,
    animar,
    location.pathname,
    modo,
    menuAberto,
    mostrarMensagem,
    preferencias.mensagensEspontaneas,
  ]);

  useEffect(() => {
    if (!menuAberto) return undefined;
    const fecharAoClicarFora = (evento) => {
      if (!mascoteRef.current?.contains(evento.target)) setMenuAberto(false);
    };
    document.addEventListener("pointerdown", fecharAoClicarFora);
    return () => document.removeEventListener("pointerdown", fecharAoClicarFora);
  }, [menuAberto]);

  function iniciarArrasto(evento) {
    if (evento.button !== 0) return;
    const raiz = mascoteRef.current;
    if (!raiz) return;
    const retangulo = raiz.getBoundingClientRect();
    arrastoRef.current = {
      pointerId: evento.pointerId,
      inicioX: evento.clientX,
      inicioY: evento.clientY,
      origemX: retangulo.left,
      origemY: retangulo.top,
      destinoX: retangulo.left,
      destinoY: retangulo.top,
      iniciou: false,
    };
    setCursorProximo(false);
    cursorProximoRef.current = false;
    window.clearTimeout(fugaTimerRef.current);
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }

  function moverArrasto(evento) {
    const arrasto = arrastoRef.current;
    if (!arrasto || arrasto.pointerId !== evento.pointerId) return;
    const deslocamentoX = evento.clientX - arrasto.inicioX;
    const deslocamentoY = evento.clientY - arrasto.inicioY;

    if (!arrasto.iniciou && Math.hypot(deslocamentoX, deslocamentoY) < 5) return;
    if (!arrasto.iniciou) {
      arrasto.iniciou = true;
      setMensagem("");
      despachar("INICIAR_ARRASTO");
    }

    const x = limitar(
      arrasto.origemX + deslocamentoX,
      0,
      Math.max(0, viewport.largura - dimensoes.largura)
    );
    const y = limitar(
      arrasto.origemY + deslocamentoY,
      0,
      Math.max(0, viewport.altura - dimensoes.altura)
    );
    mascoteRef.current.style.left = `${x}px`;
    mascoteRef.current.style.top = `${y}px`;
    posicaoRef.current = { x, y };
    arrasto.destinoX = x;
    arrasto.destinoY = y;
  }

  function finalizarArrasto(evento) {
    const arrasto = arrastoRef.current;
    if (!arrasto || arrasto.pointerId !== evento.pointerId) return;
    arrastoRef.current = null;

    if (arrasto.iniciou) {
      ignorarCliqueRef.current = true;
      const posicao = converterParaPercentual(
        arrasto.destinoX,
        arrasto.destinoY,
        viewport,
        dimensoes
      );
      setPreferencias((atual) => ({ ...atual, posicao }));
      duracaoEstadoRef.current = 1100;
      despachar("FINALIZAR_ARRASTO");
      mostrarMensagem("Gostei daqui! ✨");
      window.setTimeout(() => {
        ignorarCliqueRef.current = false;
      }, 0);
    }
  }

  function reagirAoClique(evento) {
    if (ignorarCliqueRef.current) {
      evento.preventDefault();
      ignorarCliqueRef.current = false;
      return;
    }

    const agora = Date.now();
    cliquesRapidosRef.current = agora - cliqueAnteriorRef.current < 700
      ? cliquesRapidosRef.current + 1
      : 1;
    cliqueAnteriorRef.current = agora;

    if (cliquesRapidosRef.current >= 3) {
      cliquesRapidosRef.current = 0;
      animar("SURPRISED", 1300);
      mostrarMensagem("Eita! Clique mais devagar 😅");
      return;
    }

    animar(indiceMensagemRef.current % 3 === 0 ? "HAPPY" : "INTERACTING", 1400);
    mostrarMensagem(MENSAGENS_CLIQUE[indiceMensagemRef.current % MENSAGENS_CLIQUE.length]);
    indiceMensagemRef.current += 1;
  }

  function reposicionar() {
    setPreferencias((atual) => ({ ...atual, posicao: POSICAO_INICIAL }));
    duracaoEstadoRef.current = 900;
    despachar("RECUPERAR");
    setMenuAberto(false);
  }

  function restaurar() {
    window.clearTimeout(timerOcultarRef.current);
    setModo("normal");
  }

  function ocultarTemporariamente() {
    setModo("oculto");
    setMenuAberto(false);
    timerOcultarRef.current = window.setTimeout(() => setModo("normal"), 10 * 60 * 1000);
  }

  const posicaoMenu = {
    right: preferencias.posicao.x > 50 ? 0 : "auto",
    left: preferencias.posicao.x <= 50 ? 0 : "auto",
    bottom: preferencias.posicao.y >= 35 ? "calc(100% + 8px)" : "auto",
    top: preferencias.posicao.y < 35 ? "calc(100% + 8px)" : "auto",
  };

  const posicaoBalao = {
    right: preferencias.posicao.x > 50 ? 0 : "auto",
    left: preferencias.posicao.x <= 50 ? 0 : "auto",
    bottom: preferencias.posicao.y >= 35 ? "calc(100% + 4px)" : "auto",
    top: preferencias.posicao.y < 35 ? "calc(100% + 4px)" : "auto",
  };
  return (
    <>
      {modo === "normal" && (
        <div
          ref={mascoteRef}
          className={`mascote-flutuante${compacto ? " mascote-flutuante--compacto" : ""}`}
          data-estado={estado}
          data-arrastando={estado === "dragged"}
          style={{
            left: `${posicaoPixels.x}px`,
            top: `${posicaoPixels.y}px`,
            "--sentido": sentido,
            "--duracao-movimento": `${duracaoMovimento}ms`,
          }}
          onPointerMove={moverArrasto}
          onPointerUp={finalizarArrasto}
          onPointerCancel={finalizarArrasto}
        >
          <button
            type="button"
            className="mascote-personagem"
            aria-label="Mascote PresenSee. Clique para receber uma reação ou arraste para reposicionar."
            onPointerDown={iniciarArrasto}
            onClick={reagirAoClique}
            style={{ "--sentido": sentido }}
          >
            <MascoteRig elementRef={rigRef} estado={estado} olharProximo={cursorProximo} />
          </button>

          <button
            type="button"
            className="mascote-atalho-chat"
            onClick={abrirConversa}
            aria-label="Abrir conversa com o assistente PresenSee"
            aria-expanded={conversaAberta}
            title="Conversar com o assistente"
          >
            <span aria-hidden="true">✦</span>
          </button>
          <button
            type="button"
            className="mascote-atalho-config"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            aria-label="Configurações do mascote"
            aria-expanded={menuAberto}
            title="Configurações do mascote"
          >
            <span aria-hidden="true">⚙</span>
          </button>

          {mensagem && (
            <div className="mascote-balao" style={posicaoBalao}>
              {mensagem}
            </div>
          )}

          {menuAberto && (
            <section
              className="mascote-configuracoes"
              style={posicaoMenu}
              aria-label="Configurações do mascote"
            >
              <strong>Meu jeitinho</strong>
              <label>
                <input
                  type="checkbox"
                  checked={preferencias.movimentoAutomatico}
                  onChange={(evento) =>
                    alterarPreferencia("movimentoAutomatico", evento.target.checked)
                  }
                  disabled={reduzido}
                />
                Movimentação automática
              </label>
              {reduzido && (
                <small className="mascote-preferencia-nota">
                  Pausada pela preferência de movimento reduzido do sistema.
                </small>
              )}
              <label>
                <input
                  type="checkbox"
                  checked={preferencias.mensagensEspontaneas}
                  onChange={(evento) =>
                    alterarPreferencia("mensagensEspontaneas", evento.target.checked)
                  }
                />
                Mensagens espontâneas
              </label>
              <button type="button" onClick={abrirConversa}>
                Abrir conversa
              </button>
              <button type="button" onClick={reposicionar}>
                Voltar ao canto
              </button>
              <button type="button" onClick={() => setModo("minimizado")}>
                Minimizar por enquanto
              </button>
              <button type="button" onClick={ocultarTemporariamente}>
                Ocultar por 10 minutos
              </button>
            </section>
          )}
        </div>
      )}

      {modo !== "normal" && (
        <div className="mascote-restaurar">
          <button type="button" onClick={restaurar}>
            Mostrar mascote
          </button>
          <button
            type="button"
            onClick={() => {
              restaurar();
              abrirConversa();
            }}
          >
            Abrir assistente
          </button>
        </div>
      )}

      <ChatAssistente aberto={conversaAberta} onFechar={fecharConversa} />
    </>
  );
}
