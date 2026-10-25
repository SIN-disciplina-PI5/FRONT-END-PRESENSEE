import { useMemo, useState, useEffect } from "react"
import { Link } from "react-router-dom"
import DashboardLayout from "../layouts/DashboardLayout"
import api from "../services/api"
import {
  MascotAvatar,
  IconIntervencao,
  IconDiario,
  IconChecklist,
  IconCalendario,
  IconRelogio,
  IconSeta,
  IconEnviar,
} from "../components/Icons"
import "../styles/Diario.css"
import "../styles/DiarioWorkspace.css"

const CATEGORIAS = ["Atendimento", "Reunião", "Contato com responsável", "Administrativo", "Observação"]
const PRIORIDADES = ["Alta", "Média", "Baixa"]

function dataHojeISO() {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, "0")
  const dia = String(hoje.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

function partesDaData(iso) {
  if (!iso) return { dia: "--", mes: "---" }
  const dataObj = new Date(iso)
  if (isNaN(dataObj)) {
    const partes = String(iso).split("-")
    if (partes.length === 3) return { dia: partes[2], mes: MESES[Number(partes[1]) - 1] || "" }
    return { dia: "--", mes: "---" }
  }
  return { 
    dia: String(dataObj.getDate()).padStart(2, '0'), 
    mes: MESES[dataObj.getMonth()] 
  }
}

function formatarDataDisplay(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleDateString("pt-BR")
}

function Diario() {
  const avatar = localStorage.getItem("avatarUsuario") || ""
  const [textoAnotacao, setTextoAnotacao] = useState("")
  const [categoria, setCategoria] = useState("")
  const [marcarComoPendencia, setMarcarComoPendencia] = useState(false)
  const [prioridadeNova, setPrioridadeNova] = useState("Média")
  const [mensagem, setMensagem] = useState("")
  const [loading, setLoading] = useState(true)
  
  const [anotacoesLocais, setAnotacoesLocais] = useState([])
  const [pendencias, setPendencias] = useState([])
  const [intervencoes, setIntervencoes] = useState([])

  useEffect(() => {
    async function carregarDados() {
      try {
        // Carrega intervenções/eventos recentes
        try {
          const resEventos = await api.get("/eventos"); // Ajuste para a rota de eventos/intervenções
          setIntervencoes(Array.isArray(resEventos.data) ? resEventos.data : []);
        } catch (e) { console.warn("Rota /eventos pendente"); }
        
        // Carrega incidentes/pendências/anotações
        try {
          const resIncidentes = await api.get("/incidentes"); // Ajuste para a rota de incidentes/anotações
          const dadosInc = Array.isArray(resIncidentes.data) ? resIncidentes.data : [];
          
          const notas = dadosInc.filter(i => i.type === "NOTA" || !i.isPending).map(n => ({
            id: n.id,
            data: n.createdAt || n.data,
            texto: n.description || n.texto,
            categoria: n.category || n.categoria || "Observação",
            titulo: n.title || n.titulo || (n.description ? `${n.description.slice(0, 52)}...` : "Anotação")
          }));
          setAnotacoesLocais(notas);
          
          const pends = dadosInc.filter(i => i.isPending || i.type === "PENDENCIA").map(p => ({
            id: p.id,
            texto: p.description || p.texto,
            alunoId: p.studentId || p.alunoId,
            prioridade: p.priority || p.prioridade || "Média",
            feita: p.resolved || p.feita || false,
          }));
          setPendencias(pends);
        } catch (e) { console.warn("Rota /incidentes pendente"); }

      } catch (error) {
        console.error("Erro geral ao carregar o diário", error);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, [])

  const registrosOrdenados = useMemo(
    () => [...intervencoes].sort((a, b) => String(b.createdAt || b.data).localeCompare(String(a.createdAt || a.data))),
    [intervencoes]
  )

  const notasRecentes = useMemo(
    () => [...anotacoesLocais].sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 3),
    [anotacoesLocais]
  )

  const pendenciasOrdenadas = useMemo(
    () =>
      [...pendencias].sort((a, b) => {
        if (a.feita !== b.feita) return a.feita ? 1 : -1
        return PRIORIDADES.indexOf(a.prioridade) - PRIORIDADES.indexOf(b.prioridade)
      }),
    [pendencias]
  )

  const abertas = pendencias.filter((item) => !item.feita).length
  const diasComRegistro = new Set([
    ...intervencoes.map((item) => String(item.createdAt || item.data).split('T')[0]),
    ...anotacoesLocais.map((item) => String(item.data).split('T')[0]),
  ]).size

  async function salvarAnotacao(event) {
    event.preventDefault()
    const texto = textoAnotacao.trim()

    if (!texto) {
      setMensagem("Escreva uma anotação antes de salvar.")
      return
    }
    
    setMensagem("Salvando...");

    const payload = {
      description: texto,
      category: categoria || "Observação",
      title: texto.length > 55 ? `${texto.slice(0, 52)}...` : texto,
      isPending: marcarComoPendencia,
      priority: marcarComoPendencia ? prioridadeNova : undefined,
      type: marcarComoPendencia ? "PENDENCIA" : "NOTA"
    };

    try {
      // Ajuste para a rota de gravação do seu back-end
      const response = await api.post("/incidentes", payload);
      const novoRegistro = response.data;
      
      if (marcarComoPendencia) {
        setPendencias(lista => [{
          id: novoRegistro.id || `temp-${Date.now()}`,
          texto: payload.description,
          prioridade: payload.priority,
          feita: false
        }, ...lista]);
      } else {
        setAnotacoesLocais(lista => [{
          id: novoRegistro.id || `temp-${Date.now()}`,
          data: novoRegistro.createdAt || dataHojeISO(),
          texto: payload.description,
          categoria: payload.category,
          titulo: payload.title
        }, ...lista]);
      }
      
      setTextoAnotacao("")
      setCategoria("")
      setMarcarComoPendencia(false)
      setPrioridadeNova("Média")
      setMensagem("Anotação adicionada com sucesso.")
      
      setTimeout(() => setMensagem(""), 3000);
    } catch (error) {
      console.error("Erro ao salvar anotação", error);
      setMensagem("Falha ao salvar. Verifique sua conexão.");
    }
  }

  async function alternarPendencia(id) {
    // Atualiza front-end otimisticamente
    const pendencia = pendencias.find(p => p.id === id);
    const novoStatus = !pendencia.feita;
    
    setPendencias((lista) =>
      lista.map((item) => item.id === id ? { ...item, feita: novoStatus } : item)
    )
    
    // Atualiza back-end
    try {
      // Caso seja um ID real do banco (não os temps que criamos)
      if (typeof id === 'number' || (typeof id === 'string' && !id.startsWith('temp'))) {
        await api.patch(`/incidentes/${id}`, { resolved: novoStatus, feita: novoStatus });
      }
    } catch (error) {
      console.error("Erro ao atualizar pendência", error);
    }
  }

  async function trocarPrioridade(id) {
    const pendencia = pendencias.find(p => p.id === id);
    const proxima = PRIORIDADES[(PRIORIDADES.indexOf(pendencia.prioridade) + 1) % PRIORIDADES.length];
    
    setPendencias((lista) =>
      lista.map((item) => item.id === id ? { ...item, prioridade: proxima } : item)
    )
    
    try {
      if (typeof id === 'number' || (typeof id === 'string' && !id.startsWith('temp'))) {
        await api.patch(`/incidentes/${id}`, { priority: proxima, prioridade: proxima });
      }
    } catch (error) {
      console.error("Erro ao alterar prioridade", error);
    }
  }

  async function excluirPendencia(id) {
    setPendencias((lista) => lista.filter((item) => item.id !== id))
    try {
      if (typeof id === 'number' || (typeof id === 'string' && !id.startsWith('temp'))) {
        await api.delete(`/incidentes/${id}`);
      }
    } catch (error) {
      console.error("Erro ao excluir", error);
    }
  }

  return (
    <DashboardLayout>
      <main className="diario-workspace">

        <header className="dw-cabecalho">
          <div className="dw-cabecalho-identidade">
            <div className="dw-avatar">
              {avatar ? <img src={avatar} alt="Foto do monitor" /> : <MascotAvatar size={76} />}
            </div>
            <div>
              <h1>Diário do Monitor</h1>
              <p>Registre anotações, acompanhe pendências e veja suas últimas intervenções.</p>
            </div>
          </div>
          <div className="dw-data-hoje">
            <IconCalendario width={20} height={20} />
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
            <span className="dw-indicador-icone" aria-hidden="true"><IconIntervencao /></span>
            <div>
              <strong>{intervencoes.length}</strong>
              <p>Total de intervenções</p>
              <small>Registros cadastrados</small>
            </div>
          </article>
          <article className="dw-indicador dw-azul">
            <span className="dw-indicador-icone" aria-hidden="true"><IconDiario /></span>
            <div>
              <strong>{anotacoesLocais.length}</strong>
              <p>Anotações registradas</p>
              <small>No diário</small>
            </div>
          </article>
          <article className="dw-indicador dw-amarelo">
            <span className="dw-indicador-icone" aria-hidden="true"><IconChecklist /></span>
            <div>
              <strong>{abertas}</strong>
              <p>Pendências</p>
              <small>Em aberto</small>
            </div>
          </article>
          <article className="dw-indicador dw-verde">
            <span className="dw-indicador-icone" aria-hidden="true"><IconCalendario /></span>
            <div>
              <strong>{diasComRegistro}</strong>
              <p>Dias com registro</p>
              <small>Com atividade registrada</small>
            </div>
          </article>
        </section>

        <section className="dw-grade-principal">
          {/* NOVA ANOTAÇÃO */}
          <form className="dw-card dw-form-anotacao" onSubmit={salvarAnotacao}>
            <div className="dw-card-titulo">
              <span className="dw-titulo-icone" aria-hidden="true"><IconDiario /></span>
              <div className="dw-card-titulo-texto">
                <h2>Nova anotação</h2>
                <p>Registre uma observação do dia.</p>
              </div>
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
             <div className="dw-pendencia-opcao">
              <label className="dw-switch-label">
                <span>Marcar como pendência</span>
                <input
                  type="checkbox"
                  checked={marcarComoPendencia}
                  onChange={(event) => setMarcarComoPendencia(event.target.checked)}
                />
                <span className="dw-switch-visual" aria-hidden="true" />
              </label>
              {marcarComoPendencia && (
                <div className="dw-prio-grupo" role="radiogroup" aria-label="Prioridade da pendência">
                  {PRIORIDADES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="radio"
                      aria-checked={prioridadeNova === item}
                      className={`dw-prio-opcao dw-prio-${item.toLowerCase()} ${prioridadeNova === item ? "ativa" : ""}`}
                      onClick={() => setPrioridadeNova(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
              <button className="dw-botao-salvar" type="submit">
                <IconEnviar width={18} height={18} /> Salvar anotação
              </button>
            </div>
            {mensagem && <p className="dw-mensagem" role="status">{mensagem}</p>}
          </form>

          {/* PENDÊNCIAS */}
          <section className="dw-card dw-card-pendencias">
            <div className="dw-card-titulo">
              <span className="dw-titulo-icone" aria-hidden="true"><IconChecklist /></span>
              <div className="dw-card-titulo-texto">
                <h2>Minhas pendências</h2>
                <p>O que ainda precisa da sua atenção.</p>
              </div>
              <span className="dw-contador">{abertas} abertas</span>
            </div>
            {loading ? (
              <div className="dw-estado-vazio"><p>Carregando pendências...</p></div>
            ) : pendencias.length ? (
              <ul className="dw-lista-pendencias">
                {pendenciasOrdenadas.slice(0, 6).map((item) => (
                  <li className={item.feita ? "dw-pendencia-concluida" : ""} key={item.id}>
                    <label className="dw-pendencia-check">
                      <input type="checkbox" checked={item.feita} onChange={() => alternarPendencia(item.id)} />
                      <span className="dw-check-visual" aria-hidden="true" />
                      <span className="dw-pendencia-texto">{item.texto}</span>
                    </label>
                    <button
                      type="button"
                      className={`dw-prioridade dw-prioridade-${item.prioridade.toLowerCase()}`}
                      onClick={() => trocarPrioridade(item.id)}
                      title="Clique para mudar a prioridade"
                    >
                      {item.prioridade}
                    </button>
                    <button type="button" className="dw-remover-pendencia" onClick={() => excluirPendencia(item.id)} aria-label={`Excluir pendência: ${item.texto}`} title="Excluir pendência">×</button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dw-estado-vazio">
                <span><IconChecklist /></span>
                <p>Nenhuma pendência em aberto. Você pode criar uma ao salvar uma anotação.</p>
              </div>
            )}
          </section>

          {/* REGISTROS RECENTES */}
          <section className="dw-card dw-card-registros">
            <div className="dw-card-titulo">
              <span className="dw-titulo-icone" aria-hidden="true"><IconRelogio /></span>
              <div className="dw-card-titulo-texto">
                <h2>Registros recentes</h2>
                <p>Últimas intervenções com os alunos.</p>
              </div>
            </div>
            {loading ? (
              <div className="dw-estado-vazio"><p>Carregando registros...</p></div>
            ) : registrosOrdenados.length ? (
              <div className="dw-lista-registros">
                {registrosOrdenados.slice(0, 5).map((item) => {
                  const dataReg = item.createdAt || item.data;
                  const { dia, mes } = partesDaData(dataReg)
                  const tipo = item.type || item.tipo || "Registro";
                  return (
                    <article className="dw-registro" key={item.id}>
                      <div className="dw-registro-data" aria-label={formatarDataDisplay(dataReg)}>
                        <strong>{dia}</strong>
                        <span>{mes}</span>
                      </div>
                      <div className="dw-registro-conteudo">
                        <div className="dw-registro-topo">
                          <strong>{item.title || item.titulo || item.student?.name || "Registro Escolar"}</strong>
                          <span className={`dw-tipo-tag dw-tipo-${String(tipo).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                            {tipo}
                          </span>
                        </div>
                        <p>{item.description || item.descricao || "Intervenção registrada no acompanhamento do aluno."}</p>
                        <div className="dw-registro-meta">
                          {(item.time || item.hora) && <span>{item.time || item.hora}</span>}
                          {(item.studentId || item.alunoId) && (
                            <Link to={`/alunos/${item.studentId || item.alunoId}`}>
                              Ver aluno <IconSeta width={14} height={14} />
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="dw-estado-vazio">
                <span><IconRelogio /></span>
                <p>Nenhum registro encontrado.</p>
              </div>
            )}
          </section>

          {/* ANOTAÇÕES RECENTES */}
          <section className="dw-card dw-card-anotacoes">
            <div className="dw-card-titulo">
              <span className="dw-titulo-icone" aria-hidden="true"><IconDiario /></span>
              <div className="dw-card-titulo-texto">
                <h2>Minhas anotações recentes</h2>
                <p>Suas últimas observações registradas.</p>
              </div>
              <span className="dw-contador">{anotacoesLocais.length} registros</span>
            </div>
            {loading ? (
              <div className="dw-estado-vazio"><p>Carregando anotações...</p></div>
            ) : notasRecentes.length ? (
              <div className="dw-notas-recentes">
                {notasRecentes.map((nota) => (
                  <article className="dw-nota-recente" key={nota.id}>
                    <div className="dw-nota-recente-topo">
                      <strong>{nota.titulo || (nota.texto.length > 58 ? `${nota.texto.slice(0, 55)}...` : nota.texto)}</strong>
                      <time>{formatarDataDisplay(nota.data)}</time>
                    </div>
                    <p>{nota.texto}</p>
                    {nota.categoria && <span>{nota.categoria}</span>}
                  </article>
                ))}
              </div>
            ) : (
              <div className="dw-estado-vazio">
                <span><IconDiario /></span>
                <p>Suas anotações salvas aparecerão aqui.</p>
              </div>
            )}
          </section>
        </section>

        <section className="dw-atalhos">
          <div>
            <strong>Atalhos do monitor</strong>
            <p>Acesse rapidamente as informações que você acompanha.</p>
          </div>
          <Link to="/alunos">Ver alunos <IconSeta width={16} height={16} /></Link>
          <Link to="/turmas">Consultar turmas <IconSeta width={16} height={16} /></Link>
          <Link to="/intervencao">Registrar intervenção <IconSeta width={16} height={16} /></Link>
        </section>
      </main>
    </DashboardLayout>
  )
}

export default Diario