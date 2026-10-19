import { useEffect, useRef, useState } from 'react'
import {
  CheckCircleIcon,
  PaperClipIcon,
  DocumentArrowUpIcon,
  PencilSquareIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ETAPA_LABEL } from '../../lib/constants'
import { CHECKLIST_FIELDS, CHECKLIST_COPY_FROM_PROJECT } from '../../lib/checklistFields'
import toast from 'react-hot-toast'

// ── Modal de upload de documento obrigatório ──────────────────
function ModalAnexo({ item, projectId, etapa, onClose, onDone }) {
  const { session } = useAuth()
  const fileRef = useRef(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) { toast.error('Selecione um arquivo.'); return }
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${projectId}/${etapa}/${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(path, file, { upsert: false })

    if (upErr) { toast.error('Erro ao enviar: ' + upErr.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    await supabase.from('documents').insert({
      project_id: projectId, etapa,
      nome_arquivo: file.name, url_storage: publicUrl,
      enviado_por: session.user.id, checklist_item_id: item.id,
    })

    const now = new Date().toISOString()
    await supabase.from('checklist_items').update({
      concluido: true, concluido_por: session.user.id, concluido_em: now,
    }).eq('id', item.id)

    toast.success('Documento anexado e item confirmado!')
    onDone(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Anexar documento obrigatório</h2>
            <p className="text-sm text-gray-500 mt-0.5">{item.descricao}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleUpload} className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <DocumentArrowUpIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            {file
              ? <p className="text-sm font-medium text-blue-700">{file.name}</p>
              : <p className="text-sm text-gray-500">Clique para selecionar o arquivo</p>
            }
            <input ref={fileRef} type="file" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={uploading || !file}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
              {uploading ? 'Enviando...' : 'Confirmar OK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Campo de formulário genérico ──────────────────────────────
function Field({ field, value, onChange, users }) {
  const base = 'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  if (field.type === 'textarea') return (
    <textarea rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)}
      required={field.required} className={base + ' resize-none'} />
  )

  if (field.type === 'select') return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}
      required={field.required} className={base + ' bg-white'}>
      <option value=''>Selecione...</option>
      {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  if (field.type === 'user_select') return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}
      required={field.required} className={base + ' bg-white'}>
      <option value=''>Selecione...</option>
      {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
    </select>
  )

  if (field.type === 'currency') return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">R$</span>
      <input type="number" step="0.01" min="0" value={value || ''} onChange={(e) => onChange(e.target.value)}
        required={field.required} className={base + ' pl-9'} />
    </div>
  )

  return (
    <input type={field.type} value={value || ''} onChange={(e) => onChange(e.target.value)}
      required={field.required} className={base} />
  )
}

