import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import { getUsuario } from "../services/auth";
import {
  MascotAvatar,
  IconIntervencao,
  IconDiario,
  IconChecklist,
  IconCalendario,
  IconRelogio,
  IconSeta,
  IconEnviar,
} from "../components/Icons";
import "../styles/Diario.css";
import "../styles/DiarioWorkspace.css";

const CATEGORIAS = ["Atendimento", "Reunião", "Contato com responsável", "Administrativo", "Observação"];
const PRIORIDADES = ["Alta", "Média", "Baixa"];

function lerAvatarDiario() {
  const direto = localStorage.getItem("avatarUsuario");
  if (direto) return direto;
  const user = getUsuario();
  return user?.avatar || "";
}

function dataHojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function partesDaData(iso) {
  if (!iso) return { dia: "--", mes: "---" };
  const dataObj = new Date(iso);
  if (isNaN(dataObj)) {
    const partes = String(iso).split("-");
    if (partes.length === 3) return { dia: partes[2], mes: MESES[Number(partes[1]) - 1] || "" };
    return { dia: "--", mes: "---" };
  }
  return {
    dia: String(dataObj.getDate()).padStart(2, "0"),
    mes: MESES[dataObj.getMonth()],
  };
}

function formatarDataDisplay(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("pt-BR");
}

function limparTags(texto) {
  if (!texto) return "";
  return texto
    .replace(/\[Prioridade:.*?\]\s*/gi, "")
    .replace(/\[Categoria:\s*.*?\]\s*/gi, "")
    .replace(/\[Atendimento\]\s*/gi, "")
    .replace(/\[Reunião\]\s*/gi, "")
    .replace(/\[Contato com responsável\]\s*/gi, "")
    .replace(/\[Administrativo\]\s*/gi, "")
    .replace(/\[Observação\]\s*/gi, "")
    .trim();
}

function extrairPrioridade(texto) {
  if (!texto) return "Média";
  const match = texto.match(/\[Prioridade:\s*(Alta|Média|Baixa)\]/i);
  return match ? match[1] : "Média";
}

function extrairCategoria(texto, fallback = "") {
  if (!texto) return fallback;
  const matchTag = texto.match(/\[Categoria:\s*(.*?)\]/i);
  if (matchTag) return matchTag[1].trim();
  for (const cat of CATEGORIAS) {
    if (texto.includes(`[${cat}]`)) return cat;
  }
  return fallback;
}

