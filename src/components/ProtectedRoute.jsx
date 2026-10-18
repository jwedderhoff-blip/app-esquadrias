import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './ui/Spinner'

export default function ProtectedRoute({ children, requiredPerfil }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (requiredPerfil && profile && !requiredPerfil.includes(profile.perfil)) {
    return <Navigate to="/" replace />
  }

  return children
}
