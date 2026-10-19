// Dados fictícios compartilhados entre Alunos, Perfil e Diário do Monitor.
// Cada uma das 9 turmas contém exatamente 20 estudantes.
export const TIPOS_INTERVENCAO = [
  "Conversa Individual",
  "Contato com responsável",
  "Encaminhamento",
];

// Preserve os quatro registros originais: IDs e matrículas são usados
// pelas rotas de perfil, notificações e intervenções demonstrativas.
const ALUNOS_ORIGINAIS = [
  {
    id: 1,
    nome: "Cirilo Santos",
    nomeCompleto: "Cirilo Santos Ferreira",
    responsaveis: [
      { nome: "Maria Santos", parentesco: "Mãe", telefone: "(81) 90000-0001" },
      { nome: "José Ferreira", parentesco: "Pai", telefone: "(81) 90000-0002" },
    ],
    historicoFaltas: [
      { data: "2026-09-11", justificada: false },
      { data: "2026-09-10", justificada: false },
      { data: "2026-09-09", justificada: false },
      { data: "2026-09-02", justificada: true },
    ],
    observacoes: "Falta principalmente às segundas e sextas. A família relatou dificuldade de transporte.",
    resultadoEsperado: "Frequência mínima de 75% até o fim do bimestre.",
    resultadoObtido: "66% de frequência, com 3 faltas seguidas em setembro.",
    turma: "3º Ano A", status: "Em Acompanhamento", risco: 77, frequencia: 66,
    faltas: 16, matricula: "20240117", email: "cirilo.santos@email.com",
    pendencias: ["Verificar frequência", "Entrar em contato com responsável"],
  },
  {
    id: 2,
    nome: "Gabriel Soares",
    nomeCompleto: "Gabriel Soares Lima",
    responsaveis: [
      { nome: "Carlos Soares", parentesco: "Pai", telefone: "(81) 90000-0003" },
    ],
    historicoFaltas: [
      { data: "2026-09-08", justificada: true },
      { data: "2026-08-27", justificada: false },
    ],
    observacoes: "Queda de frequência após mudança de turno da família.",
    resultadoEsperado: "Manter a frequência acima de 80%.",
    resultadoObtido: "78% de frequência, em leve recuperação.",
    turma: "1º Ano A", status: "Em Acompanhamento", risco: 58, frequencia: 78,
    faltas: 9, matricula: "20240232", email: "gabriel.soares@email.com",
    pendencias: ["Verificar frequência"],
  },
  {
    id: 3,
    nome: "Pedro Henrique",
    nomeCompleto: "Pedro Henrique Alves",
    responsaveis: [
      { nome: "Ana Henrique", parentesco: "Mãe", telefone: "(81) 90000-0004" },
    ],
    historicoFaltas: [
      { data: "2026-09-10", justificada: false },
      { data: "2026-09-04", justificada: false },
      { data: "2026-08-20", justificada: true },
    ],
    observacoes: "Relatou problemas com o transporte. Contato com a responsável ainda pendente.",
    resultadoEsperado: "Retornar à frequência mínima de 75%.",
    resultadoObtido: "73% de frequência, ainda abaixo do mínimo.",
    turma: "2º Ano B", status: "Em Acompanhamento", risco: 64, frequencia: 73,
    faltas: 12, matricula: "20240345", email: "pedro.henrique@email.com",
    pendencias: ["Entrar em contato com responsável"],
  },
  {
    id: 4,
    nome: "Miguel Augusto",
    nomeCompleto: "Miguel Augusto Lima de Oliveira",
    responsaveis: [
      { nome: "Paulo Augusto", parentesco: "Pai", telefone: "(81) 90000-0005" },
    ],
    historicoFaltas: [
      { data: "2026-09-12", justificada: false },
      { data: "2026-09-05", justificada: true },
    ],
    observacoes: "Baixa motivação nas últimas semanas. Encaminhado ao setor pedagógico.",
    resultadoEsperado: "Frequência mínima de 75% e melhora nas notas.",
    resultadoObtido: "70% de frequência, sem melhora nas notas até agora.",
    turma: "3º Ano A", status: "Em Acompanhamento", risco: 71, frequencia: 70,
    faltas: 13, matricula: "20240456", email: "miguel.augusto@email.com",
    pendencias: [],
  },
];