function Diario() {
  const [avatar, setAvatar] = useState(lerAvatarDiario);
  const [textoAnotacao, setTextoAnotacao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [marcarComoPendencia, setMarcarComoPendencia] = useState(false);
  const [prioridadeNova, setPrioridadeNova] = useState("Média");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);

  const [anotacoesLocais, setAnotacoesLocais] = useState([]);
  const [pendencias, setPendencias] = useState([]);
  const [intervencoes, setIntervencoes] = useState([]);

  useEffect(() => {
    const sincronizarAvatar = () => setAvatar(lerAvatarDiario());
    window.addEventListener("avatar-atualizado", sincronizarAvatar);
    window.addEventListener("storage", sincronizarAvatar);
    return () => {
      window.removeEventListener("avatar-atualizado", sincronizarAvatar);
      window.removeEventListener("storage", sincronizarAvatar);
    };
  }, []);

  useEffect(() => {
    async function carregarDados() {
      try {
        const resIncidentes = await api.get("/incidents");
        const dadosInc = Array.isArray(resIncidentes.data) ? resIncidentes.data : [];

        // 1. Intervenções (vinculadas a estudantes)
        const intervs = dadosInc
          .filter((i) => i.studentId || i.alunoId)
          .map((i) => ({
            ...i,
            id: i.id || i._id,
            data: i.date || i.createdAt || i.data,
            titulo: i.title || i.titulo || (i.student ? i.student.name : "Intervenção"),
            tipo: i.type || i.tipo || "Registro",
            descricao: limparTags(i.description || i.texto),
          }));
        setIntervencoes(intervs);

        // 2. Anotações Locais
        const notas = dadosInc
          .filter(
            (i) =>
              (i.type === "NOTA" || (!i.isPending && i.type !== "PENDENCIA" && i.type !== "RESOLVIDO")) &&
              !(i.studentId || i.alunoId)
          )
          .map((n) => {
            const bruto = n.description || n.texto || "";
            return {
              id: n.id || n._id,
              data: n.date || n.createdAt || n.data,
              texto: limparTags(bruto),
              categoria: n.category || n.categoria || extrairCategoria(bruto, "Observação"),
              titulo:
                n.title ||
                n.titulo ||
                (bruto ? `${limparTags(bruto).slice(0, 52)}...` : "Anotação"),
            };
          });
        setAnotacoesLocais(notas);

        // 3. Pendências (agora preservando a Categoria!)
        const pends = dadosInc
          .filter((i) => i.isPending || i.type === "PENDENCIA" || i.type === "RESOLVIDO")
          .map((p) => {
            const bruto = p.description || p.texto || "";
            return {
              id: p.id || p._id,
              texto: limparTags(bruto),
              alunoId: p.studentId || p.alunoId,
              categoria: p.category || p.categoria || extrairCategoria(bruto, ""),
              prioridade: p.priority || p.prioridade || extrairPrioridade(bruto),
              feita: p.resolved || p.feita || p.type === "RESOLVIDO" || false,
            };
          });
        setPendencias(pends);
      } catch (error) {
        console.error("Erro geral ao carregar o diário", error);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

  const registrosOrdenados = useMemo(
    () => [...intervencoes].sort((a, b) => String(b.data).localeCompare(String(a.data))),
    [intervencoes]
  );

  const notasRecentes = useMemo(
    () => [...anotacoesLocais].sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 3),
    [anotacoesLocais]
  );

  const pendenciasOrdenadas = useMemo(
    () =>
      [...pendencias].sort((a, b) => {
        if (a.feita !== b.feita) return a.feita ? 1 : -1;
        return PRIORIDADES.indexOf(a.prioridade) - PRIORIDADES.indexOf(b.prioridade);
      }),
    [pendencias]
  );

  const abertas = pendencias.filter((item) => !item.feita).length;
  const diasComRegistro = new Set([
    ...intervencoes.map((item) => String(item.data).split("T")[0]),
    ...anotacoesLocais.map((item) => String(item.data).split("T")[0]),
  ]).size;

  async function salvarAnotacao(event) {
    event.preventDefault();
    const texto = textoAnotacao.trim();

    if (!texto) {
      setMensagem("Escreva uma anotação antes de salvar.");
      return;
    }

    setSalvando(true);
    setMensagem("Salvando...");

    const categoriaEscolhida = categoria || "Observação";
    const descricaoPersistida = marcarComoPendencia
      ? `[Prioridade: ${prioridadeNova}] [Categoria: ${categoriaEscolhida}] ${texto}`
      : `[Categoria: ${categoriaEscolhida}] ${texto}`;

    const payload = {
      description: descricaoPersistida,
      category: categoriaEscolhida,
      title: texto.length > 55 ? `${texto.slice(0, 52)}...` : texto,
      isPending: marcarComoPendencia,
      priority: marcarComoPendencia ? prioridadeNova : undefined,
      type: marcarComoPendencia ? "PENDENCIA" : "NOTA",
    };

    try {
      const response = await api.post("/incidents", payload);
      const novoRegistro = response.data;
      const novoId = novoRegistro.id || novoRegistro._id || `temp-${Date.now()}`;

      if (marcarComoPendencia) {
        setPendencias((lista) => [
          {
            id: novoId,
            texto: limparTags(texto),
            categoria: categoriaEscolhida,
            prioridade: prioridadeNova,
            feita: false,
          },
          ...lista,
        ]);
      } else {
        setAnotacoesLocais((lista) => [
          {
            id: novoId,
            data: novoRegistro.date || novoRegistro.createdAt || dataHojeISO(),
            texto: limparTags(texto),
            categoria: categoriaEscolhida,
            titulo: limparTags(payload.title),
          },
          ...lista,
        ]);
      }

      setTextoAnotacao("");
      setCategoria("");
      setMarcarComoPendencia(false);
      setPrioridadeNova("Média");
      setMensagem(
        marcarComoPendencia
          ? "Pendência adicionada com sucesso."
          : "Anotação adicionada com sucesso."
      );

      setTimeout(() => setMensagem(""), 3000);
    } catch (error) {
      console.error("Erro ao salvar anotação", error);
      setMensagem("Falha ao salvar. Verifique sua conexão.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarPendencia(id) {
    const pendencia = pendencias.find((p) => p.id === id);
    if (!pendencia) return;
    const novoStatus = !pendencia.feita;

    setPendencias((lista) =>
      lista.map((item) => (item.id === id ? { ...item, feita: novoStatus } : item))
    );

    try {
      if (typeof id === "number" || (typeof id === "string" && !id.startsWith("temp"))) {
        await api.patch(`/incidents/${id}`, { resolved: novoStatus, feita: novoStatus });
      }
    } catch (error) {
      console.error("Erro ao atualizar pendência", error);
    }
  }

  async function trocarPrioridade(id) {
    const pendencia = pendencias.find((p) => p.id === id);
    if (!pendencia) return;
    const proxima = PRIORIDADES[(PRIORIDADES.indexOf(pendencia.prioridade) + 1) % PRIORIDADES.length];

    setPendencias((lista) =>
      lista.map((item) => (item.id === id ? { ...item, prioridade: proxima } : item))
    );

    const tagCat = pendencia.categoria ? ` [Categoria: ${pendencia.categoria}]` : "";

    try {
      if (typeof id === "number" || (typeof id === "string" && !id.startsWith("temp"))) {
        await api.patch(`/incidents/${id}`, {
          priority: proxima,
          prioridade: proxima,
          description: `[Prioridade: ${proxima}]${tagCat} ${pendencia.texto}`,
        });
      }
    } catch (error) {
      console.error("Erro ao alterar prioridade", error);
    }
  }

  async function excluirPendencia(id) {
    setPendencias((lista) => lista.filter((item) => item.id !== id));
    try {
      if (typeof id === "number" || (typeof id === "string" && !id.startsWith("temp"))) {
        await api.delete(`/incidents/${id}`);
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
                disabled={salvando}
              />
              <small>{textoAnotacao.length}/500</small>
            </label>

            <div
              className="dw-form-rodape"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                marginTop: "4px",
              }}
            >
              {/* SELETOR DE CATEGORIA POR PÍLULAS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Categoria (opcional)</span>
                <div
                  role="radiogroup"
                  aria-label="Categoria da anotação"
                  style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                >
                  {CATEGORIAS.map((item) => {
                    const ativa = categoria === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        role="radio"
                        aria-checked={ativa}
                        disabled={salvando}
                        onClick={() => setCategoria(ativa ? "" : item)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "999px",
                          border: ativa ? "1.5px solid #633df2" : "1px solid #cbd5e1",
                          backgroundColor: ativa ? "#ede9fe" : "#f8fafc",
                          color: ativa ? "#5b21b6" : "#475569",
                          fontSize: "12.5px",
                          fontWeight: ativa ? 700 : 500,
                          cursor: salvando ? "not-allowed" : "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  width: "100%",
                }}
              >
                <div
                  className="dw-pendencia-opcao"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <label className="dw-switch-label" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>Marcar como pendência</span>
                    <input
                      type="checkbox"
                      checked={marcarComoPendencia}
                      onChange={(event) => setMarcarComoPendencia(event.target.checked)}
                      disabled={salvando}
                    />
                    <span className="dw-switch-visual" aria-hidden="true" />
                  </label>

                  {marcarComoPendencia && (
                    <div
                      className="dw-prio-grupo"
                      role="radiogroup"
                      aria-label="Prioridade da pendência"
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        position: "static",
                        marginTop: "2px",
                      }}
                    >
                      {PRIORIDADES.map((item) => (
                        <button
                          key={item}
                          type="button"
                          role="radio"
                          aria-checked={prioridadeNova === item}
                          disabled={salvando}
                          className={`dw-prio-opcao dw-prio-${item.toLowerCase()} ${prioridadeNova === item ? "ativa" : ""}`}
                          onClick={() => setPrioridadeNova(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  className="dw-botao-salvar"
                  type="submit"
                  disabled={salvando}
                  style={{ marginLeft: "auto", flexShrink: 0 }}
                >
                  <IconEnviar width={18} height={18} />
                  {salvando ? "Salvando..." : marcarComoPendencia ? "Salvar pendência" : "Salvar anotação"}
                </button>
              </div>
            </div>

            {mensagem && (
              <p className="dw-mensagem" role="status" style={{ marginTop: "10px" }}>
                {mensagem}
              </p>
            )}
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
                    <label className="dw-pendencia-check" style={{ alignItems: "flex-start" }}>
                      <input type="checkbox" checked={item.feita} onChange={() => alternarPendencia(item.id)} />
                      <span className="dw-check-visual" aria-hidden="true" />
                      <span style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span className="dw-pendencia-texto">{item.texto}</span>
                        {item.categoria && (
                          <span
                            style={{
                              display: "inline-block",
                              width: "fit-content",
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "999px",
                              backgroundColor: "#ede9fe",
                              color: "#5b21b6",
                            }}
                          >
                            {item.categoria}
                          </span>
                        )}
                      </span>
                    </label>
                    <button
                      type="button"
                      className={`dw-prioridade dw-prioridade-${item.prioridade.toLowerCase()}`}
                      onClick={() => trocarPrioridade(item.id)}
                      title="Clique para mudar a prioridade"
                    >
                      {item.prioridade}
                    </button>
                    <button
                      type="button"
                      className="dw-remover-pendencia"
                      onClick={() => excluirPendencia(item.id)}
                      aria-label={`Excluir pendência: ${item.texto}`}
                      title="Excluir pendência"
                    >
                      ×
                    </button>
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
                  const dataReg = item.data;
                  const { dia, mes } = partesDaData(dataReg);
                  const tipo = item.type || item.tipo || "Registro";
                  return (
                    <article className="dw-registro" key={item.id || item._id}>
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
                        <p>{item.descricao}</p>
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
                  );
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
  );
}

export default Diario;