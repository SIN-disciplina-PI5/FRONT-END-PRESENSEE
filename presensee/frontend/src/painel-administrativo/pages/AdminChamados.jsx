
import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Headset,
  MessageCircle,
  Search,
  Send,
  X
} from "lucide-react";
import "../../styles/Alunos.css";
import "../styles/admin.css";
import "../styles/AdminChamados.css";

const STORAGE_KEY = "presensee_chamados_demo";

const STATUS = [
  "Aberto",
  "Em atendimento",
  "Aguardando resposta",
  "Resolvido",
  "Encerrado"
];

const PRIORIDADES = [
  "Baixa",
  "Média",
  "Alta",
  "Crítica"
];

const CATEGORIAS = [
  "Acesso",
  "Frequência",
  "Biometria",
  "Relatórios",
  "Cadastro",
  "Outros"
];

const CHAMADOS_INICIAIS = [
  {
    id: "CH-0001",
    titulo: "Erro ao registrar frequência",
    descricao: "Ao tentar registrar a frequência dos alunos, o sistema apresenta uma mensagem de erro.",
    escola: "ETE Porto Digital",
    solicitante: "Gestor escolar",
    categoria: "Frequência",
    prioridade: "Alta",
    status: "Aberto",
    criadoEm: "2026-10-24T09:30:00",
    atualizadoEm: "2026-10-24T09:30:00",
    mensagens: []
  },
  {
    id: "CH-0002",
    titulo: "Problema ao acessar o sistema",
    descricao: "O monitor não consegue realizar o login com suas credenciais.",
    escola: "Escola Exemplo",
    solicitante: "Monitor escolar",
    categoria: "Acesso",
    prioridade: "Média",
    status: "Em atendimento",
    criadoEm: "2026-10-23T14:15:00",
    atualizadoEm: "2026-10-24T10:20:00",
    mensagens: []
  },
  {
    id: "CH-0003",
    titulo: "Dúvida sobre exportação de relatórios",
    descricao: "Gostaria de saber como exportar relatórios de frequência em PDF.",
    escola: "ETE Porto Digital",
    solicitante: "Gestor escolar",
    categoria: "Relatórios",
    prioridade: "Baixa",
    status: "Resolvido",
    criadoEm: "2026-10-21T11:00:00",
    atualizadoEm: "2026-10-22T16:40:00",
    mensagens: [
      {
        id: "MSG-0001",
        autor: "Suporte PresenSee",
        texto: "A exportação está disponível na tela de Relatórios.",
        data: "2026-10-22T16:40:00"
      }
    ]
  }
];

function carregarChamados() {
  try {
    const dados = localStorage.getItem(STORAGE_KEY);

    if (!dados) {
      return CHAMADOS_INICIAIS;
    }

    const parsed = JSON.parse(dados);

    return Array.isArray(parsed)
      ? parsed
      : CHAMADOS_INICIAIS;
  } catch {
    return CHAMADOS_INICIAIS;
  }
}

function formatarData(data) {
  if (!data) return "Não informado";

  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    return "Não informado";
  }

  return valor.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function classeStatus(status) {
  return {
    Aberto: "aberto",
    "Em atendimento": "atendimento",
    "Aguardando resposta": "aguardando",
    Resolvido: "resolvido",
    Encerrado: "encerrado"
  }[status] || "aberto";
}

function classePrioridade(prioridade) {
  return {
    Baixa: "baixa",
    Média: "media",
    Alta: "alta",
    Crítica: "critica"
  }[prioridade] || "baixa";
}

