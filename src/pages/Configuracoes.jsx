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
  { key: 'system', label: 'Automático', Icon: ComputerDesktopIcon, desc: 'Segue o celular/PC (padrão)' },
  { key: 'light',  label: 'Claro',      Icon: SunIcon,             desc: 'Sempre modo claro' },
  { key: 'dark',   label: 'Escuro',     Icon: MoonIcon,            desc: 'Sempre modo escuro' },
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
            <a
              href="https://wa.me/5547999962800"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-green-500 hover:text-green-400 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Meridio Soluções
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
