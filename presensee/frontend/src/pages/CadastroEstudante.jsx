import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { MascotAvatar } from "../components/Icons";
import { NOMES_TURMAS } from "../data/diarioMock";
import "../styles/CadastroEstudante.css";

const CHAVE_ALUNOS = "presensee_alunos_cadastrados_demo";
const PARENTESCOS = ["Mãe", "Pai", "Avó/Avô", "Tio/Tia", "Irmã/Irmão", "Tutor(a) legal", "Outro"];
const TURNOS = ["Manhã", "Tarde", "Noite", "Integral"];
const SEXOS = ["Feminino", "Masculino", "Prefiro não informar"];

const FORM_INICIAL = {
  nome: "",
  nascimento: "",
  sexo: "",
  cpf: "",
  matricula: "",
  turma: "",
  turno: "Manhã",
  email: "",
  telefone: "",
  cep: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  respNome: "",
  respParentesco: "Mãe",
  respTelefone: "",
  respEmail: "",
  observacoes: "",
};

const soDigitos = (v) => String(v || "").replace(/\D/g, "");

function mascaraCPF(valor) {
  const d = soDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function mascaraTelefone(valor) {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function mascaraCEP(valor) {
  const d = soDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function cpfValido(cpf) {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const digito = (base) => {
    let soma = 0;
    for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function hojeISO() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
}

function iniciais(nome) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function idadeEmAnos(iso) {
  if (!iso) return null;
  const n = new Date(`${iso}T12:00:00`);
  const h = new Date();
  let idade = h.getFullYear() - n.getFullYear();
  const m = h.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) idade--;
  return idade;
}

function Campo({ rotulo, erro, obrigatorio, largo, children, dica }) {
  return (
    <label className={`cest-campo ${largo ? "cest-campo-largo" : ""} ${erro ? "cest-campo-erro" : ""}`}>
      <span className="cest-rotulo">
        {rotulo}
        {obrigatorio && <b aria-hidden="true"> *</b>}
      </span>
      {children}
      {dica && !erro && <small className="cest-dica">{dica}</small>}
      {erro && <small className="cest-erro-texto" role="alert">{erro}</small>}
    </label>
  );
}

function SecaoTitulo({ icone, titulo, descricao }) {
  return (
    <div className="cest-secao-titulo">
      <span className="cest-secao-icone" aria-hidden="true">{icone}</span>
      <div>
        <h2>{titulo}</h2>
        <p>{descricao}</p>
      </div>
    </div>
  );
}

function CadastroEstudante() {
  const navigate = useNavigate();
  const [form, setForm] = useState(FORM_INICIAL);
  const [erros, setErros] = useState({});
  const [foto, setFoto] = useState("");
  const [avisoFoto, setAvisoFoto] = useState("");
  const [salvo, setSalvo] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const refFoto = useRef(null);

  // Fecha o aviso de confirmação com a tecla Esc.
  useEffect(() => {
    if (!confirmando) return undefined;
    const aoTeclar = (e) => { if (e.key === "Escape") setConfirmando(false); };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [confirmando]);

  const idade = useMemo(() => idadeEmAnos(form.nascimento), [form.nascimento]);
  const menorDeIdade = idade !== null && idade < 18;

  function alterar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    if (erros[campo]) setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  function escolherFoto(evento) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      setAvisoFoto("Escolha um arquivo de imagem válido.");
      return;
    }
    if (arquivo.size > 2 * 1024 * 1024) {
      setAvisoFoto("A imagem deve ter no máximo 2 MB.");
      evento.target.value = "";
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      setFoto(String(leitor.result || ""));
      setAvisoFoto("");
    };
    leitor.readAsDataURL(arquivo);
  }

  function removerFoto() {
    setFoto("");
    setAvisoFoto("");
    if (refFoto.current) refFoto.current.value = "";
  }

  function validar() {
    const e = {};
    if (form.nome.trim().split(/\s+/).filter(Boolean).length < 2) e.nome = "Informe o nome completo (nome e sobrenome).";
    if (!form.nascimento) e.nascimento = "Informe a data de nascimento.";
    else if (form.nascimento > hojeISO()) e.nascimento = "A data não pode ser futura.";
    if (form.cpf && !cpfValido(form.cpf)) e.cpf = "CPF inválido.";
    if (!form.matricula.trim()) e.matricula = "Informe a matrícula.";
    if (!form.turma) e.turma = "Selecione a turma.";
    if (form.email && !emailValido(form.email.trim())) e.email = "E-mail inválido.";
    if (form.telefone && soDigitos(form.telefone).length < 10) e.telefone = "Telefone incompleto.";
    if (form.cep && soDigitos(form.cep).length !== 8) e.cep = "CEP incompleto.";
    if (!form.respNome.trim()) e.respNome = "Informe o nome do responsável.";
    if (soDigitos(form.respTelefone).length < 10) e.respTelefone = "Informe um telefone válido para contato.";
    if (form.respEmail && !emailValido(form.respEmail.trim())) e.respEmail = "E-mail inválido.";
    return e;
  }

  function salvar(evento) {
    evento.preventDefault();
    const encontrados = validar();
    setErros(encontrados);

    if (Object.keys(encontrados).length) {
      const primeiro = document.querySelector(".cest-campo-erro input, .cest-campo-erro select");
      primeiro?.focus();
      return;
    }

    // Dados válidos: pede a confirmação do usuário antes de gravar.
    setConfirmando(true);
  }

  function confirmarCadastro() {
    setConfirmando(false);

    const aluno = {
      id: Date.now(),
      nome: form.nome.trim(),
      nascimento: form.nascimento,
      sexo: form.sexo,
      cpf: form.cpf,
      matricula: form.matricula.trim(),
      turma: form.turma,
      turno: form.turno,
      email: form.email.trim(),
      telefone: form.telefone,
      endereco: {
        cep: form.cep,
        rua: form.rua.trim(),
        numero: form.numero.trim(),
        bairro: form.bairro.trim(),
        cidade: form.cidade.trim(),
        estado: form.estado,
      },
      responsaveis: [
        {
          nome: form.respNome.trim(),
          parentesco: form.respParentesco,
          telefone: form.respTelefone,
          email: form.respEmail.trim(),
        },
      ],
      observacoes: form.observacoes.trim(),
      frequencia: 100,
      faltas: 0,
      pendencias: [],
      status: "Ativo",
    };

    // MODO DEMONSTRAÇÃO: sem backend, o cadastro fica apenas neste navegador.
    // A foto não é gravada no localStorage para não estourar a cota.
    try {
      const atuais = JSON.parse(localStorage.getItem(CHAVE_ALUNOS) || "[]");
      localStorage.setItem(CHAVE_ALUNOS, JSON.stringify([...atuais, aluno]));
    } catch {
      /* se o navegador não permitir, o cadastro segue apenas na sessão */
    }

    setSalvo(aluno);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function limpar() {
    setForm(FORM_INICIAL);
    setErros({});
    removerFoto();
  }

  function novoCadastro() {
    limpar();
    setSalvo(null);
  }

  if (salvo) {
    return (
      <DashboardLayout>
        <main className="cest-page">
          <section className="cest-sucesso">
            <div className="cest-sucesso-icone" aria-hidden="true">✓</div>
            <h1>Aluno cadastrado!</h1>
            <p>
              <strong>{salvo.nome}</strong> foi adicionado à turma <strong>{salvo.turma}</strong>.
            </p>

            <div className="cest-resumo">
              <div><span>Matrícula</span><strong>{salvo.matricula}</strong></div>
              <div><span>Turno</span><strong>{salvo.turno}</strong></div>
              <div><span>Responsável</span><strong>{salvo.responsaveis[0].nome}</strong></div>
              <div><span>Contato</span><strong>{salvo.responsaveis[0].telefone}</strong></div>
            </div>

            <p className="cest-aviso-demo">
              Modo demonstração: o cadastro foi guardado apenas neste navegador. A gravação definitiva depende da integração com a API.
            </p>

            <div className="cest-sucesso-acoes">
              <button type="button" className="cest-btn cest-btn-secundario" onClick={novoCadastro}>
                Cadastrar outro aluno
              </button>
              <button type="button" className="cest-btn cest-btn-primario" onClick={() => navigate("/alunos")}>
                Ver lista de alunos
              </button>
            </div>
          </section>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <main className="cest-page">
        <div className="cest-breadcrumb">
          <Link to="/alunos">Alunos</Link>
          <span>/</span>
          <span>Cadastrar aluno</span>
        </div>

        <header className="cest-cabecalho">
          <div>
            <h1>Cadastrar aluno</h1>
            <p>Preencha os dados abaixo para adicionar um novo aluno ao acompanhamento da escola.</p>
          </div>
          <span className="cest-legenda-obrigatorio"><b>*</b> Campos obrigatórios</span>
        </header>

        <form className="cest-form" onSubmit={salvar} noValidate>
          {/* DADOS PESSOAIS */}
          <section className="cest-card">
            <SecaoTitulo icone="♙" titulo="Dados pessoais" descricao="Identificação básica do aluno." />

            <div className="cest-pessoais">
              <div className="cest-foto">
                <div className="cest-foto-avatar">
                  {foto ? (
                    <img src={foto} alt="Pré-visualização da foto do aluno" />
                  ) : form.nome.trim() ? (
                    <span className="cest-foto-iniciais">{iniciais(form.nome)}</span>
                  ) : (
                    <MascotAvatar size={84} />
                  )}
                </div>
                <label className="cest-btn cest-btn-secundario cest-foto-upload">
                  {foto ? "Trocar foto" : "Adicionar foto"}
                  <input ref={refFoto} type="file" accept="image/*" onChange={escolherFoto} />
                </label>
                {foto && (
                  <button type="button" className="cest-foto-remover" onClick={removerFoto}>Remover</button>
                )}
                <small className={avisoFoto ? "cest-erro-texto" : "cest-dica"}>
                  {avisoFoto || "JPG ou PNG, até 2 MB. Opcional."}
                </small>
              </div>

              <div className="cest-grid">
                <Campo rotulo="Nome completo" obrigatorio largo erro={erros.nome}>
                  <input
                    className="cest-input"
                    value={form.nome}
                    onChange={(e) => alterar("nome", e.target.value)}
                    placeholder="Ex.: Maria Eduarda da Silva"
                    autoComplete="off"
                  />
                </Campo>

                <Campo rotulo="Data de nascimento" obrigatorio erro={erros.nascimento}
                  dica={idade !== null && idade >= 0 ? `${idade} ano${idade === 1 ? "" : "s"}` : undefined}>
                  <input
                    className="cest-input"
                    type="date"
                    max={hojeISO()}
                    value={form.nascimento}
                    onChange={(e) => alterar("nascimento", e.target.value)}
                  />
                </Campo>

                <Campo rotulo="Sexo">
                  <select className="cest-input" value={form.sexo} onChange={(e) => alterar("sexo", e.target.value)}>
                    <option value="">Selecione</option>
                    {SEXOS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Campo>

                <Campo rotulo="CPF" erro={erros.cpf} dica="Opcional">
                  <input
                    className="cest-input"
                    inputMode="numeric"
                    value={form.cpf}
                    onChange={(e) => alterar("cpf", mascaraCPF(e.target.value))}
                    placeholder="000.000.000-00"
                  />
                </Campo>
              </div>
            </div>
          </section>

          {/* DADOS ESCOLARES */}
          <section className="cest-card">
            <SecaoTitulo icone="▤" titulo="Dados escolares" descricao="Vínculo do aluno com a escola." />
            <div className="cest-grid cest-grid-3">
              <Campo rotulo="Matrícula" obrigatorio erro={erros.matricula}>
                <input
                  className="cest-input"
                  value={form.matricula}
                  onChange={(e) => alterar("matricula", e.target.value)}
                  placeholder="Ex.: 2026001"
                />
              </Campo>

              <Campo rotulo="Turma" obrigatorio erro={erros.turma}>
                <select className="cest-input" value={form.turma} onChange={(e) => alterar("turma", e.target.value)}>
                  <option value="">Selecione a turma</option>
                  {(NOMES_TURMAS || []).map((t) => <option key={t}>{t}</option>)}
                </select>
              </Campo>

              <Campo rotulo="Turno">
                <div className="cest-segmentos" role="radiogroup" aria-label="Turno">
                  {TURNOS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={form.turno === t}
                      className={form.turno === t ? "ativo" : ""}
                      onClick={() => alterar("turno", t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Campo>
            </div>
          </section>

          {/* CONTATO E ENDEREÇO */}
          <section className="cest-card">
            <SecaoTitulo icone="✉" titulo="Contato e endereço" descricao="Como encontrar o aluno quando necessário." />
            <div className="cest-grid cest-grid-3">
              <Campo rotulo="E-mail do aluno" erro={erros.email} dica="Opcional">
                <input
                  className="cest-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => alterar("email", e.target.value)}
                  placeholder="aluno@email.com"
                />
              </Campo>

              <Campo rotulo="Telefone do aluno" erro={erros.telefone} dica="Opcional">
                <input
                  className="cest-input"
                  type="tel"
                  inputMode="tel"
                  value={form.telefone}
                  onChange={(e) => alterar("telefone", mascaraTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </Campo>

              <Campo rotulo="CEP" erro={erros.cep}>
                <input
                  className="cest-input"
                  inputMode="numeric"
                  value={form.cep}
                  onChange={(e) => alterar("cep", mascaraCEP(e.target.value))}
                  placeholder="00000-000"
                />
              </Campo>

              <Campo rotulo="Rua" largo>
                <input className="cest-input" value={form.rua} onChange={(e) => alterar("rua", e.target.value)} placeholder="Rua, avenida..." />
              </Campo>

              <Campo rotulo="Número">
                <input className="cest-input" value={form.numero} onChange={(e) => alterar("numero", e.target.value)} placeholder="Nº" />
              </Campo>

              <Campo rotulo="Bairro">
                <input className="cest-input" value={form.bairro} onChange={(e) => alterar("bairro", e.target.value)} />
              </Campo>

              <Campo rotulo="Cidade">
                <input className="cest-input" value={form.cidade} onChange={(e) => alterar("cidade", e.target.value)} />
              </Campo>

              <Campo rotulo="Estado">
                <input
                  className="cest-input"
                  maxLength={2}
                  value={form.estado}
                  onChange={(e) => alterar("estado", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                  placeholder="PE"
                />
              </Campo>
            </div>
          </section>

          {/* RESPONSÁVEL */}
          <section className="cest-card">
            <SecaoTitulo
              icone="☎"
              titulo="Responsável"
              descricao={menorDeIdade
                ? "Aluno menor de idade: o contato do responsável é essencial."
                : "Contato para comunicados e acompanhamento."}
            />
            <div className="cest-grid cest-grid-2">
              <Campo rotulo="Nome do responsável" obrigatorio erro={erros.respNome}>
                <input className="cest-input" value={form.respNome} onChange={(e) => alterar("respNome", e.target.value)} placeholder="Nome completo" />
              </Campo>

              <Campo rotulo="Parentesco">
                <select className="cest-input" value={form.respParentesco} onChange={(e) => alterar("respParentesco", e.target.value)}>
                  {PARENTESCOS.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Campo>

              <Campo rotulo="Telefone do responsável" obrigatorio erro={erros.respTelefone}>
                <input
                  className="cest-input"
                  type="tel"
                  inputMode="tel"
                  value={form.respTelefone}
                  onChange={(e) => alterar("respTelefone", mascaraTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </Campo>

              <Campo rotulo="E-mail do responsável" erro={erros.respEmail} dica="Opcional">
                <input className="cest-input" type="email" value={form.respEmail} onChange={(e) => alterar("respEmail", e.target.value)} placeholder="responsavel@email.com" />
              </Campo>
            </div>
          </section>

          {/* OBSERVAÇÕES */}
          <section className="cest-card">
            <SecaoTitulo icone="✎" titulo="Observações" descricao="Informações úteis para o acompanhamento (opcional)." />
            <label className="cest-campo">
              <span className="cest-sr-only">Observações</span>
              <textarea
                className="cest-input cest-textarea"
                rows={4}
                maxLength={500}
                value={form.observacoes}
                onChange={(e) => alterar("observacoes", e.target.value)}
                placeholder="Ex.: aluno transferido, necessidade de acompanhamento especial..."
              />
              <small className="cest-contador">{form.observacoes.length}/500</small>
            </label>
            <p className="cest-aviso-sensivel">
              Evite registrar diagnósticos ou dados médicos neste campo.
            </p>
          </section>

          {Object.keys(erros).some((k) => erros[k]) && (
            <p className="cest-resumo-erros" role="alert">
              Revise os campos destacados antes de salvar.
            </p>
          )}

          <div className="cest-acoes">
            <button type="button" className="cest-btn cest-btn-secundario" onClick={limpar}>
              Limpar formulário
            </button>
            <button type="button" className="cest-btn cest-btn-secundario" onClick={() => navigate("/alunos")}>
              Cancelar
            </button>
            <button type="submit" className="cest-btn cest-btn-primario">
              Cadastrar aluno
            </button>
          </div>
        </form>

        {confirmando && (
          <div
            className="cest-modal-fundo"
            role="presentation"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmando(false); }}
          >
            <section
              className="cest-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="cest-confirmar-titulo"
              aria-describedby="cest-confirmar-desc"
            >
              <div className="cest-modal-icone" aria-hidden="true">!</div>
              <h2 id="cest-confirmar-titulo">Confirmar cadastro?</h2>
              <p id="cest-confirmar-desc">
                Confira os dados abaixo. Ao confirmar, o aluno será adicionado ao sistema e passará a ser acompanhado pela escola.
              </p>

              <div className="cest-modal-dados">
                <div><span>Aluno</span><strong>{form.nome.trim()}</strong></div>
                <div>
                  <span>Nascimento</span>
                  <strong>{form.nascimento.split("-").reverse().join("/")}</strong>
                </div>
                <div><span>Matrícula</span><strong>{form.matricula.trim()}</strong></div>
                <div><span>Turma · Turno</span><strong>{form.turma} · {form.turno}</strong></div>
                <div>
                  <span>Responsável</span>
                  <strong>{form.respNome.trim()} ({form.respParentesco})</strong>
                </div>
                <div><span>Telefone do responsável</span><strong>{form.respTelefone}</strong></div>
              </div>

              <div className="cest-modal-acoes">
                <button type="button" className="cest-btn cest-btn-secundario" onClick={() => setConfirmando(false)}>
                  Voltar e revisar
                </button>
                <button type="button" className="cest-btn cest-btn-primario" onClick={confirmarCadastro} autoFocus>
                  Sim, cadastrar aluno
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}

export default CadastroEstudante;