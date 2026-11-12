import { useMemo, useState, useEffect } from "react";
import api from "../../services/api";
import GestorDetalhesModal from "../components/GestorDetalhesModal";
import "../../styles/Alunos.css";
import "../styles/admin.css";
import "../styles/AdminGestores.css";

export default function AdminGestores() {
  const [gestores, setGestores] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const [ordenacao, setOrdenacao] = useState({
    campo: "nome",
    direcao: "asc"
  });
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  useEffect(() => {
    async function carregarDados() {
      try {
        setCarregando(true);
        // Carrega utilizadores e escolas em simultâneo
        const [resUsers, resEscolas] = await Promise.all([
          api.get("/users"),
          api.get("/escolas")
        ]);
        
        const listaUsuarios = Array.isArray(resUsers.data) ? resUsers.data : [];
        const listaEscolas = Array.isArray(resEscolas.data) ? resEscolas.data : [];
        
        setEscolas(listaEscolas);

        const apenasGestores = listaUsuarios.filter(user => 
          user.role === "MANAGER" || user.role === "GESTOR" || user.perfil === "MANAGER"
        );
        
        // CORREÇÃO AQUI: Usa 'escolaId' em vez de 'schoolId'
        const gestoresComEscola = apenasGestores.map(gestor => {
          const escolaVinculada = listaEscolas.find(e => e.id === gestor.escolaId);
          
          return {
            ...gestor,
            nome: gestor.name || gestor.nome,
            escolaNome: escolaVinculada ? escolaVinculada.nome : null
          };
        });

        setGestores(gestoresComEscola);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setCarregando(false);
      }
    }
    carregarDados();
  }, []);

  const gestoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    return gestores.filter((gestor) => {
      const correspondeStatus =
        filtro === "Todas" || 
        gestor.status === filtro || 
        String(gestor.status || "Ativa").toUpperCase() === filtro.toUpperCase();

      const texto = [
        gestor.nome,
        gestor.email,
        gestor.escolaNome || "Sem escola associada"
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return correspondeStatus && texto.includes(termo);
    });
  }, [gestores, busca, filtro]);

  const gestoresOrdenados = useMemo(() => {
    return [...gestoresFiltrados].sort((a, b) => {
      const valA = a[ordenacao.campo] || (ordenacao.campo === 'nome' ? a.name : '');
      const valB = b[ordenacao.campo] || (ordenacao.campo === 'nome' ? b.name : '');
      
      const primeiro = String(valA ?? "");
      const segundo = String(valB ?? "");

      const comparacao = primeiro.localeCompare(
        segundo,
        "pt-BR",
        { numeric: true }
      );

      return ordenacao.direcao === "asc"
        ? comparacao
        : -comparacao;
    });
  }, [gestoresFiltrados, ordenacao]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(gestoresOrdenados.length / itensPorPagina)
  );

  const paginaAtual = Math.min(pagina, totalPaginas);

  const gestoresPaginados = gestoresOrdenados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  function alterarFiltro(valor) {
    setFiltro(valor);
    setPagina(1);
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

  function obterIniciais(nome) {
    return String(nome || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join("")
      .toUpperCase();
  }

  if (carregando) {
    return <div className="alunos-page admin-gestores-page" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>Carregando gestores...</div>;
  }

  return (
    <div className="alunos-page admin-gestores-page">
      <header className="alunos-header">
        <div className="alunos-header-usuario">
          <div>
            <h1>Gestores escolares</h1>
            <p>
              Acompanhe os gestores responsáveis pelas
              instituições cadastradas no PresenSee.
            </p>
          </div>
        </div>
      </header>

      <section
        className="alunos-filtros-panel admin-gestores-filtros"
        aria-label="Filtros de gestores"
      >
        <label className="alunos-busca">
          <span
            className="alunos-search-icon"
            aria-hidden="true"
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
            placeholder="Buscar gestor, escola ou e-mail..."
            value={busca}
            onChange={(event) => {
              setBusca(event.target.value);
              setPagina(1);
            }}
            aria-label="Pesquisar gestores"
          />
        </label>

        <div className="alunos-filtro">
          <label htmlFor="admin-gestores-status">
            Situação
          </label>

          <select
            id="admin-gestores-status"
            value={filtro}
            onChange={(event) => alterarFiltro(event.target.value)}
          >
            <option value="Todas">Todas as situações</option>
            <option value="Ativa">Ativos</option>
            <option value="Pendente">Pendentes</option>
            <option value="Bloqueada">Bloqueados</option>
          </select>
        </div>
      </section>

      <section
        className="alunos-tabela-panel"
        aria-label="Listagem de gestores"
      >
        <div className="alunos-tabela-scroll">
          <table className="students-table admin-gestores-tabela">
            <thead>
              <tr>
                {[
                  ["nome", "Gestor"],
                  ["escolaNome", "Escola"],
                  ["email", "E-mail"],
                  ["status", "Situação"]
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
              {gestoresPaginados.map((gestor) => {
                const nomeExibicao = gestor.nome || "Sem nome";
                const statusExibicao = gestor.status || "Ativa"; 

                return (
                  <tr key={gestor.id}>
                    <td>
                      <div className="alunos-nome">
                        <span className="alunos-avatar">
                          {obterIniciais(nomeExibicao)}
                        </span>

                        <button
                          type="button"
                          className="admin-gestores-nome"
                          onClick={() => setSelecionado(gestor)}
                        >
                          {nomeExibicao}
                        </button>
                      </div>
                    </td>

                    <td>
                      <span className="admin-gestores-escola">
                        {gestor.escolaNome || "Sem escola associada"}
                      </span>
                    </td>

                    <td>
                      {gestor.email || "Não informado"}
                    </td>

                    <td>
                      <span
                        className={`risk-status admin-gestores-status ${
                          String(statusExibicao).toLowerCase()
                        }`}
                      >
                        <span className="risk-dot" />
                        {statusExibicao === "ATIVA" ? "Ativa" : statusExibicao === "BLOQUEADA" ? "Bloqueada" : statusExibicao}
                      </span>
                    </td>

                    <td>
                      <div className="alunos-acoes admin-gestores-acoes">
                        <button
                          type="button"
                          className="alunos-acao"
                          onClick={() => setSelecionado(gestor)}
                          aria-label={`Ver perfil de ${nomeExibicao}`}
                          title="Ver perfil"
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
                            <path d="M2 12s3.5-6 10-6 10 6-3.5 6-10 6S2 12 2 12Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {gestoresPaginados.length === 0 && (
                <tr>
                  <td colSpan={5} className="alunos-vazio">
                    Nenhum gestor encontrado na base de dados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="alunos-paginacao">
          <span>
            Mostrando {gestoresPaginados.length} de{" "}
            {gestoresFiltrados.length} gestores
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

      <GestorDetalhesModal
        gestor={selecionado}
        onClose={() => setSelecionado(null)}
      />
    </div>
  );
}