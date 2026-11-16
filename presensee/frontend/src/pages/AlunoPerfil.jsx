import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import GaugeChart from "../components/GaugeChart";
import api from "../services/api";
import "../styles/AlunoPerfil.css";

const PRIORIDADES = ["Alta", "Média", "Baixa"];

const ESTILOS_PRIORIDADE = {
  Alta: { backgroundColor: "#fee2e2", color: "#b91c1c" },
  Média: { backgroundColor: "#fef3c7", color: "#b45309" },
  Baixa: { backgroundColor: "#dcfce7", color: "#15803d" },
};

function corFrequencia(valor) {
  if (valor < 75) return "#ef4444";
  if (valor < 90) return "#eab308";
  return "#22c55e";
}

function corRisco(valor) {
  if (valor >= 70) return "#ef4444";
  if (valor >= 40) return "#eab308";
  return "#22c55e";
}

function iniciais(nome) {
  if (!nome) return "AL";
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function formatarDataDisplay(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("pt-BR");
}

function valorOuNaoInformado(v) {
  return v !== undefined && v !== null && String(v).trim() ? v : "Não informado";
}

function formatarNascimento(valor) {
  if (!valor) return "";
  const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return formatarDataDisplay(valor);
}

function calcularIdade(valor) {
  const m = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - Number(m[1]);
  const mes = hoje.getMonth() + 1 - Number(m[2]);
  if (mes < 0 || (mes === 0 && hoje.getDate() < Number(m[3]))) idade--;
  return idade >= 0 ? idade : null;
}

function limparTagsPendencia(texto) {
  if (!texto) return "";
  return texto
    .replace(/\[Prioridade:\s*(Alta|Média|Baixa)\]\s*/gi, "")
    .replace(/\[Categoria:\s*.*?\]\s*/gi, "")
    .trim();
}

function extrairPrioridadePendencia(texto) {
  if (!texto) return "Média";
  const match = texto.match(/\[Prioridade:\s*(Alta|Média|Baixa)\]/i);
  if (!match) return "Média";
  const valor = match[1].toLowerCase();
  if (valor === "alta") return "Alta";
  if (valor === "baixa") return "Baixa";
  return "Média";
}

function extrairDadosFichaCadastro(incidentes) {
  const ficha = incidentes.find((i) => i.type === "FICHA_CADASTRO");
  if (!ficha?.description) return null;
  try {
    return JSON.parse(ficha.description);
  } catch {
    return null;
  }
}

function formatarDescricaoIntervencao(texto) {
  if (!texto) return "";
  const limpo = String(texto).trim();
  if (limpo.startsWith("{") && limpo.endsWith("}")) {
    try {
      const obj = JSON.parse(limpo);
      const partes = [];
      if (obj.guardianName) {
        partes.push(
          `Responsável: ${obj.guardianName}${obj.guardianRelationship ? ` (${obj.guardianRelationship})` : ""}`
        );
      }
      if (obj.guardianPhone) partes.push(`Tel. Resp.: ${obj.guardianPhone}`);
      if (obj.guardianEmail) partes.push(`E-mail Resp.: ${obj.guardianEmail}`);
      if (obj.phone) partes.push(`Tel. Aluno: ${obj.phone}`);
      if (obj.notes) partes.push(`Obs.: ${obj.notes}`);
      if (partes.length > 0) return partes.join(" · ");
    } catch {
      return limpo;
    }
  }
  return limpo;
}

// Risco atual: 0% quando frequência >= 90%, proporcional às ausências abaixo disso
function calcularPercentualRisco(riskLevel, frequencia) {
  if (typeof riskLevel === "number" && Number.isFinite(riskLevel)) {
    return Math.min(100, Math.max(0, Math.round(riskLevel)));
  }
  if (frequencia >= 90) return 0;
  return Math.min(100, Math.max(0, Math.round(100 - frequencia)));
}

function formatarTurmaCompleta(classObj, fallbackNome) {
  const nome = classObj?.name || fallbackNome || "Turma não vinculada";
  const curso = classObj?.course || "";
  const turno = classObj?.shift || "";
  const detalhe = [curso, turno].filter(Boolean).join(" · ");
  return {
    nome,
    curso,
    turno,
    detalhe,
    rotuloCompleto: detalhe ? `${nome} (${detalhe})` : nome,
  };
}

function AlunoPerfil() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [aluno, setAluno] = useState(null);
  const [turmasLista, setTurmasLista] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [pendencias, setPendencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historicoExpandido, setHistoricoExpandido] = useState(false);

  // Estados do Modal Customizado de Pendência (Criar / Editar)
  const [modalPendenciaAberto, setModalPendenciaAberto] = useState(false);
  const [pendenciaEditando, setPendenciaEditando] = useState(null);
  const [textoPendencia, setTextoPendencia] = useState("");
  const [prioridadePendencia, setPrioridadePendencia] = useState("Média");
  const [erroPendencia, setErroPendencia] = useState("");
  const [salvandoPendencia, setSalvandoPendencia] = useState(false);

  // Estado do Modal de Confirmação de Exclusão de Pendência
  const [pendenciaParaExcluir, setPendenciaParaExcluir] = useState(null);
  const [excluindoPendencia, setExcluindoPendencia] = useState(false);

  // Estados do Modal de Edição do Aluno (CRUD completo com Endereço)
  const [modalEditarAlunoAberto, setModalEditarAlunoAberto] = useState(false);
  const [formEdicaoAluno, setFormEdicaoAluno] = useState({
    name: "",
    registration: "",
    classId: "",
    email: "",
    birthDate: "",
    gender: "",
    cpf: "",
    phone: "",
    guardianName: "",
    guardianRelationship: "",
    guardianPhone: "",
    guardianEmail: "",
    cep: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    notes: "",
  });
  const [salvandoEdicaoAluno, setSalvandoEdicaoAluno] = useState(false);
  const [erroEdicaoAluno, setErroEdicaoAluno] = useState("");

  const carregarPerfil = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      let dadosAluno = null;

      const [resAlunoResult, resTurmasResult] = await Promise.allSettled([
        api.get(`/students/${encodeURIComponent(id)}`),
        api.get("/classes"),
      ]);

      if (resTurmasResult.status === "fulfilled" && Array.isArray(resTurmasResult.value.data)) {
        setTurmasLista(resTurmasResult.value.data);
      }

      if (resAlunoResult.status === "fulfilled") {
        dadosAluno = resAlunoResult.value.data?.student || resAlunoResult.value.data;
      } else {
        console.warn("Busca direta /students/:id falhou, tentando localizar na listagem geral...");
      }

      if (!dadosAluno || !dadosAluno.id) {
        const resLista = await api.get("/students");
        const lista = Array.isArray(resLista.data) ? resLista.data : [];
        dadosAluno = lista.find(
          (s) => String(s.id) === String(id) || String(s.registration || s.matricula) === String(id)
        );
      }

      if (!dadosAluno) {
        setAluno(null);
        return;
      }

      const studentRealId = dadosAluno.id || id;

      let attendances = Array.isArray(dadosAluno.attendances) ? dadosAluno.attendances : [];
      if (attendances.length === 0) {
        try {
          const resFreq = await api.get(`/students/${studentRealId}/attendance-history`);
          attendances = Array.isArray(resFreq.data) ? resFreq.data : [];
        } catch {
          // Segue sem registros caso falhe
        }
      }

      const totalChamadas = attendances.length;
      const totalPresentes = attendances.filter(
        (a) => a.status === "PRESENT" || a.status === "EXCUSED"
      ).length;
      const totalFaltas =
        totalChamadas > 0
          ? attendances.filter((a) => a.status === "ABSENT").length
          : dadosAluno.absences ?? dadosAluno.faltas ?? 0;

      const frequenciaCalculada =
        totalChamadas > 0
          ? Math.round((totalPresentes / totalChamadas) * 100)
          : dadosAluno.attendanceRate ?? dadosAluno.frequencia ?? 100;

      const riscoCalculado = calcularPercentualRisco(dadosAluno.riskLevel, frequenciaCalculada);

      let todosIncidentes = Array.isArray(dadosAluno.incidents) ? [...dadosAluno.incidents] : [];
      try {
        const resIncidentes = await api.get(`/incidents?studentId=${studentRealId}`);
        if (Array.isArray(resIncidentes.data)) {
          const mapaInc = new Map();
          [...todosIncidentes, ...resIncidentes.data].forEach((item) => {
            if (item?.id) mapaInc.set(item.id, item);
          });
          todosIncidentes = Array.from(mapaInc.values());
        }
      } catch (e) {
        console.warn("Rota auxiliar de incidentes pendente para o aluno:", e);
      }

      const incidentes = todosIncidentes.filter(
        (i) => !i.studentId || String(i.studentId) === String(studentRealId)
      );

      const fichaCadastro = extrairDadosFichaCadastro(incidentes);

      let listaResponsaveis = [];
      if (Array.isArray(dadosAluno.guardians) && dadosAluno.guardians.length > 0) {
        listaResponsaveis = dadosAluno.guardians;
      } else if (Array.isArray(dadosAluno.responsaveis) && dadosAluno.responsaveis.length > 0) {
        listaResponsaveis = dadosAluno.responsaveis;
      } else if (
        dadosAluno.guardianName ||
        dadosAluno.responsavelNome ||
        dadosAluno.guardianPhone ||
        dadosAluno.responsavelTelefone ||
        fichaCadastro?.guardianName ||
        fichaCadastro?.guardianPhone
      ) {
        listaResponsaveis = [
          {
            nome:
              dadosAluno.guardianName ||
              dadosAluno.responsavelNome ||
              fichaCadastro?.guardianName ||
              "Não informado",
            telefone:
              dadosAluno.guardianPhone ||
              dadosAluno.responsavelTelefone ||
              fichaCadastro?.guardianPhone ||
              "Telefone não informado",
            parentesco:
              dadosAluno.guardianRelationship || fichaCadastro?.guardianRelationship || "",
            email: dadosAluno.guardianEmail || fichaCadastro?.guardianEmail || "",
          },
        ];
      }

      const brutoEndereco = dadosAluno.address || dadosAluno.endereco;
      const end = brutoEndereco && typeof brutoEndereco === "object" ? brutoEndereco : {};
      const turmaInfo = formatarTurmaCompleta(dadosAluno.class || dadosAluno.turma, dadosAluno.turma);

      setAluno({
        id: studentRealId,
        classId: dadosAluno.classId || dadosAluno.class?.id || "",
        nome: dadosAluno.name || dadosAluno.nome || "Aluno sem nome",
        matricula: dadosAluno.registration || dadosAluno.matricula || "N/A",
        turma: turmaInfo.nome,
        curso: turmaInfo.curso,
        turno: turmaInfo.turno,
        turmaRotuloCompleto: turmaInfo.rotuloCompleto,
        email: dadosAluno.email || "Não informado",
        foto:
          dadosAluno.biometricDataUrl ||
          dadosAluno.biometryUrl ||
          dadosAluno.photoUrl ||
          dadosAluno.avatar ||
          "",
        frequencia: frequenciaCalculada,
        risco: riscoCalculado,
        status:
          dadosAluno.status || (frequenciaCalculada < 75 ? "Em acompanhamento" : "Regular"),
        faltas: totalFaltas,
        responsaveis: listaResponsaveis,
        nascimento:
          dadosAluno.birthDate || dadosAluno.nascimento || fichaCadastro?.birthDate || "",
        sexo: dadosAluno.gender || dadosAluno.sexo || fichaCadastro?.gender || "",
        cpf: dadosAluno.cpf || fichaCadastro?.cpf || "",
        telefone: dadosAluno.phone || dadosAluno.telefone || fichaCadastro?.phone || "",
        observacoes: dadosAluno.notes || dadosAluno.observacoes || fichaCadastro?.notes || "",
        cep:
          end.zipCode || end.cep || dadosAluno.zipCode || dadosAluno.cep || fichaCadastro?.cep || "",
        rua:
          end.street || end.rua || dadosAluno.street || dadosAluno.rua || fichaCadastro?.rua || "",
        numero:
          end.number || end.numero || dadosAluno.number || dadosAluno.numero || fichaCadastro?.numero || "",
        bairro:
          end.neighborhood || end.bairro || dadosAluno.neighborhood || dadosAluno.bairro || fichaCadastro?.bairro || "",
        cidade:
          end.city || end.cidade || dadosAluno.city || dadosAluno.cidade || fichaCadastro?.cidade || "",
        estado:
          end.state || end.estado || dadosAluno.state || dadosAluno.estado || fichaCadastro?.estado || "",
      });

      const historicoFiltrado = incidentes.filter(
        (i) =>
          !i.isPending &&
          i.type !== "PENDENCIA" &&
          i.type !== "RESOLVIDO" &&
          i.type !== "FICHA_CADASTRO"
      );
      setHistorico(
        historicoFiltrado
          .map((e) => ({
            id: e.id || e._id,
            data: e.createdAt || e.date || e.data,
            tipo: e.type || e.tipo || "Intervenção",
            descricao: formatarDescricaoIntervencao(e.description || e.descricao),
          }))
          .sort((a, b) => String(b.data).localeCompare(String(a.data)))
      );

      const pends = incidentes.filter(
        (i) => i.isPending || i.type === "PENDENCIA" || i.type === "RESOLVIDO"
      );
      setPendencias(
        pends.map((p) => {
          const bruto = p.description || p.texto || "";
          return {
            id: p.id || p._id,
            texto: limparTagsPendencia(bruto),
            prioridade: p.priority || p.prioridade || extrairPrioridadePendencia(bruto),
            feita: p.resolved || p.feita || p.type === "RESOLVIDO" || false,
          };
        })
      );
    } catch (error) {
      console.error("Erro ao buscar perfil do aluno:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    carregarPerfil();
  }, [carregarPerfil]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (modalPendenciaAberto && !salvandoPendencia) fecharModalPendencia();
        if (pendenciaParaExcluir && !excluindoPendencia) setPendenciaParaExcluir(null);
        if (modalEditarAlunoAberto && !salvandoEdicaoAluno) setModalEditarAlunoAberto(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    modalPendenciaAberto,
    salvandoPendencia,
    pendenciaParaExcluir,
    excluindoPendencia,
    modalEditarAlunoAberto,
    salvandoEdicaoAluno,
  ]);

  if (loading) {
    return (
      <DashboardLayout>
        <div
          className="perfil-page"
          style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}
        >
          <p>Carregando perfil do estudante...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!aluno) {
    return (
      <DashboardLayout>
        <div className="perfil-page">
          <h1>Aluno não encontrado</h1>
          <Link to="/alunos" className="diario-link-aluno">
            ← Voltar para a lista de alunos
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const ultimasIntervencoes = historicoExpandido ? historico : historico.slice(0, 3);
  const responsavelPrincipal = aluno.responsaveis?.[0];

  const idadeAluno = calcularIdade(aluno.nascimento);
  const nascimentoTexto = aluno.nascimento
    ? `${formatarNascimento(aluno.nascimento)}${idadeAluno !== null ? ` · ${idadeAluno} anos` : ""}`
    : "";

  const dadosPessoais = [
    ["Data de nascimento", nascimentoTexto],
    ["Sexo", aluno.sexo],
    ["CPF", aluno.cpf],
    ["Matrícula", aluno.matricula !== "N/A" ? aluno.matricula : ""],
    ["Turma", aluno.turma !== "Turma não vinculada" ? aluno.turma : ""],
    ["Modalidade / Curso", aluno.curso],
    ["Turno", aluno.turno],
    ["E-mail", aluno.email !== "Não informado" ? aluno.email : ""],
    ["Telefone", aluno.telefone],
  ];

  const limparPlaceholder = (v) =>
    v === "Não informado" || v === "Telefone não informado" ? "" : v;

  const dadosResponsavel = [
    ["Nome", limparPlaceholder(responsavelPrincipal?.nome || responsavelPrincipal?.name)],
    ["Parentesco", responsavelPrincipal?.parentesco],
    ["Telefone", limparPlaceholder(responsavelPrincipal?.telefone || responsavelPrincipal?.phone)],
    ["E-mail", responsavelPrincipal?.email],
  ];

  const dadosEndereco = [
    ["CEP", aluno.cep],
    ["Rua", aluno.rua],
    ["Número", aluno.numero],
    ["Bairro", aluno.bairro],
    ["Cidade", aluno.cidade],
    ["Estado", aluno.estado],
  ];

  const pendenciasOrdenadas = [...pendencias].sort((a, b) => {
    if (a.feita !== b.feita) return a.feita ? 1 : -1;
    return PRIORIDADES.indexOf(a.prioridade) - PRIORIDADES.indexOf(b.prioridade);
  });

  async function buscarCepAutomatico(cepDigitado) {
    const cepLimpo = cepDigitado.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        setFormEdicaoAluno((prev) => ({
          ...prev,
          rua: data.logradouro || prev.rua,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } catch {
      // Ignora erro de rede no ViaCEP
    }
  }

  function abrirModalEdicaoAluno() {
    const dataNascInput = aluno.nascimento ? String(aluno.nascimento).slice(0, 10) : "";

    setFormEdicaoAluno({
      name: aluno.nome || "",
      registration: aluno.matricula !== "N/A" ? aluno.matricula : "",
      classId: aluno.classId || "",
      email: aluno.email !== "Não informado" ? aluno.email : "",
      birthDate: dataNascInput,
      gender: aluno.sexo || "",
      cpf: aluno.cpf || "",
      phone: aluno.telefone || "",
      guardianName: limparPlaceholder(responsavelPrincipal?.nome || responsavelPrincipal?.name) || "",
      guardianRelationship: responsavelPrincipal?.parentesco || "",
      guardianPhone: limparPlaceholder(responsavelPrincipal?.telefone || responsavelPrincipal?.phone) || "",
      guardianEmail: responsavelPrincipal?.email || "",
      cep: aluno.cep || "",
      rua: aluno.rua || "",
      numero: aluno.numero || "",
      bairro: aluno.bairro || "",
      cidade: aluno.cidade || "",
      estado: aluno.estado || "",
      notes: aluno.observacoes || "",
    });
    setErroEdicaoAluno("");
    setModalEditarAlunoAberto(true);
  }

  async function salvarEdicaoAluno(e) {
    e.preventDefault();
    setErroEdicaoAluno("");

    if (!formEdicaoAluno.name.trim() || !formEdicaoAluno.registration.trim() || !formEdicaoAluno.classId) {
      setErroEdicaoAluno("Nome, matrícula e turma são obrigatórios.");
      return;
    }

    setSalvandoEdicaoAluno(true);
    try {
      await api.patch(`/students/${aluno.id}`, {
        name: formEdicaoAluno.name.trim(),
        registration: formEdicaoAluno.registration.trim(),
        classId: formEdicaoAluno.classId,
        email: formEdicaoAluno.email.trim(),
        birthDate: formEdicaoAluno.birthDate || null,
        gender: formEdicaoAluno.gender.trim(),
        cpf: formEdicaoAluno.cpf.trim(),
        phone: formEdicaoAluno.phone.trim(),
        guardianName: formEdicaoAluno.guardianName.trim(),
        guardianRelationship: formEdicaoAluno.guardianRelationship.trim(),
        guardianPhone: formEdicaoAluno.guardianPhone.trim(),
        guardianEmail: formEdicaoAluno.guardianEmail.trim(),
        cep: formEdicaoAluno.cep.trim(),
        rua: formEdicaoAluno.rua.trim(),
        numero: formEdicaoAluno.numero.trim(),
        bairro: formEdicaoAluno.bairro.trim(),
        cidade: formEdicaoAluno.cidade.trim(),
        estado: formEdicaoAluno.estado.trim(),
        notes: formEdicaoAluno.notes.trim(),
      });

      setModalEditarAlunoAberto(false);
      await carregarPerfil();
    } catch (error) {
      console.error("Erro ao atualizar aluno:", error);
      setErroEdicaoAluno(
        error.response?.data?.error || "Não foi possível salvar as alterações do aluno."
      );
    } finally {
      setSalvandoEdicaoAluno(false);
    }
  }

  async function excluirAlunoPerfil() {
    const confirmar = window.confirm(
      `Deseja realmente excluir o estudante "${aluno.nome}"? Todos os registros vinculados serão removidos.`
    );
    if (!confirmar) return;

    try {
      await api.delete(`/students/${aluno.id}`);
      navigate("/alunos");
    } catch (error) {
      alert(error.response?.data?.error || "Não foi possível excluir o estudante.");
    }
  }

  function abrirModalNovaPendencia() {
    setPendenciaEditando(null);
    setTextoPendencia("");
    setPrioridadePendencia("Média");
    setErroPendencia("");
    setModalPendenciaAberto(true);
  }

  function abrirModalEditarPendencia(item) {
    setPendenciaEditando(item);
    setTextoPendencia(item.texto);
    setPrioridadePendencia(item.prioridade || "Média");
    setErroPendencia("");
    setModalPendenciaAberto(true);
  }

  function fecharModalPendencia() {
    setModalPendenciaAberto(false);
    setPendenciaEditando(null);
    setTextoPendencia("");
    setErroPendencia("");
  }

  async function salvarPendenciaModal(e) {
    e.preventDefault();
    const textoLimpo = textoPendencia.trim();
    if (!textoLimpo) {
      setErroPendencia("Descreva a pendência antes de salvar.");
      return;
    }

    setSalvandoPendencia(true);
    setErroPendencia("");

    const descricaoFormatada = `[Prioridade: ${prioridadePendencia}] ${textoLimpo}`;

    try {
      if (pendenciaEditando) {
        await api.patch(`/incidents/${pendenciaEditando.id}`, {
          description: descricaoFormatada,
          priority: prioridadePendencia,
        });

        setPendencias((lista) =>
          lista.map((p) =>
            p.id === pendenciaEditando.id
              ? { ...p, texto: textoLimpo, prioridade: prioridadePendencia }
              : p
          )
        );
      } else {
        const payload = {
          description: descricaoFormatada,
          studentId: aluno.id,
          isPending: true,
          type: "PENDENCIA",
          priority: prioridadePendencia,
          resolved: false,
        };

        const response = await api.post("/incidents", payload);
        const nova = response.data;

        setPendencias((lista) => [
          ...lista,
          {
            id: nova.id || nova._id || Date.now(),
            texto: textoLimpo,
            prioridade: prioridadePendencia,
            feita: false,
          },
        ]);
      }

      fecharModalPendencia();
    } catch (error) {
      console.error("Erro ao salvar pendência:", error);
      setErroPendencia("Não foi possível salvar a pendência no servidor. Tente novamente.");
    } finally {
      setSalvandoPendencia(false);
    }
  }

  async function confirmarExclusaoPendencia() {
    if (!pendenciaParaExcluir) return;
    setExcluindoPendencia(true);

    try {
      await api.delete(`/incidents/${pendenciaParaExcluir.id}`);
      setPendencias((lista) => lista.filter((item) => item.id !== pendenciaParaExcluir.id));
      setPendenciaParaExcluir(null);
    } catch (error) {
      console.error("Erro ao excluir pendência:", error);
    } finally {
      setExcluindoPendencia(false);
    }
  }

  async function alternarPendencia(idPendencia) {
    const pendencia = pendencias.find((p) => p.id === idPendencia);
    if (!pendencia) return;
    const novoStatus = !pendencia.feita;

    setPendencias((lista) =>
      lista.map((item) => (item.id === idPendencia ? { ...item, feita: novoStatus } : item))
    );

    try {
      await api.patch(`/incidents/${idPendencia}`, { resolved: novoStatus });
    } catch (error) {
      console.error("Erro ao alternar pendência:", error);
    }
  }

  return (
    <DashboardLayout>
      <main className="perfil-page perfil-moderno">
        <div
          className="perfil-breadcrumb"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <Link to="/alunos">Alunos</Link>
            <span> / </span>
            <span>Perfil do aluno</span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={abrirModalEdicaoAluno}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#1e293b",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              ✎ Editar cadastro
            </button>
            <button
              type="button"
              onClick={excluirAlunoPerfil}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Excluir aluno
            </button>
          </div>
        </div>

        <section className="perfil-cabecalho">
          <div className="perfil-identificacao">
            <div className="perfil-avatar-iniciais">
              {aluno.foto ? (
                <img
                  src={aluno.foto}
                  alt={aluno.nome}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                />
              ) : (
                iniciais(aluno.nome)
              )}
            </div>
            <div className="perfil-identificacao-texto">
              <h1>{aluno.nome}</h1>
              <p>
                {aluno.turmaRotuloCompleto} <span>·</span> Matrícula: {aluno.matricula}
              </p>
              <span
                className={`perfil-status-badge ${
                  aluno.frequencia < 75 ? "alto" : aluno.frequencia < 90 ? "medio" : "baixo"
                }`}
              >
                <span className="perfil-status-ponto" />
                {aluno.status}
              </span>
            </div>
          </div>

          <div className="perfil-risco">
            <span className="perfil-risco-label">Risco atual</span>
            <strong>{aluno.risco}%</strong>
            <div className="perfil-risco-barra">
              <span
                style={{
                  width: `${Math.min(100, Math.max(0, Number(aluno.risco) || 0))}%`,
                  backgroundColor: corRisco(aluno.risco),
                }}
              />
            </div>
            <p>
              {aluno.frequencia < 75
                ? "Frequência abaixo do esperado. É importante manter o acompanhamento."
                : "Continue acompanhando a frequência e o desempenho do aluno."}
            </p>
          </div>

          <div className="perfil-detalhes">
            <div className="perfil-detalhes-titulo">
              <span className="perfil-detalhes-icone">▤</span>
              <h2>Informações do cadastro</h2>
            </div>

            <div className="perfil-detalhes-grupos">
              <div className="perfil-detalhes-grupo">
                <h3>
                  <span className="perfil-detalhes-grupo-icone">♙</span>
                  Dados pessoais
                </h3>
                <dl className="perfil-dados-grid">
                  {dadosPessoais.map(([rotulo, valor]) => (
                    <div className="perfil-dados-item" key={rotulo}>
                      <dt>{rotulo}</dt>
                      <dd>{valorOuNaoInformado(valor)}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="perfil-detalhes-grupo">
                <h3>
                  <span className="perfil-detalhes-grupo-icone">☎</span>
                  Responsável
                </h3>
                <dl className="perfil-dados-grid perfil-dados-grid-unica">
                  {dadosResponsavel.map(([rotulo, valor]) => (
                    <div className="perfil-dados-item" key={rotulo}>
                      <dt>{rotulo}</dt>
                      <dd>{valorOuNaoInformado(valor)}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="perfil-detalhes-grupo">
                <h3>
                  <span className="perfil-detalhes-grupo-icone">⌂</span>
                  Endereço
                </h3>
                <dl className="perfil-dados-grid">
                  {dadosEndereco.map(([rotulo, valor]) => (
                    <div className="perfil-dados-item" key={rotulo}>
                      <dt>{rotulo}</dt>
                      <dd>{valorOuNaoInformado(valor)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <div className="perfil-detalhes-obs">
              <h3>
                <span className="perfil-detalhes-grupo-icone">✎</span>
                Observações
              </h3>
              <p>{valorOuNaoInformado(aluno.observacoes)}</p>
            </div>
          </div>
        </section>

        <section className="perfil-indicadores">
          <article className="perfil-indicador perfil-indicador-frequencia">
            <div className="perfil-indicador-titulo">
              <span className="perfil-indicador-icone">↗</span>
              <h2>Frequência</h2>
            </div>
            <div className="perfil-frequencia-conteudo">
              <div className="perfil-gauge-moderno">
                <GaugeChart value={aluno.frequencia} color={corFrequencia(aluno.frequencia)} />
              </div>
              <div className="perfil-frequencia-legenda">
                <span
                  className={`perfil-pilula-frequencia ${
                    aluno.frequencia < 75 ? "atencao" : "normal"
                  }`}
                >
                  {aluno.frequencia < 75 ? "Abaixo do esperado" : "Frequência registrada"}
                </span>
                <p>Frequência atual do aluno</p>
              </div>
            </div>
          </article>

          <article className="perfil-indicador perfil-indicador-intervencoes">
            <div className="perfil-indicador-titulo">
              <span className="perfil-indicador-icone">▤</span>
              <h2>Intervenções</h2>
            </div>
            <strong className="perfil-indicador-numero">{historico.length}</strong>
            <span className="perfil-indicador-descricao">
              {historico.length === 1 ? "Intervenção registrada" : "Intervenções registradas"}
            </span>
            {historico.length > 0 && (
              <span className="perfil-indicador-detalhe">
                Última em {formatarDataDisplay(historico[0].data)}
              </span>
            )}
          </article>

          <article className="perfil-indicador perfil-indicador-faltas">
            <div className="perfil-indicador-titulo">
              <span className="perfil-indicador-icone">▦</span>
              <h2>Faltas</h2>
            </div>
            <strong className="perfil-indicador-numero">{aluno.faltas}</strong>
            <span className="perfil-indicador-descricao">Faltas registradas</span>
            <span className="perfil-indicador-detalhe">Histórico de frequência</span>
          </article>
        </section>

        <section className="perfil-inferior">
          <article className="perfil-bloco perfil-bloco-historico">
            <header className="perfil-bloco-cabecalho">
              <div className="perfil-bloco-titulo">
                <span className="perfil-bloco-icone roxo">◷</span>
                <h2>Últimas intervenções</h2>
              </div>
              {historico.length > 3 && (
                <button
                  type="button"
                  className="perfil-link-historico"
                  onClick={() => setHistoricoExpandido(!historicoExpandido)}
                >
                  {historicoExpandido ? "Mostrar menos" : "Ver histórico completo"}
                  <span>{historicoExpandido ? "↑" : "→"}</span>
                </button>
              )}
            </header>

            {historico.length > 0 ? (
              <div className="perfil-timeline">
                {ultimasIntervencoes.map((item) => {
                  const texto = item.descricao || "";
                  const matchAtestado = texto.match(/\|\s*\[Atestado:\s*(https?:\/\/[^\]]+)\]/i);
                  const textoLimpo = texto
                    .replace(/\|\s*\[Atestado:\s*https?:\/\/[^\]]+\]/i, "")
                    .trim();

                  return (
                    <div className="perfil-timeline-item" key={item.id}>
                      <div className="perfil-timeline-marcador">
                        <span />
                      </div>
                      <div className="perfil-timeline-data">{formatarDataDisplay(item.data)}</div>
                      <div className="perfil-timeline-conteudo">
                        <span
                          className={`perfil-tipo-badge ${
                            item.tipo === "Conversa Individual"
                              ? "conversa"
                              : item.tipo === "Contato com responsável"
                              ? "responsavel"
                              : "encaminhamento"
                          }`}
                        >
                          {item.tipo}
                        </span>
                        <p>{textoLimpo || "Sem descrição registrada."}</p>
                        {matchAtestado && (
                          <a
                            href={matchAtestado[1]}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              marginTop: "6px",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#633df2",
                              textDecoration: "none",
                            }}
                          >
                            📄 Abrir documento do atestado ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="perfil-sem-registros">
                <span>◷</span>
                <p>Nenhuma intervenção registrada para este aluno.</p>
              </div>
            )}
          </article>

          <article className="perfil-bloco perfil-bloco-pendencias">
            <header className="perfil-bloco-cabecalho">
              <div className="perfil-bloco-titulo">
                <span className="perfil-bloco-icone verde">☷</span>
                <h2>Pendências</h2>
              </div>
              <div className="perfil-pendencias-acoes">
                <span className="perfil-pendencias-contador">
                  {pendencias.filter((item) => !item.feita).length} abertas
                </span>
                <button
                  type="button"
                  className="perfil-btn-adicionar-pendencia"
                  onClick={abrirModalNovaPendencia}
                  title="Adicionar pendência"
                  aria-label="Adicionar pendência"
                >
                  +
                </button>
              </div>
            </header>

            {pendenciasOrdenadas.length > 0 ? (
              <div className="perfil-pendencias-modernas">
                {pendenciasOrdenadas.map((item) => {
                  const nivelPrio = ESTILOS_PRIORIDADE[item.prioridade] ? item.prioridade : "Média";
                  const estiloPrio = ESTILOS_PRIORIDADE[nivelPrio];

                  return (
                    <div
                      key={item.id}
                      className={`perfil-pendencia-item ${item.feita ? "concluida" : ""}`}
                    >
                      <label className="perfil-pendencia-checkbox">
                        <input
                          type="checkbox"
                          checked={Boolean(item.feita)}
                          onChange={() => alternarPendencia(item.id)}
                        />
                        <span className="perfil-pendencia-texto">{item.texto}</span>
                      </label>
                      <div
                        className="perfil-pendencia-botoes"
                        style={{ display: "flex", alignItems: "center", gap: "8px" }}
                      >
                        <span
                          style={{
                            ...estiloPrio,
                            fontSize: "11.5px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "999px",
                            lineHeight: 1.2,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {nivelPrio}
                        </span>
                        <button
                          type="button"
                          className="perfil-btn-editar-pendencia"
                          onClick={() => abrirModalEditarPendencia(item)}
                          title="Editar pendência"
                          aria-label={`Editar pendência: ${item.texto}`}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="perfil-btn-excluir-pendencia"
                          onClick={() => setPendenciaParaExcluir(item)}
                          title="Excluir pendência"
                          aria-label={`Excluir pendência: ${item.texto}`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="perfil-sem-registros">
                <span>✓</span>
                <p>Nenhuma pendência para este aluno.</p>
              </div>
            )}
          </article>
        </section>

        {/* MODAL CUSTOMIZADO: EDITAR CADASTRO COMPLETO DO ALUNO (INCLUINDO ENDEREÇO) */}
        {modalEditarAlunoAberto && (
          <div
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !salvandoEdicaoAluno)
                setModalEditarAlunoAberto(false);
            }}
            role="presentation"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(3px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              zIndex: 1100,
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Editar cadastro do aluno"
              style={{
                width: "100%",
                maxWidth: "620px",
                maxHeight: "90vh",
                overflowY: "auto",
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 20px 45px rgba(15, 23, 42, 0.22)",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "19px", color: "#0f172a" }}>
                  Editar Cadastro do Aluno
                </h2>
                <button
                  type="button"
                  onClick={() => setModalEditarAlunoAberto(false)}
                  disabled={salvandoEdicaoAluno}
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    fontSize: "18px",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={salvarEdicaoAluno}
                style={{ display: "flex", flexDirection: "column", gap: "12px" }}
              >
                <strong style={{ fontSize: "13px", color: "#633df2" }}>Dados Pessoais</strong>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                  Nome completo *
                  <input
                    type="text"
                    required
                    value={formEdicaoAluno.name}
                    onChange={(e) => setFormEdicaoAluno({ ...formEdicaoAluno, name: e.target.value })}
                    style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    Matrícula *
                    <input
                      type="text"
                      required
                      value={formEdicaoAluno.registration}
                      onChange={(e) =>
                        setFormEdicaoAluno({ ...formEdicaoAluno, registration: e.target.value })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    Data de nascimento
                    <input
                      type="date"
                      value={formEdicaoAluno.birthDate}
                      onChange={(e) =>
                        setFormEdicaoAluno({ ...formEdicaoAluno, birthDate: e.target.value })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    Sexo
                    <select
                      value={formEdicaoAluno.gender}
                      onChange={(e) =>
                        setFormEdicaoAluno({ ...formEdicaoAluno, gender: e.target.value })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="">Selecione</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    CPF
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={formEdicaoAluno.cpf}
                      onChange={(e) =>
                        setFormEdicaoAluno({ ...formEdicaoAluno, cpf: e.target.value })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    E-mail
                    <input
                      type="email"
                      value={formEdicaoAluno.email}
                      onChange={(e) =>
                        setFormEdicaoAluno({ ...formEdicaoAluno, email: e.target.value })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    Telefone
                    <input
                      type="tel"
                      value={formEdicaoAluno.phone}
                      onChange={(e) =>
                        setFormEdicaoAluno({ ...formEdicaoAluno, phone: e.target.value })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>
                </div>

                {/* TOGGLE LIST PADRONIZADO DE TURMAS */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>Turma *</span>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      maxHeight: "130px",
                      overflowY: "auto",
                    }}
                  >
                    {turmasLista.map((t) => {
                      const tId = t.id || t._id;
                      const ativo = String(formEdicaoAluno.classId) === String(tId);
                      const info = formatarTurmaCompleta(t, t.name);
                      return (
                        <button
                          key={tId}
                          type="button"
                          onClick={() => setFormEdicaoAluno({ ...formEdicaoAluno, classId: tId })}
                          style={{
                            padding: "7px 12px",
                            borderRadius: "8px",
                            border: ativo ? "2px solid #633df2" : "1px solid #cbd5e1",
                            background: ativo ? "#633df2" : "#ffffff",
                            color: ativo ? "#ffffff" : "#1e293b",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <div>{info.nome}</div>
                          {info.detalhe && (
                            <div style={{ fontSize: "10px", opacity: 0.85 }}>{info.detalhe}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <strong style={{ fontSize: "13px", color: "#633df2", marginTop: "4px" }}>
                  Responsável
                </strong>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    Nome do Responsável
                    <input
                      type="text"
                      value={formEdicaoAluno.guardianName}
                      onChange={(e) =>
                        setFormEdicaoAluno({ ...formEdicaoAluno, guardianName: e.target.value })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    Parentesco
                    <input
                      type="text"
                      placeholder="Ex: Mãe, Pai, Avó"
                      value={formEdicaoAluno.guardianRelationship}
                      onChange={(e) =>
                        setFormEdicaoAluno({
                          ...formEdicaoAluno,
                          guardianRelationship: e.target.value,
                        })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    Telefone do Responsável
                    <input
                      type="tel"
                      value={formEdicaoAluno.guardianPhone}
                      onChange={(e) =>
                        setFormEdicaoAluno({ ...formEdicaoAluno, guardianPhone: e.target.value })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    E-mail do Responsável
                    <input
                      type="email"
                      value={formEdicaoAluno.guardianEmail}
                      onChange={(e) =>
                        setFormEdicaoAluno({ ...formEdicaoAluno, guardianEmail: e.target.value })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>
                </div>

                <strong style={{ fontSize: "13px", color: "#633df2", marginTop: "4px" }}>
                  Endereço
                </strong>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: "10px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    CEP
                    <input
                      type="text"
                      placeholder="50000-000"
                      value={formEdicaoAluno.cep}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormEdicaoAluno({ ...formEdicaoAluno, cep: val });
                        buscarCepAutomatico(val);
                      }}
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    Rua / Logradouro
                    <input
                      type="text"
                      value={formEdicaoAluno.rua}
                      onChange={(e) =>
                        setFormEdicaoAluno({ ...formEdicaoAluno, rua: e.target.value })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    Número
                    <input
                      type="text"
                      value={formEdicaoAluno.numero}
                      onChange={(e) =>
                        setFormEdicaoAluno({ ...formEdicaoAluno, numero: e.target.value })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 0.6fr", gap: "10px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    Bairro
                    <input
                      type="text"
                      value={formEdicaoAluno.bairro}
                      onChange={(e) =>
                        setFormEdicaoAluno({ ...formEdicaoAluno, bairro: e.target.value })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    Cidade
                    <input
                      type="text"
                      value={formEdicaoAluno.cidade}
                      onChange={(e) =>
                        setFormEdicaoAluno({ ...formEdicaoAluno, cidade: e.target.value })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                    UF
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="PE"
                      value={formEdicaoAluno.estado}
                      onChange={(e) =>
                        setFormEdicaoAluno({
                          ...formEdicaoAluno,
                          estado: e.target.value.toUpperCase(),
                        })
                      }
                      style={{ padding: "9px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </label>
                </div>

                <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: 600 }}>
                  Observações
                  <textarea
                    rows={2}
                    value={formEdicaoAluno.notes}
                    onChange={(e) =>
                      setFormEdicaoAluno({ ...formEdicaoAluno, notes: e.target.value })
                    }
                    style={{
                      padding: "9px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontFamily: "inherit",
                    }}
                  />
                </label>

                {erroEdicaoAluno && (
                  <p
                    style={{
                      margin: 0,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "#fee2e2",
                      color: "#b91c1c",
                      fontSize: "13px",
                    }}
                  >
                    {erroEdicaoAluno}
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="button"
                    disabled={salvandoEdicaoAluno}
                    onClick={() => setModalEditarAlunoAberto(false)}
                    style={{
                      padding: "9px 16px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvandoEdicaoAluno}
                    style={{
                      padding: "9px 18px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#633df2",
                      color: "#ffffff",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {salvandoEdicaoAluno ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CUSTOMIZADO: ADICIONAR / EDITAR PENDÊNCIA */}
        {modalPendenciaAberto && (
          <div
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !salvandoPendencia) fecharModalPendencia();
            }}
            role="presentation"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(3px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              zIndex: 1100,
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-modal-pendencia"
              style={{
                width: "100%",
                maxWidth: "460px",
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 20px 45px rgba(15, 23, 42, 0.22)",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <h2 id="titulo-modal-pendencia" style={{ margin: 0, fontSize: "19px", color: "#0f172a" }}>
                    {pendenciaEditando ? "Editar pendência" : "Nova pendência"}
                  </h2>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                    Estudante: <strong>{aluno.nome}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fecharModalPendencia}
                  disabled={salvandoPendencia}
                  aria-label="Fechar modal"
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    fontSize: "18px",
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={salvarPendenciaModal} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: 600, color: "#334155" }}>
                  <span>Descrição da pendência *</span>
                  <textarea
                    rows={3}
                    maxLength={300}
                    autoFocus
                    required
                    disabled={salvandoPendencia}
                    value={textoPendencia}
                    onChange={(e) => {
                      setTextoPendencia(e.target.value);
                      setErroPendencia("");
                    }}
                    placeholder="Ex.: Solicitar assinatura do responsável no termo de compromisso..."
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                  <small style={{ fontWeight: 400, color: "#64748b", textAlign: "right" }}>
                    {textoPendencia.length}/300
                  </small>
                </label>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#334155" }}>Prioridade</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                    {PRIORIDADES.map((nivel) => {
                      const ativa = prioridadePendencia === nivel;
                      const cores = {
                        Alta: { bg: "#fee2e2", border: "#ef4444", text: "#b91c1c" },
                        Média: { bg: "#fef3c7", border: "#f59e0b", text: "#b45309" },
                        Baixa: { bg: "#dcfce7", border: "#22c55e", text: "#15803d" },
                      }[nivel];
                      return (
                        <button
                          key={nivel}
                          type="button"
                          disabled={salvandoPendencia}
                          onClick={() => setPrioridadePendencia(nivel)}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "8px",
                            border: `1.5px solid ${ativa ? cores.border : "#e2e8f0"}`,
                            backgroundColor: ativa ? cores.bg : "#f8fafc",
                            color: ativa ? cores.text : "#475569",
                            fontWeight: 600,
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          {nivel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {erroPendencia && (
                  <p role="alert" style={{ margin: 0, padding: "8px 12px", borderRadius: "8px", background: "#fee2e2", color: "#b91c1c", fontSize: "13px" }}>
                    {erroPendencia}
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="button"
                    disabled={salvandoPendencia}
                    onClick={fecharModalPendencia}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#475569",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvandoPendencia}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#633df2",
                      color: "#ffffff",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: salvandoPendencia ? "not-allowed" : "pointer",
                    }}
                  >
                    {salvandoPendencia
                      ? "Salvando..."
                      : pendenciaEditando
                      ? "Salvar alterações"
                      : "Adicionar pendência"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL CUSTOMIZADO: CONFIRMAR EXCLUSÃO DE PENDÊNCIA */}
        {pendenciaParaExcluir && (
          <div
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !excluindoPendencia) setPendenciaParaExcluir(null);
            }}
            role="presentation"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(3px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              zIndex: 1100,
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-modal-excluir-pendencia"
              style={{
                width: "100%",
                maxWidth: "400px",
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 20px 45px rgba(15, 23, 42, 0.22)",
                border: "1px solid #e2e8f0",
              }}
            >
              <h2 id="titulo-modal-excluir-pendencia" style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#0f172a" }}>
                Excluir pendência
              </h2>
              <p style={{ margin: "0 0 18px 0", fontSize: "14px", color: "#475569", lineHeight: 1.5 }}>
                Tem certeza que deseja excluir a pendência <strong>“{pendenciaParaExcluir.texto}”</strong>? Esta ação não poderá ser desfeita.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  disabled={excluindoPendencia}
                  onClick={() => setPendenciaParaExcluir(null)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={excluindoPendencia}
                  onClick={confirmarExclusaoPendencia}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#ef4444",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: excluindoPendencia ? "not-allowed" : "pointer",
                  }}
                >
                  {excluindoPendencia ? "Excluindo..." : "Sim, excluir"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}

export default AlunoPerfil;