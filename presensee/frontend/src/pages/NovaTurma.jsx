import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import "../painel-administrativo/styles/admin.css";

const MODALIDADES = {
  "Ensino Fundamental": {
    rotulo: "Ensino Fundamental",
    series: [
      { valor: "1º Ano", rotulo: "1º Ano" },
      { valor: "2º Ano", rotulo: "2º Ano" },
      { valor: "3º Ano", rotulo: "3º Ano" },
      { valor: "4º Ano", rotulo: "4º Ano" },
      { valor: "5º Ano", rotulo: "5º Ano" },
      { valor: "6º Ano", rotulo: "6º Ano" },
      { valor: "7º Ano", rotulo: "7º Ano" },
      { valor: "8º Ano", rotulo: "8º Ano" },
      { valor: "9º Ano", rotulo: "9º Ano" },
    ],
  },
  "Ensino Médio": {
    rotulo: "Ensino Médio",
    series: [
      { valor: "1º Ano", rotulo: "1º Ano" },
      { valor: "2º Ano", rotulo: "2º Ano" },
      { valor: "3º Ano", rotulo: "3º Ano" },
    ],
  },
  "Ensino Técnico": {
    rotulo: "Ensino Técnico",
    series: [
      { valor: "1º Módulo", rotulo: "1º Módulo" },
      { valor: "2º Módulo", rotulo: "2º Módulo" },
      { valor: "3º Módulo", rotulo: "3º Módulo" },
      { valor: "4º Módulo", rotulo: "4º Módulo" },
      { valor: "1º Ano", rotulo: "1º Ano" },
      { valor: "2º Ano", rotulo: "2º Ano" },
      { valor: "3º Ano", rotulo: "3º Ano" },
    ],
  },
};

const CURSOS_TECNICOS_SUGERIDOS = [
  "Técnico em Informática",
  "Técnico em Desenvolvimento de Sistemas",
  "Técnico em Enfermagem",
  "Técnico em Administração",
  "Técnico em Logística",
  "Técnico em Segurança do Trabalho",
  "Técnico em Eletrotécnica",
  "Técnico em Edificações",
];

const LETRAS = ["A", "B", "C", "D", "E", "F"];
const TURNOS = ["Manhã", "Tarde", "Noite", "Integral"];

const OPCOES_AUTOCOMPLETE = [
  ...MODALIDADES["Ensino Fundamental"].series.map((s) => ({
    label: `Ensino Fundamental — ${s.rotulo}`,
    keywords: `fundamental ${s.rotulo} ${s.valor.replace(/\D/g, "")} ano ef`,
    modalidade: "Ensino Fundamental",
    serie: s.valor,
    curso: "Ensino Fundamental",
  })),
  ...MODALIDADES["Ensino Médio"].series.map((s) => ({
    label: `Ensino Médio — ${s.rotulo}`,
    keywords: `medio ensino medio ${s.rotulo} ${s.valor.replace(/\D/g, "")} ano serie em`,
    modalidade: "Ensino Médio",
    serie: s.valor,
    curso: "Ensino Médio",
  })),
  ...CURSOS_TECNICOS_SUGERIDOS.flatMap((cursoTec) =>
    ["1º Módulo", "2º Módulo", "3º Módulo", "1º Ano", "2º Ano", "3º Ano"].map((s) => ({
      label: `${cursoTec} — ${s}`,
      keywords: `tecnico ${cursoTec} ${s} modulo ano et`,
      modalidade: "Ensino Técnico",
      serie: s,
      curso: cursoTec,
    }))
  ),
];

