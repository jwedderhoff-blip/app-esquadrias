import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ETAPAS } from '../lib/constants'
import EtapaBadge from '../components/ui/Badge'
import ProgressBar from '../components/ui/ProgressBar'
import Spinner from '../components/ui/Spinner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function PrazoCell({ prazo }) {
  if (!prazo) return <span className="text-gray-300 dark:text-gray-600">—</span>

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const deadline = new Date(prazo + 'T00:00:00')
  const dias = Math.round((deadline - today) / (1000 * 60 * 60 * 24))

  const isOverdue = dias < 0
  const isUrgent = dias >= 0 && dias <= 7

  const colorClass = isOverdue
    ? 'text-red-600 dark:text-red-400'
    : isUrgent
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-green-600 dark:text-green-500'

  const label = isOverdue
    ? `${Math.abs(dias)}d atraso`
    : dias === 0
    ? 'Hoje'
    : `${dias}d`

  return (
    <div>
      <span className={`font-semibold text-sm ${colorClass}`}>{label}</span>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
        {format(deadline, "dd/MM/yy", { locale: ptBR })}
      </p>
    </div>
  )
}

export default function Carteira() {
  const { profile, effectiveCompanyId } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEtapa, setFilterEtapa] = useState('')
  const companyId = effectiveCompanyId()
  const canCreate = ['comercial', 'administrador', 'super_admin'].includes(profile?.perfil)

  useEffect(() => {
    async function load() {
      setLoading(true)
      let q = supabase
        .from('projects')
        .select('*, users!criado_por(nome)')
        .order('atualizado_em', { ascending: false })
      if (companyId) q = q.eq('company_id', companyId)

      const { data: projectsData, error } = await q
      if (error) { toast.error('Erro ao carregar projetos'); setLoading(false); return }

      const ids = (projectsData || []).map((p) => p.id)
      if (!ids.length) { setProjects([]); setLoading(false); return }

      const [{ data: checklistItems }, { data: prazosData }] = await Promise.all([
        supabase
          .from('checklist_items')
          .select('project_id, etapa, concluido')
          .in('project_id', ids),
        supabase
          .from('checklist_items')
          .select('project_id, dados')
          .in('project_id', ids)
          .eq('descricao', 'Prazo solicitado pelo cliente')
          .eq('etapa', 'pedido'),
      ])

      const prazoMap = {}
      for (const item of prazosData || []) {
        prazoMap[item.project_id] = item.dados?.prazo ?? null
      }

      const enriched = (projectsData || []).map((p) => {
        const etapaItems = (checklistItems || []).filter(
          (i) => i.project_id === p.id && i.etapa === p.etapa_atual
        )
        const etapaDone = etapaItems.filter((i) => i.concluido).length
        const etapaTotal = etapaItems.length
        const etapaPct = etapaTotal > 0 ? Math.round((etapaDone / etapaTotal) * 100) : 0

        // Progresso no pipeline: (índice da etapa + % do checklist atual) / total de etapas
        const stageIdx = ETAPAS.findIndex((e) => e.key === p.etapa_atual)
        const partial = etapaTotal > 0 ? etapaDone / etapaTotal : 0
        const pipelinePct = Math.min(100, Math.round(((Math.max(stageIdx, 0) + partial) / ETAPAS.length) * 100))

        return {
          ...p,
          pipelinePct,
          etapaDone,
          etapaTotal,
          etapaPct,
          prazo: prazoMap[p.id] ?? null,
        }
      })

      setProjects(enriched)
      setLoading(false)
    }
    load()
  }, [companyId])

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
            {projects.length} projeto{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {companyId && (
            <a
              href={`/dashboard/${companyId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-gray-600"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              Dashboard público
            </a>
          )}
          {canCreate && (
            <Link
              to="/projetos/novo"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
            >
              <PlusIcon className="w-4 h-4" />
              Novo projeto
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, cliente ou número..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterEtapa}
            onChange={(e) => setFilterEtapa(e.target.value)}
            className="pl-9 pr-8 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Projeto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Nº</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Cliente</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Etapa</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Prazo</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Checklist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/projetos/${p.id}`}
                        className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {p.titulo}
                      </Link>
                      {p.numero_pedido && (
                        <span className="ml-2 text-xs font-mono text-blue-500 sm:hidden">{p.numero_pedido}</span>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 md:hidden mt-0.5">{p.cliente}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      {p.numero_pedido
                        ? <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{p.numero_pedido}</span>
                        : <span className="text-gray-300 dark:text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 hidden md:table-cell">{p.cliente}</td>
                    <td className="px-5 py-3.5"><EtapaBadge etapa={p.etapa_atual} /></td>
                    <td className="px-5 py-3.5"><PrazoCell prazo={p.prazo} /></td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {p.etapaTotal > 0 || p.pipelinePct > 0 ? (
                        <div className="min-w-[120px]">
                          {/* Azul = progresso no pipeline (posição da etapa) */}
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${p.pipelinePct}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-right">
                              {p.pipelinePct}%
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">Processo geral</p>
                          {/* Verde = % do checklist da etapa atual */}
                          {p.etapaTotal > 0 && (
                            <div className="mt-1.5">
                              <div className="flex items-center gap-2 mb-0.5">
                                <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${p.etapaPct}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 w-8 text-right">
                                  {p.etapaPct}%
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400 dark:text-gray-500">Etapa: {p.etapaDone}/{p.etapaTotal}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
