
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "presensee_graficos_personalizados";
const GraficosContext = createContext(null);

function carregarSalvos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
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
      criadoEm: new Date().toISOString(),
    };

    setGraficos((prev) => [novo, ...prev]);
    return novo;
  }, []);

  const alterarTamanhoGrafico = useCallback((id, tamanho) => {
    const tamanhosValidos = ["pequeno", "medio", "grande"];

    if (!tamanhosValidos.includes(tamanho)) return;

    setGraficos((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, tamanho } : g
      )
    );
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
