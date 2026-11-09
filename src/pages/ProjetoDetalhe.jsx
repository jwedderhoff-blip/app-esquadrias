import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, EllipsisVerticalIcon, PencilSquareIcon, TrashIcon, XMarkIcon, PlusIcon, BanknotesIcon, CheckCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ETAPAS, ETAPA_INDEX } from '../lib/constants'
import EtapaBadge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import ChecklistTab from '../components/projeto/ChecklistTab'
import RelatorioTab from '../components/projeto/RelatorioTab'
import LogTab from '../components/projeto/LogTab'
import toast from 'react-hot-toast'

function ModalEditarProjeto({ project, usuarios, onClose, onSaved, session }) {
  const [form, setForm] = useState({
    numero_orcamento: project.numero_orcamento ?? '',
    numero_pedido: project.numero_pedido ?? '',
    titulo: project.titulo ?? '',
    cliente: project.cliente ?? '',
    cliente_cpf_cnpj: project.cliente_cpf_cnpj ?? '',
    cliente_fone: project.cliente_fone ?? '',
    cliente_email: project.cliente_email ?? '',
    criado_por: project.criado_por ?? '',
  })
  const [confirmando, setConfirmando] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function buildDiff() {
    const labels = {
      numero_orcamento: 'Nº orçamento', numero_pedido: 'Nº pedido',
      titulo: 'Título', cliente: 'Cliente',
      cliente_cpf_cnpj: 'CPF/CNPJ',
      cliente_fone: 'Telefone', cliente_email: 'Email cliente',
      criado_por: 'Responsável',
    }
    return Object.entries(form)
      .filter(([k, v]) => String(v ?? '') !== String(project[k] ?? ''))
      .map(([k]) => labels[k] ?? k)
  }

  async function handleSave() {
    setLoading(true)
    const { error } = await supabase.from('projects')
      .update({ ...form, atualizado_em: new Date().toISOString() })
      .eq('id', project.id)

    if (error) { toast.error('Erro ao salvar: ' + error.message); setLoading(false); return }

    const diff = buildDiff()
    await supabase.from('activity_log').insert({
      project_id: project.id,
      usuario_id: session.user.id,
      acao: 'projeto_editado',
      detalhe: `Campos alterados: ${diff.join(', ')}`,
    })

    toast.success('Projeto atualizado!')
    setLoading(false)
    onSaved()
    onClose()
  }

  const diff = buildDiff()

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Editar projeto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><XMarkIcon className="w-5 h-5" /></button>
        </div>

        {!confirmando ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nº orçamento</label>
                <input value={form.numero_orcamento} onChange={set('numero_orcamento')} placeholder="ORC-2024-001"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nº pedido / contrato</label>
                <input value={form.numero_pedido} onChange={set('numero_pedido')} placeholder="PED-2024-001"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Título *</label>
              <input value={form.titulo} onChange={set('titulo')} required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome do cliente *</label>
              <input value={form.cliente} onChange={set('cliente')} required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">CPF / CNPJ</label>
              <input value={form.cliente_cpf_cnpj} onChange={set('cliente_cpf_cnpj')} placeholder="000.000.000-00 ou 00.000.000/0001-00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Telefone / WhatsApp</label>
                <input type="tel" value={form.cliente_fone} onChange={set('cliente_fone')} placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email do cliente</label>
                <input type="email" value={form.cliente_email} onChange={set('cliente_email')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Responsável</label>
              <select value={form.criado_por} onChange={set('criado_por')}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancelar</button>
              <button onClick={() => setConfirmando(true)} disabled={diff.length === 0}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                Revisar alterações
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Confirme as alterações nos campos:</p>
            <ul className="mb-5 space-y-1">
              {diff.map((campo) => (
                <li key={campo} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  {campo}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">Esta ação será registrada no log do projeto.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmando(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Voltar</button>
              <button onClick={handleSave} disabled={loading}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
                {loading ? 'Salvando...' : 'Confirmar e salvar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ModalConfirmarExclusao({ project, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Excluir projeto</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">Você está prestes a excluir:</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-5">"{project.titulo}"</p>
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 mb-5">
          Todos os dados, checklist e documentos deste projeto serão removidos permanentemente.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancelar</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition">
            {loading ? 'Excluindo...' : 'Excluir projeto'}
          </button>
        </div>
      </div>
    </div>
  )
}

const TABS = [
  { key: 'etapas', label: 'Etapas & Checklist' },
  { key: 'relatorio', label: 'Relatório' },
  { key: 'log', label: 'Log' },
]

export default function ProjetoDetalhe() {
  const { id } = useParams()
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [checklistItems, setChecklistItems] = useState([])
  const [selectedEtapa, setSelectedEtapa] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [tab, setTab] = useState('etapas')
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [actionMenu, setActionMenu] = useState(false)
  const [advanceModal, setAdvanceModal] = useState(false)
  const [stageStats, setStageStats] = useState({})
  const [pagamentos, setPagamentos] = useState([])
  const [editandoValor, setEditandoValor] = useState(false)
  const [valorInput, setValorInput] = useState('')
  const [modalPagamento, setModalPagamento] = useState(false)
  const [formPagamento, setFormPagamento] = useState({ descricao: '', valor: '', data_pagamento: '', forma_recebimento: '', destino: '' })
  const [savingPagamento, setSavingPagamento] = useState(false)
  const [editandoPagamento, setEditandoPagamento] = useState(null)
  const [formEditPagamento, setFormEditPagamento] = useState({ descricao: '', valor: '', data_pagamento: '', forma_recebimento: '', destino: '' })
  const [savingEditPagamento, setSavingEditPagamento] = useState(false)
  const [financeiroAberto, setFinanceiroAberto] = useState(() => {
    try { return localStorage.getItem('financeiro_aberto') !== 'false' } catch { return true }
  })

  const canEdit = ['administrador', 'comercial', 'financeiro', 'super_admin'].includes(profile?.perfil)
  const canDelete = ['administrador', 'super_admin'].includes(profile?.perfil)

  async function fetchProject() {
    const { data } = await supabase
      .from('projects')
      .select('*, users!criado_por(nome)')
      .eq('id', id)
      .single()
    setProject(data)
    return data
  }

  async function loadStageChecklist(etapa) {
    setSelectedEtapa(etapa)
    const { data: existing } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('project_id', id)
      .eq('etapa', etapa)
      .order('ordem')

    if (existing?.length) {
      setChecklistItems(existing)
      return
    }

    // Etapa ainda não iniciada — cria itens a partir dos templates
    const { data: templates } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('etapa', etapa)
      .order('ordem')

    if (templates?.length) {
      const { data: inserted } = await supabase
        .from('checklist_items')
        .insert(templates.map((t) => ({
          project_id: id,
          etapa,
          descricao: t.descricao,
          requer_documento: t.requer_documento ?? false,
          ordem: t.ordem,
        })))
        .select()
      setChecklistItems((inserted || []).sort((a, b) => a.ordem - b.ordem))
    } else {
      setChecklistItems([])
    }
  }

  async function loadAllStageStats() {
    const { data } = await supabase
      .from('checklist_items')
      .select('etapa, concluido')
      .eq('project_id', id)
    const stats = {}
    for (const item of data || []) {
      if (!stats[item.etapa]) stats[item.etapa] = { total: 0, done: 0 }
      stats[item.etapa].total++
      if (item.concluido) stats[item.etapa].done++
    }
    setStageStats(stats)
  }

  async function fetchPagamentos() {
    const { data } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('project_id', id)
      .order('data_pagamento', { ascending: true, nullsFirst: false })
    setPagamentos(data || [])
  }

  async function syncValorContrato(projectData) {
    if (projectData?.valor_contrato != null) return
    const { data } = await supabase
      .from('checklist_items')
      .select('dados')
      .eq('project_id', id)
      .eq('etapa', 'contrato')
      .eq('descricao', 'Valor contratual registrado')
      .eq('concluido', true)
      .maybeSingle()
    const raw = data?.dados?.valor
    if (!raw) return
    const valor = parseFloat(String(raw).replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return
    await supabase.from('projects').update({ valor_contrato: valor }).eq('id', id)
    setProject((p) => ({ ...p, valor_contrato: valor }))
  }

  async function salvarValorContrato() {
    const valor = parseFloat(valorInput.replace(',', '.'))
    if (isNaN(valor) || valor < 0) { toast.error('Valor inválido'); return }
    const { error } = await supabase.from('projects').update({ valor_contrato: valor }).eq('id', id)
    if (error) { toast.error('Erro ao salvar'); return }
    setProject((p) => ({ ...p, valor_contrato: valor }))
    setEditandoValor(false)
    toast.success('Valor do contrato atualizado')
  }

  async function adicionarPagamento() {
    const valor = parseFloat(formPagamento.valor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) { toast.error('Valor inválido'); return }
    if (!formPagamento.descricao.trim()) { toast.error('Informe uma descrição'); return }
    setSavingPagamento(true)
    const { error } = await supabase.from('pagamentos').insert({
      project_id: id,
      company_id: project.company_id,
      descricao: formPagamento.descricao.trim(),
      valor,
      data_pagamento: formPagamento.data_pagamento || null,
      forma_recebimento: formPagamento.forma_recebimento || null,
      destino: formPagamento.destino.trim() || null,
      criado_por: session.user.id,
    })
    setSavingPagamento(false)
    if (error) { toast.error('Erro: ' + error.message); return }
    setFormPagamento({ descricao: '', valor: '', data_pagamento: '', forma_recebimento: '', destino: '' })
    setModalPagamento(false)
    fetchPagamentos()
    toast.success('Pagamento registrado')
  }

  function abrirEditarPagamento(pag) {
    setFormEditPagamento({
      descricao: pag.descricao || '',
      valor: String(pag.valor).replace('.', ','),
      data_pagamento: pag.data_pagamento || '',
      forma_recebimento: pag.forma_recebimento || '',
      destino: pag.destino || '',
    })
    setEditandoPagamento(pag)
  }

  async function salvarEditPagamento() {
    const valor = parseFloat(formEditPagamento.valor.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) { toast.error('Valor inválido'); return }
    if (!formEditPagamento.descricao.trim()) { toast.error('Informe uma descrição'); return }
    setSavingEditPagamento(true)
    const { error } = await supabase.from('pagamentos').update({
      descricao: formEditPagamento.descricao.trim(),
      valor,
      data_pagamento: formEditPagamento.data_pagamento || null,
      forma_recebimento: formEditPagamento.forma_recebimento || null,
      destino: formEditPagamento.destino.trim() || null,
    }).eq('id', editandoPagamento.id)
    setSavingEditPagamento(false)
    if (error) { toast.error('Erro: ' + error.message); return }
    setEditandoPagamento(null)
    fetchPagamentos()
    toast.success('Pagamento atualizado')
  }

  async function fetchChecklist() {
    const etapa = selectedEtapa ?? project?.etapa_atual
    if (!etapa) return
    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('project_id', id)
      .eq('etapa', etapa)
      .order('ordem')
    setChecklistItems(data || [])
  }

  useEffect(() => {
    fetchProject().then((p) => {
      if (p) { loadStageChecklist(p.etapa_atual); syncValorContrato(p) }
      setLoading(false)
    })
    loadAllStageStats()
    fetchPagamentos()
    supabase.from('users').select('id, nome').eq('ativo', true).order('nome').then(({ data }) => setUsuarios(data || []))
  }, [id])

  async function handleDelete() {
    setDeleting(true)
    const { data: { session: s } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${s?.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ project_id: id }),
    })
    const result = await res.json()
    if (!res.ok) {
      toast.error('Erro ao excluir: ' + (result.error || res.statusText))
      setDeleting(false)
      return
    }
    toast.success('Projeto excluído.')
    navigate('/')
  }

  function handleAdvanceClick() {
    const pending = checklistItems.filter((i) => !i.concluido).length
    if (pending > 0) {
      setAdvanceModal(true)
    } else {
      handleAdvance()
    }
  }

  async function handleAdvance() {
    setAdvanceModal(false)
    setAdvancing(true)
    const currentIdx = ETAPA_INDEX[project.etapa_atual]
    if (currentIdx >= ETAPAS.length - 1) {
      toast('Projeto já está na última etapa.')
      setAdvancing(false)
      return
    }

    const nextEtapa = ETAPAS[currentIdx + 1].key
    const now = new Date().toISOString()

    // Concluir etapa atual em project_stages
    const { data: stages } = await supabase
      .from('project_stages')
      .select('id')
      .eq('project_id', id)
      .eq('etapa', project.etapa_atual)
      .is('concluida_em', null)
    if (stages?.length) {
      await supabase
        .from('project_stages')
        .update({ concluida_em: now, concluida_por: session.user.id })
        .eq('id', stages[0].id)
    }

    // Atualizar etapa do projeto
    const { error: updateErr } = await supabase
      .from('projects')
      .update({ etapa_atual: nextEtapa, atualizado_em: now })
      .eq('id', id)

    if (updateErr) {
      toast.error('Erro ao avançar etapa: ' + updateErr.message)
      setAdvancing(false)
      return
    }

    // Iniciar nova etapa em project_stages
    await supabase.from('project_stages').insert({ project_id: id, etapa: nextEtapa })

    // Popular checklist da nova etapa (ignorar duplicatas)
    const { data: templates } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('etapa', nextEtapa)
      .order('ordem')

    if (templates?.length) {
      // Buscar itens já existentes para evitar duplicatas
      const { data: existing } = await supabase
        .from('checklist_items')
        .select('descricao')
        .eq('project_id', id)
        .eq('etapa', nextEtapa)

      const existingDescs = new Set((existing || []).map((i) => i.descricao))
      const toInsert = templates
        .filter((t) => !existingDescs.has(t.descricao))
        .map((t) => ({
          project_id: id,
          etapa: nextEtapa,
          descricao: t.descricao,
          requer_documento: t.requer_documento ?? false,
          ordem: t.ordem,
        }))

      if (toInsert.length) {
        await supabase.from('checklist_items').insert(toInsert)
      }
    }

    // Log
    await supabase.from('activity_log').insert({
      project_id: id,
      usuario_id: session.user.id,
      acao: 'etapa_avancada',
      detalhe: `Etapa avançada de "${ETAPAS[currentIdx].label}" para "${ETAPAS[currentIdx + 1].label}"`,
    })

    toast.success(`Avançado para: ${ETAPAS[currentIdx + 1].label}`)
    // Forçar reload completo para garantir que todos os estados atualizem
    navigate(0)
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!project) return <div className="text-center py-20 text-gray-400">Projeto não encontrado.</div>

  const currentIdx = ETAPA_INDEX[project.etapa_atual]
  const isLast = currentIdx >= ETAPAS.length - 1
  const viewingCurrentEtapa = (selectedEtapa ?? project.etapa_atual) === project.etapa_atual
  const allDone = checklistItems.length > 0 && checklistItems.every((i) => i.concluido)

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Voltar
      </button>

      {/* Header do projeto */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {project.numero_orcamento && (
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  ORC: {project.numero_orcamento}
                </span>
              )}
              {project.numero_pedido && (
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                  PED: {project.numero_pedido}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{project.titulo}</h1>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 font-medium">{project.cliente}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {project.cliente_cpf_cnpj && (
                <span className="text-xs text-gray-500 font-mono">{project.cliente_cpf_cnpj}</span>
              )}
              {project.cliente_fone && (
                <a href={`https://wa.me/55${project.cliente_fone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                  className="text-xs text-green-600 hover:underline">
                  📱 {project.cliente_fone}
                </a>
              )}
              {project.cliente_email && (
                <a href={`mailto:${project.cliente_email}`}
                  className="text-xs text-blue-600 hover:underline">
                  ✉ {project.cliente_email}
                </a>
              )}
              {project.drive_pasta_url && (
                <a href={project.drive_pasta_url} target="_blank" rel="noreferrer"
                  className="text-xs text-gray-600 hover:text-blue-600 hover:underline font-medium">
                  📁 Pasta Drive
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <EtapaBadge etapa={project.etapa_atual} />
              <span className="text-xs text-gray-400 dark:text-gray-500">Responsável: {project.users?.nome ?? '—'}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 flex-shrink-0">
            {/* Círculo de progresso */}
            {(() => {
              const stageIdx = ETAPA_INDEX[project.etapa_atual] ?? 0
              const curStats = stageStats[project.etapa_atual]
              const partial = curStats?.total > 0 ? curStats.done / curStats.total : 0
              const pct = Math.min(100, Math.round(((stageIdx + partial) / ETAPAS.length) * 100))
              const color = pct === 100 ? '#22c55e' : pct >= 60 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#94a3b8'
              const r = 30, circ = 2 * Math.PI * r
              const dash = (pct / 100) * circ
              return (
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-20 h-20">
                    <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
                      <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
                      <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="8"
                        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 0.7s ease' }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none">{pct}%</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">Progresso</span>
                </div>
              )
            })()}
            <div className="flex items-center gap-2">
              {(canEdit || canDelete) && (
                <div className="relative">
                  <button
                    onClick={() => setActionMenu((v) => !v)}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    title="Mais ações"
                  >
                    <EllipsisVerticalIcon className="w-5 h-5" />
                  </button>
                  {actionMenu && (
                    <>
                      {/* backdrop para fechar ao clicar fora */}
                      <div className="fixed inset-0 z-10" onClick={() => setActionMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-[140px]">
                        {canEdit && (
                          <button
                            onClick={() => { setActionMenu(false); setEditModal(true) }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                            Editar
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => { setActionMenu(false); setDeleteModal(true) }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Excluir
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              {!isLast && (
                <button
                  onClick={handleAdvanceClick}
                  disabled={advancing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {advancing ? 'Avançando...' : 'Avançar etapa →'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Seletor de etapas clicável */}
        <div className="mt-5 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max pb-1">
            {ETAPAS.map((etapa, i) => {
              const stats = stageStats[etapa.key]
              const isFullyDone = stats && stats.total > 0 && stats.done === stats.total
              const isPartial = stats && stats.done > 0 && stats.done < stats.total
              const active = etapa.key === project.etapa_atual
              const selected = etapa.key === selectedEtapa

              let cls = ''
              if (selected) {
                if (isFullyDone) cls = 'bg-green-600 text-white border-green-600'
                else if (isPartial) cls = 'bg-amber-500 text-white border-amber-500'
                else if (active) cls = 'bg-blue-600 text-white border-blue-600'
                else cls = 'bg-gray-700 text-white border-gray-700'
              } else {
                if (isFullyDone) cls = 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                else if (isPartial) cls = 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                else if (active) cls = 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                else cls = 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }

              const prefix = !selected && isFullyDone ? '✓ ' : !selected && isPartial ? '◐ ' : ''
              return (
                <button
                  key={etapa.key}
                  onClick={() => { setTab('etapas'); loadStageChecklist(etapa.key) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${cls}`}
                >
                  {prefix}{etapa.label}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            Etapa atual: <strong>{ETAPAS[currentIdx]?.label}</strong> — toque em qualquer etapa para ver ou preencher
          </p>
        </div>
      </div>

      {/* Card financeiro */}
      {(() => {
        const totalRecebido = pagamentos.reduce((s, p) => s + Number(p.valor), 0)
        const saldo = (project.valor_contrato ?? 0) - totalRecebido
        const fmtBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        return (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
            {/* Cabeçalho colapsável */}
            <button
              type="button"
              onClick={() => setFinanceiroAberto((v) => { const n = !v; try { localStorage.setItem('financeiro_aberto', String(n)) } catch {} return n })}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-2">
                <BanknotesIcon className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Financeiro</span>
                {!financeiroAberto && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    {fmtBRL(totalRecebido)} recebido
                    {saldo > 0 ? ` · ${fmtBRL(saldo)} pendente` : ' · quitado'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {canEdit && financeiroAberto && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setModalPagamento(true) }}
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Registrar pagamento
                  </button>
                )}
                {financeiroAberto
                  ? <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                  : <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                }
              </div>
            </button>

            {financeiroAberto && <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">

            {/* Valor do contrato */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 w-32 flex-shrink-0">Valor do contrato</span>
              {editandoValor ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={valorInput}
                    onChange={(e) => setValorInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') salvarValorContrato(); if (e.key === 'Escape') setEditandoValor(false) }}
                    placeholder="0,00"
                    autoFocus
                    className="w-32 px-2 py-1 text-sm border border-blue-400 rounded-lg dark:bg-gray-800 dark:text-gray-100 focus:outline-none"
                  />
                  <button onClick={salvarValorContrato} className="text-xs text-blue-600 font-medium hover:underline">Salvar</button>
                  <button onClick={() => setEditandoValor(false)} className="text-xs text-gray-400 hover:underline">Cancelar</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {project.valor_contrato != null ? fmtBRL(Number(project.valor_contrato)) : <span className="text-gray-400 font-normal">Não informado</span>}
                  </span>
                  {canEdit && (
                    <button onClick={() => { setValorInput(project.valor_contrato != null ? String(project.valor_contrato).replace('.', ',') : ''); setEditandoValor(true) }}
                      className="text-gray-400 hover:text-blue-500 transition-colors">
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Lista de pagamentos */}
            {pagamentos.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {pagamentos.map((pag) => (
                  <div key={pag.id} className="py-2 px-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircleIcon className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{pag.descricao}</span>
                        {pag.data_pagamento && (
                          <span className="text-[11px] text-gray-400 flex-shrink-0">
                            {new Date(pag.data_pagamento + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400">{fmtBRL(Number(pag.valor))}</span>
                        {canEdit && (
                          <button onClick={() => abrirEditarPagamento(pag)} title="Editar lançamento"
                            className="p-0.5 text-gray-400 hover:text-blue-500 transition-colors">
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {(pag.forma_recebimento || pag.destino) && (
                      <div className="flex gap-3 mt-1 ml-5">
                        {pag.forma_recebimento && (
                          <span className="text-[11px] text-gray-400 capitalize">{pag.forma_recebimento.replace(/_/g, ' ')}</span>
                        )}
                        {pag.forma_recebimento && pag.destino && <span className="text-[11px] text-gray-300 dark:text-gray-600">·</span>}
                        {pag.destino && (
                          <span className="text-[11px] text-gray-400">{pag.destino}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Totais */}
            {project.valor_contrato != null && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="text-center">
                  <p className="text-[11px] text-gray-400 mb-0.5">Recebido</p>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">{fmtBRL(totalRecebido)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-gray-400 mb-0.5">Pendente</p>
                  <p className={`text-sm font-bold ${saldo > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>{fmtBRL(Math.max(0, saldo))}</p>
                </div>
                <div className="text-center col-span-2 sm:col-span-1">
                  <p className="text-[11px] text-gray-400 mb-0.5">Total contrato</p>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{fmtBRL(Number(project.valor_contrato))}</p>
                </div>
              </div>
            )}

            {pagamentos.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Nenhum pagamento registrado ainda.</p>
            )}
            </div>}
          </div>
        )
      })()}

      {/* Modal adicionar pagamento */}
      {modalPagamento && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Registrar pagamento</h2>
              <button onClick={() => setModalPagamento(false)}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descrição</label>
                <input
                  type="text"
                  value={formPagamento.descricao}
                  onChange={(e) => setFormPagamento((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Sinal, Parcela 1, Quitação..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Valor (R$)</label>
                <input
                  type="text"
                  value={formPagamento.valor}
                  onChange={(e) => setFormPagamento((f) => ({ ...f, valor: e.target.value }))}
                  placeholder="0,00"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data do pagamento</label>
                <input
                  type="date"
                  value={formPagamento.data_pagamento}
                  onChange={(e) => setFormPagamento((f) => ({ ...f, data_pagamento: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Forma de recebimento</label>
                <select
                  value={formPagamento.forma_recebimento}
                  onChange={(e) => setFormPagamento((f) => ({ ...f, forma_recebimento: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                  <option value="transferencia">Transferência bancária</option>
                  <option value="cheque">Cheque</option>
                  <option value="boleto">Boleto</option>
                  <option value="cartao_credito">Cartão de crédito</option>
                  <option value="cartao_debito">Cartão de débito</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Destino / utilização do valor</label>
                <input
                  type="text"
                  value={formPagamento.destino}
                  onChange={(e) => setFormPagamento((f) => ({ ...f, destino: e.target.value }))}
                  placeholder="Ex: Caixa, Fornecedor, Materiais..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalPagamento(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Cancelar
              </button>
              <button onClick={adicionarPagamento} disabled={savingPagamento}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
                {savingPagamento ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar pagamento */}
      {editandoPagamento && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Editar lançamento</h2>
              <button onClick={() => setEditandoPagamento(null)}><XMarkIcon className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descrição</label>
                <input type="text" value={formEditPagamento.descricao}
                  onChange={(e) => setFormEditPagamento((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Sinal, Parcela 1, Quitação..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Valor (R$)</label>
                <input type="text" value={formEditPagamento.valor}
                  onChange={(e) => setFormEditPagamento((f) => ({ ...f, valor: e.target.value }))}
                  placeholder="0,00"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data do pagamento</label>
                <input type="date" value={formEditPagamento.data_pagamento}
                  onChange={(e) => setFormEditPagamento((f) => ({ ...f, data_pagamento: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Forma de recebimento</label>
                <select value={formEditPagamento.forma_recebimento}
                  onChange={(e) => setFormEditPagamento((f) => ({ ...f, forma_recebimento: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                  <option value="transferencia">Transferência bancária</option>
                  <option value="cheque">Cheque</option>
                  <option value="boleto">Boleto</option>
                  <option value="cartao_credito">Cartão de crédito</option>
                  <option value="cartao_debito">Cartão de débito</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Destino / utilização do valor</label>
                <input type="text" value={formEditPagamento.destino}
                  onChange={(e) => setFormEditPagamento((f) => ({ ...f, destino: e.target.value }))}
                  placeholder="Ex: Caixa, Fornecedor, Materiais..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditandoPagamento(null)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Cancelar
              </button>
              <button onClick={salvarEditPagamento} disabled={savingEditPagamento}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
                {savingEditPagamento ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'etapas' && (
        <ChecklistTab
          projectId={id}
          etapa={selectedEtapa ?? project.etapa_atual}
          items={checklistItems}
          onUpdate={() => { fetchChecklist(); loadAllStageStats() }}
          project={project}
          isCurrentEtapa={(selectedEtapa ?? project.etapa_atual) === project.etapa_atual}
        />
      )}
      {tab === 'relatorio' && <RelatorioTab projectId={id} project={project} />}
      {tab === 'log' && <LogTab projectId={id} />}

      {editModal && (
        <ModalEditarProjeto
          project={project}
          usuarios={usuarios}
          session={session}
          onClose={() => setEditModal(false)}
          onSaved={fetchProject}
        />
      )}
      {deleteModal && (
        <ModalConfirmarExclusao
          project={project}
          loading={deleting}
          onClose={() => setDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}
      {advanceModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">Avançar etapa</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Há {checklistItems.filter((i) => !i.concluido).length} item(ns) pendente(s) no checklist.
              Deseja avançar mesmo assim?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setAdvanceModal(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdvance}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
              >
                Avançar mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
