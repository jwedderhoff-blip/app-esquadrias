import { useEffect, useRef, useState } from 'react'
import {
  CheckCircleIcon,
  PaperClipIcon,
  DocumentArrowUpIcon,
  PencilSquareIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ETAPA_LABEL } from '../../lib/constants'
import { CHECKLIST_FIELDS, CHECKLIST_COPY_FROM_PROJECT } from '../../lib/checklistFields'
import { syncToDrive } from '../../lib/syncDrive'
import toast from 'react-hot-toast'

// ── Modal de upload de documento obrigatório ──────────────────
function ModalAnexo({ item, projectId, etapa, project, onClose, onDone }) {
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

    const { data: newDoc } = await supabase.from('documents').insert({
      project_id: projectId, etapa,
      nome_arquivo: file.name, url_storage: publicUrl,
      enviado_por: session.user.id, checklist_item_id: item.id,
    }).select('id').single()

    if (newDoc) syncToDrive({ documentId: newDoc.id, urlStorage: publicUrl, fileName: file.name, mimeType: file.type, companyId: project?.company_id, projectTitulo: project?.titulo, etapa })

    const now = new Date().toISOString()
    await supabase.from('checklist_items').update({
      concluido: true, concluido_por: session.user.id, concluido_em: now,
    }).eq('id', item.id)

    toast.success('Documento anexado e item confirmado!')
    onDone(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Anexar documento obrigatório</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.descricao}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-4">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleUpload} className="space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <DocumentArrowUpIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            {file
              ? <p className="text-sm font-medium text-blue-700 dark:text-blue-400">{file.name}</p>
              : <p className="text-sm text-gray-500 dark:text-gray-400">Clique para selecionar o arquivo</p>
            }
            <input ref={fileRef} type="file" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
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
  const base = 'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  if (field.type === 'textarea') return (
    <textarea rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)}
      required={field.required} className={base + ' resize-none'} />
  )

  if (field.type === 'select') return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}
      required={field.required} className={base}>
      <option value=''>Selecione...</option>
      {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  if (field.type === 'user_select') return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}
      required={field.required} className={base}>
      <option value=''>Selecione...</option>
      {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
    </select>
  )

  if (field.type === 'currency') return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">R$</span>
      <input type="number" step="0.01" min="0" value={value || ''} onChange={(e) => onChange(e.target.value)}
        required={field.required} className={base + ' pl-9'} />
    </div>
  )

  if (field.type === 'boolean') return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        id={`chk-${field.key}`}
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <label htmlFor={`chk-${field.key}`} className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
        {value ? 'Sim — confirmado' : 'Ainda não confirmado'}
      </label>
    </div>
  )

  return (
    <input type={field.type} value={value || ''} onChange={(e) => onChange(e.target.value)}
      required={field.required} className={base} />
  )
}

