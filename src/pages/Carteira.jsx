import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
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
        const items = (checklistItems || []).filter(
          (i) => i.project_id === p.id && i.etapa === p.etapa_atual
        )
        return {
          ...p,
          checklistDone: items.filter((i) => i.concluido).length,
          checklistTotal: items.length,
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
      p.cliente.toLowerCase().includes(q)
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

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou cliente..."
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
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Cliente</th>
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
                        <span className="ml-2 text-xs font-mono text-blue-500">{p.numero_pedido}</span>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 sm:hidden mt-0.5">{p.cliente}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{p.cliente}</td>
                    <td className="px-5 py-3.5"><EtapaBadge etapa={p.etapa_atual} /></td>
                    <td className="px-5 py-3.5"><PrazoCell prazo={p.prazo} /></td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {p.checklistTotal > 0 ? (
                        <div className="w-28">
                          <ProgressBar value={p.checklistDone} max={p.checklistTotal} />
                          <p className="text-xs text-gray-400 mt-0.5">{p.checklistDone}/{p.checklistTotal}</p>
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
