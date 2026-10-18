import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, PencilSquareIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ETAPAS, ETAPA_INDEX } from '../lib/constants'
import EtapaBadge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import ChecklistTab from '../components/projeto/ChecklistTab'
import DocumentosTab from '../components/projeto/DocumentosTab'
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
    drive_pasta_url: project.drive_pasta_url ?? '',
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
      criado_por: 'Responsável', drive_pasta_url: 'Pasta Drive',
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Editar projeto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5" /></button>
        </div>

        {!confirmando ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nº orçamento</label>
                <input value={form.numero_orcamento} onChange={set('numero_orcamento')} placeholder="ORC-2024-001"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nº pedido / contrato</label>
                <input value={form.numero_pedido} onChange={set('numero_pedido')} placeholder="PED-2024-001"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Título *</label>
              <input value={form.titulo} onChange={set('titulo')} required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome do cliente *</label>
              <input value={form.cliente} onChange={set('cliente')} required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">CPF / CNPJ</label>
              <input value={form.cliente_cpf_cnpj} onChange={set('cliente_cpf_cnpj')} placeholder="000.000.000-00 ou 00.000.000/0001-00"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Telefone / WhatsApp</label>
                <input type="tel" value={form.cliente_fone} onChange={set('cliente_fone')} placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email do cliente</label>
                <input type="email" value={form.cliente_email} onChange={set('cliente_email')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Pasta no Google Drive (URL)</label>
              <input type="url" value={form.drive_pasta_url} onChange={set('drive_pasta_url')}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-0.5">Pasta específica deste projeto no Drive da empresa.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Responsável</label>
              <select value={form.criado_por} onChange={set('criado_por')}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={() => setConfirmando(true)} disabled={diff.length === 0}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                Revisar alterações
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-3">Confirme as alterações nos campos:</p>
            <ul className="mb-5 space-y-1">
              {diff.map((campo) => (
                <li key={campo} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  {campo}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-400 mb-5">Esta ação será registrada no log do projeto.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmando(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Voltar</button>
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <TrashIcon className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Excluir projeto</h2>
            <p className="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-1">Você está prestes a excluir:</p>
        <p className="text-sm font-semibold text-gray-900 mb-5">"{project.titulo}"</p>
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-5">
          Todos os dados, checklist e documentos deste projeto serão removidos permanentemente.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancelar</button>
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
  { key: 'documentos', label: 'Documentos' },
  { key: 'relatorio', label: 'Relatório' },
  { key: 'log', label: 'Log' },
]

export default function ProjetoDetalhe() {
  const { id } = useParams()
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [checklistItems, setChecklistItems] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [tab, setTab] = useState('etapas')
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [advanceModal, setAdvanceModal] = useState(false)

  const canEdit = ['administrador', 'supervisor', 'super_admin'].includes(profile?.perfil)
  const canDelete = ['administrador', 'super_admin'].includes(profile?.perfil)

  async function fetchProject() {
    const { data } = await supabase
      .from('projects')
      .select('*, users!criado_por(nome)')
      .eq('id', id)
      .single()
    setProject(data)
  }

  async function fetchChecklist() {
    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('project_id', id)
      .eq('etapa', project?.etapa_atual ?? '')
      .order('id')
    setChecklistItems(data || [])
  }

  useEffect(() => {
    fetchProject().then(() => setLoading(false))
    supabase.from('users').select('id, nome').eq('ativo', true).order('nome').then(({ data }) => setUsuarios(data || []))
  }, [id])

  useEffect(() => {
    if (project) fetchChecklist()
  }, [project?.etapa_atual])

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
  const allDone = checklistItems.length > 0 && checklistItems.every((i) => i.concluido)

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Voltar
      </button>

      {/* Header do projeto */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {project.numero_orcamento && (
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  ORC: {project.numero_orcamento}
                </span>
              )}
              {project.numero_pedido && (
                <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  PED: {project.numero_pedido}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{project.titulo}</h1>
            <p className="text-sm text-gray-700 mt-0.5 font-medium">{project.cliente}</p>
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
              <span className="text-xs text-gray-400">Responsável: {project.users?.nome ?? '—'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canEdit && (
              <button onClick={() => setEditModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                <PencilSquareIcon className="w-4 h-4" />
                Editar
              </button>
            )}
            {canDelete && (
              <button onClick={() => setDeleteModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition">
                <TrashIcon className="w-4 h-4" />
              </button>
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

        {/* Barra de progresso de etapas */}
        <div className="mt-5">
          <div className="flex items-center gap-1">
            {ETAPAS.map((etapa, i) => {
              const done = i < currentIdx
              const active = i === currentIdx
              return (
                <div key={etapa.key} className="flex items-center flex-1 min-w-0">
                  <div
                    title={etapa.label}
                    className={`h-2 rounded-full w-full transition-all ${
                      done ? 'bg-green-500' : active ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                  {i < ETAPAS.length - 1 && <div className="w-1 flex-shrink-0" />}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-400">Etapa {currentIdx + 1} de {ETAPAS.length}</span>
            <span className="text-xs text-gray-400">{Math.round((currentIdx / (ETAPAS.length - 1)) * 100)}% concluído</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
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
          etapa={project.etapa_atual}
          items={checklistItems}
          onUpdate={fetchChecklist}
          project={project}
        />
      )}
      {tab === 'documentos' && (
        <DocumentosTab projectId={id} etapa={project.etapa_atual} project={project} />
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-2">Avançar etapa</h2>
            <p className="text-sm text-gray-600 mb-5">
              Há {checklistItems.filter((i) => !i.concluido).length} item(ns) pendente(s) no checklist.
              Deseja avançar mesmo assim?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setAdvanceModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
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
