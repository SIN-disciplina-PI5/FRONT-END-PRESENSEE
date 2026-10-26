import { useEffect, useState } from "react";
import { getUsuario } from "../services/auth";
import { COMUNICADOS_EVENTO, comunicadosParaEscola, getComunicadosLidos, localizarEscolaUsuario, marcarComunicadoLido } from "../painel-administrativo/services/comunicadosDemo";

export function useComunicadosNotificacoes() {
    const usuario = getUsuario();
    const { escolaId, usuarioId } = localizarEscolaUsuario(usuario);
    const [versao, setVersao] = useState(0);
    useEffect(() => {
        const atualizar = () => setVersao((atual) => atual + 1);
        window.addEventListener(COMUNICADOS_EVENTO, atualizar);
        window.addEventListener("storage", atualizar);
        const intervalo = setInterval(atualizar, 60000);
        return () => {
            window.removeEventListener(COMUNICADOS_EVENTO, atualizar);
            window.removeEventListener("storage", atualizar);
            clearInterval(intervalo);
        };
    }, []);
    const comunicados = comunicadosParaEscola(escolaId);
    const lidos = getComunicadosLidos(escolaId, usuarioId);
    return {
        comunicados,
        lidos,
        escolaId,
        versao,
        marcarLido: (id) => marcarComunicadoLido(escolaId, usuarioId, id)
    };
}
