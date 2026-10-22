import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'

const ETAPAS = [
  { key: 'pedido',          label: 'Pedido',              color: '#64748b', bg: '#f1f5f9', text: '#334155', darkBg: '#1e293b', darkText: '#94a3b8' },
  { key: 'contrato',        label: 'Contrato assinado',   color: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', darkBg: '#1e3a5f', darkText: '#93c5fd' },
  { key: 'compra_material', label: 'Compra de material',  color: '#f97316', bg: '#fff7ed', text: '#c2410c', darkBg: '#431407', darkText: '#fdba74' },
  { key: 'fabricacao',      label: 'Em fabricação',       color: '#a855f7', bg: '#faf5ff', text: '#7e22ce', darkBg: '#3b0764', darkText: '#d8b4fe' },
  { key: 'pronto_entrega',  label: 'Pronto p/ entrega',   color: '#eab308', bg: '#fefce8', text: '#854d0e', darkBg: '#422006', darkText: '#fde047' },
  { key: 'instalacao',      label: 'Instalação',          color: '#06b6d4', bg: '#ecfeff', text: '#155e75', darkBg: '#083344', darkText: '#67e8f9' },
  { key: 'pos_obra',        label: 'Pós-obra',            color: '#ec4899', bg: '#fdf2f8', text: '#9d174d', darkBg: '#500724', darkText: '#f9a8d4' },
  { key: 'encerrado',       label: 'Encerrado',           color: '#22c55e', bg: '#f0fdf4', text: '#15803d', darkBg: '#052e16', darkText: '#86efac' },
]

const ETAPA_MAP = Object.fromEntries(ETAPAS.map((e) => [e.key, e]))

const THEME_CYCLE = ['system', 'light', 'dark']
const THEME_ICON  = { system: ComputerDesktopIcon, light: SunIcon, dark: MoonIcon }
const THEME_LABEL = { system: 'Automático', light: 'Claro', dark: 'Escuro' }

function Ticker({ items }) {
  const doubled = [...items, ...items]
  return (
    <div className="bg-gray-900 dark:bg-black overflow-hidden py-2.5 select-none">
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: ticker-scroll ${Math.max(items.length * 4, 20)}s linear infinite;
        }
        .ticker-track:hover { animation-play-state: paused; }
      `}</style>
      <div className="ticker-track">
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-6 whitespace-nowrap">
            <span style={{ color: item.dotColor }} className="text-base leading-none">●</span>
            <span className="text-xs font-medium text-gray-200">{item.label}</span>
            <span className="text-xs font-bold" style={{ color: item.valueColor }}>{item.value}</span>
            <span className="text-gray-600 mx-2 text-xs">|</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DonutChart({ pct, isDark }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke={isDark ? '#374151' : '#e5e7eb'} strokeWidth="10" />
        <circle
          cx="44" cy="44" r={r} fill="none"
          stroke={pct === 100 ? '#22c55e' : pct > 0 ? '#3b82f6' : (isDark ? '#374151' : '#e5e7eb')}
          strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none">{pct}%</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">concluído</span>
      </div>
    </div>
  )
}

function StagePipeline({ projects }) {
  const counts = {}
  for (const p of projects) counts[p.etapa_atual] = (counts[p.etapa_atual] || 0) + 1
  const max = Math.max(...Object.values(counts), 1)

  return (
    <div className="space-y-2">
      {ETAPAS.map((e) => {
        const n = counts[e.key] || 0
        if (n === 0) return null
        const pct = Math.round((n / max) * 100)
        return (
          <div key={e.key} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 w-32 flex-shrink-0 truncate">{e.label}</span>
            <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: e.color }}
              >
                <span className="text-[10px] font-bold text-white">{n}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getAcaoLabel(acao, detalhe) {
  if (acao === 'etapa_avancada') {
    const m = detalhe?.match(/para "(.+?)"/)
    return m ? `→ ${m[1]}` : 'Etapa avançada'
  }
  if (acao === 'projeto_editado') return detalhe ?? 'Dados editados'
  if (acao === 'projeto_criado') return 'Projeto criado'
  return detalhe ?? acao ?? ''
}

function getAcaoIcon(acao) {
  if (acao === 'etapa_avancada') return '🔄'
  if (acao === 'projeto_editado') return '✏️'
  if (acao === 'projeto_criado') return '🆕'
  return '📝'
}

function ProjectCard({ p, isDark }) {
  const e = ETAPA_MAP[p.etapa_atual] || { label: p.etapa_atual, color: '#94a3b8', bg: '#f8fafc', text: '#475569', darkBg: '#1e293b', darkText: '#94a3b8' }
  const stageIdx = ETAPAS.findIndex((et) => et.key === p.etapa_atual)
  const checklistPartial = p.checklist_total > 0 ? p.checklist_done / p.checklist_total : 0
  const pipelinePct = Math.min(100, Math.round(((stageIdx + checklistPartial) / ETAPAS.length) * 100))
  const pipelineColor = pipelinePct === 100 ? '#22c55e' : pipelinePct >= 60 ? '#3b82f6' : pipelinePct >= 30 ? '#f59e0b' : '#94a3b8'
  const updated = p.atualizado_em || p.criado_em

  const badgeStyle = isDark
    ? { backgroundColor: e.darkBg, color: e.darkText }
    : { backgroundColor: e.bg, color: e.text }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{p.titulo}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{p.cliente}</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0" style={badgeStyle}>
          {e.label}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-400 dark:text-gray-500">Progresso geral</span>
          <span className="font-bold" style={{ color: pipelineColor }}>{pipelinePct}%</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pipelinePct}%`, backgroundColor: pipelineColor }}
          />
        </div>
        {p.checklist_total > 0 && (
          <p className="text-[10px] text-gray-300 dark:text-gray-600">
            Checklist: {p.checklist_done}/{p.checklist_total} itens
          </p>
        )}
      </div>

      {p.prazo_pedido && (() => {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const deadline = new Date(p.prazo_pedido + 'T00:00:00')
        const dias = Math.round((deadline - today) / (1000 * 60 * 60 * 24))
        const isOverdue = dias < 0
        const isUrgent = dias >= 0 && dias <= 7
        const color = isOverdue ? '#ef4444' : isUrgent ? '#f59e0b' : '#22c55e'
        const label = isOverdue ? `${Math.abs(dias)}d em atraso` : dias === 0 ? 'Vence hoje' : `${dias}d restantes`
        return (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Prazo do pedido</span>
            <span className="text-[11px] font-bold" style={{ color }}>
              {isOverdue ? '🔴' : isUrgent ? '⚠️' : '✅'} {label}
            </span>
          </div>
        )
      })()}

      {p.ultima_alteracao ? (
        <div
          className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700"
          title={p.ultima_alteracao.detalhe ?? undefined}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
              {getAcaoIcon(p.ultima_alteracao.acao)} {p.ultima_alteracao.nome}
            </span>
            <span className="text-[10px] text-gray-300 dark:text-gray-600 flex-shrink-0">
              {format(new Date(p.ultima_alteracao.em), "dd/MM/yy HH:mm", { locale: ptBR })}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-400 truncate mt-0.5">
            {getAcaoLabel(p.ultima_alteracao.acao, p.ultima_alteracao.detalhe)}
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-2 text-right">
          {format(new Date(updated), "dd/MM/yy", { locale: ptBR })}
        </p>
      )}
    </div>
  )
}