// ── Modal de orçamentos (múltiplos arquivos + formulário) ─────
function ModalOrcamentos({ item, projectId, etapa, onClose, onDone }) {
  const { session } = useAuth()
  const fileRef = useRef(null)
  const [docs, setDocs] = useState([])
  const [values, setValues] = useState(item.dados || {})
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('documents').select('*')
      .eq('checklist_item_id', item.id)
      .order('enviado_em')
      .then(({ data }) => setDocs(data || []))
  }, [])

  function set(key, val) { setValues((v) => ({ ...v, [key]: val })) }

  async function handleFileAdd(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${projectId}/${etapa}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: false })
    if (error) { toast.error('Erro ao enviar: ' + error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    const { data: doc } = await supabase.from('documents').insert({
      project_id: projectId, etapa,
      nome_arquivo: file.name, url_storage: publicUrl,
      enviado_por: session.user.id, checklist_item_id: item.id,
    }).select().single()
    setDocs((prev) => [...prev, doc])
    e.target.value = ''
    setUploading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('checklist_items').update({
      dados: values,
      concluido: true,
      concluido_por: session.user.id,
      concluido_em: new Date().toISOString(),
    }).eq('id', item.id)
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success('Orçamentos registrados!')
    onDone(); onClose()
  }

  const base = 'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">Orçamentos realizados</h2>
            <p className="text-xs text-gray-500 mt-0.5">Anexe os orçamentos e registre o aprovado</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Arquivos enviados */}
        <div className="mb-5">
          {docs.length > 0 && (() => {
            const aprovado = docs.find((d) => d.id === values.doc_aprovado_id)
            const outros = docs.filter((d) => d.id !== values.doc_aprovado_id)
            return (
              <div className="space-y-3 mb-3">
                {/* Orçamento aprovado em destaque */}
                {aprovado ? (
                  <div>
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">Orçamento aprovado</p>
                    <a href={aprovado.url_storage} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 px-4 py-3 bg-green-50 border-2 border-green-400 rounded-xl hover:bg-green-100 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                        <PaperClipIcon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-green-800 truncate flex-1 group-hover:underline">
                        {aprovado.nome_arquivo}
                      </span>
                      <span className="flex-shrink-0 text-[11px] font-bold text-green-700 bg-green-200 px-2 py-0.5 rounded-full">
                        ✓ APROVADO
                      </span>
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Selecione qual orçamento foi aprovado clicando em "Marcar aprovado"
                  </p>
                )}

                {/* Demais arquivos para consulta */}
                {outros.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      Arquivos para consulta ({outros.length})
                    </p>
                    <div className="space-y-1">
                      {outros.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                          <PaperClipIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <a href={d.url_storage} target="_blank" rel="noreferrer"
                            className="text-xs text-gray-500 hover:text-gray-800 hover:underline flex-1 truncate">
                            {d.nome_arquivo}
                          </a>
                          <button type="button"
                            onClick={() => set('doc_aprovado_id', d.id)}
                            className="flex-shrink-0 text-[11px] text-gray-400 hover:text-green-600 px-2 py-0.5 rounded border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors">
                            Marcar aprovado
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-xs text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Enviando...' : '+ Adicionar orçamento (PDF, imagem…)'}
          </button>
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            onChange={handleFileAdd} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor aprovado *</label>
            <input required value={values.fornecedor_aprovado || ''}
              onChange={(e) => set('fornecedor_aprovado', e.target.value)}
              placeholder="Nome do fornecedor selecionado"
              className={base} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor aprovado (R$) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">R$</span>
              <input required type="number" step="0.01" min="0" value={values.valor_aprovado || ''}
                onChange={(e) => set('valor_aprovado', e.target.value)}
                className={base + ' pl-9'} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de entrega prevista *</label>
            <input required type="date" value={values.data_entrega || ''}
              onChange={(e) => set('data_entrega', e.target.value)}
              className={base} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de compra *</label>
            <select required value={values.tipo_compra || ''}
              onChange={(e) => set('tipo_compra', e.target.value)}
              className={base + ' bg-white'}>
              <option value="">Selecione...</option>
              <option value="Totalidade do material">Totalidade do material</option>
              <option value="Compra parcial">Compra parcial</option>
            </select>
          </div>
          {values.tipo_compra === 'Compra parcial' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">O que está sendo comprado nesta ordem</label>
              <textarea rows={3} value={values.obs_compra || ''}
                onChange={(e) => set('obs_compra', e.target.value)}
                placeholder="Descreva os itens desta compra parcial..."
                className={base + ' resize-none'} />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
              {saving ? 'Salvando...' : 'Confirmar OK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal de formulário de dados ──────────────────────────────
function ModalDados({ item, project, onClose, onDone }) {
  const { session } = useAuth()
  const fields = CHECKLIST_FIELDS[item.descricao] || []
  const copyMap = CHECKLIST_COPY_FROM_PROJECT[item.descricao]
  const [values, setValues] = useState(item.dados || {})
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const needsUsers = fields.some((f) => f.type === 'user_select')
    if (needsUsers) {
      supabase.from('users').select('id, nome').eq('ativo', true).order('nome')
        .then(({ data }) => setUsers(data || []))
    }
  }, [])

  function set(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  function copiarDoCadastro() {
    if (!copyMap || !project) return
    setValues((prev) => {
      const next = { ...prev }
      for (const { key, projectField } of copyMap) {
        if (project[projectField]) next[key] = project[projectField]
      }
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const now = new Date().toISOString()
    const { error } = await supabase.from('checklist_items').update({
      dados: values,
      concluido: true,
      concluido_por: session.user.id,
      concluido_em: now,
    }).eq('id', item.id)

    if (error) { toast.error('Erro ao salvar: ' + error.message); setSaving(false); return }
    toast.success('Dados salvos e item confirmado!')
    onDone(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">{item.descricao}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Preencha os dados para confirmar este item</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {copyMap && project && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
            <p className="text-xs text-blue-700">
              Copiar nome, CPF/CNPJ e contato do cadastro inicial do projeto
            </p>
            <button
              type="button"
              onClick={copiarDoCadastro}
              className="ml-3 flex-shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md px-2.5 py-1 hover:bg-blue-100 transition"
            >
              Copiar do cadastro
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}{field.required && ' *'}
              </label>
              <Field field={field} value={values[field.key]} onChange={(v) => set(field.key, v)} users={users} />
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
              {saving ? 'Salvando...' : 'Confirmar OK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Resumo dos dados preenchidos ──────────────────────────────
function DadosResumo({ item, users }) {
  const [open, setOpen] = useState(false)
  const fields = CHECKLIST_FIELDS[item.descricao] || []
  const dados = item.dados || {}
  if (!fields.length || !Object.keys(dados).length) return null

  function display(field) {
    const v = dados[field.key]
    if (!v) return '—'
    if (field.type === 'user_select') return users.find((u) => u.id === v)?.nome ?? v
    if (field.type === 'currency') return `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    if (field.type === 'date') return new Date(v + 'T12:00:00').toLocaleDateString('pt-BR')
    return v
  }

  return (
    <div className="mt-2 ml-9">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        {open ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
        {open ? 'Ocultar dados' : 'Ver dados preenchidos'}
      </button>
      {open && (
        <div className="mt-2 bg-gray-50 rounded-lg p-3 space-y-1.5 border border-gray-100">
          {fields.map((f) => (
            <div key={f.key} className="flex gap-2 text-xs">
              <span className="text-gray-500 flex-shrink-0">{f.label}:</span>
              <span className="text-gray-800 font-medium">{display(f)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Verifica se algum campo de data com alertar_atraso está vencido
function isOverdue(item) {
  if (item.concluido) return false
  const fields = CHECKLIST_FIELDS[item.descricao] || []
  const dados = item.dados || {}
  return fields.some((f) => {
    if (!f.alertar_atraso || f.type !== 'date') return false
    const v = dados[f.key]
    if (!v) return false
    return new Date(v + 'T23:59:59') < new Date()
  })
}

// ── Componente principal ──────────────────────────────────────
export default function ChecklistTab({ projectId, etapa, items, onUpdate, project }) {
  const { session } = useAuth()
  const [updating, setUpdating] = useState(null)
  const [anexoModal, setAnexoModal] = useState(null)
  const [dadosModal, setDadosModal] = useState(null)
  const [orcamentosModal, setOrcamentosModal] = useState(null)
  const [users, setUsers] = useState([])

  const done = items.filter((i) => i.concluido).length
  const total = items.length

  useEffect(() => {
    supabase.from('users').select('id, nome').eq('ativo', true).order('nome')
      .then(({ data }) => setUsers(data || []))
  }, [])

  function handleClick(item) {
    if (item.descricao === 'Orçamentos realizados') {
      setOrcamentosModal(item); return
    }
    if (item.requer_documento && !item.concluido) {
      setAnexoModal(item); return
    }
    const fields = CHECKLIST_FIELDS[item.descricao]
    if (fields?.length && !item.concluido) {
      setDadosModal(item); return
    }
    // Toggle item simples (sem campos e sem documento)
    if (!fields?.length && !item.requer_documento) {
      toggleSimple(item)
    }
  }

  async function toggleSimple(item) {
    setUpdating(item.id)
    const now = new Date().toISOString()
    await supabase.from('checklist_items').update({
      concluido: !item.concluido,
      concluido_por: !item.concluido ? session.user.id : null,
      concluido_em: !item.concluido ? now : null,
    }).eq('id', item.id)
    await onUpdate()
    setUpdating(null)
  }

  function openEdit(item) {
    if (item.descricao === 'Orçamentos realizados') { setOrcamentosModal(item); return }
    if (item.requer_documento) { setAnexoModal(item); return }
    const fields = CHECKLIST_FIELDS[item.descricao]
    if (fields?.length) { setDadosModal(item); return }
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
          {items.map((item) => {
            const hasFields = !!(CHECKLIST_FIELDS[item.descricao]?.length)
            const hasDados = hasFields && Object.keys(item.dados || {}).length > 0
            const overdue = isOverdue(item)

            return (
              <div
                key={item.id}
                className={`rounded-xl border transition-colors ${
                  item.concluido
                    ? 'bg-green-50 border-green-100'
                    : overdue
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 p-4">
                  {/* Ícone / botão de status */}
                  <button
                    onClick={() => handleClick(item)}
                    disabled={updating === item.id}
                    className="flex-shrink-0 transition-colors disabled:opacity-50"
                  >
                    {item.concluido
                      ? <CheckCircleSolid className="w-6 h-6 text-green-500" />
                      : <CheckCircleIcon className="w-6 h-6 text-gray-300 hover:text-blue-500" />
                    }
                  </button>

                  {/* Descrição */}
                  <span className={`text-sm flex-1 ${item.concluido ? 'text-gray-500' : 'text-gray-800'}`}>
                    {item.descricao}
                  </span>

                  {/* Badges e ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {overdue && (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                        ⚠ Atrasado
                      </span>
                    )}
                    {item.requer_documento && (
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.concluido ? 'bg-green-100 text-green-600' : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}>
                        <PaperClipIcon className="w-3 h-3" />
                        {item.concluido ? 'Anexado' : 'Requer doc.'}
                      </span>
                    )}
                    {hasFields && !item.requer_documento && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.concluido ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}>
                        {item.concluido ? '✓ Preenchido' : 'Requer dados'}
                      </span>
                    )}
                    {item.concluido && (hasFields || item.requer_documento) && (
                      <button
                        onClick={() => openEdit(item)}
                        title="Editar"
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Resumo dos dados preenchidos */}
                {item.concluido && hasDados && (
                  <div className="px-4 pb-3">
                    <DadosResumo item={item} users={users} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {done === total && total > 0 && (
        <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 text-center font-medium">
          ✓ Todos os itens concluídos — você pode avançar para a próxima etapa
        </div>
      )}

      {orcamentosModal && (
        <ModalOrcamentos item={orcamentosModal} projectId={projectId} etapa={etapa}
          onClose={() => setOrcamentosModal(null)} onDone={onUpdate} />
      )}
      {anexoModal && (
        <ModalAnexo item={anexoModal} projectId={projectId} etapa={etapa}
          onClose={() => setAnexoModal(null)} onDone={onUpdate} />
      )}
      {dadosModal && (
        <ModalDados item={dadosModal} project={project}
          onClose={() => setDadosModal(null)} onDone={onUpdate} />
      )}
    </div>
  )
}