export const NOMES_TURMAS = [
  "1º Ano A", "1º Ano B", "1º Ano C",
  "2º Ano A", "2º Ano B", "2º Ano C",
  "3º Ano A", "3º Ano B", "3º Ano C",
];

// Combinações determinísticas: os mesmos nomes e identificadores após recarregar.
// Domínios .example são reservados para documentação e não pertencem a pessoas reais.
const NOMES_FEMININOS = [
  "Ana Clara", "Alice", "Amanda", "Amélia", "Beatriz", "Bianca", "Brenda", "Camila",
  "Carolina", "Cecília", "Clara", "Débora", "Eduarda", "Eloá", "Emilly", "Esther",
  "Fernanda", "Gabriela", "Giovana", "Heloísa", "Helena", "Isabela", "Jéssica", "Júlia",
  "Karen", "Larissa", "Laura", "Letícia", "Lívia", "Lorena", "Luana", "Ludmila",
  "Manuela", "Maria Eduarda", "Mariana", "Melissa", "Milena", "Mirella", "Natália", "Nicole",
  "Olívia", "Paloma", "Raquel", "Rebeca", "Sabrina", "Samara", "Sara", "Sofia",
  "Tainá", "Talita", "Valentina", "Vitória", "Yasmin", "Yohana",
];

const NOMES_MASCULINOS = [
  "Arthur", "André", "Antônio", "Bernardo", "Bruno", "Caio", "Carlos Eduardo", "Cauã",
  "César", "Daniel", "Davi", "Diego", "Enzo", "Erick", "Felipe", "Fernando",
  "Francisco", "Guilherme", "Gustavo", "Heitor", "Henrique", "Hugo", "Igor", "João Gabriel",
  "João Miguel", "José Pedro", "Kauê", "Leandro", "Leonardo", "Lucas", "Luiz Felipe", "Marcelo",
  "Matheus", "Murilo", "Nicolas", "Otávio", "Paulo", "Rafael", "Raul", "Renan",
  "Ricardo", "Roberto", "Samuel", "Thiago", "Tomás", "Vitor", "Vinícius", "Wesley",
  "William", "Yago", "Yuri",
];

const SOBRENOMES = [
  "Albuquerque", "Almeida", "Amaral", "Andrade", "Araújo", "Assis", "Azevedo", "Barbosa",
  "Barros", "Batista", "Bezerra", "Borges", "Brandão", "Brito", "Cabral", "Campos",
  "Cardoso", "Carvalho", "Cavalcante", "Coelho", "Correia", "Costa", "Cruz", "Dantas",
  "Dias", "Duarte", "Farias", "Fernandes", "Ferreira", "Figueiredo", "Freitas", "Gomes",
  "Gonçalves", "Lacerda", "Leite", "Lima", "Lopes", "Machado", "Marques", "Medeiros",
  "Melo", "Mendes", "Monteiro", "Moraes", "Moreira", "Nascimento", "Nogueira", "Oliveira",
  "Paiva", "Pereira", "Pimentel", "Queiroz", "Ramos", "Ribeiro", "Rocha", "Rodrigues",
  "Santana", "Santos", "Silva", "Siqueira", "Soares", "Souza", "Tavares", "Teixeira",
  "Torres", "Vasconcelos", "Vieira", "Xavier",
];

const OBSERVACOES = [
  "Acompanhamento da frequência durante o bimestre.",
  "Faltas mais frequentes próximas ao início da semana; verificar justificativas.",
  "Apresenta oscilações pontuais de presença ao longo do semestre.",
  "Necessário conferir as ausências recentes com a equipe pedagógica.",
  "Boa participação nas aulas; seguir acompanhando a assiduidade.",
  "Responsável informado sobre a importância da frequência escolar.",
  "Monitorar a regularidade da presença nas próximas semanas.",
  "Acompanhamento preventivo de faltas em andamento.",
  "Registros de ausência distribuídos por diferentes meses.",
  "Recomenda-se confirmar o motivo das últimas ausências.",
];

