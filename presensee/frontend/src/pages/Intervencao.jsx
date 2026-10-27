import { useMemo, useRef, useState, useEffect } from "react"
import DashboardLayout from "../layouts/DashboardLayout"
import api from "../services/api"
import "../styles/Intervencao.css"
import "../styles/IntervencaoBusca.css"

const TIPOS_INTERVENCAO = ["Conversa Individual", "Contato com responsável", "Encaminhamento"]

function dataHoje() {
  return new Date().toISOString().split("T")[0]
}

function formatarData(dataStr) {
  if (!dataStr) return ""
  const [ano, mes, dia] = dataStr.split("T")[0].split("-")
  return `${dia}/${mes}/${ano}`
}

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function Intervencao() {
  const [registros, setRegistros] = useState([])
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingPost, setLoadingPost] = useState(false)

  const [busca, setBusca] = useState("")
  const [tipoSelecionado, setTipoSelecionado] = useState("Todos")
  const [modalAberto, setModalAberto] = useState(false)
  const [detalheSelecionado, setDetalheSelecionado] = useState(null)

  const [alunoId, setAlunoId] = useState("")
  const [alunoBusca, setAlunoBusca] = useState("")
  const [turmaBusca, setTurmaBusca] = useState("")
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false)
  const [opcaoAtiva, setOpcaoAtiva] = useState(0)
  const buscaRef = useRef(null)
  
  const [tipo, setTipo] = useState(TIPOS_INTERVENCAO[0])
  const [data, setData] = useState(dataHoje())
  const [descricao, setDescricao] = useState("")
  const [erro, setErro] = useState("")

  useEffect(() => {
    async function carregarDados() {
      try {
        const [resAlunos, resIntervencoes] = await Promise.all([
          api.get("/students"),
          api.get("/incidents").catch(() => ({ data: [] }))
        ])
        
        // Mapeamento dos estudantes do banco para o padrão do componente
        const alunosMap = (resAlunos.data || []).map(a => ({
          id: a.id || a._id,
          nome: a.name || a.nome,
          turma: a.class?.name || a.turma || "Sem Turma"
        }))
        
        // Mapeamento apenas dos incidentes que possuem um studentId (Intervenções)
        const intervencoesMap = (resIntervencoes.data || [])
          .filter(i => i.studentId)
          .map(i => ({
            id: i.id || i._id,
            alunoId: i.studentId,
            tipo: i.type,
            descricao: i.description,
            data: i.date || i.createdAt
          }))

        setAlunos(alunosMap)
        setRegistros(intervencoesMap)
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      } finally {
        setLoading(false)
      }
    }
    carregarDados()
  }, [])

  const turmas = useMemo(
    () => [...new Set(alunos.map((aluno) => aluno.turma).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b), "pt-BR", { numeric: true })),
    [alunos]
  )

  const sugestoes = useMemo(() => {
    const pesquisa = normalizar(alunoBusca)
    return alunos
      .filter((aluno) => {
        const turmaCorresponde = !turmaBusca || aluno.turma === turmaBusca
        const nomeCorresponde = !pesquisa || normalizar(aluno.nome).includes(pesquisa) || normalizar(aluno.id).includes(pesquisa)
        return turmaCorresponde && nomeCorresponde
      })
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"))
      .slice(0, 12)
  }, [alunos, alunoBusca, turmaBusca])

  const selecionado = alunos.find((aluno) => String(aluno.id) === String(alunoId))

  const listaFiltrada = useMemo(() => {
    return registros
      .filter((item) => {
        const aluno = alunos.find((a) => String(a.id) === String(item.alunoId))
        const nome = aluno?.nome || "Aluno não encontrado"
        const correspondeBusca = normalizar(nome).includes(normalizar(busca))
        const correspondeTipo = tipoSelecionado === "Todos" || item.tipo === tipoSelecionado
        return correspondeBusca && correspondeTipo
      })
      .sort((a, b) => String(b.data).localeCompare(String(a.data)))
  }, [registros, busca, tipoSelecionado, alunos])

  function escolherAluno(aluno) {
    setAlunoId(String(aluno.id))
    setAlunoBusca(aluno.nome)
    setSugestoesAbertas(false)
    setOpcaoAtiva(0)
    setErro("")
  }

  function alterarBuscaAluno(valor) {
    setAlunoBusca(valor)
    setAlunoId("")
    setOpcaoAtiva(0)
    setSugestoesAbertas(true)
  }

  function alterarTurma(valor) {
    setTurmaBusca(valor)
    setAlunoId("")
    setAlunoBusca("")
    setOpcaoAtiva(0)
    setSugestoesAbertas(false)
  }

  function navegarSugestoes(evento) {
    if (evento.key === "Escape") {
      setSugestoesAbertas(false)
      return
    }
    if (evento.key === "ArrowDown") {
      evento.preventDefault()
      setSugestoesAbertas(true)
      setOpcaoAtiva((anterior) => Math.min(anterior + 1, sugestoes.length - 1))
    }
    if (evento.key === "ArrowUp") {
      evento.preventDefault()
      setSugestoesAbertas(true)
      setOpcaoAtiva((anterior) => Math.max(anterior - 1, 0))
    }
    if (evento.key === "Enter" && sugestoesAbertas && sugestoes.length) {
      evento.preventDefault()
      escolherAluno(sugestoes[Math.max(0, opcaoAtiva)])
    }
  }

  function abrirModal() {
    setAlunoId("")
    setAlunoBusca("")
    setTurmaBusca("")
    setSugestoesAbertas(false)
    setOpcaoAtiva(0)
    setTipo(TIPOS_INTERVENCAO[0])
    setData(dataHoje())
    setDescricao("")
    setErro("")
    setModalAberto(true)
  }

  async function salvarIntervencao(e) {
    e.preventDefault()
    if (!alunoId || !tipo || !data || !descricao.trim()) {
      setErro("Selecione um aluno nas sugestões e preencha todos os campos.")
      return
    }

    setLoadingPost(true)
    try {
      const payload = {
        studentId: alunoId,
        type: tipo,
        description: descricao.trim(),
        date: new Date(data).toISOString()
      }
      
      const response = await api.post("/incidents", payload)
      const respData = response.data;
      
      const novoRegistro = {
        id: respData.id || respData._id || Math.random().toString(),
        alunoId: respData.studentId || payload.studentId,
        tipo: respData.type || payload.type,
        descricao: respData.description || payload.description,
        data: respData.date || respData.createdAt || payload.date
      }
      
      setRegistros((anterior) => [novoRegistro, ...anterior])
      setBusca("")
      setTipoSelecionado("Todos")
      setModalAberto(false)
      setErro("")
    } catch (error) {
      console.error("Erro ao salvar intervenção:", error)
      setErro("Ocorreu um erro ao salvar. Verifique sua conexão.")
    } finally {
      setLoadingPost(false)
    }
  }

  function iniciais(nome) {
    return (nome || "").split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase()
  }

  function classeTipo(tipoIntervencao) {
    if (tipoIntervencao === "Conversa Individual") return "conversa"
    if (tipoIntervencao === "Contato com responsável") return "responsavel"
    return "encaminhamento"
  }

  function nomeAluno(id) {
    return alunos.find((aluno) => String(aluno.id) === String(id))?.nome || "Aluno não encontrado"
  }

  function turmaAluno(id) {
    return alunos.find((a) => String(a.id) === String(id))?.turma || "Turma não informada"
  }

  if (loading) {
    return (
      <DashboardLayout>
        <main className="intervencao-page">
          <p style={{ padding: "2rem" }}>Carregando dados das intervenções...</p>
        </main>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <main className="intervencao-page">
        <header className="intervencao-header">
          <div>
            <h1>Intervenções</h1>
            <p>Registre ações, consulte o histórico e acompanhe os alunos.</p>
          </div>
          <button type="button" className="intervencao-botao-principal" onClick={abrirModal}>
            <span aria-hidden="true">+</span>
            Nova intervenção
          </button>
        </header>

        <section className="intervencao-resumo">
          <article className="intervencao-card">
            <div className="intervencao-card-topo"><span>Total de registros</span><span className="intervencao-icone">▤</span></div>
            <strong>{registros.length}</strong>
            <small>Intervenções cadastradas nesta sessão</small>
          </article>
          <article className="intervencao-card">
            <div className="intervencao-card-topo"><span>Tipos disponíveis</span><span className="intervencao-icone">◎</span></div>
            <strong>{TIPOS_INTERVENCAO.length}</strong>
            <small>Modalidades de acompanhamento</small>
          </article>
          <article className="intervencao-card">
            <div className="intervencao-card-topo"><span>Registros encontrados</span><span className="intervencao-icone">⌕</span></div>
            <strong>{listaFiltrada.length}</strong>
            <small>De acordo com a busca e os filtros</small>
          </article>
        </section>

        <section className="intervencao-lista-card">
          <div className="intervencao-lista-cabecalho">
            <div><h2>Registros de intervenção</h2><p>Consulte as ações realizadas com cada aluno.</p></div>
            <span className="intervencao-contador">{listaFiltrada.length} {listaFiltrada.length === 1 ? "registro" : "registros"}</span>
          </div>
          <div className="intervencao-filtros">
            <label className="intervencao-busca">
              <span aria-hidden="true">⌕</span>
              <input type="search" placeholder="Buscar pelo nome do aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar pelo nome do aluno" />
            </label>
            <select value={tipoSelecionado} onChange={(e) => setTipoSelecionado(e.target.value)} aria-label="Filtrar por tipo de intervenção">
              <option value="Todos">Todos os tipos</option>
              {TIPOS_INTERVENCAO.map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}
            </select>
          </div>
          {listaFiltrada.length > 0 ? (
            <div className="intervencao-lista">
              {listaFiltrada.map((item) => {
                const nome = nomeAluno(item.alunoId)
                return (
                  <article className="intervencao-item" key={item.id}>
                    <div className="intervencao-avatar" aria-hidden="true">{iniciais(nome)}</div>
                    <div className="intervencao-item-info">
                      <div className="intervencao-aluno-linha"><h3>{nome}</h3><span className="intervencao-turma">{turmaAluno(item.alunoId)}</span></div>
                      <span className={`intervencao-etiqueta ${classeTipo(item.tipo)}`}>{item.tipo}</span>
                      <p>{item.descricao}</p>
                    </div>
                    <button type="button" className="intervencao-ver-detalhes" onClick={() => setDetalheSelecionado(item)}>Ver detalhes <span aria-hidden="true">→</span></button>
                    <time className="intervencao-data" dateTime={item.data}><span aria-hidden="true">◷</span>{formatarData(item.data)}</time>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="intervencao-vazio">
              <span aria-hidden="true">⌕</span>
              <h3>Nenhuma intervenção encontrada</h3>
              <p>Tente mudar o nome pesquisado ou selecionar outro tipo de intervenção.</p>
              <button type="button" onClick={() => { setBusca(""); setTipoSelecionado("Todos") }}>Limpar filtros</button>
            </div>
          )}
        </section>

        {detalheSelecionado && (
          <div className="intervencao-modal-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetalheSelecionado(null) }}>
            <section className="intervencao-modal" role="dialog" aria-modal="true" aria-labelledby="detalhe-intervencao-titulo">
              <div className="intervencao-modal-cabecalho">
                <div><h2 id="detalhe-intervencao-titulo">Detalhes da intervenção</h2><p>Informações completas do registro selecionado.</p></div>
                <button type="button" className="intervencao-modal-fechar" onClick={() => setDetalheSelecionado(null)} aria-label="Fechar detalhes">×</button>
              </div>
              <div className="intervencao-detalhes-conteudo">
                <span className="intervencao-detalhes-label">Aluno</span><strong>{nomeAluno(detalheSelecionado.alunoId)}</strong>
                <span className="intervencao-detalhes-label">Turma</span><strong>{turmaAluno(detalheSelecionado.alunoId)}</strong>
                <span className="intervencao-detalhes-label">Tipo de intervenção</span>
                <div><span className={`intervencao-etiqueta ${classeTipo(detalheSelecionado.tipo)}`}>{detalheSelecionado.tipo}</span></div>
                <span className="intervencao-detalhes-label">Data</span><strong>{formatarData(detalheSelecionado.data)}</strong>
                <span className="intervencao-detalhes-label">Descrição</span><p>{detalheSelecionado.descricao}</p>
              </div>
              <div className="intervencao-formulario-acoes"><button type="button" className="intervencao-botao-principal" onClick={() => setDetalheSelecionado(null)}>Fechar detalhes</button></div>
            </section>
          </div>
        )}

        {modalAberto && (
          <div className="intervencao-modal-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalAberto(false) }}>
            <section className="intervencao-modal" role="dialog" aria-modal="true" aria-labelledby="intervencao-modal-titulo">
              <div className="intervencao-modal-cabecalho">
                <div><h2 id="intervencao-modal-titulo">Nova intervenção</h2><p>Informe os dados da ação pedagógica realizada.</p></div>
                <button type="button" className="intervencao-modal-fechar" onClick={() => setModalAberto(false)} aria-label="Fechar formulário">×</button>
              </div>
              <form className="intervencao-formulario" onSubmit={salvarIntervencao}>
                <div className="intervencao-seletor-aluno">
                  <label htmlFor="intervencao-turma-filtro">Turma</label>
                  <select id="intervencao-turma-filtro" value={turmaBusca} onChange={(e) => alterarTurma(e.target.value)}>
                    <option value="">Todas as turmas</option>
                    {turmas.map((turma) => <option key={turma} value={turma}>{turma}</option>)}
                  </select>
                  <label htmlFor="intervencao-buscar-aluno">Aluno</label>
                  <div className="intervencao-combobox" ref={buscaRef}>
                    <div className="intervencao-busca-aluno-campo">
                      <span aria-hidden="true">⌕</span>
                      <input
                        id="intervencao-buscar-aluno"
                        type="search"
                        autoComplete="off"
                        placeholder="Pesquisar nome ou matrícula..."
                        value={alunoBusca}
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={sugestoesAbertas}
                        aria-controls="intervencao-sugestoes-alunos"
                        aria-activedescendant={sugestoesAbertas && sugestoes.length ? `intervencao-opcao-${sugestoes[opcaoAtiva]?.id}` : undefined}
                        onChange={(e) => alterarBuscaAluno(e.target.value)}
                        onFocus={() => { if (!selecionado) setSugestoesAbertas(true) }}
                        onBlur={(e) => { if (!buscaRef.current?.contains(e.relatedTarget)) setSugestoesAbertas(false) }}
                        onKeyDown={navegarSugestoes}
                        required
                      />
                    </div>
                    {sugestoesAbertas && (
                      <div id="intervencao-sugestoes-alunos" role="listbox" aria-label="Alunos encontrados" className="intervencao-sugestoes-alunos">
                        {sugestoes.length ? sugestoes.map((aluno, index) => (
                          <button
                            id={`intervencao-opcao-${aluno.id}`}
                            key={aluno.id}
                            type="button"
                            role="option"
                            aria-selected={index === opcaoAtiva}
                            className={index === opcaoAtiva ? "ativo" : ""}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => escolherAluno(aluno)}
                          >
                            <span>{aluno.nome}</span><small>{aluno.turma}</small>
                          </button>
                        )) : <p className="intervencao-sem-alunos">Nenhum aluno encontrado</p>}
                      </div>
                    )}
                  </div>
                  {selecionado && <div className="intervencao-aluno-selecionado">Selecionado: <strong>{selecionado.nome}</strong> <span>· {selecionado.turma}</span><button type="button" onClick={() => { alterarBuscaAluno(""); buscaRef.current?.querySelector("input")?.focus() }} aria-label="Remover aluno selecionado">×</button></div>}
                </div>
                <label>Tipo de intervenção
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)} required>
                    {TIPOS_INTERVENCAO.map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}
                  </select>
                </label>
                <label>Data da intervenção
                  <input type="date" value={data} onChange={(e) => setData(e.target.value)} max={dataHoje()} required />
                </label>
                <label>Descrição da intervenção
                  <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva a ação realizada e os principais pontos tratados..." rows={4} maxLength={1000} required />
                  <small>{descricao.length}/1000 caracteres</small>
                </label>
                {erro && <p className="intervencao-erro" role="alert">{erro}</p>}
                <div className="intervencao-formulario-acoes">
                  <button type="button" className="intervencao-botao-secundario" onClick={() => setModalAberto(false)} disabled={loadingPost}>Cancelar</button>
                  <button type="submit" className="intervencao-botao-principal" disabled={loadingPost}>
                    {loadingPost ? "Salvando..." : "Salvar intervenção"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </DashboardLayout>
  )
}

export default Intervencao