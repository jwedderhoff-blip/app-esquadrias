import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ArrowTopRightOnSquareIcon, FunnelIcon } from '@heroicons/react/24/outline'

const FORMA_LABEL = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  transferencia: 'Transferência bancária',
  cheque: 'Cheque',
  boleto: 'Boleto',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
}

function fmtBRL(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

export default function RelatorioFinanceiro() {
  const { companyId } = useAuth()
  const [rows, setRows] = useState([])   // { project, pagamentos[] }
  const [loading, setLoading] = useState(true)
  const [filtroForma, setFiltroForma] = useState('')
  const [filtroMesInicio, setFiltroMesInicio] = useState('')
  const [filtroMesFim, setFiltroMesFim] = useState('')
  const [filtroDestino, setFiltroDestino] = useState('')

  useEffect(() => {
    if (!companyId) return
    load()
  }, [companyId])

  async function load() {
    setLoading(true)
    const [{ data: projects }, { data: pagamentos }] = await Promise.all([
      supabase
        .from('projects')
        .select('id, titulo, cliente, etapa_atual, valor_contrato')
        .eq('company_id', companyId)
        .neq('etapa_atual', 'encerrado')
        .order('titulo'),
      supabase
        .from('pagamentos')
        .select('*')
        .eq('company_id', companyId)
        .order('data_pagamento', { ascending: false }),
    ])

    const pagsByProject = {}
    for (const p of pagamentos || []) {
      if (!pagsByProject[p.project_id]) pagsByProject[p.project_id] = []
      pagsByProject[p.project_id].push(p)
    }

    const result = (projects || [])
      .filter((p) => pagsByProject[p.id]?.length > 0)
      .map((p) => ({ project: p, pagamentos: pagsByProject[p.id] || [] }))

    setRows(result)
    setLoading(false)
  }

  // Filtragem
  const rowsFiltrados = rows.map(({ project, pagamentos }) => {
    let pags = pagamentos
    if (filtroForma) pags = pags.filter((p) => p.forma_recebimento === filtroForma)
    if (filtroMesInicio) pags = pags.filter((p) => p.data_pagamento && p.data_pagamento >= filtroMesInicio + '-01')
    if (filtroMesFim) {
      const [ano, mes] = filtroMesFim.split('-').map(Number)
      const ultimo = new Date(ano, mes, 0).toISOString().slice(0, 10)
      pags = pags.filter((p) => p.data_pagamento && p.data_pagamento <= ultimo)
    }
    if (filtroDestino) pags = pags.filter((p) => p.destino?.toLowerCase().includes(filtroDestino.toLowerCase()))
    return { project, pagamentos: pags }
  }).filter(({ pagamentos }) => pagamentos.length > 0)

  const totalGeral = rowsFiltrados.reduce((s, { pagamentos }) => s + pagamentos.reduce((ss, p) => ss + Number(p.valor), 0), 0)
  const totalPorForma = {}
  for (const { pagamentos } of rowsFiltrados) {
    for (const p of pagamentos) {
      const k = p.forma_recebimento || 'nao_informado'
      totalPorForma[k] = (totalPorForma[k] || 0) + Number(p.valor)
    }
  }

  const inputCls = 'px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Relatório financeiro</h1>
        <button onClick={() => window.print()}
          className="px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition print:hidden">
          Imprimir / PDF
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 print:hidden">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Filtros</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Forma de recebimento</label>
            <select value={filtroForma} onChange={(e) => setFiltroForma(e.target.value)} className={inputCls}>
              <option value="">Todas</option>
              {Object.entries(FORMA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">De (mês/ano)</label>
            <input type="month" value={filtroMesInicio} onChange={(e) => setFiltroMesInicio(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Até (mês/ano)</label>
            <input type="month" value={filtroMesFim} onChange={(e) => setFiltroMesFim(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Destino</label>
            <input type="text" value={filtroDestino} onChange={(e) => setFiltroDestino(e.target.value)}
              placeholder="Buscar destino..." className={inputCls + ' w-full'} />
          </div>
        </div>
      </div>

      {/* Totais por forma */}
      {Object.keys(totalPorForma).length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Resumo por forma</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(totalPorForma).map(([k, v]) => (
              <div key={k} className="flex-1 min-w-[120px] bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-center">
                <p className="text-[11px] text-gray-400 mb-1">{k === 'nao_informado' ? 'Não informado' : (FORMA_LABEL[k] ?? k)}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmtBRL(v)}</p>
              </div>
            ))}
            <div className="flex-1 min-w-[120px] bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 text-center border border-blue-100 dark:border-blue-800/30">
              <p className="text-[11px] text-blue-500 mb-1">Total geral</p>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{fmtBRL(totalGeral)}</p>
            </div>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>}

      {/* Tabela por projeto */}
      {!loading && rowsFiltrados.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">Nenhum lançamento encontrado com os filtros aplicados.</p>
      )}

      {rowsFiltrados.map(({ project, pagamentos }) => {
        const totalProjeto = pagamentos.reduce((s, p) => s + Number(p.valor), 0)
        const saldo = project.valor_contrato != null ? Number(project.valor_contrato) - totalProjeto : null

        return (
          <div key={project.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Cabeçalho do projeto */}
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{project.titulo}</span>
                  <Link to={`/projetos/${project.id}`} target="_blank"
                    className="text-gray-400 hover:text-blue-500 transition-colors print:hidden">
                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{project.cliente}</p>
              </div>
              <div className="flex items-center gap-4 flex-wrap text-right">
                {project.valor_contrato != null && (
                  <div>
                    <p className="text-[11px] text-gray-400">Contrato</p>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{fmtBRL(Number(project.valor_contrato))}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-gray-400">Recebido</p>
                  <p className="text-xs font-bold text-green-600 dark:text-green-400">{fmtBRL(totalProjeto)}</p>
                </div>
                {saldo != null && (
                  <div>
                    <p className="text-[11px] text-gray-400">Saldo</p>
                    <p className={`text-xs font-bold ${saldo > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                      {fmtBRL(Math.max(0, saldo))}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Lançamentos */}
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {pagamentos.map((pag) => (
                <div key={pag.id} className="px-5 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{pag.descricao}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {pag.data_pagamento && (
                          <span className="text-[11px] text-gray-400">{fmtData(pag.data_pagamento)}</span>
                        )}
                        {pag.forma_recebimento && (
                          <span className="text-[11px] text-gray-400">{FORMA_LABEL[pag.forma_recebimento] ?? pag.forma_recebimento}</span>
                        )}
                        {pag.destino && (
                          <span className="text-[11px] text-gray-400">→ {pag.destino}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400 flex-shrink-0">{fmtBRL(Number(pag.valor))}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <style>{`
        @media print {
          body { background: white !important; }
          .dark body { background: white !important; color: black !important; }
        }
      `}</style>
    </div>
  )
}
