
import { useMemo, useState } from "react";
import { getLogs } from "../services/adminDemo";
import "../../styles/Alunos.css";
import "../styles/admin.css";
import "../styles/AdminAuditoria.css";

const TIPOS = ["Todas", "Cadastro", "Alteração", "Exclusão", "Outros"];

function classificarAcao(acao) {
  const valor = String(acao || "").toLocaleLowerCase("pt-BR");

  if (valor.includes("cadastrad")) return "Cadastro";
  if (valor.includes("excluíd") || valor.includes("excluid")) return "Exclusão";
  if (valor.includes("alterad")) return "Alteração";

  return "Outros";
}

function interpretarData(valor) {
  const partes = String(valor || "").match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/
  );

  if (!partes) return null;

  const [, dia, mes, ano, horas = "0", minutos = "0", segundos = "0"] = partes;

  const data = new Date(
    Number(ano),
    Number(mes) - 1,
    Number(dia),
    Number(horas),
    Number(minutos),
    Number(segundos)
  );

  if (
    data.getFullYear() !== Number(ano) ||
    data.getMonth() !== Number(mes) - 1 ||
    data.getDate() !== Number(dia)
  ) {
    return null;
  }

  return data;
}

function formatarDia(data) {
  if (!data) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(data);
}

function extrairDetalhes(acao) {
  const partes = String(acao || "").split(/:\s*(.*)/s);

  if (partes.length < 2 || !partes[1]) {
    return {
      titulo: String(acao || "Ação não informada"),
      descricao: ""
    };
  }

  return {
    titulo: partes[0],
    descricao: partes[1]
  };
}

function IconeAcao({ tipo }) {
  if (tipo === "Cadastro") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    );
  }

  if (tipo === "Alteração") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M20 7H7l3-3M4 17h13l-3 3M7 7l3 3M17 17l-3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (tipo === "Exclusão") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7h.01" strokeLinecap="round" />
    </svg>
  );
}