// ── Modal de orçamentos → aprovação de compra ────────────────
function ModalOrcamentos({ item, projectId, etapa, project, onClose, onDone }) {
  const { session } = useAuth()
  const addDocRef = useRef(null)

  function initOrcamentos() {
    const d = item.dados || {}
    if (d.orcamentos) return d.orcamentos.filter((o) => o.fornecedor)
    // Migração: dados.compras (formato anterior)
    if (d.compras) return d.compras.filter((c) => c.fornecedor).map((c) => ({
      id: c.id, fornecedor: c.fornecedor,
      material: c.referencia_orcamento || '', valor: c.valor || '',
      arquivo_nome: '', arquivo_url: '',
      aprovado: true, aprovado_em: c.aprovado_em || null,
      data_entrega: c.data_entrega || '', tipo_compra: c.tipo_compra || '',
      percentual_compra: c.percentual_compra || '', obs_compra: c.obs_compra || '',
    }))
    // Migração: formato muito antigo
    if (d.fornecedor_aprovado) return [{
      id: `migrated-${Date.now()}`, fornecedor: d.fornecedor_aprovado,
      material: '', valor: d.valor_aprovado || '',
      arquivo_nome: '', arquivo_url: '',
      aprovado: true, aprovado_em: null,
      data_entrega: d.data_entrega || '', tipo_compra: d.tipo_compra || '',
      percentual_compra: d.percentual_compra || '', obs_compra: d.obs_compra || '',
    }]
    return []
  }

  const [orcamentos, setOrcamentos] = useState(initOrcamentos)
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [aprovandoId, setAprovandoId] = useState(null)
  const emptyOrc = { fornecedor: '', material: '', valor: '', arquivo_nome: '', arquivo_url: '' }
  const emptyAprov = { data_entrega: '', tipo_compra: '', percentual_compra: '', obs_compra: '' }
  const [form, setFormState] = useState(emptyOrc)
  const [aprovForm, setAprovForm] = useState(emptyAprov)
  const orcFileRefs = useRef({})

  useEffect(() => {
    supabase.from('documents').select('*')
      .eq('checklist_item_id', item.id)
      .order('enviado_em')
      .then(({ data }) => setDocs(data || []))
  }, [])

  function setFF(k, v) { setFormState((p) => ({ ...p, [k]: v })) }
  function setAF(k, v) { setAprovForm((p) => ({ ...p, [k]: v })) }

  function startAdd() { setFormState(emptyOrc); setEditingId(null); setShowForm(true); setAprovandoId(null) }
  function startEdit(orc) {
    setFormState({ fornecedor: orc.fornecedor, material: orc.material || '', valor: orc.valor || '', arquivo_nome: orc.arquivo_nome || '', arquivo_url: orc.arquivo_url || '' })
    setEditingId(orc.id); setShowForm(true); setAprovandoId(null)
  }
  function cancelForm() { setShowForm(false); setEditingId(null) }

  async function handleOrcFileAdd(orcId, e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${projectId}/${etapa}/orc-${orcId}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: false })
    if (error) { toast.error('Erro ao enviar: ' + error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    if (orcId === '__form__') {
      setFF('arquivo_nome', file.name); setFF('arquivo_url', publicUrl)
    } else {
      setOrcamentos((prev) => prev.map((o) => o.id === orcId ? { ...o, arquivo_nome: file.name, arquivo_url: publicUrl } : o))
    }
    e.target.value = ''
    setUploading(false)
  }

  async function removeOrcFile(orc) {
    if (!confirm(`Excluir "${orc.arquivo_nome}"?`)) return
    const storagePath = orc.arquivo_url?.split('/storage/v1/object/public/documents/')?.[1]
    if (storagePath) await supabase.storage.from('documents').remove([storagePath])
    setOrcamentos((prev) => prev.map((o) => o.id === orc.id ? { ...o, arquivo_nome: '', arquivo_url: '' } : o))
  }

  function saveForm() {
    if (!form.fornecedor) { toast.error('Informe o fornecedor.'); return }
    if (editingId) {
      setOrcamentos((prev) => prev.map((o) => o.id === editingId
        ? { ...o, fornecedor: form.fornecedor, material: form.material, valor: form.valor, arquivo_nome: form.arquivo_nome, arquivo_url: form.arquivo_url }
        : o))
    } else {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setOrcamentos((prev) => [...prev, { id, fornecedor: form.fornecedor, material: form.material, valor: form.valor, arquivo_nome: form.arquivo_nome, arquivo_url: form.arquivo_url, aprovado: false, aprovado_em: null, data_entrega: '', tipo_compra: '', percentual_compra: '', obs_compra: '' }])
    }
    setShowForm(false); setEditingId(null)
  }

  function removeOrcamento(id) { setOrcamentos((prev) => prev.filter((o) => o.id !== id)) }

  function startAprovar(id) {
    const orc = orcamentos.find((o) => o.id === id)
    setAprovForm({ data_entrega: orc.data_entrega || '', tipo_compra: orc.tipo_compra || '', percentual_compra: orc.percentual_compra || '', obs_compra: orc.obs_compra || '' })
    setAprovandoId(id); setShowForm(false); setEditingId(null)
  }
  function cancelAprovar() { setAprovandoId(null) }

  function confirmarAprovacao() {
    if (!aprovForm.data_entrega || !aprovForm.tipo_compra) { toast.error('Informe data prevista de entrega e tipo de compra.'); return }
    setOrcamentos((prev) => prev.map((o) => o.id === aprovandoId ? { ...o, aprovado: true, aprovado_em: new Date().toISOString(), ...aprovForm } : o))
    setAprovandoId(null)
  }

  function desaprovar(id) {
    setOrcamentos((prev) => prev.map((o) => o.id === id ? { ...o, aprovado: false, aprovado_em: null, data_entrega: '', tipo_compra: '', percentual_compra: '', obs_compra: '' } : o))
  }

  // Documentos gerais (anexos avulsos)
  async function handleGlobalFileAdd(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${projectId}/${etapa}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: false })
    if (error) { toast.error('Erro ao enviar: ' + error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    const { data: doc } = await supabase.from('documents').insert({
      project_id: projectId, etapa, nome_arquivo: file.name, url_storage: publicUrl,
      enviado_por: session.user.id, checklist_item_id: item.id,
    }).select().single()
    if (doc) syncToDrive({ documentId: doc.id, urlStorage: publicUrl, fileName: file.name, mimeType: file.type, companyId: project?.company_id, projectTitulo: project?.titulo, etapa })
    setDocs((prev) => [...prev, doc])
    e.target.value = ''
    setUploading(false)
  }

  async function handleGlobalFileDelete(doc) {
    if (!confirm(`Excluir "${doc.nome_arquivo}"?`)) return
    const storagePath = doc.url_storage?.split('/storage/v1/object/public/documents/')?.[1]
    if (storagePath) await supabase.storage.from('documents').remove([storagePath])
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocs((prev) => prev.filter((d) => d.id !== doc.id))
    toast.success('Documento excluído.')
  }

  async function handleGlobalFileReplace(doc, e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const storagePath = doc.url_storage?.split('/storage/v1/object/public/documents/')?.[1]
    if (storagePath) await supabase.storage.from('documents').remove([storagePath])
    const ext = file.name.split('.').pop()
    const path = `${projectId}/${etapa}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: false })
    if (error) { toast.error('Erro ao enviar: ' + error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    await supabase.from('documents').update({ nome_arquivo: file.name, url_storage: publicUrl }).eq('id', doc.id)
    setDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, nome_arquivo: file.name, url_storage: publicUrl } : d))
    e.target.value = ''
    setUploading(false)
    toast.success('Documento substituído.')
  }

  async function handleSave() {
    if (orcamentos.length === 0) { toast.error('Registre ao menos um orçamento.'); return }
    const aprovados = orcamentos.filter((o) => o.aprovado)
    if (aprovados.length === 0) { toast.error('Aprove ao menos um orçamento antes de confirmar.'); return }
    setSaving(true)
    const compras = aprovados.map((o) => ({
      id: o.id, fornecedor: o.fornecedor, referencia_orcamento: o.material,
      valor: o.valor, data_entrega: o.data_entrega, tipo_compra: o.tipo_compra,
      percentual_compra: o.percentual_compra, obs_compra: o.obs_compra,
    }))
    const { error } = await supabase.from('checklist_items').update({
      dados: { orcamentos, compras },
      concluido: true,
      concluido_por: session.user.id,
      concluido_em: new Date().toISOString(),
    }).eq('id', item.id)
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success('Orçamentos registrados!')
    onDone(); onClose()
  }

  const base = 'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const aprovados = orcamentos.filter((o) => o.aprovado).length

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Orçamentos e compras</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Adicione os orçamentos recebidos, depois aprove os selecionados como compra.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-4 flex-shrink-0">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Lista de orçamentos ─── */}
        <div className="space-y-3 mb-4">
          {orcamentos.map((orc) => (
            <div key={orc.id} className={`rounded-xl border transition-colors ${
              orc.aprovado
                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}>
              {/* Linha principal */}
              <div className="flex items-start gap-2 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{orc.fornecedor}</p>
                    {orc.aprovado && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        ✓ Aprovado
                      </span>
                    )}
                  </div>
                  {orc.material && <p className="text-xs text-blue-600 dark:text-blue-400 truncate mt-0.5">{orc.material}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {orc.valor && <span>R$ {parseFloat(orc.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                    {orc.aprovado && orc.data_entrega && (
                      <span>Entrega prev.: {new Date(orc.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    )}
                    {orc.aprovado && orc.tipo_compra && (
                      <span>{orc.tipo_compra}{orc.percentual_compra ? ` (${orc.percentual_compra}%)` : ''}</span>
                    )}
                  </div>
                  {/* Documento do orçamento */}
                  {orc.arquivo_url ? (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <PaperClipIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <a href={orc.arquivo_url} target="_blank" rel="noreferrer"
                        className="text-xs text-gray-500 dark:text-gray-400 hover:underline truncate flex-1">{orc.arquivo_nome}</a>
                      <button type="button" title="Substituir"
                        onClick={() => { orcFileRefs.current[orc.id]?.click() }}
                        className="text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0">
                        <ArrowPathIcon className="w-3 h-3" />
                      </button>
                      <button type="button" title="Excluir doc" onClick={() => removeOrcFile(orc)}
                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => orcFileRefs.current[orc.id]?.click()}
                      className="mt-1.5 text-xs text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1">
                      <PaperClipIcon className="w-3 h-3" /> Anexar documento
                    </button>
                  )}
                  <input
                    ref={(el) => { orcFileRefs.current[orc.id] = el }}
                    type="file" className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={(e) => handleOrcFileAdd(orc.id, e)}
                  />
                </div>
                {/* Botões ação */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!orc.aprovado && (
                    <button type="button" onClick={() => startAprovar(orc.id)}
                      title="Aprovar como compra"
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
                      Aprovar
                    </button>
                  )}
                  {orc.aprovado && (
                    <button type="button" onClick={() => desaprovar(orc.id)}
                      title="Desfazer aprovação"
                      className="text-gray-300 hover:text-amber-500 transition-colors">
                      <ArrowPathIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button type="button" onClick={() => startEdit(orc)}
                    className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => removeOrcamento(orc.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Formulário de aprovação inline */}
              {aprovandoId === orc.id && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-3 bg-blue-50 dark:bg-blue-900/10 rounded-b-xl">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Dados da compra aprovada</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Previsão de entrega *</label>
                      <input type="date" value={aprovForm.data_entrega}
                        onChange={(e) => setAF('data_entrega', e.target.value)} className={base} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de compra *</label>
                      <select value={aprovForm.tipo_compra} onChange={(e) => setAF('tipo_compra', e.target.value)} className={base}>
                        <option value="">Selecione...</option>
                        <option value="Totalidade do material">Totalidade do material</option>
                        <option value="Compra parcial">Compra parcial</option>
                      </select>
                    </div>
                  </div>
                  {aprovForm.tipo_compra === 'Compra parcial' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Percentual (%)</label>
                        <div className="relative">
                          <input type="number" min="1" max="100" value={aprovForm.percentual_compra}
                            onChange={(e) => setAF('percentual_compra', e.target.value)} className={base + ' pr-9'} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">O que será comprado</label>
                        <input value={aprovForm.obs_compra} onChange={(e) => setAF('obs_compra', e.target.value)}
                          placeholder="Descreva..." className={base} />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={cancelAprovar}
                      className="flex-1 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      Cancelar
                    </button>
                    <button type="button" onClick={confirmarAprovacao}
                      className="flex-1 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition">
                      ✓ Confirmar aprovação
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {orcamentos.length === 0 && !showForm && (
            <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
              Nenhum orçamento registrado. Adicione ao menos um.
            </p>
          )}
        </div>

        {/* Formulário novo/editar orçamento */}
        {showForm ? (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {editingId ? 'Editar orçamento' : 'Novo orçamento'}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fornecedor *</label>
              <input value={form.fornecedor} onChange={(e) => setFF('fornecedor', e.target.value)}
                placeholder="Nome do fornecedor" className={base} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material / referência <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input value={form.material} onChange={(e) => setFF('material', e.target.value)}
                placeholder="Ex.: vidros temperados 8mm, perfis de alumínio..." className={base} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor do orçamento (R$) <span className="text-gray-400 font-normal">(opcional)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">R$</span>
                <input type="number" step="0.01" min="0" value={form.valor}
                  onChange={(e) => setFF('valor', e.target.value)} className={base + ' pl-9'} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Documento do orçamento <span className="text-gray-400 font-normal">(opcional)</span></label>
              {form.arquivo_url ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <PaperClipIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">{form.arquivo_nome}</span>
                  <button type="button" onClick={() => { setFF('arquivo_nome', ''); setFF('arquivo_url', '') }}
                    className="text-gray-400 hover:text-red-500 transition-colors">
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" disabled={uploading}
                  onClick={() => orcFileRefs.current['__form__']?.click()}
                  className="w-full border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg py-2 text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors disabled:opacity-50">
                  {uploading ? 'Enviando...' : '+ Anexar PDF ou imagem'}
                </button>
              )}
              <input
                ref={(el) => { orcFileRefs.current['__form__'] = el }}
                type="file" className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={(e) => handleOrcFileAdd('__form__', e)}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={cancelForm}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Cancelar
              </button>
              <button type="button" onClick={saveForm}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                Salvar orçamento
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={startAdd}
            className="w-full mb-4 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl py-3 text-xs text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            + Adicionar orçamento recebido
          </button>
        )}

        {/* Documentos gerais */}
        {docs.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Outros documentos</p>
            <div className="space-y-1.5">
              {docs.map((d) => {
                const replaceRef = { current: null }
                return (
                  <div key={d.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg group">
                    <PaperClipIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <a href={d.url_storage} target="_blank" rel="noreferrer"
                      className="text-xs text-gray-600 dark:text-gray-400 hover:underline flex-1 truncate">{d.nome_arquivo}</a>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button type="button" title="Substituir" onClick={() => replaceRef.current?.click()}
                        className="text-gray-400 hover:text-blue-500 transition-colors">
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" title="Excluir" onClick={() => handleGlobalFileDelete(d)}
                        className="text-gray-400 hover:text-red-500 transition-colors">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input ref={replaceRef} type="file" className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      onChange={(e) => handleGlobalFileReplace(d, e)} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
        <button type="button" onClick={() => addDocRef.current?.click()} disabled={uploading}
          className="w-full mb-5 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl py-2.5 text-xs text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50">
          {uploading ? 'Enviando...' : '+ Adicionar outro documento'}
        </button>
        <input ref={addDocRef} type="file" className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={handleGlobalFileAdd} />

        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving || aprovados === 0}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
            {saving ? 'Salvando...' : `Confirmar${aprovados > 0 ? ` (${aprovados} aprovado${aprovados > 1 ? 's' : ''})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de recebimento de material (por compra) ─────────────
function ModalRecebimento({ item, orcamentoItem, onClose, onDone }) {
  const { session } = useAuth()
  const compras = orcamentoItem?.dados?.orcamentos
    ? orcamentoItem.dados.orcamentos.filter((o) => o.fornecedor && o.aprovado)
    : (orcamentoItem?.dados?.compras || []).filter((c) => c.fornecedor)
  const [recebimentos, setRecebimentos] = useState(item.dados?.recebimentos || [])
  const [saving, setSaving] = useState(false)

  function getRec(compraId) {
    return recebimentos.find((r) => r.compra_id === compraId)
  }

  function toggleRec(compraId) {
    const existing = getRec(compraId)
    if (existing) {
      setRecebimentos((prev) => prev.map((r) =>
        r.compra_id === compraId ? { ...r, recebido: !r.recebido } : r
      ))
    } else {
      setRecebimentos((prev) => [...prev, {
        compra_id: compraId, recebido: true,
        data_recebimento: new Date().toISOString().split('T')[0], obs: '',
      }])
    }
  }

  function setRecField(compraId, field, value) {
    setRecebimentos((prev) => prev.map((r) =>
      r.compra_id === compraId ? { ...r, [field]: value } : r
    ))
  }

  async function handleSave() {
    setSaving(true)
    const allRecebidos = compras.length > 0 && compras.every((c) => getRec(c.id)?.recebido)
    const { error } = await supabase.from('checklist_items').update({
      dados: { recebimentos },
      concluido: allRecebidos,
      concluido_por: allRecebidos ? session.user.id : null,
      concluido_em: allRecebidos ? new Date().toISOString() : null,
    }).eq('id', item.id)
    if (error) { toast.error('Erro: ' + error.message); setSaving(false); return }
    toast.success('Recebimentos atualizados!')
    onDone(); onClose()
  }

  const base = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  if (!compras.length) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Material recebido e conferido</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-4">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            Nenhuma compra registrada em "Orçamentos realizados". Registre as compras primeiro.
          </p>
          <button type="button" onClick={onClose}
            className="mt-4 w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Material recebido e conferido</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Confirme o recebimento de cada compra</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-4 flex-shrink-0">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {compras.map((compra) => {
            const rec = getRec(compra.id)
            const recebido = rec?.recebido ?? false
            return (
              <div key={compra.id} className={`rounded-xl border p-4 ${recebido ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => toggleRec(compra.id)} className="flex-shrink-0 mt-0.5 transition-colors">
                    {recebido
                      ? <CheckCircleSolid className="w-5 h-5 text-green-500 dark:text-green-400" />
                      : <CheckCircleIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 hover:text-blue-500" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{compra.fornecedor}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {compra.valor && <span>R$ {parseFloat(compra.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                      {compra.data_entrega && <span>Prev.: {new Date(compra.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                      {compra.tipo_compra && <span>{compra.tipo_compra}{compra.percentual_compra ? ` (${compra.percentual_compra}%)` : ''}</span>}
                    </div>
                    {compra.obs_compra && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{compra.obs_compra}</p>}
                    {recebido && (
                      <div className="mt-3 space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data de recebimento</label>
                          <input type="date" value={rec?.data_recebimento || ''}
                            onChange={(e) => setRecField(compra.id, 'data_recebimento', e.target.value)} className={base} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Observações</label>
                          <textarea rows={2} value={rec?.obs || ''}
                            onChange={(e) => setRecField(compra.id, 'obs', e.target.value)}
                            placeholder="Ex: sem avarias, conferido com NF..."
                            className={base + ' resize-none'} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-3 mt-5">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de pedido unificado ────────────────────────────────
function ModalPedido({ items, projectId, etapa, project, onClose, onDone }) {
  const { session } = useAuth()
  const fileRef = useRef(null)

  const itemDados = items.find((i) => i.descricao === 'Dados complementares do cliente e endereço da obra')
  const itemDescricao = items.find((i) => i.descricao === 'Descrição do produto solicitado')
  const itemPrazo = items.find((i) => i.descricao === 'Prazo solicitado pelo cliente')
  const itemResp = items.find((i) => i.descricao === 'Responsável interno atribuído')

  const [dadosCliente, setDadosCliente] = useState(itemDados?.dados || {})
  const [prazo, setPrazo] = useState(itemPrazo?.dados?.prazo || '')
  const [responsavelId, setResponsavelId] = useState(itemResp?.dados?.responsavel_id || '')
  const [vendedorId, setVendedorId] = useState(itemDados?.dados?.vendedor_id || '')
  const [existingDoc, setExistingDoc] = useState(null)
  const [file, setFile] = useState(null)
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const base = 'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const clienteFields = CHECKLIST_FIELDS['Dados complementares do cliente e endereço da obra'] || []

  useEffect(() => {
    supabase.from('users').select('id, nome').eq('ativo', true).order('nome')
      .then(({ data }) => setUsers(data || []))
    if (itemDescricao) {
      supabase.from('documents').select('*')
        .eq('checklist_item_id', itemDescricao.id)
        .order('enviado_em', { ascending: false })
        .limit(1)
        .then(({ data }) => setExistingDoc(data?.[0] ?? null))
    }
  }, [])

  function setDado(key, val) { setDadosCliente((prev) => ({ ...prev, [key]: val })) }

  // persiste vendedor junto aos dados do cliente
  function setVendedor(val) {
    setVendedorId(val)
    setDadosCliente((prev) => ({ ...prev, vendedor_id: val }))
  }

  function copiarDoCadastro() {
    if (!project) return
    const map = CHECKLIST_COPY_FROM_PROJECT['Dados complementares do cliente e endereço da obra']
    if (!map) return
    setDadosCliente((prev) => {
      const next = { ...prev }
      for (const { key, projectField } of map) {
        if (project[projectField]) next[key] = project[projectField]
      }
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const now = new Date().toISOString()

    if (file && itemDescricao) {
      setUploading(true)
      const ext = file.name.split('.').pop()
      const path = `${projectId}/${etapa}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: false })
      if (upErr) { toast.error('Erro ao enviar: ' + upErr.message); setSaving(false); setUploading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      const { data: newDocP } = await supabase.from('documents').insert({
        project_id: projectId, etapa,
        nome_arquivo: file.name, url_storage: publicUrl,
        enviado_por: session.user.id, checklist_item_id: itemDescricao.id,
      }).select('id').single()
      if (newDocP) syncToDrive({ documentId: newDocP.id, urlStorage: publicUrl, fileName: file.name, mimeType: file.type, companyId: project?.company_id, projectTitulo: project?.titulo, etapa })
      setUploading(false)
    }

    const updates = []
    if (itemDados) {
      const hasData = Object.values(dadosCliente).some((v) => v)
      updates.push(supabase.from('checklist_items').update({
        dados: dadosCliente,
        concluido: hasData,
        concluido_por: hasData ? session.user.id : null,
        concluido_em: hasData ? now : null,
      }).eq('id', itemDados.id))
    }
    if (itemPrazo) {
      updates.push(supabase.from('checklist_items').update({
        dados: { prazo },
        concluido: !!prazo,
        concluido_por: prazo ? session.user.id : null,
        concluido_em: prazo ? now : null,
      }).eq('id', itemPrazo.id))
    }
    if (itemResp) {
      updates.push(supabase.from('checklist_items').update({
        dados: { responsavel_id: responsavelId },
        concluido: !!responsavelId,
        concluido_por: responsavelId ? session.user.id : null,
        concluido_em: responsavelId ? now : null,
      }).eq('id', itemResp.id))
    }
    if (itemDescricao && (file || existingDoc)) {
      updates.push(supabase.from('checklist_items').update({
        concluido: true, concluido_por: session.user.id, concluido_em: now,
      }).eq('id', itemDescricao.id))
    }

    await Promise.all(updates)
    toast.success('Pedido registrado!')
    onDone(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Informações do pedido</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Cliente, prazo, responsável e descrição do produto</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-4 flex-shrink-0">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Prazo, Responsável e Vendedor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prazo solicitado</label>
              <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className={base} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsável pelo andamento</label>
              <select value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} className={base}>
                <option value="">Selecione...</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendedor</label>
            <select value={vendedorId} onChange={(e) => setVendedor(e.target.value)} className={base}>
              <option value="">Selecione...</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>

          {/* Dados do cliente */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Dados do cliente e endereço da obra</p>
              {project && (
                <button type="button" onClick={copiarDoCadastro}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-md px-2 py-0.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">
                  Copiar do cadastro
                </button>
              )}
            </div>
            <div className="space-y-3">
              {clienteFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                  <input type="text" value={dadosCliente[field.key] || ''}
                    onChange={(e) => setDado(field.key, e.target.value)} className={base} />
                </div>
              ))}
            </div>
          </div>

          {/* Descrição do produto */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Descrição do produto solicitado</p>
            {existingDoc && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl mb-2">
                <PaperClipIcon className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <a href={existingDoc.url_storage} target="_blank" rel="noreferrer"
                  className="text-xs font-medium text-green-700 dark:text-green-400 hover:underline flex-1 truncate">
                  {existingDoc.nome_arquivo}
                </a>
                <span className="text-[10px] font-bold text-green-600 dark:text-green-400 flex-shrink-0">✓ Atual</span>
              </div>
            )}
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <DocumentArrowUpIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              {file
                ? <p className="text-sm font-medium text-blue-700 dark:text-blue-400">{file.name}</p>
                : <p className="text-sm text-gray-500 dark:text-gray-400">
                    {existingDoc ? 'Clique para substituir o arquivo' : 'Clique para selecionar o arquivo'}
                  </p>
              }
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">PDF, imagem, Word...</p>
            </div>
            <input ref={fileRef} type="file" className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving || uploading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
              {uploading ? 'Enviando...' : saving ? 'Salvando...' : 'Confirmar OK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal de contrato unificado ──────────────────────────────
function ModalContrato({ items, projectId, etapa, project, onClose, onDone }) {
  const { session } = useAuth()
  const fileRef = useRef(null)

  const itemAnexo = items.find((i) => i.descricao === 'Contrato em PDF anexado')
  const itemDataAssin = items.find((i) => i.descricao === 'Data de assinatura registrada')
  const itemValorContr = items.find((i) => i.descricao === 'Valor contratual registrado')

  const [existingDoc, setExistingDoc] = useState(null)
  const [file, setFile] = useState(null)
  const [dataAssinatura, setDataAssinatura] = useState(itemDataAssin?.dados?.data_assinatura || '')
  const [valor, setValor] = useState(itemValorContr?.dados?.valor || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  // URL já salva no item (acesso direto sem query extra)
  const savedUrl = itemAnexo?.dados?.url_storage ?? null

  const base = 'w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  useEffect(() => {
    if (!itemAnexo) return
    async function loadDoc() {
      const { data: d1 } = await supabase.from('documents').select('*')
        .eq('checklist_item_id', itemAnexo.id)
        .order('enviado_em', { ascending: false }).limit(1)
      if (d1?.[0]) { setExistingDoc(d1[0]); return }
      // Fallback: documentos antigos sem checklist_item_id
      const { data: d2 } = await supabase.from('documents').select('*')
        .eq('project_id', projectId).eq('etapa', etapa)
        .order('enviado_em', { ascending: false }).limit(1)
      setExistingDoc(d2?.[0] ?? null)
    }
    loadDoc()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!existingDoc && !file) { toast.error('Selecione o arquivo do contrato.'); return }
    setSaving(true)
    const now = new Date().toISOString()
    let contratoUploadedUrl = null

    if (file) {
      setUploading(true)
      const ext = file.name.split('.').pop()
      const path = `${projectId}/${etapa}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: false })
      if (upErr) { toast.error('Erro ao enviar: ' + upErr.message); setSaving(false); setUploading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      contratoUploadedUrl = publicUrl
      const { data: newDocC } = await supabase.from('documents').insert({
        project_id: projectId, etapa,
        nome_arquivo: file.name, url_storage: publicUrl,
        enviado_por: session.user.id, checklist_item_id: itemAnexo.id,
      }).select('id').single()
      if (newDocC) syncToDrive({ documentId: newDocC.id, urlStorage: publicUrl, fileName: file.name, mimeType: file.type, companyId: project?.company_id, projectTitulo: project?.titulo, etapa })
      setUploading(false)
    }

    const updates = []
    if (itemAnexo) {
      updates.push(supabase.from('checklist_items').update({
        dados: { url_storage: contratoUploadedUrl || existingDoc?.url_storage || null },
        concluido: true, concluido_por: session.user.id, concluido_em: now,
      }).eq('id', itemAnexo.id))
    }
    if (itemDataAssin) {
      updates.push(supabase.from('checklist_items').update({
        dados: { data_assinatura: dataAssinatura },
        concluido: !!dataAssinatura,
        concluido_por: dataAssinatura ? session.user.id : null,
        concluido_em: dataAssinatura ? now : null,
      }).eq('id', itemDataAssin.id))
    }
    if (itemValorContr) {
      updates.push(supabase.from('checklist_items').update({
        dados: { valor },
        concluido: !!valor,
        concluido_por: valor ? session.user.id : null,
        concluido_em: valor ? now : null,
      }).eq('id', itemValorContr.id))
    }
    await Promise.all(updates)
    toast.success('Contrato registrado!')
    onDone(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Contrato assinado</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Registre os dados e anexe o contrato em PDF</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-4 flex-shrink-0">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Acesso rápido ao arquivo quando já existe */}
        {(savedUrl || existingDoc?.url_storage) && (
          <a
            href={savedUrl || existingDoc.url_storage}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-3 mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl text-sm font-semibold text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition"
          >
            <PaperClipIcon className="w-4 h-4 flex-shrink-0" />
            Abrir contrato anexado
          </a>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de assinatura *</label>
            <input type="date" required value={dataAssinatura} onChange={(e) => setDataAssinatura(e.target.value)} className={base} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor contratual (R$) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">R$</span>
              <input type="number" step="0.01" min="0" required value={valor}
                onChange={(e) => setValor(e.target.value)} className={base + ' pl-9'} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Arquivo do contrato *</label>
            {existingDoc && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl mb-2">
                <PaperClipIcon className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <a href={existingDoc.url_storage} target="_blank" rel="noreferrer"
                  className="text-xs font-medium text-green-700 dark:text-green-400 hover:underline flex-1 truncate">
                  {existingDoc.nome_arquivo}
                </a>
                <span className="text-[10px] font-bold text-green-600 dark:text-green-400 flex-shrink-0">✓ Arquivo atual</span>
              </div>
            )}
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <DocumentArrowUpIcon className="w-7 h-7 text-gray-400 mx-auto mb-1.5" />
              {file
                ? <p className="text-sm font-medium text-blue-700 dark:text-blue-400">{file.name}</p>
                : <p className="text-sm text-gray-500 dark:text-gray-400">
                    {existingDoc ? 'Clique para substituir o contrato' : 'Clique para selecionar o contrato'}
                  </p>
              }
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">PDF, Word, imagem...</p>
            </div>
            <input ref={fileRef} type="file" className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving || uploading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
              {uploading ? 'Enviando...' : saving ? 'Salvando...' : 'Confirmar OK'}
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{item.descricao}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Preencha os dados para confirmar este item</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-4 flex-shrink-0">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {copyMap && project && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg flex items-center justify-between">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Copiar nome, CPF/CNPJ e contato do cadastro inicial do projeto
            </p>
            <button
              type="button"
              onClick={copiarDoCadastro}
              className="ml-3 flex-shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-md px-2.5 py-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
            >
              Copiar do cadastro
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {field.label}{field.required && ' *'}
              </label>
              <Field field={field} value={values[field.key]} onChange={(v) => set(field.key, v)} users={users} />
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
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
    if (field.type === 'boolean') return v ? '✓ Confirmado' : '—'
    if (v === undefined || v === null || v === '') return '—'
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
        <div className="mt-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1.5 border border-gray-100 dark:border-gray-700">
          {fields.map((f) => (
            <div key={f.key} className="flex gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{f.label}:</span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">{display(f)}</span>
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
  if (item.descricao === 'Orçamentos realizados') {
    const compras = item.dados?.compras || []
    return compras.some((c) => c.data_entrega && new Date(c.data_entrega + 'T23:59:59') < new Date())
  }
  const fields = CHECKLIST_FIELDS[item.descricao] || []
  const dados = item.dados || {}
  return fields.some((f) => {
    if (!f.alertar_atraso || f.type !== 'date') return false
    const v = dados[f.key]
    if (!v) return false
    return new Date(v + 'T23:59:59') < new Date()
  })
}

const CONTRACT_DESCS = ['Contrato em PDF anexado', 'Data de assinatura registrada', 'Valor contratual registrado']
const PEDIDO_DESCS = [
  'Dados complementares do cliente e endereço da obra',
  'Descrição do produto solicitado',
  'Prazo solicitado pelo cliente',
  'Responsável interno atribuído',
]

// ── Componente principal ──────────────────────────────────────
export default function ChecklistTab({ projectId, etapa, items, onUpdate, project }) {
  const { session } = useAuth()
  const [updating, setUpdating] = useState(null)
  const [anexoModal, setAnexoModal] = useState(null)
  const [dadosModal, setDadosModal] = useState(null)
  const [orcamentosModal, setOrcamentosModal] = useState(null)
  const [recebimentoModal, setRecebimentoModal] = useState(null)
  const [contratoModal, setContratoModal] = useState(false)
  const [pedidoModal, setPedidoModal] = useState(false)
  const [users, setUsers] = useState([])
  const [contratoDocUrl, setContratoDocUrl] = useState(null)
  const [contratoDocLoading, setContratoDocLoading] = useState(false)

  const done = items.filter((i) => i.concluido).length
  const total = items.length

  // Contract items grouped
  const contratoItems = items.filter((i) => CONTRACT_DESCS.includes(i.descricao))
  const contratoAllDone = contratoItems.length > 0 && contratoItems.every((i) => i.concluido)
  const contratoPartial = contratoItems.some((i) => i.concluido) && !contratoAllDone
  const itemAnexoCard = contratoItems.find((i) => i.descricao === 'Contrato em PDF anexado')
  const itemDataCard = contratoItems.find((i) => i.descricao === 'Data de assinatura registrada')
  const itemValorCard = contratoItems.find((i) => i.descricao === 'Valor contratual registrado')

  // Carrega URL do contrato — funciona com dados.url_storage (novo) ou documents table (legado)
  useEffect(() => {
    const fromDados = itemAnexoCard?.dados?.url_storage
    if (fromDados) { setContratoDocUrl(fromDados); return }
    if (!itemAnexoCard?.concluido) return
    setContratoDocLoading(true)
    async function load() {
      let url = null
      const { data: d1 } = await supabase.from('documents').select('url_storage')
        .eq('checklist_item_id', itemAnexoCard.id)
        .order('enviado_em', { ascending: false }).limit(1)
      url = d1?.[0]?.url_storage ?? null
      // Fallback: documentos antigos sem checklist_item_id
      if (!url) {
        const { data: d2 } = await supabase.from('documents').select('url_storage')
          .eq('project_id', projectId).eq('etapa', etapa)
          .order('enviado_em', { ascending: false }).limit(1)
        url = d2?.[0]?.url_storage ?? null
      }
      setContratoDocUrl(url)
      setContratoDocLoading(false)
    }
    load()
  }, [itemAnexoCard?.id, itemAnexoCard?.concluido])

  // Pedido items grouped
  const pedidoItems = items.filter((i) => PEDIDO_DESCS.includes(i.descricao))
  const pedidoAllDone = pedidoItems.length > 0 && pedidoItems.every((i) => i.concluido)
  const pedidoPartial = pedidoItems.some((i) => i.concluido) && !pedidoAllDone
  const itemDadosCard = pedidoItems.find((i) => i.descricao === 'Dados complementares do cliente e endereço da obra')
  const itemPrazoCard = pedidoItems.find((i) => i.descricao === 'Prazo solicitado pelo cliente')
  const itemRespCard = pedidoItems.find((i) => i.descricao === 'Responsável interno atribuído')
  const itemDescCard = pedidoItems.find((i) => i.descricao === 'Descrição do produto solicitado')

  // Countdown do prazo do pedido
  const prazoDeadline = etapa === 'pedido' ? (itemPrazoCard?.dados?.prazo ?? null) : null
  const diasRestantes = (() => {
    if (!prazoDeadline) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const deadline = new Date(prazoDeadline + 'T00:00:00')
    return Math.round((deadline - today) / (1000 * 60 * 60 * 24))
  })()

  // Build render list: replace grouped items with sentinels
  // Pedido grouping only applies when etapa === 'pedido' to avoid showing the card in other stages
  const renderList = (() => {
    const list = []
    let contratoInserted = false
    let pedidoInserted = false
    for (const item of items) {
      if (CONTRACT_DESCS.includes(item.descricao)) {
        if (!contratoInserted) { list.push({ __contrato: true }); contratoInserted = true }
      } else if (etapa === 'pedido' && PEDIDO_DESCS.includes(item.descricao)) {
        if (!pedidoInserted) { list.push({ __pedido: true }); pedidoInserted = true }
      } else {
        list.push(item)
      }
    }
    return list
  })()

  useEffect(() => {
    supabase.from('users').select('id, nome').eq('ativo', true).order('nome')
      .then(({ data }) => setUsers(data || []))
  }, [])

  function handleClick(item) {
    if (item.descricao === 'Orçamentos realizados') {
      setOrcamentosModal(item); return
    }
    if (item.descricao === 'Material recebido e conferido') {
      const orcamentoItem = items.find((i) => i.descricao === 'Orçamentos realizados')
      setRecebimentoModal({ item, orcamentoItem }); return
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
    if (item.descricao === 'Material recebido e conferido') {
      const orcamentoItem = items.find((i) => i.descricao === 'Orçamentos realizados')
      setRecebimentoModal({ item, orcamentoItem }); return
    }
    if (item.requer_documento) { setAnexoModal(item); return }
    const fields = CHECKLIST_FIELDS[item.descricao]
    if (fields?.length) { setDadosModal(item); return }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">
          Checklist — {ETAPA_LABEL[etapa] ?? etapa}
        </h2>
        <span className={`text-sm font-medium ${done === total && total > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {done} / {total} concluídos
        </span>
      </div>

      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
        />
      </div>

      {/* Countdown do prazo do pedido */}
      {diasRestantes !== null && (
        <div className={`mb-4 rounded-xl border p-4 flex items-center gap-4 ${
          diasRestantes < 0
            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
            : diasRestantes <= 7
              ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
              : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
        }`}>
          <div className={`text-4xl font-black leading-none ${
            diasRestantes < 0 ? 'text-red-600 dark:text-red-400'
            : diasRestantes <= 7 ? 'text-amber-600 dark:text-amber-400'
            : 'text-green-600 dark:text-green-400'
          }`}>
            {Math.abs(diasRestantes)}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-bold ${
              diasRestantes < 0 ? 'text-red-700 dark:text-red-300'
              : diasRestantes <= 7 ? 'text-amber-700 dark:text-amber-300'
              : 'text-green-700 dark:text-green-300'
            }`}>
              {diasRestantes < 0
                ? `dia${Math.abs(diasRestantes) !== 1 ? 's' : ''} em atraso`
                : diasRestantes === 0
                  ? 'Prazo vence hoje!'
                  : `dia${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`
              }
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Prazo do pedido: {new Date(prazoDeadline + 'T12:00:00').toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
            diasRestantes < 0 ? 'bg-red-100 dark:bg-red-900/30'
            : diasRestantes <= 7 ? 'bg-amber-100 dark:bg-amber-900/30'
            : 'bg-green-100 dark:bg-green-900/30'
          }`}>
            {diasRestantes < 0 ? '🔴' : diasRestantes <= 7 ? '⚠️' : '✅'}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Nenhum item de checklist para esta etapa.</p>
      ) : (
        <div className="space-y-2">
          {renderList.map((item, idx) => {
            // ── Card unificado de contrato ──
            if (item.__contrato) {
              return (
                <div key="contrato-unificado" className={`rounded-xl border transition-colors ${
                  contratoAllDone
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800'
                    : contratoPartial
                      ? 'bg-amber-50/40 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-3 p-4">
                    <button
                      onClick={() => setContratoModal(true)}
                      className="flex-shrink-0 transition-colors"
                    >
                      {contratoAllDone
                        ? <CheckCircleSolid className="w-6 h-6 text-green-500 dark:text-green-400" />
                        : <CheckCircleIcon className="w-6 h-6 text-gray-300 dark:text-gray-600 hover:text-blue-500" />
                      }
                    </button>
                    <span className={`text-sm flex-1 ${contratoAllDone ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      Contrato assinado
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        contratoAllDone
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}>
                        <PaperClipIcon className="w-3 h-3" />
                        {contratoAllDone ? 'Registrado' : contratoPartial ? 'Incompleto' : 'Requer dados'}
                      </span>
                      {(contratoAllDone || contratoPartial) && (
                        <button
                          onClick={() => setContratoModal(true)}
                          title="Editar"
                          className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Resumo quando preenchido */}
                  {(contratoAllDone || contratoPartial) && (
                    <div className="px-4 pb-3 ml-9">
                      <div className="mt-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1.5 border border-gray-100 dark:border-gray-700">
                        {itemDataCard?.dados?.data_assinatura && (
                          <div className="flex gap-2 text-xs">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Data de assinatura:</span>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">
                              {new Date(itemDataCard.dados.data_assinatura + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}
                        {itemValorCard?.dados?.valor && (
                          <div className="flex gap-2 text-xs">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Valor contratual:</span>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">
                              R$ {parseFloat(itemValorCard.dados.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        {itemAnexoCard?.concluido && (
                          <div className="flex gap-2 text-xs items-center">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Arquivo:</span>
                            {contratoDocLoading ? (
                              <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1 italic">
                                carregando...
                              </span>
                            ) : contratoDocUrl ? (
                              <a
                                href={contratoDocUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
                              >
                                <PaperClipIcon className="w-3 h-3" />
                                Ver contrato
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setContratoModal(true)}
                                className="text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
                              >
                                <PaperClipIcon className="w-3 h-3" />
                                Ver contrato
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            // ── Card unificado de pedido ──
            if (item.__pedido) {
              return (
                <div key="pedido-unificado" className={`rounded-xl border transition-colors ${
                  pedidoAllDone
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800'
                    : pedidoPartial
                      ? 'bg-amber-50/40 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-3 p-4">
                    <button onClick={() => setPedidoModal(true)} className="flex-shrink-0 transition-colors">
                      {pedidoAllDone
                        ? <CheckCircleSolid className="w-6 h-6 text-green-500 dark:text-green-400" />
                        : <CheckCircleIcon className="w-6 h-6 text-gray-300 dark:text-gray-600 hover:text-blue-500" />
                      }
                    </button>
                    <span className={`text-sm flex-1 ${pedidoAllDone ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      Informações do pedido
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        pedidoAllDone
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}>
                        {pedidoAllDone ? '✓ Preenchido' : pedidoPartial ? 'Incompleto' : 'Requer dados'}
                      </span>
                      {(pedidoAllDone || pedidoPartial) && (
                        <button onClick={() => setPedidoModal(true)} title="Editar"
                          className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {(pedidoAllDone || pedidoPartial) && (
                    <div className="px-4 pb-3 ml-9">
                      <div className="mt-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1.5 border border-gray-100 dark:border-gray-700">
                        {itemDadosCard?.dados?.nome_cliente && (
                          <div className="flex gap-2 text-xs">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Cliente:</span>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">{itemDadosCard.dados.nome_cliente}</span>
                          </div>
                        )}
                        {itemPrazoCard?.dados?.prazo && (
                          <div className="flex gap-2 text-xs">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Prazo:</span>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">
                              {new Date(itemPrazoCard.dados.prazo + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}
                        {itemRespCard?.dados?.responsavel_id && users.find((u) => u.id === itemRespCard.dados.responsavel_id) && (
                          <div className="flex gap-2 text-xs">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Responsável:</span>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">
                              {users.find((u) => u.id === itemRespCard.dados.responsavel_id)?.nome}
                            </span>
                          </div>
                        )}
                        {itemDadosCard?.dados?.vendedor_id && users.find((u) => u.id === itemDadosCard.dados.vendedor_id) && (
                          <div className="flex gap-2 text-xs">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Vendedor:</span>
                            <span className="text-gray-800 dark:text-gray-200 font-medium">
                              {users.find((u) => u.id === itemDadosCard.dados.vendedor_id)?.nome}
                            </span>
                          </div>
                        )}
                        {itemDescCard?.concluido && (
                          <div className="flex gap-2 text-xs items-center">
                            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Descrição:</span>
                            <button type="button" onClick={() => setPedidoModal(true)}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1">
                              <PaperClipIcon className="w-3 h-3" />
                              Ver arquivo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            // ── Card normal ──
            const hasFields = !!(CHECKLIST_FIELDS[item.descricao]?.length)
            const hasDados = hasFields && Object.keys(item.dados || {}).length > 0
            const overdue = isOverdue(item)

            return (
              <div
                key={item.id}
                className={`rounded-xl border transition-colors ${
                  item.concluido
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800'
                    : overdue
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 p-4">
                  <button
                    onClick={() => handleClick(item)}
                    disabled={updating === item.id}
                    className="flex-shrink-0 transition-colors disabled:opacity-50"
                  >
                    {item.concluido
                      ? <CheckCircleSolid className="w-6 h-6 text-green-500 dark:text-green-400" />
                      : <CheckCircleIcon className="w-6 h-6 text-gray-300 dark:text-gray-600 hover:text-blue-500" />
                    }
                  </button>

                  <span className={`text-sm flex-1 ${item.concluido ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {item.descricao}
                  </span>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {overdue && (
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                        ⚠ Atrasado
                      </span>
                    )}
                    {item.requer_documento && (
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.concluido ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}>
                        <PaperClipIcon className="w-3 h-3" />
                        {item.concluido ? 'Anexado' : 'Requer doc.'}
                      </span>
                    )}
                    {(hasFields || item.descricao === 'Material recebido e conferido') && !item.requer_documento && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.concluido ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      }`}>
                        {item.concluido ? '✓ Preenchido' : 'Requer dados'}
                      </span>
                    )}
                    {item.concluido && (hasFields || item.requer_documento || item.descricao === 'Material recebido e conferido') && (
                      <button
                        onClick={() => openEdit(item)}
                        title="Editar"
                        className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {item.concluido && hasDados && (
                  <div className="px-4 pb-3">
                    <DadosResumo item={item} users={users} />
                  </div>
                )}

                {/* Resumo de orçamentos/compras para Orçamentos realizados */}
                {item.descricao === 'Orçamentos realizados' && (() => {
                  const orcs = item.dados?.orcamentos
                    ? item.dados.orcamentos.filter((o) => o.fornecedor)
                    : (item.dados?.compras || []).filter((c) => c.fornecedor).map((c) => ({ ...c, material: c.referencia_orcamento, aprovado: true }))
                  if (!orcs.length) return null
                  return (
                    <div className="px-4 pb-3 ml-9">
                      <div className="mt-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-700 space-y-1.5">
                        {orcs.map((orc) => (
                          <div key={orc.id} className="text-xs text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{orc.fornecedor}</span>
                              {orc.aprovado
                                ? <span className="text-green-600 dark:text-green-400 font-medium">✓ aprovado</span>
                                : <span className="text-amber-500 dark:text-amber-400">pendente</span>
                              }
                              {orc.valor && <span className="text-gray-500">R$ {parseFloat(orc.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                            </div>
                            {orc.material && <div className="text-blue-500 dark:text-blue-400 truncate">{orc.material}</div>}
                            {orc.aprovado && orc.data_entrega && (
                              <div className="text-gray-400 dark:text-gray-500">
                                Entrega prev.: {new Date(orc.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR')}
                                {orc.tipo_compra && ` · ${orc.tipo_compra}${orc.percentual_compra ? ` (${orc.percentual_compra}%)` : ''}`}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Status por compra para Material recebido e conferido */}
                {item.descricao === 'Material recebido e conferido' && (() => {
                  const orcamentoItem = items.find((i) => i.descricao === 'Orçamentos realizados')
                  const compras = orcamentoItem?.dados?.orcamentos
                    ? orcamentoItem.dados.orcamentos.filter((o) => o.fornecedor && o.aprovado)
                    : (orcamentoItem?.dados?.compras || []).filter((c) => c.fornecedor)
                  const recebimentos = item.dados?.recebimentos || []
                  if (!compras.length) return null
                  return (
                    <div className="px-4 pb-3 ml-9">
                      <div className="mt-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5 border border-gray-100 dark:border-gray-700 space-y-1.5">
                        {compras.map((compra) => {
                          const rec = recebimentos.find((r) => r.compra_id === compra.id)
                          return (
                            <div key={compra.id} className="flex items-center gap-2 text-xs">
                              {rec?.recebido
                                ? <CheckCircleSolid className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                : <CheckCircleIcon className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                              }
                              <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{compra.fornecedor}</span>
                              {rec?.recebido && rec?.data_recebimento
                                ? <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">{new Date(rec.data_recebimento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                : <span className="text-amber-500 dark:text-amber-400 flex-shrink-0 font-medium">Pendente</span>
                              }
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}

      {done === total && total > 0 && (
        <div className="mt-5 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400 text-center font-medium">
          ✓ Todos os itens concluídos — você pode avançar para a próxima etapa
        </div>
      )}

      {orcamentosModal && (
        <ModalOrcamentos item={orcamentosModal} projectId={projectId} etapa={etapa} project={project}
          onClose={() => setOrcamentosModal(null)} onDone={onUpdate} />
      )}
      {recebimentoModal && (
        <ModalRecebimento item={recebimentoModal.item} orcamentoItem={recebimentoModal.orcamentoItem}
          onClose={() => setRecebimentoModal(null)} onDone={onUpdate} />
      )}
      {anexoModal && (
        <ModalAnexo item={anexoModal} projectId={projectId} etapa={etapa} project={project}
          onClose={() => setAnexoModal(null)} onDone={onUpdate} />
      )}
      {dadosModal && (
        <ModalDados item={dadosModal} project={project}
          onClose={() => setDadosModal(null)} onDone={onUpdate} />
      )}
      {contratoModal && contratoItems.length > 0 && (
        <ModalContrato items={contratoItems} projectId={projectId} etapa={etapa} project={project}
          onClose={() => setContratoModal(false)} onDone={onUpdate} />
      )}
      {pedidoModal && pedidoItems.length > 0 && (
        <ModalPedido items={pedidoItems} projectId={projectId} etapa={etapa} project={project}
          onClose={() => setPedidoModal(false)} onDone={onUpdate} />
      )}
    </div>
  )
}
