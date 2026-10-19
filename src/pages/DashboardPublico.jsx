import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ETAPAS = [
  { key: 'pedido',          label: 'Pedido',              color: '#64748b', bg: '#f1f5f9', text: '#334155' },
  { key: 'contrato',        label: 'Contrato assinado',   color: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8' },
  { key: 'compra_material', label: 'Compra de material',  color: '#f97316', bg: '#fff7ed', text: '#c2410c' },
  { key: 'fabricacao',      label: 'Em fabricação',       color: '#a855f7', bg: '#faf5ff', text: '#7e22ce' },
  { key: 'pronto_entrega',  label: 'Pronto p/ entrega',   color: '#eab308', bg: '#fefce8', text: '#854d0e' },
  { key: 'instalacao',      label: 'Instalação',          color: '#06b6d4', bg: '#ecfeff', text: '#155e75' },
  { key: 'pos_obra',        label: 'Pós-obra',            color: '#ec4899', bg: '#fdf2f8', text: '#9d174d' },
  { key: 'encerrado',       label: 'Encerrado',           color: '#22c55e', bg: '#f0fdf4', text: '#15803d' },
]

const ETAPA_MAP = Object.fromEntries(ETAPAS.map((e) => [e.key, e]))

function DonutChart({ pct }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="44" cy="44" r={r} fill="none"
          stroke={pct === 100 ? '#22c55e' : pct > 0 ? '#3b82f6' : '#e5e7eb'}
          strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-900 leading-none">{pct}%</span>
        <span className="text-[10px] text-gray-400 mt-0.5">concluído</span>
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
            <span className="text-xs text-gray-500 w-32 flex-shrink-0 truncate">{e.label}</span>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
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

function ProjectCard({ p }) {
  const e = ETAPA_MAP[p.etapa_atual] || { label: p.etapa_atual, color: '#94a3b8', bg: '#f8fafc', text: '#475569' }
  const pct = p.checklist_total > 0 ? Math.round((p.checklist_done / p.checklist_total) * 100) : null
  const updated = p.atualizado_em || p.criado_em

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{p.titulo}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{p.cliente}</p>
        </div>
        <span
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
          style={{ backgroundColor: e.bg, color: e.text }}
        >
          {e.label}
        </span>
      </div>

      {pct !== null && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-gray-400">
            <span>Checklist</span>
            <span>{p.checklist_done}/{p.checklist_total}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: pct === 100 ? '#22c55e' : pct >= 50 ? '#3b82f6' : '#f59e0b',
              }}
            />
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-300 mt-2 text-right">
        {format(new Date(updated), "dd/MM/yy", { locale: ptBR })}
      </p>
    </div>
  )
}

export default function DashboardPublico() {
  const { companyId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterEtapa, setFilterEtapa] = useState('todas')

  useEffect(() => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-publico?company_id=${companyId}`
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } })
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); setLoading(false) })
      .catch(() => { setError('Erro ao carregar dados'); setLoading(false) })
  }, [companyId])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm animate-pulse">Carregando...</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          {company.logo_url
            ? <img src={company.logo_url} alt={company.nome} className="h-10 w-auto object-contain rounded" />
            : <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">{company.nome[0]}</span>
              </div>
          }
          <div>
            <h1 className="text-lg font-bold text-gray-900">{company.nome}</h1>
            <p className="text-xs text-gray-400">
              Atualizado em {format(new Date(generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Cards + Donut */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Donut */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-5 shadow-sm">
            <DonutChart pct={globalPct} />
            <div>
              <p className="text-xs text-gray-400 mb-3">Visão geral</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-xs text-gray-600">{emAndamento} em andamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-xs text-gray-600">{encerrados} encerrados</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                  <span className="text-xs text-gray-600">{total} total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stat cards */}
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
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline de projetos por etapa</h2>
          <StagePipeline projects={projects} />
        </div>

        {/* Lista filtrada */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-gray-700">Projetos ({filtered.length})</h2>
            <div className="flex gap-1.5 flex-wrap">
              {filterOptions.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setFilterEtapa(o.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterEtapa === o.key
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0
            ? <p className="text-center text-gray-400 text-sm py-8">Nenhum projeto nesta etapa.</p>
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p) => <ProjectCard key={p.id} p={p} />)}
              </div>
            )
          }
        </div>

        <p className="text-center text-xs text-gray-300 pb-4">App Esquadrias</p>
      </div>
    </div>
  )
}