function ModalChamado({ chamado, onClose, onUpdate }) {
  const [resposta, setResposta] = useState("");

  if (!chamado) return null;

  function enviarResposta(event) {
    event.preventDefault();

    const texto = resposta.trim();

    if (!texto) return;

    onUpdate(chamado.id, {
      mensagens: [
        ...(chamado.mensagens || []),
        {
          id: `MSG-${Date.now()}`,
          autor: "Suporte PresenSee",
          texto,
          data: new Date().toISOString()
        }
      ]
    });

    setResposta("");
  }

  return (
    <div
      className="chamados-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="chamados-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chamado-modal-titulo"
      >
        <header className="chamados-modal-header">
          <div>
            <span className="chamados-identificador">
              {chamado.id}
            </span>

            <h2 id="chamado-modal-titulo">
              {chamado.titulo}
            </h2>
          </div>

          <button
            type="button"
            className="chamados-fechar"
            onClick={onClose}
            aria-label="Fechar detalhes"
          >
            <X size={20} />
          </button>
        </header>

        <div className="chamados-modal-scroll">
          <div className="chamados-modal-informacoes">
            <div>
              <span>Instituição</span>
              <strong>{chamado.escola}</strong>
            </div>

            <div>
              <span>Solicitante</span>
              <strong>{chamado.solicitante}</strong>
            </div>

            <div>
              <span>Categoria</span>
              <strong>{chamado.categoria}</strong>
            </div>

            <div>
              <span>Aberto em</span>
              <strong>{formatarData(chamado.criadoEm)}</strong>
            </div>
          </div>

          <div className="chamados-modal-controles">
            <label>
              Status

              <select
                value={chamado.status}
                onChange={(event) =>
                  onUpdate(chamado.id, {
                    status: event.target.value
                  })
                }
              >
                {STATUS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Prioridade

              <select
                value={chamado.prioridade}
                onChange={(event) =>
                  onUpdate(chamado.id, {
                    prioridade: event.target.value
                  })
                }
              >
                {PRIORIDADES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="chamados-modal-secao">
            <h3>Descrição do problema</h3>
            <p>{chamado.descricao}</p>
          </div>

          <div className="chamados-modal-secao">
            <h3>Histórico de atendimento</h3>

            {(chamado.mensagens || []).length === 0 ? (
              <p className="chamados-sem-mensagens">
                Nenhuma resposta registrada.
              </p>
            ) : (
              <div className="chamados-mensagens">
                {chamado.mensagens.map((mensagem) => (
                  <article
                    key={mensagem.id}
                    className="chamados-mensagem"
                  >
                    <div className="chamados-mensagem-cabecalho">
                      <strong>{mensagem.autor}</strong>
                      <time>{formatarData(mensagem.data)}</time>
                    </div>

                    <p>{mensagem.texto}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <form
            className="chamados-resposta"
            onSubmit={enviarResposta}
          >
            <label htmlFor="chamado-resposta">
              Registrar resposta
            </label>

            <textarea
              id="chamado-resposta"
              value={resposta}
              onChange={(event) => setResposta(event.target.value)}
              placeholder="Escreva uma resposta para este chamado..."
              rows={4}
              maxLength={3000}
            />

            <button
              type="submit"
              disabled={!resposta.trim()}
            >
              <Send size={17} />
              Registrar resposta
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default function AdminChamados() {
  const [chamados, setChamados] = useState(carregarChamados);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("Todos");
  const [prioridade, setPrioridade] = useState("Todas");
  const [categoria, setCategoria] = useState("Todas");
  const [ordenacao, setOrdenacao] = useState("recentes");
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [selecionadoId, setSelecionadoId] = useState(null);

  const selecionado = chamados.find(
    (chamado) => chamado.id === selecionadoId
  );

  const indicadores = useMemo(() => ({
    abertos: chamados.filter(
      (chamado) => chamado.status === "Aberto"
    ).length,
    atendimento: chamados.filter(
      (chamado) => chamado.status === "Em atendimento"
    ).length,
    criticos: chamados.filter(
      (chamado) =>
        chamado.prioridade === "Crítica" &&
        !["Resolvido", "Encerrado"].includes(chamado.status)
    ).length,
    resolvidos: chamados.filter(
      (chamado) => chamado.status === "Resolvido"
    ).length
  }), [chamados]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    return chamados.filter((chamado) => {
      const correspondeBusca = [
        chamado.id,
        chamado.titulo,
        chamado.descricao,
        chamado.escola,
        chamado.solicitante,
        chamado.categoria
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(termo);

      return (
        correspondeBusca &&
        (status === "Todos" || chamado.status === status) &&
        (prioridade === "Todas" || chamado.prioridade === prioridade) &&
        (categoria === "Todas" || chamado.categoria === categoria)
      );
    });
  }, [chamados, busca, status, prioridade, categoria]);

  const ordenados = useMemo(() => {
    return [...filtrados].sort((a, b) => {
      const primeiro = new Date(a.criadoEm).getTime() || 0;
      const segundo = new Date(b.criadoEm).getTime() || 0;

      return ordenacao === "recentes"
        ? segundo - primeiro
        : primeiro - segundo;
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

  function atualizarFiltro(setter, valor) {
    setter(valor);
    setPagina(1);
  }

  function atualizarChamado(id, alteracoes) {
    setChamados((atual) => {
      const novos = atual.map((chamado) =>
        chamado.id === id
          ? {
              ...chamado,
              ...alteracoes,
              atualizadoEm: new Date().toISOString()
            }
          : chamado
      );

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(novos)
      );

      return novos;
    });
  }

  function filtrarIndicador(novoStatus) {
    setStatus(novoStatus);
    setBusca("");
    setPrioridade("Todas");
    setCategoria("Todas");
    setPagina(1);
  }

  return (
    <div className="alunos-page admin-chamados-page">
      <header className="alunos-header">
        <div className="alunos-header-usuario">
          <div>
            <h1>Central de Suporte</h1>
            <p>
              Acompanhe e gerencie os chamados enviados
              pelas instituições do PresenSee.
            </p>
          </div>
        </div>
      </header>


      <section className="chamados-indicadores">
        <button
          className="chamados-indicador abertos"
          type="button"
          onClick={() => filtrarIndicador("Aberto")}
        >
          <span className="chamados-indicador-icone">
            <MessageCircle size={25} />
          </span>
          <div>
            <strong>{indicadores.abertos}</strong>
            <span>Chamados abertos</span>
          </div>
        </button>

        <button
          className="chamados-indicador atendimento"
          type="button"
          onClick={() => filtrarIndicador("Em atendimento")}
        >
          <span className="chamados-indicador-icone">
            <Headset size={25} />
          </span>
          <div>
            <strong>{indicadores.atendimento}</strong>
            <span>Em atendimento</span>
          </div>
        </button>

        <button
          className="chamados-indicador criticos"
          type="button"
          onClick={() => {
            setStatus("Todos");
            setPrioridade("Crítica");
            setCategoria("Todas");
            setBusca("");
            setPagina(1);
          }}
        >
          <span className="chamados-indicador-icone">
            <AlertCircle size={25} />
          </span>
          <div>
            <strong>{indicadores.criticos}</strong>
            <span>Prioridade crítica</span>
          </div>
        </button>

        <button
          className="chamados-indicador resolvidos"
          type="button"
          onClick={() => filtrarIndicador("Resolvido")}
        >
          <span className="chamados-indicador-icone">
            <CheckCircle2 size={25} />
          </span>
          <div>
            <strong>{indicadores.resolvidos}</strong>
            <span>Resolvidos</span>
          </div>
        </button>
      </section>

      <section className="alunos-filtros-panel chamados-filtros">
        <label className="alunos-busca">
          <span className="alunos-search-icon">
            <Search size={19} />
          </span>

          <input
            className="search-aluno"
            type="search"
            placeholder="Buscar chamado, escola ou solicitante..."
            value={busca}
            onChange={(event) =>
              atualizarFiltro(setBusca, event.target.value)
            }
          />
        </label>

        <div className="alunos-filtro">
          <label htmlFor="chamados-status">Status</label>
          <select
            id="chamados-status"
            value={status}
            onChange={(event) =>
              atualizarFiltro(setStatus, event.target.value)
            }
          >
            <option value="Todos">Todos os status</option>
            {STATUS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="alunos-filtro">
          <label htmlFor="chamados-prioridade">Prioridade</label>
          <select
            id="chamados-prioridade"
            value={prioridade}
            onChange={(event) =>
              atualizarFiltro(setPrioridade, event.target.value)
            }
          >
            <option value="Todas">Todas</option>
            {PRIORIDADES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="alunos-filtro">
          <label htmlFor="chamados-categoria">Categoria</label>
          <select
            id="chamados-categoria"
            value={categoria}
            onChange={(event) =>
              atualizarFiltro(setCategoria, event.target.value)
            }
          >
            <option value="Todas">Todas</option>
            {CATEGORIAS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="alunos-tabela-panel">
        <div className="chamados-tabela-titulo">
          <div>
            <h2>Chamados recebidos</h2>
            <p>Solicitações registradas pelas instituições</p>
          </div>

          <label>
            <Clock3 size={16} />
            <select
              value={ordenacao}
              onChange={(event) =>
                atualizarFiltro(setOrdenacao, event.target.value)
              }
            >
              <option value="recentes">Mais recentes</option>
              <option value="antigos">Mais antigos</option>
            </select>
          </label>
        </div>

        <div className="alunos-tabela-scroll">
          <table className="students-table chamados-tabela">
            <thead>
              <tr>
                <th>Chamado</th>
                <th>Escola</th>
                <th>Categoria</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {visiveis.map((chamado) => (
                <tr key={chamado.id}>
                  <td>
                    <div className="chamados-tabela-identificacao">
                      <small>{chamado.id}</small>
                      <button
                        type="button"
                        onClick={() => setSelecionadoId(chamado.id)}
                      >
                        {chamado.titulo}
                      </button>
                      <span>{chamado.solicitante}</span>
                    </div>
                  </td>

                  <td>{chamado.escola}</td>

                  <td>{chamado.categoria}</td>

                  <td>
                    <span className={`chamados-badge prioridade-${classePrioridade(chamado.prioridade)}`}>
                      {chamado.prioridade}
                    </span>
                  </td>

                  <td>
                    <span className={`chamados-badge status-${classeStatus(chamado.status)}`}>
                      {chamado.status}
                    </span>
                  </td>

                  <td className="chamados-data">
                    {formatarData(chamado.criadoEm)}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="chamados-ver"
                      onClick={() => setSelecionadoId(chamado.id)}
                    >
                      Ver chamado
                    </button>
                  </td>
                </tr>
              ))}

              {visiveis.length === 0 && (
                <tr>
                  <td colSpan={7} className="alunos-vazio">
                    Nenhum chamado encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="alunos-paginacao">
          <span>
            Mostrando {visiveis.length} de {filtrados.length} chamados
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
              {[10, 20, 50].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </footer>
      </section>

      {selecionado && (
        <ModalChamado
          key={selecionado.id}
          chamado={selecionado}
          onUpdate={atualizarChamado}
          onClose={() => setSelecionadoId(null)}
        />
      )}
    </div>
  );
}
