import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "../layouts/DashboardLayout"
import { MascotAvatar } from "../components/Icons"
import {
  alunos,
  intervencoes,
  anotacoes,
  formatarData,
} from "../data/diarioMock"
import "../styles/Diario.css"

const CATEGORIAS = ["Atendimento", "Reunião", "Contato com responsável", "Administrativo", "Observação"]

function dataHojeISO() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function nomeDoAluno(id) {
  return alunos.find((aluno) => aluno.id === id)?.nome || "Aluno"
}

function prioridadePorRisco(risco) {
  if (Number(risco) >= 70) return "Alta"
  if (Number(risco) >= 40) return "Média"
  return "Baixa"
}

function Diario() {
  const avatar = localStorage.getItem("avatarUsuario") || ""
  const [textoAnotacao, setTextoAnotacao] = useState("")
  const [categoria, setCategoria] = useState("")
  const [marcarComoPendencia, setMarcarComoPendencia] = useState(false)
  const [mensagem, setMensagem] = useState("")
  const [anotacoesLocais, setAnotacoesLocais] = useState(() =>
    [...anotacoes].sort((a, b) => String(b.data).localeCompare(String(a.data)))
  )

  const [pendencias, setPendencias] = useState(() => {
    const existentes = []
    alunos.forEach((aluno) => {
      ;(aluno.pendencias || []).forEach((texto, indice) => {
        existentes.push({
          id: `aluno-${aluno.id}-${indice}`,
          texto: typeof texto === "string" ? texto : texto.texto || texto.titulo || "Acompanhar aluno",
          alunoId: aluno.id,
          prioridade: prioridadePorRisco(aluno.risco),
          prazo: "A definir",
          feita: false,
        })
      })
    })
    return existentes
  })

  const registrosOrdenados = useMemo(
    () => [...intervencoes].sort((a, b) => String(b.data).localeCompare(String(a.data))),
    []
  )

  const notasRecentes = useMemo(
    () => [...anotacoesLocais].sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 3),
    [anotacoesLocais]
  )

  const abertas = pendencias.filter((item) => !item.feita).length
  const diasComRegistro = new Set([
    ...intervencoes.map((item) => item.data),
    ...anotacoesLocais.map((item) => item.data),
  ]).size

  function salvarAnotacao(event) {
    event.preventDefault()
    const texto = textoAnotacao.trim()

    if (!texto) {
      setMensagem("Escreva uma anotação antes de salvar.")
      return
    }

    const novaAnotacao = {
      id: `local-${Date.now()}`,
      data: dataHojeISO(),
      texto,
      categoria: categoria || "Observação",
      titulo: texto.length > 55 ? `${texto.slice(0, 52)}...` : texto,
    }

    setAnotacoesLocais((lista) => [novaAnotacao, ...lista])
    if (marcarComoPendencia) {
      setPendencias((lista) => [
        {
          id: `pendencia-${Date.now()}`,
          texto,
          prioridade: "Média",
          prazo: "Hoje",
          feita: false,
          alunoId: null,
        },
        ...lista,
      ])
    }

    setTextoAnotacao("")
    setCategoria("")
    setMarcarComoPendencia(false)
    setMensagem("Anotação adicionada nesta sessão.")
  }

  function alternarPendencia(id) {
    setPendencias((lista) =>
      lista.map((item) => item.id === id ? { ...item, feita: !item.feita } : item)
    )
  }

  function excluirPendencia(id) {
    setPendencias((lista) => lista.filter((item) => item.id !== id))
  }

  return (
    <DashboardLayout>
      <main className="diario-workspace">
        <header className="dw-cabecalho">
          <div className="dw-cabecalho-identidade">
            <div className="dw-avatar">
              {avatar ? <img src={avatar} alt="Foto do monitor" /> : <MascotAvatar size={48} />}
            </div>
            <div>
              <h1>Diário do Monitor</h1>
              <p>Área de trabalho </p>
            </div>
          </div>
          <div className="dw-data-hoje">
            <span aria-hidden="true">▦</span>
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "short",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </div>
        </header>

        <section className="dw-indicadores" aria-label="Resumo do monitor">
          <article className="dw-indicador dw-roxo">
            <span className="dw-indicador-icone" aria-hidden="true">♧</span>
            <div><p>Total de intervenções</p><strong>{intervencoes.length}</strong><small>Registros cadastrados</small></div>
          </article>
          <article className="dw-indicador dw-azul">
            <span className="dw-indicador-icone" aria-hidden="true">▤</span>
            <div><p>Anotações registradas</p><strong>{anotacoesLocais.length}</strong><small>No diário</small></div>
          </article>
          <article className="dw-indicador dw-amarelo">
            <span className="dw-indicador-icone" aria-hidden="true">✓</span>
            <div><p>Pendências</p><strong>{abertas}</strong><small>Em aberto</small></div>
          </article>
          <article className="dw-indicador dw-verde">
            <span className="dw-indicador-icone" aria-hidden="true">▦</span>
            <div><p>Dias com registro</p><strong>{diasComRegistro}</strong><small>Dias com atividade registrada</small></div>
          </article>
        </section>

        <section className="dw-grade-principal">
          <form className="dw-card dw-form-anotacao" onSubmit={salvarAnotacao}>
            <div className="dw-card-titulo">
              <span className="dw-titulo-icone">▤</span>
              <h2>Nova anotação</h2>
            </div>
            <label className="dw-campo-anotacao">
              <span className="dw-sr-only">Texto da anotação</span>
              <textarea
                value={textoAnotacao}
                onChange={(event) => setTextoAnotacao(event.target.value.slice(0, 500))}
                maxLength={500}
                placeholder="Escreva sua anotação aqui..."
                rows={4}
              />
              <small>{textoAnotacao.length}/500</small>
            </label>
            <div className="dw-form-rodape">
              <label className="dw-select-categoria">
                <span>Categoria (opcional)</span>
                <select value={categoria} onChange={(event) => setCategoria(event.target.value)}>
                  <option value="">Selecione uma categoria</option>
                  {CATEGORIAS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="dw-switch-label">
                <span>Marcar como pendência</span>
                <input
                  type="checkbox"
                  checked={marcarComoPendencia}
                  onChange={(event) => setMarcarComoPendencia(event.target.checked)}
                />
                <span className="dw-switch-visual" aria-hidden="true" />
              </label>
              <button className="dw-botao-salvar" type="submit"><span aria-hidden="true">➤</span> Salvar anotação</button>
            </div>
            {mensagem && <p className="dw-mensagem" role="status">{mensagem}</p>}
          </form>

          <section className="dw-card dw-card-pendencias">
            <div className="dw-card-titulo dw-card-titulo-com-link">
              <div><span className="dw-titulo-icone">☑</span><h2>Minhas pendências</h2></div>
              <span className="dw-contador">{abertas} abertas</span>
            </div>
            {pendencias.length ? (
              <ul className="dw-lista-pendencias">
                {pendencias.slice(0, 6).map((item) => (
                  <li className={item.feita ? "dw-pendencia-concluida" : ""} key={item.id}>
                    <label className="dw-pendencia-check">
                      <input type="checkbox" checked={item.feita} onChange={() => alternarPendencia(item.id)} />
                      <span className="dw-check-visual" aria-hidden="true" />
                      <span className="dw-pendencia-texto">{item.texto}</span>
                    </label>
                    <span className={`dw-prioridade dw-prioridade-${item.prioridade.toLowerCase()}`}>{item.prioridade}</span>
                    <button type="button" className="dw-remover-pendencia" onClick={() => excluirPendencia(item.id)} aria-label={`Excluir pendência: ${item.texto}`} title="Excluir pendência">×</button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dw-estado-vazio"><span>✓</span><p>Nenhuma pendência em aberto. Você pode criar uma ao salvar uma anotação.</p></div>
            )}
          </section>

          <section className="dw-card dw-card-registros">
            <div className="dw-card-titulo"><span className="dw-titulo-icone">◷</span><h2>Registros recentes</h2></div>
            {registrosOrdenados.length ? (
              <div className="dw-timeline">
                {registrosOrdenados.slice(0, 5).map((item, indice) => (
                  <article className="dw-timeline-item" key={item.id}>
                    <div className="dw-timeline-hora">{item.hora || "—"}</div>
                    <span className="dw-timeline-ponto" aria-hidden="true" />
                    <div className="dw-timeline-conteudo">
                      <strong>{item.titulo || `${item.tipo || "Intervenção"} — ${nomeDoAluno(item.alunoId)}`}</strong>
                      <p>{item.descricao || "Intervenção registrada no acompanhamento do aluno."}</p>
                      <div className="dw-timeline-meta">
                        <span>{formatarData(item.data)}</span>
                        {item.alunoId && <Link to={`/diario/aluno/${item.alunoId}`}>Ver aluno</Link>}
                      </div>
                    </div>
                    <span className={`dw-tipo-tag dw-tipo-${String(item.tipo || "registro").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{item.tipo || "Registro"}</span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dw-estado-vazio"><span>◷</span><p>Nenhum registro encontrado.</p></div>
            )}
          </section>

          <section className="dw-card dw-card-anotacoes">
            <div className="dw-card-titulo dw-card-titulo-com-link">
              <div><span className="dw-titulo-icone">▤</span><h2>Minhas anotações recentes</h2></div>
              <span className="dw-anotacoes-total">{anotacoesLocais.length} registros</span>
            </div>
            {notasRecentes.length ? (
              <div className="dw-notas-recentes">
                {notasRecentes.map((nota) => (
                  <article className="dw-nota-recente" key={nota.id}>
                    <div className="dw-nota-recente-topo">
                      <strong>{nota.titulo || (nota.texto.length > 58 ? `${nota.texto.slice(0, 55)}...` : nota.texto)}</strong>
                      <time>{formatarData(nota.data)}</time>
                    </div>
                    <p>{nota.texto}</p>
                    {nota.categoria && <span>{nota.categoria}</span>}
                  </article>
                ))}
              </div>
            ) : (
              <div className="dw-estado-vazio"><span>▤</span><p>Suas anotações salvas aparecerão aqui.</p></div>
            )}
          </section>
        </section>

        <section className="dw-atalhos">
          <div><strong>Atalhos do monitor</strong><p>Acesse rapidamente as informações que você acompanha.</p></div>
          <Link to="/alunos">Ver alunos <span>→</span></Link>
          <Link to="/turma">Consultar turmas <span>→</span></Link>
          <Link to="/intervencao">Registrar intervenção <span>→</span></Link>
        </section>
      </main>
    </DashboardLayout>
  )
}

export default Diario
