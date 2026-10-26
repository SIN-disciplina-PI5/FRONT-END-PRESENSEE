const KEY = "presensee_admin_comunicados_demo_v1";
const READ_KEY = "presensee_comunicados_lidos_demo_v1";
export const COMUNICADOS_EVENTO = "presensee-comunicados-atualizados";
export const TIPOS_COMUNICADO = ["Informativo", "Manutenção", "Atualização", "Urgente"];
export const PUBLICOS_COMUNICADO = ["Todas as escolas", "Escolas específicas"];

function lerJSON(chave, alternativa) {
    try {
        const dado = JSON.parse(localStorage.getItem(chave));
        return dado ?? alternativa;
    } catch {
        return alternativa;
    }
}

export function getComunicados() {
    const dados = lerJSON(KEY, []);
    return Array.isArray(dados) ? dados : [];
}

export function salvarComunicados(dados) {
    localStorage.setItem(KEY, JSON.stringify(dados));
    window.dispatchEvent(new Event(COMUNICADOS_EVENTO));
}

export function comunicadoPublicado(comunicado, agora = Date.now()) {
    if (comunicado.status !== "Publicado") return false;
    if (comunicado.inicio && new Date(comunicado.inicio).getTime() > agora) return false;
    if (comunicado.fim && new Date(comunicado.fim).getTime() < agora) return false;
    return true;
}

export function comunicadosParaEscola(escolaId) {
    if (!escolaId) return [];
    return getComunicados()
        .filter((comunicado) => comunicadoPublicado(comunicado))
        .filter((comunicado) => comunicado.publico === "Todas as escolas" || comunicado.escolas.includes(String(escolaId)))
        .sort((a, b) => new Date(b.publicadoEm || b.criadoEm) - new Date(a.publicadoEm || a.criadoEm));
}

function chaveLeitura(escolaId, usuarioId) {
    return `${READ_KEY}:${String(escolaId)}:${String(usuarioId || "usuario")}`;
}

export function getComunicadosLidos(escolaId, usuarioId) {
    const dados = lerJSON(chaveLeitura(escolaId, usuarioId), []);
    return Array.isArray(dados) ? dados : [];
}

export function marcarComunicadoLido(escolaId, usuarioId, id) {
    if (!escolaId) return;
    const chave = chaveLeitura(escolaId, usuarioId);
    const lidos = getComunicadosLidos(escolaId, usuarioId);
    localStorage.setItem(chave, JSON.stringify([...new Set([...lidos, id])]));
    window.dispatchEvent(new Event(COMUNICADOS_EVENTO));
}

export function localizarEscolaUsuario(usuario) {
    const dados = usuario || {};
    const escolaId = dados.escolaId ?? dados.escola_id ?? dados.escola?.id ?? dados.instituicaoId ?? dados.instituicao_id;
    const usuarioId = dados.id ?? dados.usuarioId ?? dados.usuario_id ?? dados.email ?? dados.matricula;
    return { escolaId: escolaId == null ? null : String(escolaId), usuarioId: usuarioId == null ? null : String(usuarioId) };
}
