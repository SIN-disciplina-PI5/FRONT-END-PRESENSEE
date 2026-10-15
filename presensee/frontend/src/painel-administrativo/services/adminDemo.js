const KEY = "presensee_admin_demo_escolas"
const AUDIT = "presensee_admin_demo_logs"
const SESSION = "presensee_admin_demo_session"
const example = [
  { id: "1", nome: "ETE Porto Digital", inep: "", municipio: "Recife", rede: "Estadual", gestor: "Gestor Exemplo", email: "gestor@exemplo.edu.br", status: "Ativa" },
  { id: "2", nome: "Escola Exemplo B", inep: "", municipio: "Olinda", rede: "Municipal", gestor: "Responsável Exemplo", email: "direcao@exemplo.edu.br", status: "Pendente" }
]
// O login demonstrativo é realizado na tela de login original do projeto.
// Nunca utilize credenciais fixas no frontend em produção.
export const isAdminDemo = () => sessionStorage.getItem(SESSION) === "true"
export function loginAdminDemo(email, senha) {
  if (email.trim().toLowerCase() !== "admin@presensee.com" || senha !== "admin123") return false
  sessionStorage.setItem(SESSION, "true")
  return true
}
export const logoutAdminDemo = () => sessionStorage.removeItem(SESSION)
export function getEscolas() {
  try { const data = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(data) ? data : example } catch { return example }
}
export function getLogs() { try { return JSON.parse(localStorage.getItem(AUDIT)) || [] } catch { return [] } }
function log(acao) { localStorage.setItem(AUDIT, JSON.stringify([{id: crypto.randomUUID(), acao, data: new Date().toLocaleString('pt-BR')}, ...getLogs()].slice(0,100))) }
export function saveEscola(escola) {
 const saved = { ...escola, id: crypto.randomUUID(), criadoEm: new Date().toISOString(), usuarios: [], totalAlunos: null }
 localStorage.setItem(KEY, JSON.stringify([...getEscolas(),saved]))
 log(`Escola cadastrada: ${saved.nome}`)
 return saved
}
export function changeStatus(id,status) {
 const escolas = getEscolas().map(e=>e.id===id?{...e,status}:e)
 localStorage.setItem(KEY,JSON.stringify(escolas))
 log(`Acesso alterado para ${status}: ${escolas.find(e=>e.id===id)?.nome}`)
}

// Apenas demonstração: remover definitivamente requer API segura e autorização no backend.
export function deleteEscola(id) {
  const escolas = getEscolas()
  const escola = escolas.find((item) => item.id === id)
  if (!escola) return false
  localStorage.setItem(KEY, JSON.stringify(escolas.filter((item) => item.id !== id)))
  log(`Escola excluída: ${escola.nome}`)
  return true
}
