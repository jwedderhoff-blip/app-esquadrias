import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ETAPA_LABEL = {
  pedido: 'Pedido',
  contrato: 'Contrato assinado',
  compra_material: 'Compra de material',
  fabricacao: 'Em fabricação',
  pronto_entrega: 'Pronto para entrega',
  instalacao: 'Instalação',
  pos_obra: 'Pós-obra',
  encerrado: 'Encerrado',
}

const ETAPA_COLOR = {
  pedido: 'bg-slate-100 text-slate-700',
  contrato: 'bg-blue-100 text-blue-700',
  compra_material: 'bg-orange-100 text-orange-700',
  fabricacao: 'bg-purple-100 text-purple-700',
  pronto_entrega: 'bg-yellow-100 text-yellow-700',
  instalacao: 'bg-cyan-100 text-cyan-700',
  pos_obra: 'bg-pink-100 text-pink-700',
  encerrado: 'bg-green-100 text-green-700',
}

const ETAPAS_ORDER = ['pedido', 'contrato', 'compra_material', 'fabricacao', 'pronto_entrega', 'instalacao', 'pos_obra', 'encerrado']

function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-200'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-12 text-right">{pct}%</span>
    </div>
  )
}

export default function DashboardPublico() {
  const { companyId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-publico?company_id=${companyId}`
    fetch(url, {
      headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
        setLoading(false)
      })
      .catch(() => { setError('Erro ao carregar dados'); setLoading(false) })
  }, [companyId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Carregando...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const { company, projects, generated_at } = data
  const total = projects.length
  const encerrados = projects.filter((p) => p.etapa_atual === 'encerrado').length
  const emAndamento = total - encerrados

  const byEtapa = {}
  for (const p of projects) {
    byEtapa[p.etapa_atual] = (byEtapa[p.etapa_atual] || 0) + 1
  }

  const totalItems = projects.reduce((s, p) => s + p.checklist_total, 0)
  const doneItems = projects.reduce((s, p) => s + p.checklist_done, 0)
  const globalPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-4">
          {company.logo_url && (
            <img src={company.logo_url} alt={company.nome} className="h-10 w-auto object-contain" />
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900">{company.nome}</h1>
            <p className="text-xs text-gray-500">
              Painel de projetos — atualizado em {format(new Date(generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Cards resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total de projetos</p>
            <p className="text-3xl font-bold text-gray-900">{total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Em andamento</p>
            <p className="text-3xl font-bold text-blue-600">{emAndamento}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Encerrados</p>
            <p className="text-3xl font-bold text-green-600">{encerrados}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Conclusão geral</p>
            <p className="text-3xl font-bold text-gray-900">{globalPct}%</p>
          </div>
        </div>

        {/* Distribuição por etapa */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Projetos por etapa</h2>
          <div className="flex flex-wrap gap-2">
            {ETAPAS_ORDER.map((key) => {
              const count = byEtapa[key] || 0
              if (count === 0) return null
              return (
                <span key={key} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${ETAPA_COLOR[key] || 'bg-gray-100 text-gray-700'}`}>
                  {ETAPA_LABEL[key]} — {count}
                </span>
              )
            })}
          </div>
        </div>

        {/* Lista de projetos */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Projetos</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {projects.length === 0 && (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">Nenhum projeto encontrado.</p>
            )}
            {projects.map((p) => (
              <div key={p.id} className="px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.titulo}</p>
                    <p className="text-xs text-gray-500 truncate">{p.cliente}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ETAPA_COLOR[p.etapa_atual] || 'bg-gray-100 text-gray-700'}`}>
                      {ETAPA_LABEL[p.etapa_atual] || p.etapa_atual}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:block">
                      {format(new Date(p.atualizado_em || p.criado_em), 'dd/MM/yy', { locale: ptBR })}
                    </span>
                  </div>
                </div>
                {p.checklist_total > 0 && (
                  <div className="mt-2">
                    <ProgressBar done={p.checklist_done} total={p.checklist_total} />
                    <p className="text-xs text-gray-400 mt-0.5">{p.checklist_done}/{p.checklist_total} itens do checklist concluídos</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          App Esquadrias — dados em tempo real
        </p>
      </div>
    </div>
  )
}
