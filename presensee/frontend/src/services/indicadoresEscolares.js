
 // Fonte única de indicadores provisórios enquanto a API não estiver integrada.
import { alunos, NOMES_TURMAS } from "../data/diarioMock";

export function classificarRisco(frequencia) {
  const valor = Number(frequencia);
  if (!Number.isFinite(valor)) return "indefinido";
  if (valor >= 90) return "baixo";
  if (valor >= 75) return "medio";
  return "alto";
}

export const media = (valores) => valores.length
  ? Math.round(valores.reduce((soma, numero) => soma + numero, 0) / valores.length)
  : 0;

export function obterIndicadoresEscolares() {
  const estudantes = alunos.filter((aluno) =>
    Number.isFinite(Number(aluno.frequencia))
  );

  const totalAlunos = estudantes.length;

  const alunosRisco = estudantes.filter(
    (aluno) => classificarRisco(aluno.frequencia) === "medio"
  ).length;

  const alunosAltoRisco = estudantes.filter(
    (aluno) => classificarRisco(aluno.frequencia) === "alto"
  ).length;

  const alunosBaixoRisco = estudantes.filter(
    (aluno) => classificarRisco(aluno.frequencia) === "baixo"
  ).length;

  const taxaFrequenciaGeral = media(
    estudantes.map((aluno) => Number(aluno.frequencia))
  );

  const TURNOS_DEMONSTRACAO = {
    "1º Ano A": "Integral",
    "1º Ano B": "Integral",
    "1º Ano C": "Integral",
    "2º Ano A": "Integral",
    "2º Ano B": "Integral",
    "2º Ano C": "Integral",
    "3º Ano A": "Integral",
    "3º Ano B": "Integral",
    "3º Ano C": "Integral",
  };

  const turmas = NOMES_TURMAS.map((nome) => {
    const lista = estudantes.filter((aluno) => aluno.turma === nome);

    return {
      nome,
      turma: nome.replace(/º Ano /, ""),
      alunos: lista.length,
      frequencia: media(
        lista.map((aluno) => Number(aluno.frequencia))
      ),
      atencao: lista.filter(
        (aluno) => classificarRisco(aluno.frequencia) === "medio"
      ).length,
      altoRisco: lista.filter(
        (aluno) => classificarRisco(aluno.frequencia) === "alto"
      ).length,
      baixoRisco: lista.filter(
        (aluno) => classificarRisco(aluno.frequencia) === "baixo"
      ).length,
      curso: "Ensino Médio",
      turno: TURNOS_DEMONSTRACAO[nome],
    };
  });

  const faltasPorSemana = ["Seg", "Ter", "Qua", "Qui", "Sex"].map(
    (dia, indice) => ({
      dia,
      faltas: estudantes.reduce(
        (total, aluno) =>
          total + (aluno.historicoFaltas || []).filter((falta) => {
            const data = new Date(`${falta.data}T12:00:00`);
            return (
              !Number.isNaN(data.getTime()) &&
              data.getDay() === indice + 1
            );
          }).length,
        0
      ),
    })
  );

  // Frequência semanal demonstrativa baseada na média geral
  // e na distribuição das faltas presentes no mock.
  const mediaFaltasDia = media(
    faltasPorSemana.map(({ faltas }) => faltas)
  );

  const maiorContagem = Math.max(
    1,
    ...faltasPorSemana.map(({ faltas }) => faltas)
  );

  const frequenciaPorSemana = faltasPorSemana.map(
    ({ dia, faltas }) => ({
      dia,
      frequencia: Math.max(
        0,
        Math.min(
          100,
          Math.round(
            taxaFrequenciaGeral +
              ((mediaFaltasDia - faltas) / maiorContagem) * 10
          )
        )
      ),
    })
  );

  // EVOLUÇÃO DO RISCO DE EVASÃO
  // Histórico fictício com tendência de redução do risco.
  // Outubro representa o risco atual derivado da frequência.
  const riscoAtual = totalAlunos
    ? Math.round(
        estudantes.reduce(
          (soma, aluno) =>
            soma + (100 - Number(aluno.frequencia)),
          0
        ) / totalAlunos
      )
    : 0;

  const mesesHistorico = [
    "Out-25", "Nov-25","Dez-25", "Jan", "Fev", "Mar", "Abr","Mai", "Jun", "Jul", "Ago", "Set", "Out"
  ];

  // Variações maiores nos primeiros meses criam a curva
  // descendente, representando uma melhora ao longo do tempo.
  const variacoes = [60 ,60, 60 , 45 , 40, 45, 35, 35, 20, 15, 15, 10, 10];

  const evolucaoRisco = mesesHistorico.map(
    (periodo, indice) => ({
      periodo,
      risco: Math.max(
        0,
        Math.min(100, riscoAtual + variacoes[indice])
      ),
    })
  );

  return {
    evolucaoRisco,
    totalAlunos,
    alunosRisco,
    alunosAltoRisco,
    alunosBaixoRisco,
    taxaFrequenciaGeral,
    turmas,
    faltasPorSemana,
    frequenciaPorSemana,
  };
}