function exportarCSV(registros) {
  const linhas = [
    ["Data", "Tipo", "Ação", "Responsável"],
    ...registros.map((registro) => [
      registro.data || "",
      registro.tipo,
      registro.acao || "",
      "Superadmin (demo)"
    ])
  ];

  const conteudo = linhas
    .map((linha) =>
      linha
        .map((valor) => {
          const seguro = String(valor).replace(/^\s*[=+\-@\t\r]/, "'$&");
          return `"${seguro.replace(/"/g, '""')}"`;
        })
        .join(";")
    )
    .join("\r\n");

  const blob = new Blob(
    ["\uFEFF", conteudo],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "presensee-auditoria.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function AdminAuditoria() {
  const [logs] = useState(getLogs);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("Todas");
  const [ordenacao, setOrdenacao] = useState("recentes");
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [expandidos, setExpandidos] = useState([]);

  const registros = useMemo(() => {
    return logs.map((log, indice) => {
      const dataObj = interpretarData(log.data);
      const detalhes = extrairDetalhes(log.acao);

      return {
        ...log,
        chave: log.id || `registro-${indice}`,
        indice,
        dataObj,
        dia: formatarDia(dataObj),
        horario: dataObj
          ? dataObj.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit"
            })
          : "—",
        tipo: classificarAcao(log.acao),
        ...detalhes
      };
    });
  }, [logs]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    return registros.filter((registro) => {
      const correspondeTipo =
        tipo === "Todas" || registro.tipo === tipo;

      const texto = [
        registro.acao,
        registro.data,
        registro.tipo
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return correspondeTipo && texto.includes(termo);
    });
  }, [registros, busca, tipo]);

  const ordenados = useMemo(() => {
    return [...filtrados].sort((a, b) => {
      const dataA = a.dataObj?.getTime() ?? 0;
      const dataB = b.dataObj?.getTime() ?? 0;
      const diferenca = dataB - dataA;

      if (diferenca !== 0) {
        return ordenacao === "recentes"
          ? diferenca
          : -diferenca;
      }

      return ordenacao === "recentes"
        ? a.indice - b.indice
        : b.indice - a.indice;
    });
  }, [filtrados, ordenacao]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(ordenados.length / itensPorPagina)
  );

  const paginaAtual = Math.min(pagina, totalPaginas);

  const visiveis = ordenados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  const grupos = useMemo(() => {
    const resultado = [];

    visiveis.forEach((registro) => {
      let grupo = resultado.find((item) => item.dia === registro.dia);

      if (!grupo) {
        grupo = { dia: registro.dia, itens: [] };
        resultado.push(grupo);
      }

      grupo.itens.push(registro);
    });

    return resultado;
  }, [visiveis]);

  function atualizarFiltro(setter, valor) {
    setter(valor);
    setPagina(1);
  }

  function alternarDetalhes(chave) {
    setExpandidos((atual) =>
      atual.includes(chave)
        ? atual.filter((item) => item !== chave)
        : [...atual, chave]
    );
  }

  return (
    <div className="alunos-page admin-auditoria-page">
      <header className="alunos-header admin-auditoria-header">
        <div>
          <h1>Auditoria</h1>
          <p>
            Acompanhe o histórico de atividades administrativas
            realizadas no PresenSee.
          </p>
        </div>

        <button
          type="button"
          className="admin-auditoria-exportar"
          disabled={ordenados.length === 0}
          onClick={() => exportarCSV(ordenados)}
        >
          Exportar CSV
        </button>
      </header>

      <section className="alunos-filtros-panel admin-auditoria-filtros">
        <label className="alunos-busca">
          <span className="alunos-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 5 5" />
            </svg>
          </span>

          <input
            className="search-aluno"
            type="search"
            value={busca}
            placeholder="Pesquisar atividade ou escola..."
            aria-label="Pesquisar auditoria"
            onChange={(event) =>
              atualizarFiltro(setBusca, event.target.value)
            }
          />
        </label>

        <div className="alunos-filtro">
          <label htmlFor="auditoria-tipo">Tipo de ação</label>
          <select
            id="auditoria-tipo"
            value={tipo}
            onChange={(event) =>
              atualizarFiltro(setTipo, event.target.value)
            }
          >
            {TIPOS.map((item) => (
              <option key={item} value={item}>
                {item === "Todas" ? "Todas as ações" : item}
              </option>
            ))}
          </select>
        </div>

        <div className="alunos-filtro">
          <label htmlFor="auditoria-ordem">Ordenação</label>
          <select
            id="auditoria-ordem"
            value={ordenacao}
            onChange={(event) =>
              atualizarFiltro(setOrdenacao, event.target.value)
            }
          >
            <option value="recentes">Mais recentes</option>
            <option value="antigos">Mais antigos</option>
          </select>
        </div>
      </section>

      <section className="admin-auditoria-historico">
        <div className="admin-auditoria-historico-topo">
          <div>
            <h2>Histórico de atividades</h2>
            <p>Registros de operações administrativas</p>
          </div>
          <span>{filtrados.length} registros</span>
        </div>

        {grupos.length ? (
          <div className="admin-auditoria-timeline">
            {grupos.map((grupo, indice) => (
              <div className="admin-auditoria-grupo" key={`${grupo.dia}-${indice}`}>
                <h3>{grupo.dia}</h3>

                <div className="admin-auditoria-eventos">
                  {grupo.itens.map((registro) => {
                    const aberto = expandidos.includes(registro.chave);

                    return (
                      <article
                        key={registro.chave}
                        className="admin-auditoria-evento"
                      >
                        <span
                          className={`admin-auditoria-evento-icone ${registro.tipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
                          aria-hidden="true"
                        >
                          <IconeAcao tipo={registro.tipo} />
                        </span>

                        <div className="admin-auditoria-evento-corpo">
                          <div className="admin-auditoria-evento-principal">
                            <div className="admin-auditoria-evento-texto">
                              <strong>{registro.titulo}</strong>

                              {registro.descricao && (
                                <p>{registro.descricao}</p>
                              )}

                              <div className="admin-auditoria-evento-meta">
                                <span>Superadmin (demo)</span>
                                <span>{registro.horario}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="admin-auditoria-detalhes"
                              onClick={() => alternarDetalhes(registro.chave)}
                              aria-expanded={aberto}
                              aria-label={`${aberto ? "Ocultar" : "Mostrar"} detalhes de ${registro.titulo}`}
                            >
                              {aberto ? "Ocultar" : "Detalhes"}
                            </button>
                          </div>

                          {aberto && (
                            <dl className="admin-auditoria-info">
                              <div>
                                <dt>Data e hora</dt>
                                <dd>{registro.data || "Não informado"}</dd>
                              </div>
                              <div>
                                <dt>Tipo de ação</dt>
                                <dd>{registro.tipo}</dd>
                              </div>
                              <div>
                                <dt>Responsável</dt>
                                <dd>Superadmin (demo)</dd>
                              </div>
                              <div>
                                <dt>Identificador</dt>
                                <dd>{registro.id || "Não informado"}</dd>
                              </div>
                              <div className="admin-auditoria-info-completa">
                                <dt>Registro original</dt>
                                <dd>{registro.acao || "Não informado"}</dd>
                              </div>
                            </dl>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-auditoria-vazio">
            {logs.length === 0
              ? "Nenhuma atividade registrada."
              : "Nenhuma atividade corresponde aos filtros selecionados."}
          </p>
        )}

        <footer className="alunos-paginacao">
          <span>
            Mostrando {visiveis.length} de {filtrados.length} registros
          </span>

          <div className="alunos-paginas">
            <button
              type="button"
              disabled={paginaAtual <= 1}
              onClick={() => setPagina(paginaAtual - 1)}
              aria-label="Página anterior"
            >
              ‹
            </button>

            <strong>{paginaAtual}</strong>
            <span>de {totalPaginas}</span>

            <button
              type="button"
              disabled={paginaAtual >= totalPaginas}
              onClick={() => setPagina(paginaAtual + 1)}
              aria-label="Próxima página"
            >
              ›
            </button>
          </div>

          <label className="alunos-por-pagina">
            Itens por página
            <select
              value={itensPorPagina}
              onChange={(event) => {
                setItensPorPagina(Number(event.target.value));
                setPagina(1);
              }}
            >
              {[10, 20, 50].map((quantidade) => (
                <option key={quantidade} value={quantidade}>
                  {quantidade}
                </option>
              ))}
            </select>
          </label>
        </footer>
      </section>
    </div>
  );
}
