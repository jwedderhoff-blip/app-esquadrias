import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, ArrowTopRightOnSquareIcon, ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
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

const ETAPA_INDEX_MAP = Object.fromEntries(ETAPAS.map((e, i) => [e.key, i]))

function getPendencias(projects, perfil) {
  const enc = 'encerrado'
  if (perfil === 'comercial') {
    return projects
      .filter((p) => p.etapa_atual !== enc && (!p.cliente || !p.titulo || p.valor_contrato == null))
      .map((p) => {
        const motivos = []
        if (!p.titulo) motivos.push('sem título')
        if (!p.cliente) motivos.push('sem cliente')
        if (p.valor_contrato == null) motivos.push('sem valor do contrato')
        return { ...p, motivo: motivos.join(' · ') }
      })
  }
  if (perfil === 'financeiro') {
    return projects
      .filter((p) => p.etapa_atual !== enc && p.valor_contrato != null && p.totalPagamentos === 0)
      .map((p) => ({ ...p, motivo: 'contrato sem lançamentos financeiros' }))
  }
  if (perfil === 'compras') {
    return projects
      .filter((p) => {
        if (p.etapa_atual === enc || p.etapa_atual === 'pos_obra') return false
        const idx = ETAPA_INDEX_MAP[p.etapa_atual] ?? -1
        const contratoIdx = ETAPA_INDEX_MAP['contrato'] ?? 1
        if (idx < contratoIdx) return false
        const ci = p.comprasInfo
        return !ci || ci.done === 0
      })
      .map((p) => ({ ...p, motivo: 'cotação/compra de materiais não iniciada' }))
  }
  if (perfil === 'administrador' || perfil === 'super_admin') {
    const comercial = getPendencias(projects, 'comercial').map((p) => ({ ...p, _area: 'Comercial' }))
    const financeiro = getPendencias(projects, 'financeiro').map((p) => ({ ...p, _area: 'Financeiro' }))
    const compras = getPendencias(projects, 'compras').map((p) => ({ ...p, _area: 'Compras' }))
    const seen = new Set()
    const result = []
    for (const p of [...comercial, ...financeiro, ...compras]) {
      const key = `${p.id}:${p._area}`
      if (!seen.has(key)) { seen.add(key); result.push(p) }
    }
    return result
  }
  return []
}

export default function Carteira() {
  const { profile, effectiveCompanyId } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEtapa, setFilterEtapa] = useState('')
  const [pendenciasAberto, setPendenciasAberto] = useState(true)
  const companyId = effectiveCompanyId()
  const canCreate = ['comercial', 'financeiro', 'administrador', 'super_admin'].includes(profile?.perfil)

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

      const [{ data: checklistItems }, { data: prazosData }, { data: pagamentosData }] = await Promise.all([
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
        supabase
          .from('pagamentos')
          .select('project_id, valor, pago')
          .in('project_id', ids),
      ])

      const prazoMap = {}
      for (const item of prazosData || []) {
        prazoMap[item.project_id] = item.dados?.prazo ?? null
      }

      const pagMap = {}
      const pagCountMap = {}
      for (const pg of pagamentosData || []) {
        pagMap[pg.project_id] = (pagMap[pg.project_id] || 0) + (pg.pago ? Number(pg.valor) : 0)
        pagCountMap[pg.project_id] = (pagCountMap[pg.project_id] || 0) + 1
      }

      // checklist de compra_material: quantos itens concluídos por projeto
      const comprasDoneMap = {}
      for (const item of (checklistItems || [])) {
        if (item.etapa === 'compra_material') {
          if (!comprasDoneMap[item.project_id]) comprasDoneMap[item.project_id] = { total: 0, done: 0 }
          comprasDoneMap[item.project_id].total++
          if (item.concluido) comprasDoneMap[item.project_id].done++
        }
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

        const totalRecebido = pagMap[p.id] || 0
        const totalPagamentos = pagCountMap[p.id] || 0
        const saldoPendente = p.valor_contrato != null ? Math.max(0, Number(p.valor_contrato) - totalRecebido) : null
        const comprasInfo = comprasDoneMap[p.id] || null

        return {
          ...p,
          pipelinePct,
          etapaDone,
          etapaTotal,
          etapaPct,
          prazo: prazoMap[p.id] ?? null,
          saldoPendente,
          totalPagamentos,
          comprasInfo,
        }
      })

      setProjects(enriched)
      setLoading(false)
    }
    load()
  }, [companyId])

  const filtered = projects
    .filter((p) => {
      const q = search.toLowerCase()
      const matchSearch = !search ||
        (p.titulo ?? '').toLowerCase().includes(q) ||
        (p.cliente ?? '').toLowerCase().includes(q) ||
        (p.numero_pedido ?? '').toLowerCase().includes(q)
      const matchEtapa = !filterEtapa || p.etapa_atual === filterEtapa
      return matchSearch && matchEtapa
    })
    .sort((a, b) => {
      const aEnc = a.etapa_atual === 'encerrado' ? 1 : 0
      const bEnc = b.etapa_atual === 'encerrado' ? 1 : 0
      if (aEnc !== bEnc) return aEnc - bEnc
      return (parseInt(b.numero_pedido) || 0) - (parseInt(a.numero_pedido) || 0)
    })

  const perfil = profile?.perfil
  const pendencias = !loading && ['comercial', 'financeiro', 'compras', 'administrador', 'super_admin'].includes(perfil)
    ? getPendencias(projects, perfil)
    : []

  return (
    <div>
      {/* Card de pendências por função */}
      {pendencias.length > 0 && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/50 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setPendenciasAberto((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Suas pendências — {pendencias.length} projeto{pendencias.length !== 1 ? 's' : ''} aguardando ação
              </span>
            </div>
            {pendenciasAberto
              ? <ChevronUpIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
              : <ChevronDownIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
            }
          </button>
          {pendenciasAberto && (
            <div className="border-t border-amber-200 dark:border-amber-800/40 divide-y divide-amber-100 dark:divide-amber-800/30">
              {pendencias.map((p) => (
                <Link
                  key={`${p.id}:${p._area || perfil}`}
                  to={`/projetos/${p.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.numero_pedido && (
                        <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded flex-shrink-0">
                          {p.numero_pedido}
                        </span>
                      )}
                      {p._area && (
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded flex-shrink-0">
                          {p._area}
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {p.titulo || p.cliente || 'Sem título'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{p.motivo}</p>
                  </div>
                  <EtapaBadge etapa={p.etapa_atual} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

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
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Nº</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Projeto</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Cliente</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Etapa</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Prazo</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Checklist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {filtered.map((p) => (
                  <tr key={p.id} className={`relative transition-colors ${
                    p.etapa_atual === 'encerrado' && p.saldoPendente > 0.005
                      ? 'bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/projetos/${p.id}`}
                        className="absolute inset-0 z-10"
                        aria-label={`Abrir projeto ${p.titulo || 'Sem título'}`}
                      />
                      {p.numero_pedido
                        ? <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{p.numero_pedido}</span>
                        : <span className="text-gray-300 dark:text-gray-600">—</span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`font-medium ${p.titulo ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                        {p.titulo || 'Sem título'}
                      </span>
                      <p className="text-xs text-gray-400 dark:text-gray-500 sm:hidden mt-0.5">{p.cliente}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{p.cliente}</td>
                    <td className="px-5 py-3.5">
                      <EtapaBadge etapa={p.etapa_atual} />
                      {p.etapa_atual === 'encerrado' && p.saldoPendente != null && p.saldoPendente > 0.005 && (
                        <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          ⚠ Pend. fin.
                        </span>
                      )}
                    </td>
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
