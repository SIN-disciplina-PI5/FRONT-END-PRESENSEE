import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "presensee_graficos_personalizados";
const GraficosContext = createContext(null);

const ALTURAS_PADRAO = {
  pequeno: 200,
  medio: 270,
  grande: 360,
};

function carregarSalvos() {
  try {
    const lista = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(lista)
      ? lista.map((g) => ({
          tamanho: "pequeno",
          colunas: g.colunas || (g.tamanho === "grande" ? 3 : g.tamanho === "medio" ? 2 : 1),
          altura: g.altura || ALTURAS_PADRAO[g.tamanho || "pequeno"] || 220,
          ...g,
        }))
      : [];
  } catch {
    return [];
  }
}

export function GraficosProvider({ children }) {
  const [graficos, setGraficos] = useState(carregarSalvos);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(graficos));
  }, [graficos]);

  const adicionarGrafico = useCallback((spec) => {
    const novo = {
      ...spec,
      id: crypto.randomUUID(),
      tamanho: "pequeno",
      colunas: 1,
      altura: 220,
      criadoEm: new Date().toISOString(),
    };

    setGraficos((prev) => [novo, ...prev]);
    return novo;
  }, []);

  const alterarTamanhoGrafico = useCallback((id, tamanho) => {
    const tamanhosValidos = ["pequeno", "medio", "grande"];
    if (!tamanhosValidos.includes(tamanho)) return;

    const mapaColunas = { pequeno: 1, medio: 2, grande: 3 };

    setGraficos((prev) =>
      prev.map((g) =>
        g.id === id
          ? {
              ...g,
              tamanho,
              colunas: mapaColunas[tamanho],
              altura: ALTURAS_PADRAO[tamanho],
            }
          : g
      )
    );
  }, []);

  const atualizarGrafico = useCallback((id, alteracoes) => {
    setGraficos((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...alteracoes } : g))
    );
  }, []);

  const moverGrafico = useCallback((idOrigem, idDestino) => {
    if (!idOrigem || !idDestino || idOrigem === idDestino) return;
    setGraficos((prev) => {
      const idxOrigem = prev.findIndex((g) => g.id === idOrigem);
      const idxDestino = prev.findIndex((g) => g.id === idDestino);
      if (idxOrigem === -1 || idxDestino === -1) return prev;
      const copia = [...prev];
      const [item] = copia.splice(idxOrigem, 1);
      copia.splice(idxDestino, 0, item);
      return copia;
    });
  }, []);

  const removerGrafico = useCallback((id) => {
    setGraficos((prev) => prev.filter((g) => g.id !== id));
  }, []);

  return (
    <GraficosContext.Provider
      value={{
        graficos,
        adicionarGrafico,
        alterarTamanhoGrafico,
        atualizarGrafico,
        moverGrafico,
        removerGrafico,
      }}
    >
      {children}
    </GraficosContext.Provider>
  );
}

export function useGraficos() {
  const ctx = useContext(GraficosContext);
  if (!ctx) {
    throw new Error("useGraficos precisa estar dentro de <GraficosProvider>");
  }
  return ctx;
}