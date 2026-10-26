export const CHAMADOS_KEY = "presensee_chamados_demo";

export const STATUS = ["Aberto", "Em atendimento", "Aguardando resposta", "Resolvido", "Encerrado"];
export const PRIORIDADES = ["Baixa", "Média", "Alta", "Crítica"];
export const CATEGORIAS = ["Acesso", "Frequência", "Biometria", "Relatórios", "Cadastro", "Outros"];
export const RESPONSAVEIS = ["Não atribuído", "Equipe de suporte", "Administrador", "Equipe técnica"];
export const PRAZOS_HORAS = { Baixa: 72, Média: 48, Alta: 24, Crítica: 4 };

const iniciais = [
  { id: "CH-0001", titulo: "Erro ao registrar frequência", descricao: "Ao registrar a frequência dos alunos, o sistema apresenta uma mensagem de erro.", escola: "ETE Porto Digital", solicitante: "Gestor escolar", categoria: "Frequência", prioridade: "Alta", status: "Aberto", responsavel: "Não atribuído", criadoEm: "2026-10-24T09:30:00", atualizadoEm: "2026-10-24T09:30:00", mensagens: [], historico: [], anexos: [], notificacoes: [] },
  { id: "CH-0002", titulo: "Problema ao acessar o sistema", descricao: "O monitor não consegue entrar com suas credenciais.", escola: "Escola Exemplo", solicitante: "Monitor escolar", categoria: "Acesso", prioridade: "Média", status: "Em atendimento", responsavel: "Equipe de suporte", criadoEm: "2026-10-23T14:15:00", atualizadoEm: "2026-10-24T10:20:00", mensagens: [], historico: [], anexos: [], notificacoes: [] },
  { id: "CH-0003", titulo: "Dúvida sobre exportação de relatórios", descricao: "Como exportar relatórios em PDF?", escola: "ETE Porto Digital", solicitante: "Gestor escolar", categoria: "Relatórios", prioridade: "Baixa", status: "Resolvido", responsavel: "Administrador", criadoEm: "2026-10-21T11:00:00", atualizadoEm: "2026-10-22T16:40:00", mensagens: [{ id: "MSG-0001", autor: "Suporte PresenSee", texto: "A exportação está disponível na tela de Relatórios.", data: "2026-10-22T16:40:00", interno: false, anexos: [] }], historico: [], anexos: [], notificacoes: [], resolvidoEm: "2026-10-22T16:40:00" }
];

export function carregarChamados() {
  try {
    const bruto = localStorage.getItem(CHAMADOS_KEY);
    if (!bruto) return iniciais;
    const salvo = JSON.parse(bruto);
    if (!Array.isArray(salvo)) return iniciais;
    return salvo.map((c) => ({
      ...c,
      responsavel: c.responsavel || "Não atribuído",
      mensagens: Array.isArray(c.mensagens) ? c.mensagens : [],
      historico: Array.isArray(c.historico) ? c.historico : [],
      anexos: Array.isArray(c.anexos) ? c.anexos : [],
      notificacoes: Array.isArray(c.notificacoes) ? c.notificacoes : []
    }));
  } catch {
    return iniciais;
  }
}

export function prazoChamado(chamado, agora = Date.now()) {
  if (["Resolvido", "Encerrado"].includes(chamado.status)) return { estado: "finalizado", texto: "Finalizado" };
  const criado = new Date(chamado.criadoEm).getTime();
  if (!Number.isFinite(criado)) return { estado: "indefinido", texto: "Sem prazo" };
  const horas = PRAZOS_HORAS[chamado.prioridade] ?? 48;
  const limite = criado + horas * 3600000;
  const diferenca = limite - agora;
  if (diferenca < 0) return { estado: "atrasado", texto: `Atrasado ${Math.ceil(-diferenca / 3600000)}h` };
  if (diferenca < 3600000) return { estado: "proximo", texto: `${Math.max(1, Math.ceil(diferenca / 60000))} min restantes` };
  return { estado: "em-dia", texto: `${Math.ceil(diferenca / 3600000)}h restantes` };
}

export function dataTexto(valor) {
  const data = new Date(valor);
  return Number.isFinite(data.getTime()) ? data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Não informado";
}

export function registrarAlteracao(lista, id, modificacoes, autor = "Administrador") {
  const agora = new Date().toISOString();
  return lista.map((item) => {
    if (item.id !== id) return item;
    const eventos = [];
    for (const campo of ["status", "prioridade", "responsavel"]) {
      if (campo in modificacoes && item[campo] !== modificacoes[campo]) {
        eventos.push({ id: crypto.randomUUID(), data: agora, autor, tipo: "alteracao", texto: `${campo === "responsavel" ? "Responsável" : campo === "status" ? "Status" : "Prioridade"}: ${item[campo] || "Não definido"} → ${modificacoes[campo]}` });
      }
    }
    if (modificacoes.mensagem) eventos.push({ id: crypto.randomUUID(), data: agora, autor, tipo: modificacoes.mensagem.interno ? "nota" : "resposta", texto: modificacoes.mensagem.interno ? "Nota interna registrada" : "Resposta registrada" });
    if (modificacoes.avaliacao) eventos.push({ id: crypto.randomUUID(), data: agora, autor, tipo: "avaliacao", texto: `Atendimento avaliado com ${modificacoes.avaliacao} estrela(s)` });
    const atualizado = {
      ...item,
      ...Object.fromEntries(Object.entries(modificacoes).filter(([chave]) => !["mensagem"].includes(chave))),
      mensagens: modificacoes.mensagem ? [...item.mensagens, modificacoes.mensagem] : item.mensagens,
      historico: [...item.historico, ...eventos],
      atualizadoEm: agora
    };
    if (modificacoes.status === "Resolvido") atualizado.resolvidoEm = agora;
    if (modificacoes.status && !["Resolvido", "Encerrado"].includes(modificacoes.status)) atualizado.resolvidoEm = null;
    if (eventos.some((evento) => evento.tipo === "resposta")) {
      atualizado.notificacoes = [...item.notificacoes, { id: crypto.randomUUID(), data: agora, texto: "Nova resposta registrada (demonstração)", lida: false }];
    }
    return atualizado;
  });
}
