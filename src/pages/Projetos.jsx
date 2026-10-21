import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PlusIcon, MagnifyingGlassIcon, FunnelIcon,
  ChevronLeftIcon, ChevronRightIcon,
  ClockIcon, FolderOpenIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ETAPAS, ETAPA_LABEL } from '../lib/constants'
import EtapaBadge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

const ETAPA_COLORS = {
  pedido:          { color: '#64748b', bg: '#f1f5f9', text: '#334155', darkBg: '#1e293b', darkText: '#94a3b8' },
  contrato:        { color: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', darkBg: '#1e3a5f', darkText: '#93c5fd' },
  compra_material: { color: '#f97316', bg: '#fff7ed', text: '#c2410c', darkBg: '#431407', darkText: '#fdba74' },
  fabricacao:      { color: '#a855f7', bg: '#faf5ff', text: '#7e22ce', darkBg: '#3b0764', darkText: '#d8b4fe' },
  pronto_entrega:  { color: '#eab308', bg: '#fefce8', text: '#854d0e', darkBg: '#422006', darkText: '#fde047' },
  instalacao:      { color: '#06b6d4', bg: '#ecfeff', text: '#155e75', darkBg: '#083344', darkText: '#67e8f9' },
  pos_obra:        { color: '#ec4899', bg: '#fdf2f8', text: '#9d174d', darkBg: '#500724', darkText: '#f9a8d4' },
  encerrado:       { color: '#22c55e', bg: '#f0fdf4', text: '#15803d', darkBg: '#052e16', darkText: '#86efac' },
}

function RecentCarousel({ projects }) {
  const ref = useRef(null)
  const recent = [...projects]
    .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
    .slice(0, 8)

  function scroll(dir) {
    if (!ref.current) return
    ref.current.scrollBy({ left: dir * 260, behavior: 'smooth' })
  }

  if (recent.length === 0) return null

  return (
    <div className="relative">
      {/* Seta esquerda */}
      <button
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hidden sm:flex"
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </button>

      {/* Carrossel */}
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`.hide-scroll::-webkit-scrollbar { display: none; }`}</style>
        {recent.map((p) => {
          const ec = ETAPA_COLORS[p.etapa_atual] ?? ETAPA_COLORS.pedido
          const updated = p.atualizado_em || p.criado_em
          const today = new Date(); today.setHours(0,0,0,0)
          const deadline = p.prazo_pedido ? new Date(p.prazo_pedido + 'T00:00:00') : null
          const diasRestantes = deadline ? differenceInDays(deadline, today) : null
          const isOverdue = diasRestantes !== null && diasRestantes < 0
          const isUrgent = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 7

          return (
            <Link
              key={p.id}
              to={`/projetos/${p.id}`}
              className="flex-shrink-0 snap-start w-56 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all group"
            >
              {/* Stage bar */}
              <div className="h-1 rounded-full mb-3" style={{ backgroundColor: ec.color }} />

              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {p.titulo}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{p.cliente}</p>

              <div className="mt-3 flex items-center justify-between">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ backgroundColor: ec.bg, color: ec.text }}
                >
                  {ETAPA_LABEL[p.etapa_atual] ?? p.etapa_atual}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className="text-gray-300 dark:text-gray-600 flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  {formatDistanceToNow(new Date(updated), { addSuffix: true, locale: ptBR })}
                </span>
                {diasRestantes !== null && (
                  <span className={`font-semibold ${isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-green-500'}`}>
                    {isOverdue ? `${Math.abs(diasRestantes)}d atraso` : diasRestantes === 0 ? 'vence hoje' : `${diasRestantes}d`}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Seta direita */}
      <button
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hidden sm:flex"
      >
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function Projetos() {
  const { profile, effectiveCompanyId } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEtapa, setFilterEtapa] = useState('')
  const companyId = effectiveCompanyId()

  async function fetchProjects() {
    setLoading(true)
    let q = supabase
      .from('projects')
      .select('*, users!criado_por(nome)')
      .order('atualizado_em', { ascending: false })

    if (companyId) q = q.eq('company_id', companyId)

    const { data, error } = await q
    if (error) toast.error('Erro ao carregar projetos')
    setProjects(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchProjects() }, [companyId])

  const filtered = projects.filter((p) => {
    const matchSearch = !search ||
      p.titulo.toLowerCase().includes(search.toLowerCase()) ||
      p.cliente.toLowerCase().includes(search.toLowerCase())
    const matchEtapa = !filterEtapa || p.etapa_atual === filterEtapa
    return matchSearch && matchEtapa
  })

  // Stats
  const emAndamento = projects.filter((p) => p.etapa_atual !== 'encerrado').length
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const comPrazo = projects.filter((p) => {
    if (!p.prazo_pedido || p.etapa_atual === 'encerrado') return false
    const d = new Date(p.prazo_pedido + 'T00:00:00')
    const dias = differenceInDays(d, hoje)
    return dias >= 0 && dias <= 7
  }).length
  const atrasados = projects.filter((p) => {
    if (!p.prazo_pedido || p.etapa_atual === 'encerrado') return false
    return differenceInDays(new Date(p.prazo_pedido + 'T00:00:00'), hoje) < 0
  }).length

  return (
    <div className="space-y-6">

      {/* ── Mini Dashboard ── */}
      {!loading && projects.length > 0 && (
        <section className="space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <FolderOpenIcon className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projects.length}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">projetos</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Andamento</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{emAndamento}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">em aberto</p>
            </div>

            <div className={`rounded-xl border p-4 ${
              atrasados > 0
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                : comPrazo > 0
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                  : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <ExclamationTriangleIcon className={`w-4 h-4 ${atrasados > 0 ? 'text-red-500' : comPrazo > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {atrasados > 0 ? 'Atrasados' : 'Prazo ≤7d'}
                </span>
              </div>
              <p className={`text-2xl font-bold ${atrasados > 0 ? 'text-red-600 dark:text-red-400' : comPrazo > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-600'}`}>
                {atrasados > 0 ? atrasados : comPrazo}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                {atrasados > 0 ? 'em atraso' : comPrazo > 0 ? 'vencem em breve' : 'tudo em dia'}
              </p>
            </div>
          </div>

          {/* Carrossel de recentes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Adicionados recentemente</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {Math.min(projects.length, 8)} de {projects.length}
              </span>
            </div>
            <RecentCarousel projects={projects} />
          </div>
        </section>
      )}

      {/* ── Header + filtros ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Projetos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {projects.length} projeto{projects.length !== 1 ? 's' : ''} no total
            </p>
          </div>
          <Link
            to="/projetos/novo"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
          >
            <PlusIcon className="w-4 h-4" />
            Novo projeto
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título ou cliente..."
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterEtapa}
              onChange={(e) => setFilterEtapa(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 appearance-none"
            >
              <option value="">Todas as etapas</option>
              {ETAPAS.map((e) => (
                <option key={e.key} value={e.key}>{e.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">Nenhum projeto encontrado</p>
            <p className="text-sm mt-1">Tente ajustar os filtros ou crie um novo projeto.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Projeto</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Cliente</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Etapa</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Responsável</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link to={`/projetos/${p.id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {p.titulo}
                      </Link>
                      {p.numero_pedido && (
                        <span className="ml-2 text-xs font-mono text-blue-500">{p.numero_pedido}</span>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 sm:hidden mt-0.5">{p.cliente}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{p.cliente}</td>
                    <td className="px-5 py-3.5"><EtapaBadge etapa={p.etapa_atual} /></td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 hidden md:table-cell">{p.users?.nome ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-400 dark:text-gray-500 hidden lg:table-cell">
                      {p.atualizado_em ? formatDistanceToNow(new Date(p.atualizado_em), { addSuffix: true, locale: ptBR }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