export default function DashboardPublico() {
  const { companyId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterEtapa, setFilterEtapa] = useState('todas')

  // Tema — controla document.documentElement para que dark: do Tailwind funcione corretamente
  const [theme, setThemeState] = useState(() => {
    try { return localStorage.getItem('dash_theme') ?? 'system' } catch { return 'system' }
  })
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const html = document.documentElement
    // guarda o estado original do app para restaurar ao sair
    const appWasDark = html.classList.contains('dark')

    function applyDark(val) {
      html.classList.toggle('dark', val)
      setIsDark(val)
    }

    if (theme === 'dark') { applyDark(true); return () => html.classList.toggle('dark', appWasDark) }
    if (theme === 'light') { applyDark(false); return () => html.classList.toggle('dark', appWasDark) }

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    applyDark(mq.matches)
    const handler = (e) => applyDark(e.matches)
    mq.addEventListener('change', handler)
    return () => {
      mq.removeEventListener('change', handler)
      html.classList.toggle('dark', appWasDark)
    }
  }, [theme])

  function cycleTheme() {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length]
    setThemeState(next)
    try { localStorage.setItem('dash_theme', next) } catch {}
  }

  useEffect(() => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-publico?company_id=${companyId}`
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } })
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); setLoading(false) })
      .catch(() => { setError('Erro ao carregar dados'); setLoading(false) })
  }, [companyId])

  const ThemeIcon = THEME_ICON[theme] ?? ComputerDesktopIcon

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="text-gray-400 text-sm animate-pulse">Carregando...</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
      <p className="text-gray-500 text-sm">{error}</p>
    </div>
  )

  const { company, projects, generated_at } = data
  const total = projects.length
  const encerrados = projects.filter((p) => p.etapa_atual === 'encerrado').length
  const emAndamento = total - encerrados
  const totalItems = projects.reduce((s, p) => s + p.checklist_total, 0)
  const doneItems = projects.reduce((s, p) => s + p.checklist_done, 0)
  const globalPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  const etapasComProjetos = ETAPAS.filter((e) => projects.some((p) => p.etapa_atual === e.key))
  const filterOptions = [{ key: 'todas', label: 'Todas as etapas' }, ...etapasComProjetos]
  const filtered = filterEtapa === 'todas' ? projects : projects.filter((p) => p.etapa_atual === filterEtapa)

  const tickerItems = [
    { label: 'Total de projetos', value: total, dotColor: '#94a3b8', valueColor: '#f8fafc' },
    { label: 'Em andamento', value: emAndamento, dotColor: '#3b82f6', valueColor: '#93c5fd' },
    { label: 'Encerrados', value: encerrados, dotColor: '#22c55e', valueColor: '#86efac' },
    { label: 'Conclusão geral', value: `${globalPct}%`, dotColor: globalPct === 100 ? '#22c55e' : '#f59e0b', valueColor: '#fde68a' },
    ...etapasComProjetos.map((e) => {
      const n = projects.filter((p) => p.etapa_atual === e.key).length
      return { label: e.label, value: `${n} projeto${n !== 1 ? 's' : ''}`, dotColor: e.color, valueColor: '#f8fafc' }
    }),
    ...projects.slice(0, 5).map((p) => ({
      label: p.titulo,
      value: ETAPA_MAP[p.etapa_atual]?.label ?? p.etapa_atual,
      dotColor: ETAPA_MAP[p.etapa_atual]?.color ?? '#94a3b8',
      valueColor: ETAPA_MAP[p.etapa_atual]?.color ?? '#94a3b8',
    })),
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {company.logo_url
                ? <img src={company.logo_url} alt={company.nome} className="h-10 w-auto object-contain rounded" />
                : <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">{company.nome[0]}</span>
                  </div>
              }
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{company.nome}</h1>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Atualizado em {format(new Date(generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Botão de tema */}
              <button
                onClick={cycleTheme}
                title={`Tema: ${THEME_LABEL[theme]}`}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ThemeIcon className="w-5 h-5" />
              </button>

              {/* Crédito */}
              <div className="hidden sm:flex flex-col items-end text-right">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Desenvolvido por</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Jeferson Wedderhoff</p>
                <a
                  href="mailto:jeferson.wedderhoff@gmail.com"
                  className="text-[11px] text-blue-500 hover:text-blue-700 transition-colors"
                >
                  jeferson.wedderhoff@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Ticker */}
        <Ticker items={tickerItems} />

        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

          {/* Cards + Donut */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-5 shadow-sm">
              <DonutChart pct={globalPct} isDark={isDark} />
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Visão geral</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">{emAndamento} em andamento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">{encerrados} encerrados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">{total} total</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 shadow-sm text-white flex flex-col justify-between">
              <p className="text-sm font-medium opacity-80">Em andamento</p>
              <p className="text-4xl font-bold mt-2">{emAndamento}</p>
              <div className="mt-3 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: total > 0 ? `${Math.round((emAndamento/total)*100)}%` : '0%' }} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 shadow-sm text-white flex flex-col justify-between">
              <p className="text-sm font-medium opacity-80">Encerrados</p>
              <p className="text-4xl font-bold mt-2">{encerrados}</p>
              <div className="mt-3 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: total > 0 ? `${Math.round((encerrados/total)*100)}%` : '0%' }} />
              </div>
            </div>
          </div>

          {/* Pipeline */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Pipeline de projetos por etapa</h2>
            <StagePipeline projects={projects} />
          </div>

          {/* Lista filtrada */}
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Projetos ({filtered.length})</h2>
              <div className="flex gap-1.5 flex-wrap">
                {filterOptions.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setFilterEtapa(o.key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterEtapa === o.key
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0
              ? <p className="text-center text-gray-400 dark:text-gray-600 text-sm py-8">Nenhum projeto nesta etapa.</p>
              : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((p) => <ProjectCard key={p.id} p={p} isDark={isDark} />)}
                </div>
              )
            }
          </div>

          <p className="text-center text-xs text-gray-300 dark:text-gray-700 pb-4">App Esquadrias</p>
        </div>
      </div>
  )
}
