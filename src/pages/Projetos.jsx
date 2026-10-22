import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ETAPAS } from '../lib/constants'
import EtapaBadge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function Projetos() {
  const { effectiveCompanyId } = useAuth()
  const [projects, setProjects] = useState([])
  const [checklistStats, setChecklistStats] = useState({})
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
    const projs = data || []

    if (projs.length) {
      const ids = projs.map((p) => p.id)
      const { data: chk } = await supabase
        .from('checklist_items')
        .select('project_id, concluido, etapa')
        .in('project_id', ids)

      const map = {}
      for (const item of (chk || [])) {
        if (!map[item.project_id]) map[item.project_id] = {}
        if (!map[item.project_id][item.etapa]) map[item.project_id][item.etapa] = { total: 0, done: 0 }
        map[item.project_id][item.etapa].total++
        if (item.concluido) map[item.project_id][item.etapa].done++
      }
      setChecklistStats(map)
    }

    setProjects(projs)
    setLoading(false)
  }

  useEffect(() => { fetchProjects() }, [companyId])

  function getChecklist(projectId, etapaAtual) {
    const byEtapa = checklistStats[projectId] || {}
    let totalAll = 0, doneAll = 0
    for (const s of Object.values(byEtapa)) { totalAll += s.total; doneAll += s.done }
    const es = byEtapa[etapaAtual] || { total: 0, done: 0 }
    return {
      total: totalAll,
      done: doneAll,
      pct: totalAll ? Math.round((doneAll / totalAll) * 100) : 0,
      etapaTotal: es.total,
      etapaDone: es.done,
      etapaPct: es.total ? Math.round((es.done / es.total) * 100) : 0,
    }
  }

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      p.titulo.toLowerCase().includes(q) ||
      p.cliente.toLowerCase().includes(q) ||
      (p.numero_pedido ?? '').toLowerCase().includes(q)
    const matchEtapa = !filterEtapa || p.etapa_atual === filterEtapa
    return matchSearch && matchEtapa
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, cliente ou número..."
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
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Nº</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Cliente</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Etapa</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">Checklist</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden xl:table-cell">Responsável</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden xl:table-cell">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filtered.map((p) => {
                const ck = getChecklist(p.id, p.etapa_atual)
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    {/* Projeto */}
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/projetos/${p.id}`}
                        className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {p.titulo}
                      </Link>
                      {/* número visível só em mobile (inline) */}
                      {p.numero_pedido && (
                        <span className="ml-2 text-xs font-mono text-blue-500 sm:hidden">{p.numero_pedido}</span>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 md:hidden mt-0.5">{p.cliente}</p>
                    </td>

                    {/* Nº pedido — coluna dedicada em sm+ */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      {p.numero_pedido
                        ? <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{p.numero_pedido}</span>
                        : <span className="text-gray-300 dark:text-gray-600">—</span>
                      }
                    </td>

                    {/* Cliente */}
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 hidden md:table-cell">{p.cliente}</td>

                    {/* Etapa */}
                    <td className="px-5 py-3.5"><EtapaBadge etapa={p.etapa_atual} /></td>

                    {/* Checklist */}
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {ck.total === 0 ? (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      ) : (
                        <div className="min-w-[120px]">
                          {/* Barra total */}
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${ck.pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-right">{ck.pct}%</span>
                          </div>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            Total: {ck.done}/{ck.total}
                          </p>
                          {/* % da etapa atual */}
                          {ck.etapaTotal > 0 && (
                            <div className="mt-1.5">
                              <div className="flex items-center gap-2 mb-0.5">
                                <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${ck.etapaPct}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 w-8 text-right">{ck.etapaPct}%</span>
                              </div>
                              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                Etapa: {ck.etapaDone}/{ck.etapaTotal}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Responsável */}
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 hidden xl:table-cell">
                      {p.users?.nome ?? '—'}
                    </td>

                    {/* Atualizado */}
                    <td className="px-5 py-3.5 text-gray-400 dark:text-gray-500 hidden xl:table-cell">
                      {p.atualizado_em
                        ? formatDistanceToNow(new Date(p.atualizado_em), { addSuffix: true, locale: ptBR })
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
