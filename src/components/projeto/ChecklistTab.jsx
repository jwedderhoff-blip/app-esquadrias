import { useState } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { CheckCircleIcon as CheckCircleOutline } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ETAPA_LABEL } from '../../lib/constants'
import toast from 'react-hot-toast'

export default function ChecklistTab({ projectId, etapa, items, onUpdate }) {
  const { session } = useAuth()
  const [updating, setUpdating] = useState(null)

  const done = items.filter((i) => i.concluido).length
  const total = items.length

  async function toggleItem(item) {
    setUpdating(item.id)
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('checklist_items')
      .update({
        concluido: !item.concluido,
        concluido_por: !item.concluido ? session.user.id : null,
        concluido_em: !item.concluido ? now : null,
      })
      .eq('id', item.id)

    if (error) toast.error('Erro ao atualizar item')
    await onUpdate()
    setUpdating(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">
          Checklist — {ETAPA_LABEL[etapa] ?? etapa}
        </h2>
        <span className={`text-sm font-medium ${done === total && total > 0 ? 'text-green-600' : 'text-gray-500'}`}>
          {done} / {total} concluídos
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 bg-gray-200 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
        />
      </div>

      {items.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Nenhum item de checklist para esta etapa.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                item.concluido ? 'bg-green-50 border-green-100' : 'bg-white border-gray-200'
              }`}
            >
              <button
                onClick={() => toggleItem(item)}
                disabled={updating === item.id}
                className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                {item.concluido ? (
                  <CheckCircleIcon className="w-6 h-6 text-green-500" />
                ) : (
                  <CheckCircleOutline className="w-6 h-6" />
                )}
              </button>
              <span className={`text-sm flex-1 ${item.concluido ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {item.descricao}
              </span>
            </div>
          ))}
        </div>
      )}

      {done === total && total > 0 && (
        <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 text-center font-medium">
          ✓ Todos os itens concluídos — você pode avançar para a próxima etapa
        </div>
      )}
    </div>
  )
}
