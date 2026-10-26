
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import Login from "./pages/Login"
import Welcome from "./pages/Welcome"
import CadastroEscola from "./pages/CadastroEscola"
import Dashboard from "./pages/Dashboard"
import Alunos from "./pages/Alunos"
import Calendario from "./pages/Calendario"
import Frequencia from "./pages/Frequencia"
import Relatorios from "./pages/Relatorios"
import Turmas from "./pages/Turmas"
import NovoAluno from "./pages/NovoAluno"
import Intervencao from "./pages/Intervencao"
import Diario from "./pages/Diario"
import AlunoPerfil from "./pages/AlunoPerfil"
import PerfilMonitor from "./pages/PerfilMonitor"
import { adminRoutes } from "./painel-administrativo/AdminRoutes"
import CadastroEstudante from "./pages/CadastroEstudante"

import ProtectedRoute from "./components/ProtectedRoute"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {adminRoutes()} 

        <Route
          path="/"
          element={<Welcome />}
        />

        <Route
          path="/perfil-monitor"
          element={<PerfilMonitor />}
        />

        <Route
          path="/interno/nova-escola"
          element={<CadastroEscola />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cadastro-estudante"
          element={
            <ProtectedRoute>
              <CadastroEstudante/>
            </ProtectedRoute>
          }
        />

        <Route
          path="/alunos"
          element={
            <ProtectedRoute>
              <Alunos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/novo-aluno"
          element={
            <ProtectedRoute>
              <NovoAluno />
            </ProtectedRoute>
          }
        />

        <Route
          path="/intervencao"
          element={
            <ProtectedRoute>
              <Intervencao />
            </ProtectedRoute>
          }
        />

        <Route
          path="/turmas"
          element={
            <ProtectedRoute>
              <Turmas />
            </ProtectedRoute>
          }
        />

        <Route
          path="/frequencia"
          element={
            <ProtectedRoute>
              <Frequencia />
            </ProtectedRoute>
          }
        />

        {/* CALENDÁRIO ESCOLAR */}

        <Route
          path="/calendario"
          element={
            <ProtectedRoute>
              <Calendario />
            </ProtectedRoute>
          }
        />

        {/* REDIRECIONAMENTO DA ROTA ANTIGA */}

        <Route
          path="/alertas"
          element={<Navigate to="/calendario" replace />}
        />

        <Route
          path="/relatorios"
          element={
            <ProtectedRoute>
              <Relatorios />
            </ProtectedRoute>
          }
        />

        <Route
          path="/diario"
          element={
            <ProtectedRoute>
              <Diario />
            </ProtectedRoute>
          }
        />

        <Route
          path="/alunos/:id"
          element={
            <ProtectedRoute>
              <AlunoPerfil />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
