import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Projetos from './pages/Projetos'
import NovoProjeto from './pages/NovoProjeto'
import ProjetoDetalhe from './pages/ProjetoDetalhe'
import Carteira from './pages/Carteira'
import LogAtividades from './pages/LogAtividades'
import Usuarios from './pages/Usuarios'
import Admin from './pages/Admin'
import DashboardPublico from './pages/DashboardPublico'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard/:companyId" element={<DashboardPublico />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout><Projetos /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos/novo"
        element={
          <ProtectedRoute>
            <Layout><NovoProjeto /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos/:id"
        element={
          <ProtectedRoute>
            <Layout><ProjetoDetalhe /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/carteira"
        element={
          <ProtectedRoute requiredPerfil={['supervisor', 'administrador']}>
            <Layout><Carteira /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/log"
        element={
          <ProtectedRoute requiredPerfil={['administrador']}>
            <Layout><LogAtividades /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute requiredPerfil={['administrador']}>
            <Layout><Usuarios /></Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredPerfil={['super_admin']}>
            <Layout><Admin /></Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