function normalizarTexto(txt) {
  return String(txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ºª°]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default function NovaTurma() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [turmasExistentes, setTurmasExistentes] = useState([]);

  const [buscaContexto, setBuscaContexto] = useState("");
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const [modalidade, setModalidade] = useState("Ensino Médio");
  const [serieSelecionada, setSerieSelecionada] = useState("1º Ano");
  const [letraSelecionada, setLetraSelecionada] = useState("A");
  const [cursoTecnico, setCursoTecnico] = useState("Técnico em Informática");
  const [turno, setTurno] = useState("Manhã");

  useEffect(() => {
    async function carregarExistentes() {
      try {
        const res = await api.get("/classes");
        setTurmasExistentes(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("Erro ao consultar turmas existentes:", e);
      }
    }
    carregarExistentes();
  }, []);

  const sugestoesFiltradas = useMemo(() => {
    const termo = normalizarTexto(buscaContexto);
    if (!termo) return OPCOES_AUTOCOMPLETE.slice(0, 12);
    const partes = termo.split(" ").filter(Boolean);
    return OPCOES_AUTOCOMPLETE.filter((item) => {
      const alvo = normalizarTexto(`${item.label} ${item.keywords}`);
      return partes.every((p) => alvo.includes(p));
    }).slice(0, 12);
  }, [buscaContexto]);

  const nomeTurmaGerado = `${serieSelecionada} ${letraSelecionada}`;
  const cursoFinal = modalidade === "Ensino Técnico" ? cursoTecnico.trim() || "Ensino Técnico" : modalidade;

  const turmaDuplicadaLocal = useMemo(() => {
    const nomeNorm = normalizarTexto(nomeTurmaGerado);
    const turnoNorm = normalizarTexto(turno);
    return turmasExistentes.find((t) => {
      const mesmoNome = normalizarTexto(t.name || t.nome) === nomeNorm;
      const tTurno = normalizarTexto(t.shift || t.turno);
      const mesmoTurno = !tTurno || tTurno === turnoNorm;
      return mesmoNome && mesmoTurno;
    });
  }, [turmasExistentes, nomeTurmaGerado, turno]);

  function selecionarModalidade(novaModalidade) {
    setModalidade(novaModalidade);
    const primeiraSerie = MODALIDADES[novaModalidade].series[0]?.valor || "1º Ano";
    setSerieSelecionada(primeiraSerie);
    setErro("");
  }

  function aplicarSugestaoAutocomplete(opcao) {
    setModalidade(opcao.modalidade);
    setSerieSelecionada(opcao.serie);
    if (opcao.modalidade === "Ensino Técnico") {
      setCursoTecnico(opcao.curso);
    }
    setBuscaContexto(opcao.label);
    setMostrarSugestoes(false);
    setErro("");
  }

  async function submeterFormulario(event) {
    event.preventDefault();
    setErro("");

    if (!serieSelecionada || !letraSelecionada) {
      setErro("Selecione a série/módulo e a letra da turma para continuar.");
      return;
    }

    if (turmaDuplicadaLocal) {
      setErro(
        `A turma "${turmaDuplicadaLocal.name || turmaDuplicadaLocal.nome}" (${turno}) já está cadastrada nesta escola.`
      );
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: nomeTurmaGerado,
        course: cursoFinal,
        shift: turno,
        year: new Date().getFullYear(),
      };

      await api.post("/classes", payload);
      navigate("/turmas");
    } catch (error) {
      console.error("Erro ao cadastrar turma:", error);
      const msgApi =
        error.response?.data?.error ||
        "Falha ao criar a turma. Verifique se ela já existe ou tente novamente.";
      setErro(msgApi);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="admin-page" style={{ padding: "2rem" }}>
        <div className="admin-heading">
          <div>
            <h1>Cadastrar Nova Turma</h1>
            <p>
              Pesquise pelo contexto (Fundamental, Médio ou Técnico) ou utilize os seletores rápidos abaixo.
            </p>
          </div>
        </div>

        <form onSubmit={submeterFormulario} className="admin-panel admin-form">
          <h3>Detalhes da Turma</h3>

          {/* AUTOCOMPLETE POR CONTEXTO (FUNDAMENTAL, MÉDIO E TÉCNICO) */}
          <div style={{ position: "relative", marginBottom: "22px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
              Busca rápida / Autocomplete (Modalidade, Série ou Curso)
            </label>
            <input
              type="text"
              value={buscaContexto}
              disabled={loading}
              onFocus={() => setMostrarSugestoes(true)}
              onBlur={() => setTimeout(() => setMostrarSugestoes(false), 180)}
              onChange={(e) => {
                setBuscaContexto(e.target.value);
                setMostrarSugestoes(true);
              }}
              placeholder="Ex: Fundamental 6º ano, Médio 3º ano, Técnico em Informática..."
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1.5px solid #cbd5e1",
                fontSize: "14px",
              }}
            />

            {mostrarSugestoes && (
              <div
                role="listbox"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 30,
                  marginTop: "6px",
                  maxHeight: "240px",
                  overflowY: "auto",
                  backgroundColor: "#ffffff",
                  border: "1.5px solid #ddd6fe",
                  borderRadius: "10px",
                  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.12)",
                }}
              >
                {sugestoesFiltradas.length > 0 ? (
                  sugestoesFiltradas.map((opcao, idx) => (
                    <button
                      key={`${opcao.label}-${idx}`}
                      type="button"
                      onMouseDown={() => aplicarSugestaoAutocomplete(opcao)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                        padding: "10px 14px",
                        border: "none",
                        borderBottom: "1px solid #f1f5f9",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#1e293b",
                      }}
                    >
                      <span>{opcao.label}</span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "999px",
                          background: "#f5f3ff",
                          color: "#633df2",
                        }}
                      >
                        {opcao.modalidade}
                      </span>
                    </button>
                  ))
                ) : (
                  <div style={{ padding: "12px 14px", fontSize: "13px", color: "#64748b" }}>
                    Nenhuma sugestão encontrada. Utilize os seletores manuais abaixo.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TOGGLE LIST 1: MODALIDADE DE ENSINO */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginBottom: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600 }}>Modalidade / Nível de Ensino *</span>
              <div role="radiogroup" aria-label="Selecionar modalidade" style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {Object.keys(MODALIDADES).map((mod) => {
                  const ativo = modalidade === mod;
                  return (
                    <button
                      key={mod}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      disabled={loading}
                      onClick={() => selecionarModalidade(mod)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "10px",
                        border: ativo ? "2px solid #633df2" : "1.5px solid #cbd5e1",
                        backgroundColor: ativo ? "#633df2" : "#ffffff",
                        color: ativo ? "#ffffff" : "#334155",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: ativo ? "0 4px 12px rgba(99, 61, 242, 0.25)" : "none",
                      }}
                    >
                      {mod}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CAMPO DE HABILITAÇÃO QUANDO FOR ENSINO TÉCNICO */}
            {modalidade === "Ensino Técnico" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "14px", fontWeight: 600 }}>Curso Técnico *</label>
                <input
                  type="text"
                  list="lista-cursos-tecnicos"
                  value={cursoTecnico}
                  disabled={loading}
                  onChange={(e) => {
                    setCursoTecnico(e.target.value);
                    setErro("");
                  }}
                  placeholder="Digite ou selecione o curso técnico..."
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                  }}
                />
                <datalist id="lista-cursos-tecnicos">
                  {CURSOS_TECNICOS_SUGERIDOS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            )}

            {/* TOGGLE LIST 2: ANO / SÉRIE / MÓDULO (DINÂMICO CONFORME MODALIDADE) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600 }}>
                {modalidade === "Ensino Técnico" ? "Módulo / Ano *" : "Ano / Série *"}
              </span>
              <div
                role="radiogroup"
                aria-label="Selecionar ano ou módulo"
                style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}
              >
                {MODALIDADES[modalidade].series.map((item) => {
                  const ativo = serieSelecionada === item.valor;
                  return (
                    <button
                      key={item.valor}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      disabled={loading}
                      onClick={() => {
                        setSerieSelecionada(item.valor);
                        setErro("");
                      }}
                      style={{
                        padding: "10px 18px",
                        borderRadius: "10px",
                        border: ativo ? "2px solid #633df2" : "1.5px solid #cbd5e1",
                        backgroundColor: ativo ? "#633df2" : "#ffffff",
                        color: ativo ? "#ffffff" : "#334155",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: ativo ? "0 4px 12px rgba(99, 61, 242, 0.25)" : "none",
                      }}
                    >
                      {item.rotulo}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TOGGLE LIST 3: LETRA DA TURMA */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600 }}>Identificador da Turma *</span>
              <div
                role="radiogroup"
                aria-label="Selecionar letra da turma"
                style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}
              >
                {LETRAS.map((letra) => {
                  const ativo = letraSelecionada === letra;
                  return (
                    <button
                      key={letra}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      disabled={loading}
                      onClick={() => {
                        setLetraSelecionada(letra);
                        setErro("");
                      }}
                      style={{
                        width: "46px",
                        height: "44px",
                        borderRadius: "10px",
                        border: ativo ? "2px solid #633df2" : "1.5px solid #cbd5e1",
                        backgroundColor: ativo ? "#633df2" : "#ffffff",
                        color: ativo ? "#ffffff" : "#334155",
                        fontWeight: 700,
                        fontSize: "15px",
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: ativo ? "0 4px 12px rgba(99, 61, 242, 0.25)" : "none",
                      }}
                    >
                      {letra}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TOGGLE LIST 4: TURNO */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600 }}>Turno *</span>
              <div role="radiogroup" aria-label="Selecionar turno" style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {TURNOS.map((t) => {
                  const ativo = turno === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      disabled={loading}
                      onClick={() => {
                        setTurno(t);
                        setErro("");
                      }}
                      style={{
                        padding: "9px 18px",
                        borderRadius: "10px",
                        border: ativo ? "2px solid #633df2" : "1.5px solid #cbd5e1",
                        backgroundColor: ativo ? "#633df2" : "#ffffff",
                        color: ativo ? "#ffffff" : "#334155",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: loading ? "not-allowed" : "pointer",
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PRÉ-VISUALIZAÇÃO DA TURMA SELECIONADA */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                borderRadius: "10px",
                backgroundColor: turmaDuplicadaLocal ? "#fef2f2" : "#f5f3ff",
                border: turmaDuplicadaLocal ? "1px solid #fecaca" : "1px solid #ddd6fe",
                color: turmaDuplicadaLocal ? "#b91c1c" : "#5b21b6",
                fontSize: "14px",
              }}
            >
              <span>Turma configurada:</span>
              <strong>{nomeTurmaGerado}</strong>
              <span>· {cursoFinal} · {turno}</span>
              {turmaDuplicadaLocal && (
                <span style={{ fontWeight: 700, marginLeft: "auto" }}>
                  ⚠️ Já cadastrada
                </span>
              )}
            </div>
          </div>

          {erro && (
            <p
              role="alert"
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "#fee2e2",
                color: "#b91c1c",
                fontSize: "14px",
              }}
            >
              {erro}
            </p>
          )}

          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn secondary"
              onClick={() => navigate("/turmas")}
              disabled={loading}
            >
              Cancelar
            </button>
            <button className="admin-btn" type="submit" disabled={loading || Boolean(turmaDuplicadaLocal)}>
              {loading ? "Salvando..." : "Salvar Turma"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}