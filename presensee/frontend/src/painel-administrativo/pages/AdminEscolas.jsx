
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  IconAlunos,
  IconAlertas,
  IconPlus
} from "../../components/Icons";
import AdminIcon from "../components/AdminIcons";
import {
  changeStatus,
  deleteEscola,
  getEscolas
} from "../services/adminDemo";
import EscolaDetalhesModal from "../components/EscolaDetalhesModal";
import "../../styles/Alunos.css";
import "../styles/admin.css";
import "../styles/AdminEscolas.css";

const FILTROS = ["Todas", "Ativa", "Pendente", "Bloqueada"];

const STATUS = [
  {
    valor: "Ativa",
    classe: "baixo",
    rotulo: "Escolas ativas",
    descricao: "Instituições em funcionamento"
  },
  {
    valor: "Pendente",
    classe: "medio",
    rotulo: "Aguardando ativação",
    descricao: "Aguardando liberação"
  },
  {
    valor: "Bloqueada",
    classe: "alto",
    rotulo: "Escolas bloqueadas",
    descricao: "Instituições bloqueadas"
  }
];

export default function AdminEscolas() {
  const [escolas, setEscolas] = useState(getEscolas);
  const [busca, setBusca] = useState("");
  const [excluir, setExcluir] = useState(null);
  const [detalhes, setDetalhes] = useState(null);
  const [ordenacao, setOrdenacao] = useState({
    campo: "nome",
    direcao: "asc"
  });
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [searchParams, setSearchParams] = useSearchParams();

  const statusUrl = searchParams.get("status");

  const filtro = FILTROS.includes(statusUrl)
    ? statusUrl
    : "Todas";

  const resumo = useMemo(() => ({
    Todas: escolas.length,
    Ativa: escolas.filter((escola) => escola.status === "Ativa").length,
    Pendente: escolas.filter((escola) => escola.status === "Pendente").length,
    Bloqueada: escolas.filter((escola) => escola.status === "Bloqueada").length
  }), [escolas]);

  const escolasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    return escolas.filter((escola) => {
      const statusCorreto =
        filtro === "Todas" || escola.status === filtro;

      const texto = [
        escola.nome,
        escola.municipio,
        escola.gestor,
        escola.rede,
        escola.inep
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return statusCorreto && texto.includes(termo);
    });
  }, [escolas, busca, filtro]);

  const escolasOrdenadas = useMemo(() => {
    return [...escolasFiltradas].sort((a, b) => {
      const primeiro = String(a[ordenacao.campo] ?? "");
      const segundo = String(b[ordenacao.campo] ?? "");

      const comparacao = primeiro.localeCompare(
        segundo,
        "pt-BR",
        { numeric: true }
      );

      return ordenacao.direcao === "asc"
        ? comparacao
        : -comparacao;
    });
  }, [escolasFiltradas, ordenacao]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(escolasOrdenadas.length / itensPorPagina)
  );

  const paginaAtual = Math.min(pagina, totalPaginas);

  const escolasPaginadas = escolasOrdenadas.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  function alterarFiltro(novoFiltro) {
    setSearchParams(
      novoFiltro === "Todas"
        ? {}
        : { status: novoFiltro }
    );
    setPagina(1);
  }

  function selecionarCard(novoFiltro) {
    alterarFiltro(novoFiltro === filtro ? "Todas" : novoFiltro);
  }

  function ordenar(campo) {
    setOrdenacao((atual) => ({
      campo,
      direcao:
        atual.campo === campo && atual.direcao === "asc"
          ? "desc"
          : "asc"
    }));
    setPagina(1);
  }

  function alterarStatus(id, novoStatus) {
    changeStatus(id, novoStatus);
    setEscolas(getEscolas());
  }

  function confirmarExclusao() {
    if (!excluir) return;

    deleteEscola(excluir.id);
    setEscolas(getEscolas());
    setExcluir(null);
    setDetalhes(null);
  }

  function iniciais(nome) {
    return String(nome || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join("")
      .toUpperCase();
  }

  return (
    <div className="alunos-page admin-escolas-page">
      <header className="alunos-header admin-escolas-header">
        <div className="alunos-header-usuario">
          <div>
            <h1>Escolas</h1>
            <p>
              Gerencie as instituições cadastradas e acompanhe
              suas situações no PresenSee.
            </p>
          </div>
        </div>

        <Link
          to="/admin/escolas/nova"
          className="admin-escolas-nova"
        >
          
          <span>+ Nova escola</span>
        </Link>
      </header>

      <section
        className="alunos-resumo"
        aria-label="Filtrar escolas por situação"
      >
        <button
          type="button"
          className={`alunos-resumo-card total ${
            filtro === "Todas" ? "selecionado" : ""
          }`}
          aria-pressed={filtro === "Todas"}
          onClick={() => {
            alterarFiltro("Todas");
            setBusca("");
          }}
        >
          <span className="alunos-resumo-icone">
            <AdminIcon name="school" size={27} />
          </span>

          <div>
            <strong>{resumo.Todas}</strong>
            <b>Total de escolas</b>
            <small>Cadastradas no sistema</small>
          </div>
        </button>

        {STATUS.map((item) => (
          <button
            key={item.valor}
            type="button"
            className={`alunos-resumo-card ${item.classe} ${
              filtro === item.valor ? "selecionado" : ""
            }`}
            aria-pressed={filtro === item.valor}
            onClick={() => selecionarCard(item.valor)}
          >
            <span className="alunos-resumo-icone">
              <span className="alunos-resumo-ponto" />
            </span>

            <div>
              <strong>{resumo[item.valor]}</strong>
              <b>{item.rotulo}</b>
              <small>
                {escolas.length
                  ? Math.round(
                      (resumo[item.valor] / escolas.length) * 100
                    )
                  : 0}% do total
              </small>
            </div>
          </button>
        ))}
      </section>

      <section
        className="alunos-filtros-panel admin-escolas-filtros"
        aria-label="Filtros de escolas"
      >
        <label className="alunos-busca">
          <span
            aria-hidden="true"
            className="alunos-search-icon"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 5 5" />
            </svg>
          </span>

          <input
            className="search-aluno"
            type="search"
            placeholder="Buscar escola, município ou gestor..."
            value={busca}
            onChange={(event) => {
              setBusca(event.target.value);
              setPagina(1);
            }}
            aria-label="Pesquisar escolas"
          />
        </label>

        <div className="alunos-filtro">
          <label htmlFor="admin-escolas-status">
            Situação
          </label>

          <select
            id="admin-escolas-status"
            value={filtro}
            onChange={(event) => alterarFiltro(event.target.value)}
          >
            <option value="Todas">Todas as escolas</option>
            <option value="Ativa">Ativas</option>
            <option value="Pendente">Pendentes</option>
            <option value="Bloqueada">Bloqueadas</option>
          </select>
        </div>
      </section>

      <section
        className="alunos-tabela-panel"
        aria-label="Listagem de escolas"
      >
        <div className="alunos-tabela-scroll">
          <table className="students-table admin-escolas-tabela">
            <thead>
              <tr>
                {[
                  ["nome", "Escola"],
                  ["municipio", "Município"],
                  ["rede", "Rede"],
                  ["gestor", "Gestor"],
                  ["status", "Status"]
                ].map(([campo, titulo]) => (
                  <th key={campo} scope="col">
                    <button
                      type="button"
                      className="alunos-ordenar"
                      onClick={() => ordenar(campo)}
                    >
                      {titulo}
                      <span aria-hidden="true">↕</span>
                    </button>
                  </th>
                ))}

                <th scope="col">Ações</th>
              </tr>
            </thead>

            <tbody>
              {escolasPaginadas.map((escola) => (
                <tr key={escola.id}>
                  <td>
                    <div className="alunos-nome">
                      <span className="alunos-avatar">
                        {iniciais(escola.nome)}
                      </span>

                      <div className="admin-escolas-identificacao">
                        <button
                          type="button"
                          onClick={() => setDetalhes(escola)}
                        >
                          {escola.nome}
                        </button>

                        {escola.inep && (
                          <small>INEP: {escola.inep}</small>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>{escola.municipio}</td>

                  <td>
                    <span className="alunos-turma-tag">
                      {escola.rede}
                    </span>
                  </td>

                  <td>{escola.gestor}</td>

                  <td>
                    <span
                      className={`risk-status admin-escolas-status ${
                        escola.status.toLowerCase()
                      }`}
                    >
                      <span className="risk-dot" />
                      {escola.status}
                    </span>
                  </td>

                  <td>
                    <div className="alunos-acoes admin-escolas-acoes">
                      <button
                        type="button"
                        className="alunos-acao"
                        onClick={() => setDetalhes(escola)}
                        aria-label={`Detalhes de ${escola.nome}`}
                        title="Ver detalhes"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="19"
                          height="19"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>

                      <select
                        className="admin-escolas-alterar-status"
                        aria-label={`Alterar situação de ${escola.nome}`}
                        value={escola.status}
                        onChange={(event) =>
                          alterarStatus(escola.id, event.target.value)
                        }
                      >
                        <option value="Ativa">Ativa</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Bloqueada">Bloqueada</option>
                      </select>

                      <button
                        type="button"
                        className="alunos-acao admin-escolas-excluir"
                        onClick={() => setExcluir(escola)}
                        aria-label={`Excluir ${escola.nome}`}
                        title="Excluir escola"
                      >
                        <svg
                          width="19"
                          height="19"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {escolasPaginadas.length === 0 && (
                <tr>
                  <td colSpan={6} className="alunos-vazio">
                    Nenhuma escola encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="alunos-paginacao">
          <span>
            Mostrando {escolasPaginadas.length} de{" "}
            {escolasFiltradas.length} escolas
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

      <EscolaDetalhesModal
        escola={detalhes}
        onClose={() => setDetalhes(null)}
      />

      {excluir && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setExcluir(null);
            }
          }}
        >
          <div
            className="admin-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="admin-delete-title"
            aria-describedby="admin-delete-description"
          >
            <h2 id="admin-delete-title">
              Excluir escola?
            </h2>

            <p id="admin-delete-description">
              Deseja excluir{" "}
              <strong>{excluir.nome}</strong>? Esta ação
              remove a instituição dos dados demonstrativos
              deste navegador e será registrada na auditoria.
            </p>

            <div className="admin-actions">
              <button
                type="button"
                className="admin-btn secondary"
                onClick={() => setExcluir(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={confirmarExclusao}
              >
                Sim, excluir escola
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
