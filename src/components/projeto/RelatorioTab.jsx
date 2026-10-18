import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ETAPAS, ETAPA_INDEX } from '../../lib/constants'
import Spinner from '../ui/Spinner'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function RelatorioTab({ projectId, project }) {
  const [stages, setStages] = useState([])
  const [pendingItems, setPendingItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: stagesData }, { data: itemsData }] = await Promise.all([
        supabase
          .from('project_stages')
          .select('*')
          .eq('project_id', projectId)
          .order('iniciada_em'),
        supabase
          .from('checklist_items')
          .select('*')
          .eq('project_id', projectId)
          .eq('etapa', project.etapa_atual)
          .eq('concluido', false),
      ])
      setStages(stagesData || [])
      setPendingItems(itemsData || [])
      setLoading(false)
    }
    load()
  }, [projectId])

  const currentIdx = ETAPA_INDEX[project.etapa_atual]
  const pctGeral = Math.round((currentIdx / (ETAPAS.length - 1)) * 100)

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <div className="space-y-6">
      {/* Progresso geral */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Progresso Geral</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pctGeral}%` }} />
          </div>
          <span className="text-sm font-semibold text-gray-700 w-12 text-right">{pctGeral}%</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Etapa {currentIdx + 1} de {ETAPAS.length} — {ETAPAS[currentIdx].label}
        </p>
      </div>

      {/* Linha do tempo */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Linha do Tempo</h3>
        <div className="space-y-3">
          {ETAPAS.map((etapa, i) => {
            const stage = stages.find((s) => s.etapa === etapa.key)
            const done = i < currentIdx
            const active = i === currentIdx
            const future = i > currentIdx

            return (
              <div key={etapa.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center mt-0.5">
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                    done ? 'bg-green-500' : active ? 'bg-blue-500' : 'bg-gray-200'
                  }`} />
                  {i < ETAPAS.length - 1 && (
                    <div className={`w-0.5 h-6 mt-0.5 ${done ? 'bg-green-300' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className="pb-1">
                  <p className={`text-sm font-medium ${
                    done ? 'text-green-700' : active ? 'text-blue-700' : 'text-gray-400'
                  }`}>
                    {etapa.label}
                    {done && <span className="ml-2 text-xs font-normal text-green-500">✓ Concluída</span>}
                    {active && <span className="ml-2 text-xs font-normal text-blue-500">● Em andamento</span>}
                  </p>
                  {stage && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Iniciada em {format(new Date(stage.iniciada_em), "dd/MM/yyyy", { locale: ptBR })}
                      {stage.concluida_em && ` · Concluída em ${format(new Date(stage.concluida_em), "dd/MM/yyyy", { locale: ptBR })}`}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Itens pendentes */}
      {pendingItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-semibold text-amber-800 mb-3">Itens Pendentes na Etapa Atual</h3>
          <ul className="space-y-1.5">
            {pendingItems.map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-sm text-amber-700">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                {item.descricao}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
