import { useEffect, useState, useCallback } from "react";
import { getUsuario } from "../services/auth";
import api from "../services/api";

export function useComunicadosNotificacoes() {
    const usuario = getUsuario();
    const usuarioId = usuario?.id || usuario?._id || "padrao";
    const escolaId = usuario?.escolaId || usuario?.schoolId || null;
    
    const [comunicados, setComunicados] = useState([]);
    const [versao, setVersao] = useState(0);

    // Inicia o estado lendo do localStorage para persistir as leituras por utilizador
    const [lidos, setLidos] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(`comunicados_lidos_${usuarioId}`)) || [];
        } catch {
            return [];
        }
    });

    const buscarComunicados = useCallback(async () => {
        try {
            const response = await api.get("/comunicados");
            if (response?.data) {
                setComunicados(Array.isArray(response.data) ? response.data : []);
            }
        } catch (error) {
            console.error("Erro ao buscar comunicados da API:", error);
        }
    }, []);

    useEffect(() => {
        buscarComunicados();
        
        // Atualiza a cada 60 segundos automaticamente
        const intervalo = setInterval(buscarComunicados, 60000);
        return () => clearInterval(intervalo);
    }, [buscarComunicados, versao]);

    // Guarda no localStorage sempre que um comunicado for marcado como lido
    useEffect(() => {
        localStorage.setItem(`comunicados_lidos_${usuarioId}`, JSON.stringify(lidos));
    }, [lidos, usuarioId]);

    const marcarLido = (id) => {
        setLidos((anteriores) => [...new Set([...anteriores, id])]);
    };

    const atualizar = () => setVersao((v) => v + 1);

    return {
        comunicados,
        lidos,
        escolaId,
        versao,
        marcarLido,
        atualizar
    };
}