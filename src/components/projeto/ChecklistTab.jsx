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
import { CHECKLIST_FIELDS } from '../../lib/checklistFields'
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

// ── Modal de formulário de dados ──────────────────────────────
function ModalDados({ item, onClose, onDone }) {
  const { session } = useAuth()
  const fields = CHECKLIST_FIELDS[item.descricao] || []
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

// ── Componente principal ──────────────────────────────────────
export default function ChecklistTab({ projectId, etapa, items, onUpdate }) {
  const { session } = useAuth()
  const [updating, setUpdating] = useState(null)
  const [anexoModal, setAnexoModal] = useState(null)
  const [dadosModal, setDadosModal] = useState(null)
  const [users, setUsers] = useState([])

  const done = items.filter((i) => i.concluido).length
  const total = items.length

  useEffect(() => {
    supabase.from('users').select('id, nome').eq('ativo', true).order('nome')
      .then(({ data }) => setUsers(data || []))
  }, [])

  function handleClick(item) {
    if (item.requer_documento && !item.concluido) {
      setAnexoModal(item); return
    }
    const fields = CHECKLIST_FIELDS[item.descricao]
    if (fields?.length && !item.concluido) {
      setDadosModal(item); return
    }
    // Desmarcar item simples (sem campos)
    if (item.concluido && !fields?.length && !item.requer_documento) {
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

            return (
              <div
                key={item.id}
                className={`rounded-xl border transition-colors ${
                  item.concluido ? 'bg-green-50 border-green-100' : 'bg-white border-gray-200'
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

      {anexoModal && (
        <ModalAnexo item={anexoModal} projectId={projectId} etapa={etapa}
          onClose={() => setAnexoModal(null)} onDone={onUpdate} />
      )}
      {dadosModal && (
        <ModalDados item={dadosModal}
          onClose={() => setDadosModal(null)} onDone={onUpdate} />
      )}
    </div>
  )
}
