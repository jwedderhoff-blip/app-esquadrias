import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FolderIcon, UsersIcon, Bars3Icon, XMarkIcon,
  ArrowRightOnRectangleIcon, ChartBarIcon, BuildingOffice2Icon,
  ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon,
  HomeIcon, Cog6ToothIcon, KeyIcon, EyeIcon, EyeSlashIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import NotificationBell from './NotificationBell'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/', label: 'Projetos', icon: FolderIcon, roles: ['operacional', 'comercial', 'financeiro', 'administrador', 'super_admin'] },
  { to: '/relatorio-financeiro', label: 'Relatório Financeiro', icon: BanknotesIcon, roles: ['financeiro', 'administrador', 'super_admin'] },
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
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === '1' } catch { return false }
  })
  const [senhaModal, setSenhaModal] = useState(false)
  const [senhaForm, setSenhaForm] = useState({ nova: '', confirma: '' })
  const [senhaShow, setSenhaShow] = useState({ nova: false, confirma: false })
  const [senhaLoading, setSenhaLoading] = useState(false)

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('sidebar_collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  async function handleAlterarSenha() {
    if (senhaForm.nova.length < 6) { toast.error('A senha deve ter no mínimo 6 caracteres'); return }
    if (senhaForm.nova !== senhaForm.confirma) { toast.error('As senhas não coincidem'); return }
    setSenhaLoading(true)
    const { error } = await supabase.auth.updateUser({ password: senhaForm.nova })
    setSenhaLoading(false)
    if (error) { toast.error('Erro ao alterar senha: ' + error.message); return }
    toast.success('Senha alterada com sucesso!')
    setSenhaForm({ nova: '', confirma: '' })
    setSenhaModal(false)
  }

  const allowed = navItems.filter((item) => item.roles.includes(profile?.perfil))
  const isSuperAdmin = profile?.perfil === 'super_admin'
  const logoLetter = (currentCompany?.nome ?? 'A')[0]

  // Sidebar content reutilizável — modo overlay (mobile) sempre expandido
  function SidebarContent({ forceExpanded = false }) {
    const isExpanded = forceExpanded || !collapsed

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Brand header */}
        <div className={`border-b border-gray-200 dark:border-gray-700/60 flex-shrink-0 ${isExpanded ? 'px-4 py-4' : 'px-2 py-4'}`}>
          {isExpanded ? (
            <>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-3">App Esquadrias</p>
              <div className="flex items-center gap-2.5">
                {currentCompany?.logo_url
                  ? <img src={currentCompany.logo_url} alt={currentCompany.nome} className="h-8 w-8 object-contain rounded flex-shrink-0" />
                  : <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{logoLetter}</span>
                    </div>
                }
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                    {currentCompany?.nome ?? 'App Esquadrias'}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Controle de Projetos</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex justify-center">
              {currentCompany?.logo_url
                ? <img src={currentCompany.logo_url} alt={currentCompany.nome} className="h-8 w-8 object-contain rounded" />
                : <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{logoLetter}</span>
                  </div>
              }
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-4 space-y-0.5 ${isExpanded ? 'px-3' : 'px-2'}`}>
          {allowed.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                title={!isExpanded ? label : undefined}
                className={`flex items-center rounded-lg font-medium transition-colors ${
                  isExpanded ? 'gap-3 px-3 py-2.5 text-[15px]' : 'justify-center px-0 py-3'
                } ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                {isExpanded && label}
              </Link>
            )
          })}

          <Link
            to="/configuracoes"
            onClick={() => setSidebarOpen(false)}
            title={!isExpanded ? 'Configurações' : undefined}
            className={`flex items-center rounded-lg font-medium transition-colors ${
              isExpanded ? 'gap-3 px-3 py-2.5 text-[15px]' : 'justify-center px-0 py-3'
            } ${
              location.pathname === '/configuracoes'
                ? 'bg-blue-50 dark:bg-blue-900/25 text-blue-700 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Cog6ToothIcon className={`w-5 h-5 flex-shrink-0 ${location.pathname === '/configuracoes' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
            {isExpanded && 'Configurações'}
          </Link>
        </nav>

        {/* User + sign out */}
        <div className={`border-t border-gray-200 dark:border-gray-700/60 py-3 flex-shrink-0 ${isExpanded ? 'px-3' : 'px-2'}`}>
          {isExpanded ? (
            <>
              <button
                onClick={() => setSenhaModal(true)}
                className="w-full text-left px-3 py-2.5 mb-1 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                title="Clique para alterar sua senha"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-gray-800 dark:text-gray-200 truncate">{profile?.nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">{profile?.perfil?.replace('_', ' ')}</p>
                  </div>
                  <KeyIcon className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 flex-shrink-0 ml-2 transition-colors" />
                </div>
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[15px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Sair
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setSenhaModal(true)}
                title={`${profile?.nome} — alterar senha`}
                className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center hover:ring-2 hover:ring-blue-400 transition-all"
              >
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                  {(profile?.nome ?? 'U')[0]}
                </span>
              </button>
              <button
                onClick={handleSignOut}
                title="Sair"
                className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar desktop — colapsável */}
      <aside
        className={`hidden md:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700/60 flex-shrink-0 relative transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <SidebarContent />

        {/* Botão colapsar/expandir */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
          className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-colors"
        >
          {collapsed
            ? <ChevronRightIcon className="w-3.5 h-3.5" />
            : <ChevronLeftIcon className="w-3.5 h-3.5" />
          }
        </button>
      </aside>

      {/* Sidebar mobile overlay — sempre expandida */}
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
            <SidebarContent forceExpanded />
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
            <p className="text-xs text-gray-400 dark:text-gray-600 flex items-center justify-center gap-2">
              Desenvolvido por{' '}
              <span className="font-semibold text-gray-500 dark:text-gray-500">Meridio Soluções</span>
              {' · '}
              <a
                href="https://wa.me/5547999962800"
                target="_blank"
                rel="noopener noreferrer"
                title="Contato via WhatsApp"
                className="inline-flex items-center gap-1 text-green-500 hover:text-green-400 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Fale conosco
              </a>
            </p>
          </footer>
        </main>
      </div>

      {/* Modal alteração de senha */}
      {senhaModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <KeyIcon className="w-5 h-5 text-blue-500" />
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Alterar senha</h2>
              </div>
              <button onClick={() => { setSenhaModal(false); setSenhaForm({ nova: '', confirma: '' }) }}>
                <XMarkIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              Logado como <strong className="text-gray-700 dark:text-gray-300">{profile?.nome}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nova senha</label>
                <div className="relative">
                  <input
                    type={senhaShow.nova ? 'text' : 'password'}
                    value={senhaForm.nova}
                    onChange={(e) => setSenhaForm((f) => ({ ...f, nova: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={() => setSenhaShow((s) => ({ ...s, nova: !s.nova }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {senhaShow.nova ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Confirmar nova senha</label>
                <div className="relative">
                  <input
                    type={senhaShow.confirma ? 'text' : 'password'}
                    value={senhaForm.confirma}
                    onChange={(e) => setSenhaForm((f) => ({ ...f, confirma: e.target.value }))}
                    placeholder="Repita a nova senha"
                    onKeyDown={(e) => e.key === 'Enter' && handleAlterarSenha()}
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={() => setSenhaShow((s) => ({ ...s, confirma: !s.confirma }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {senhaShow.confirma ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setSenhaModal(false); setSenhaForm({ nova: '', confirma: '' }) }}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAlterarSenha}
                disabled={senhaLoading}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition"
              >
                {senhaLoading ? 'Salvando...' : 'Alterar senha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
