import { SunIcon, MoonIcon, ComputerDesktopIcon, BellIcon, BellSlashIcon, LinkIcon, ClipboardDocumentIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

const THEMES = [
  { key: 'light',  label: 'Claro',   Icon: SunIcon,             desc: 'Interface em modo claro' },
  { key: 'dark',   label: 'Escuro',  Icon: MoonIcon,            desc: 'Interface em modo escuro' },
  { key: 'system', label: 'Sistema', Icon: ComputerDesktopIcon, desc: 'Segue o SO' },
]

export default function Configuracoes() {
  const { theme, setTheme, notifBrowser, setNotifBrowser, notifInApp, setNotifInApp } = useTheme()
  const { effectiveCompanyId } = useAuth()
  const companyId = effectiveCompanyId()
  const dashboardUrl = companyId ? `${window.location.origin}/dashboard/${companyId}` : null

  async function handleToggleBrowser(val) {
    if (val) {
      if (!('Notification' in window)) {
        toast.error('Seu navegador não suporta notificações.')
        return
      }
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') {
          toast.error('Permissão negada pelo navegador.')
          return
        }
      }
    }
    setNotifBrowser(val)
    toast.success(val ? 'Notificações do navegador ativadas.' : 'Notificações desativadas.')
  }

  function handleToggleInApp(val) {
    setNotifInApp(val)
    toast.success(val ? 'Avisos no app ativados.' : 'Avisos no app desativados.')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Personalize sua experiência no App Esquadrias.
        </p>
      </div>

      {/* Aparência */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Aparência</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Escolha o tema da interface</p>
        </div>
        <div className="p-6 grid grid-cols-3 gap-3">
          {THEMES.map(({ key, label, Icon, desc }) => {
            const active = theme === key
            return (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={`relative flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-left ${
                  active
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                {active && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckIcon className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
                <Icon className={`w-6 h-6 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                <div className="text-center">
                  <p className={`text-sm font-semibold ${active ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {label}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Notificações */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Notificações e avisos</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Controle como você recebe alertas</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${notifBrowser ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                {notifBrowser
                  ? <BellIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  : <BellSlashIcon className="w-4 h-4 text-gray-400" />
                }
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Notificações do navegador</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Receba alertas mesmo fora da aba</p>
              </div>
            </div>
            <Toggle checked={notifBrowser} onChange={handleToggleBrowser} />
          </div>

          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${notifInApp ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <BellIcon className={`w-4 h-4 ${notifInApp ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Avisos dentro do app</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Exibir notificações no sino do menu</p>
              </div>
            </div>
            <Toggle checked={notifInApp} onChange={handleToggleInApp} />
          </div>
        </div>
      </section>

      {/* Dashboard público */}
      {dashboardUrl && (
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Dashboard público</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Compartilhe o acompanhamento de projetos com clientes</p>
          </div>
          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3.5 py-3 border border-gray-200 dark:border-gray-700">
              <LinkIcon className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="text-xs text-gray-700 dark:text-gray-300 font-mono truncate flex-1 select-all">
                {dashboardUrl}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(dashboardUrl)
                  toast.success('Link copiado!')
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition"
              >
                <ClipboardDocumentIcon className="w-4 h-4" />
                Copiar link
              </button>
              <a
                href={dashboardUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                Abrir
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Sobre */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Sobre</h2>
        </div>
        <div className="px-6 py-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Aplicação</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">App Esquadrias</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Desenvolvedor</span>
            <a href="mailto:jeferson.wedderhoff@gmail.com" className="text-blue-500 hover:text-blue-700 transition-colors">
              Jeferson Wedderhoff
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
