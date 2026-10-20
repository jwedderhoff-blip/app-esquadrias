import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FolderIcon, UsersIcon, Bars3Icon, XMarkIcon,
  ArrowRightOnRectangleIcon, ChartBarIcon, BuildingOffice2Icon,
  ChevronDownIcon, HomeIcon, Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import NotificationBell from './NotificationBell'

const navItems = [
  { to: '/', label: 'Projetos', icon: FolderIcon, roles: ['operacional', 'comercial', 'administrador', 'super_admin'] },
  { to: '/usuarios', label: 'Usuários', icon: UsersIcon, roles: ['administrador', 'super_admin'] },
  { to: '/log', label: 'Log de Atividades', icon: ChartBarIcon, roles: ['administrador', 'super_admin'] },
  { to: '/admin', label: 'Empresas', icon: BuildingOffice2Icon, roles: ['super_admin'] },
]

function CompanySwitcher() {
  const { viewingCompany, viewingCompanyId, setViewingCompanyId } = useAuth()
  const [companies, setCompanies] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase.from('companies').select('id, nome').eq('ativo', true).order('nome')
      .then(({ data }) => setCompanies(data || []))
  }, [])

  const label = viewingCompany ? viewingCompany.nome : 'Todas as empresas'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
          viewingCompanyId
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <BuildingOffice2Icon className="w-4 h-4 flex-shrink-0" />
        <span className="max-w-[140px] truncate">{label}</span>
        <ChevronDownIcon className="w-3 h-3 flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-20 overflow-hidden">
            <button
              onClick={() => { setViewingCompanyId(null); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                !viewingCompanyId ? 'font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Todas as empresas
            </button>
            <div className="border-t border-gray-100 dark:border-gray-700/50" />
            {companies.map((c) => (
              <button
                key={c.id}
                onClick={() => { setViewingCompanyId(c.id); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  viewingCompanyId === c.id ? 'font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Layout({ children }) {
  const { profile, signOut, currentCompany } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const allowed = navItems.filter((item) => item.roles.includes(profile?.perfil))
  const isSuperAdmin = profile?.perfil === 'super_admin'

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand header */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700/60">
        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">App Esquadrias</p>
        <div className="flex items-center gap-2.5">
          {currentCompany?.logo_url ? (
            <img
              src={currentCompany.logo_url}
              alt={currentCompany.nome}
              className="h-8 w-8 object-contain rounded flex-shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {(currentCompany?.nome ?? 'A')[0]}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
              {currentCompany?.nome ?? 'App Esquadrias'}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">Controle de Projetos</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {allowed.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium transition-colors ${
                active
                  ? 'bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
              {label}
            </Link>
          )
        })}

        {/* Settings — always visible */}
        <Link
          to="/configuracoes"
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium transition-colors ${
            location.pathname === '/configuracoes'
              ? 'bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Cog6ToothIcon className={`w-5 h-5 flex-shrink-0 ${location.pathname === '/configuracoes' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
          Configurações
        </Link>
      </nav>

      {/* User + sign out */}
      <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700/60">
        <div className="px-3 py-2.5 mb-1 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <p className="text-[15px] font-semibold text-gray-800 dark:text-gray-200 truncate">{profile?.nome}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">{profile?.perfil?.replace('_', ' ')}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[15px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700/60 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-white dark:bg-gray-900 z-50 shadow-xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
        <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/60 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 dark:text-gray-400">
            <Bars3Icon className="w-6 h-6" />
          </button>
          <Link to="/" className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
            App Esquadrias
          </Link>
          <div className="flex items-center gap-2">
            {isSuperAdmin && <CompanySwitcher />}
            <NotificationBell />
          </div>
        </header>

        {/* Header desktop */}
        <header className="hidden md:flex items-center justify-between gap-3 px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/60">
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            Início
          </Link>
          <div className="flex items-center gap-3">
            {isSuperAdmin && <CompanySwitcher />}
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
          <footer className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700/50 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-600">
              Desenvolvido por{' '}
              <span className="font-semibold text-gray-500 dark:text-gray-500">Jeferson Wedderhoff</span>
              {' · '}
              <a
                href="mailto:jeferson.wedderhoff@gmail.com"
                className="text-blue-500 hover:text-blue-700 transition-colors"
              >
                jeferson.wedderhoff@gmail.com
              </a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