function hash(numero) {
  let x = (numero * 1664525 + 1013904223) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 2246822507);
  x ^= x >>> 13;
  return x >>> 0;
}

function escolher(lista, semente) {
  return lista[hash(semente) % lista.length];
}

function semAcentos(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
}

function telefoneFicticio(numero) {
  // (81) 9 0000-XXXX: faixa artificial para impedir associação a um contato real.
  return `(81) 9 0000-${String(numero % 10000).padStart(4, "0")}`;
}

// Recorte demonstrativo de 150 dias letivos até 16/10/2026.
// Exclui finais de semana e feriados nacionais selecionados no período.
const FERIADOS = new Set([
  "2026-02-17", "2026-04-03", "2026-04-21", "2026-05-01",
  "2026-06-04", "2026-09-07", "2026-10-12",
]);
const DIAS_LETIVOS = (() => {
  const datas = [];
  const dia = new Date("2026-02-02T12:00:00");
  const limite = new Date("2026-10-16T12:00:00");
  while (dia <= limite) {
    const iso = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`;
    if (dia.getDay() !== 0 && dia.getDay() !== 6 && !FERIADOS.has(iso)) datas.push(iso);
    dia.setDate(dia.getDate() + 1);
  }
  return datas.slice(-150);
})();

export const TOTAL_DIAS_LETIVOS_DEMO = DIAS_LETIVOS.length;

function datasDeFaltas(id, total, datasPrioritarias = []) {
  // Determinístico, sem datas repetidas, sem finais de semana e em ordem decrescente.
  const priorizadas = datasPrioritarias.filter((d) => DIAS_LETIVOS.includes(d));
  const indices = [...DIAS_LETIVOS.keys()].sort((a, b) =>
    hash(id * 10007 + a * 79) - hash(id * 10007 + b * 79)
  );
  const usadas = new Set(priorizadas);
  for (const indice of indices) {
    if (usadas.size >= total) break;
    usadas.add(DIAS_LETIVOS[indice]);
  }
  return [...usadas].sort().reverse().slice(0, total).map((data, indice) => ({
    data,
    justificada: datasPrioritarias.includes(data) ? false : hash(id * 503 + indice) % 11 === 0,
  }));
}

function riscoPelaFrequencia(frequencia) {
  // 90–100%: baixo; 75–89%: médio; abaixo de 75%: alto.
  if (frequencia >= 90) return Math.round(10 + (100 - frequencia) * 2.5);
  if (frequencia >= 75) return Math.round(40 + (89 - frequencia) * 2);
  return Math.min(100, Math.round(70 + (74 - frequencia) * 1.15));
}

function situacaoPelaFrequencia(frequencia) {
  return frequencia >= 90 ? "Regular" : frequencia >= 75 ? "Em atenção" : "Em Acompanhamento";
}

function criarAlunoFicticio(id, turma, indiceNaTurma, indiceTurma) {
  const nomes = id % 2 ? NOMES_FEMININOS : NOMES_MASCULINOS;
  const primeiro = escolher(nomes, id * 17 + indiceTurma * 13);
  const sobrenome = escolher(SOBRENOMES, id * 29 + indiceNaTurma * 31);
  let ultimo = escolher(SOBRENOMES, id * 41 + indiceTurma * 47);
  if (ultimo === sobrenome) ultimo = SOBRENOMES[(SOBRENOMES.indexOf(ultimo) + 17) % SOBRENOMES.length];
  const nomeCompleto = `${primeiro} ${sobrenome} ${ultimo}`;
  const nome = `${primeiro} ${sobrenome}`;
  // Perfil heterogêneo e estável, com frequências de 60 a 100%.
  const frequenciaAlvo = 60 + (hash(id * 17 + indiceTurma * 91) % 41);
  const faltas = Math.round(TOTAL_DIAS_LETIVOS_DEMO * (100 - frequenciaAlvo) / 100);
  const frequencia = Math.round(100 * (TOTAL_DIAS_LETIVOS_DEMO - faltas) / TOTAL_DIAS_LETIVOS_DEMO);
  const risco = riscoPelaFrequencia(frequencia);
  const matricula = String(20260000 + id);
  const nomesResponsaveis = id % 2 ? NOMES_MASCULINOS : NOMES_FEMININOS;
  const nomeResponsavel = `${escolher(nomesResponsaveis, id * 83)} ${ultimo}`;
  const segundoResponsavel = `${escolher(id % 2 ? NOMES_FEMININOS : NOMES_MASCULINOS, id * 89)} ${sobrenome}`;
  const dominios = ["gmail.example", "outlook.example", "hotmail.example", "yahoo.example"];
  const emailBase = semAcentos(`${primeiro}.${sobrenome}`);

  return {
    id,
    nome,
    nomeCompleto,
    turma,
    status: situacaoPelaFrequencia(frequencia),
    risco,
    frequencia,
    faltas,
    matricula,
    email: `${emailBase}.${String(id).padStart(3, "0")}@${dominios[id % dominios.length]}`,
    telefone: telefoneFicticio(2000 + id),
    responsaveis: [
      { nome: nomeResponsavel, parentesco: id % 2 ? "Pai" : "Mãe", telefone: telefoneFicticio(3000 + id) },
      ...(id % 4 === 0 ? [{ nome: segundoResponsavel, parentesco: id % 2 ? "Mãe" : "Pai", telefone: telefoneFicticio(4000 + id) }] : []),
    ],
    historicoFaltas: datasDeFaltas(id, faltas),
    observacoes: `${OBSERVACOES[id % OBSERVACOES.length]} (Dados fictícios.)`,
    resultadoEsperado: "Manter frequência de pelo menos 90% e acompanhar o desempenho escolar.",
    resultadoObtido: `${frequencia}% de frequência e ${faltas} faltas em ${TOTAL_DIAS_LETIVOS_DEMO} dias letivos de referência.`,
    pendencias: frequencia < 75 ? ["Verificar ausências recentes", "Contatar responsável"] :
      frequencia < 90 ? ["Acompanhar frequência"] : [],
  };
}

// Conserva quatro alunos originais, suas matrículas e IDs, usados por outras telas.
// Atualiza contato, histórico e risco para ficarem coerentes com a frequência.
const ALUNOS_ORIGINAIS_AJUSTADOS = ALUNOS_ORIGINAIS.map((aluno) => {
  const faltas = Math.round(TOTAL_DIAS_LETIVOS_DEMO * (100 - aluno.frequencia) / 100);
  const frequencia = Math.round(100 * (TOTAL_DIAS_LETIVOS_DEMO - faltas) / TOTAL_DIAS_LETIVOS_DEMO);
  const datasOriginais = aluno.historicoFaltas.map((registro) => registro.data);
  const historicoFaltas = datasDeFaltas(aluno.id, faltas, datasOriginais).map((registro) => {
    const original = aluno.historicoFaltas.find((d) => d.data === registro.data);
    return original ? { ...registro, justificada: original.justificada } : registro;
  });
  const emailBase = semAcentos(aluno.nomeCompleto.split(" ").slice(0, 2).join("."));
  return {
    ...aluno,
    status: situacaoPelaFrequencia(frequencia),
    risco: riscoPelaFrequencia(frequencia),
    frequencia,
    faltas,
    telefone: telefoneFicticio(2000 + aluno.id),
    email: `${emailBase}.${aluno.id}@gmail.example`,
    responsaveis: aluno.responsaveis.map((responsavel, indice) => ({
      ...responsavel,
      telefone: telefoneFicticio(3000 + aluno.id * 10 + indice),
    })),
    historicoFaltas,
    resultadoObtido: `${frequencia}% de frequência e ${faltas} faltas em ${TOTAL_DIAS_LETIVOS_DEMO} dias letivos de referência.`,
  };
});

// Distribui as turmas, com exatos 20 estudantes em cada uma.
let proximoId = 5;
export const alunos = NOMES_TURMAS.flatMap((turma, indiceTurma) => {
  const existentes = ALUNOS_ORIGINAIS_AJUSTADOS.filter((aluno) => aluno.turma === turma);
  const faltantes = 20 - existentes.length;
  const gerados = Array.from({ length: faltantes }, (_, indice) =>
    criarAlunoFicticio(proximoId++, turma, existentes.length + indice, indiceTurma)
  );
  return [...existentes, ...gerados];
});

// Histórico original preservado para os perfis e Diário do Monitor.
export const intervencoes = [
  { id: 1, alunoId: 1, tipo: "Conversa Individual", data: "2026-09-14", descricao: "Conversa sobre as faltas do último mês." },
  { id: 2, alunoId: 4, tipo: "Contato com responsável", data: "2026-09-12", descricao: "Responsável informado sobre o risco de evasão." },
  { id: 3, alunoId: 3, tipo: "Conversa Individual", data: "2026-09-10", descricao: "Aluno relatou dificuldade de deslocamento." },
  { id: 4, alunoId: 2, tipo: "Encaminhamento", data: "2026-09-08", descricao: "Encaminhado para reforço escolar." },
  { id: 5, alunoId: 4, tipo: "Conversa Individual", data: "2026-09-05", descricao: "Conversa sobre desempenho e motivação." },
  { id: 6, alunoId: 3, tipo: "Contato com responsável", data: "2026-09-03", descricao: "Ligação sem resposta; nova tentativa agendada." },
  { id: 7, alunoId: 1, tipo: "Conversa Individual", data: "2026-08-29", descricao: "Reunião com a mãe sobre a frequência." },
  { id: 8, alunoId: 2, tipo: "Conversa Individual", data: "2026-08-26", descricao: "Acompanhamento de rotina." },
  { id: 9, alunoId: 4, tipo: "Encaminhamento", data: "2026-08-22", descricao: "Encaminhado ao setor pedagógico." },
  { id: 10, alunoId: 3, tipo: "Conversa Individual", data: "2026-08-19", descricao: "Primeira conversa após as faltas seguidas." },
  { id: 11, alunoId: 1, tipo: "Conversa Individual", data: "2026-08-15", descricao: "Primeira conversa sobre as ausências." },
  { id: 12, alunoId: 2, tipo: "Contato com responsável", data: "2026-08-12", descricao: "Aviso sobre queda de frequência." },
  { id: 13, alunoId: 4, tipo: "Conversa Individual", data: "2026-08-08", descricao: "Registro inicial de acompanhamento." },
  { id: 14, alunoId: 3, tipo: "Encaminhamento", data: "2026-08-05", descricao: "Encaminhado ao serviço social." },
];

export const turmas = NOMES_TURMAS.map((nome) => {
  const estudantes = alunos.filter((aluno) => aluno.turma === nome);
  return {
    nome,
    alunos: estudantes.length,
    risco: Math.round(estudantes.reduce((total, aluno) => total + aluno.risco, 0) / estudantes.length),
  };
});

export const anotacoes = [
  { id: 1, data: "2026-09-14", texto: "Cirilo aceitou conversar sobre as faltas. Combinar retorno em duas semanas." },
  { id: 2, data: "2026-09-10", texto: "Pedro Henrique relatou problemas com o transporte." },
  { id: 3, data: "2026-09-05", texto: "Revisar a lista de pendências da turma 3º Ano A." },
];

export const resumoDiario = {
  riscoEvasaoGeral: 66,
  desempenhoMonitor: 66,
};

export function formatarData(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function dataHoje() {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${hoje.getFullYear()}-${mes}-${dia}`;
}

export function nivelRisco(percentual) {
  return percentual >= 70 ? "alto" : percentual >= 40 ? "medio" : "baixo";
}
