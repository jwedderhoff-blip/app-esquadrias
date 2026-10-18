import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Spinner from '../ui/Spinner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ACAO_LABEL = {
  projeto_criado: 'Projeto criado',
  etapa_avancada: 'Etapa avançada',
  documento_adicionado: 'Documento adicionado',
  checklist_atualizado: 'Checklist atualizado',
}

export default function LogTab({ projectId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('activity_log')
      .select('*, users!usuario_id(nome)')
      .eq('project_id', projectId)
      .order('criado_em', { ascending: false })
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [projectId])

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <div>
      <h2 className="font-semibold text-gray-800 mb-4">Log de Atividades</h2>
      {logs.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Nenhuma atividade registrada.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Data</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Usuário</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Ação</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 hidden sm:table-cell">Detalhe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {format(new Date(log.criado_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-5 py-3 text-gray-700">{log.users?.nome ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-700">{ACAO_LABEL[log.acao] ?? log.acao}</td>
                  <td className="px-5 py-3 text-gray-500 hidden sm:table-cell">{log.detalhe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
