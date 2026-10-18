import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ETAPAS, ETAPA_INDEX } from '../lib/constants'
import EtapaBadge from '../components/ui/Badge'
import ProgressBar from '../components/ui/ProgressBar'
import Spinner from '../components/ui/Spinner'
import { differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'

export default function Carteira() {
  const { effectiveCompanyId } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const companyId = effectiveCompanyId()

  useEffect(() => {
    async function load() {
      let q = supabase
        .from('projects')
        .select('*, users!criado_por(nome)')
        .order('atualizado_em', { ascending: false })
      if (companyId) q = q.eq('company_id', companyId)
      const { data: projects, error } = await q


      if (error) { toast.error('Erro ao carregar carteira'); setLoading(false); return }

      // Buscar progresso dos checklists para cada projeto
      const projectIds = projects.map((p) => p.id)
      const { data: allItems } = await supabase
        .from('checklist_items')
        .select('project_id, etapa, concluido')
        .in('project_id', projectIds)

      const enriched = projects.map((p) => {
        const items = allItems?.filter((i) => i.project_id === p.id && i.etapa === p.etapa_atual) || []
        const done = items.filter((i) => i.concluido).length
        const total = items.length
        const diasNaEtapa = differenceInDays(new Date(), new Date(p.atualizado_em))
        return { ...p, checklistDone: done, checklistTotal: total, diasNaEtapa }
      })

      setRows(enriched)
      setLoading(false)
    }
    load()
  }, [companyId])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Carteira de Projetos</h1>
        <p className="text-sm text-gray-500 mt-0.5">{rows.length} projeto{rows.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Projeto</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 hidden sm:table-cell">Cliente</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Etapa</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 hidden md:table-cell">Checklist</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Dias na etapa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className={`transition-colors ${p.diasNaEtapa > 7 ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-5 py-3.5">
                    <Link to={`/projetos/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                      {p.titulo}
                    </Link>
                    {p.numero_pedido && (
                      <span className="ml-2 text-xs font-mono text-blue-500">{p.numero_pedido}</span>
                    )}
                    {p.diasNaEtapa > 7 && (
                      <span className="ml-2 text-xs text-amber-600 font-medium">⚠ Parado</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 hidden sm:table-cell">{p.cliente}</td>
                  <td className="px-5 py-3.5"><EtapaBadge etapa={p.etapa_atual} /></td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    {p.checklistTotal > 0 ? (
                      <div className="w-32">
                        <ProgressBar value={p.checklistDone} max={p.checklistTotal} />
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className={`px-5 py-3.5 font-medium ${p.diasNaEtapa > 7 ? 'text-amber-600' : 'text-gray-600'}`}>
                    {p.diasNaEtapa}d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        <span className="inline-block w-3 h-3 bg-amber-100 border border-amber-200 rounded-sm mr-1 align-middle" />
        Projetos em amarelo estão parados há mais de 7 dias na mesma etapa.
      </p>
    </div>
  )
}
