import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FolderIcon, BriefcaseIcon, UsersIcon, Bars3Icon, XMarkIcon,
  ArrowRightOnRectangleIcon, ChartBarIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from './NotificationBell'

const navItems = [
  { to: '/', label: 'Projetos', icon: FolderIcon, roles: ['operacional', 'supervisor', 'administrador'] },
  { to: '/carteira', label: 'Carteira', icon: BriefcaseIcon, roles: ['supervisor', 'administrador'] },
  { to: '/usuarios', label: 'Usuários', icon: UsersIcon, roles: ['administrador'] },
  { to: '/log', label: 'Log de Atividades', icon: ChartBarIcon, roles: ['administrador'] },
]

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const allowed = navItems.filter((item) => item.roles.includes(profile?.perfil))

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-gray-200">
        <span className="text-xl font-bold text-blue-600 tracking-tight">App Esquadrias</span>
        <p className="text-xs text-gray-500 mt-0.5">Controle de Projetos</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {allowed.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4 border-t border-gray-200">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-gray-800 truncate">{profile?.nome}</p>
          <p className="text-xs text-gray-500 capitalize">{profile?.perfil}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-white z-50 shadow-xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header mobile */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <span className="font-bold text-blue-600">App Esquadrias</span>
          <NotificationBell />
        </header>

        {/* Header desktop */}
        <header className="hidden md:flex items-center justify-end px-6 py-3 bg-white border-b border-gray-200">
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
