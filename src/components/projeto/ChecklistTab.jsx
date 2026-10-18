import { useRef, useState } from 'react'
import {
  CheckCircleIcon,
  PaperClipIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ETAPA_LABEL } from '../../lib/constants'
import toast from 'react-hot-toast'

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

    if (upErr) {
      toast.error('Erro ao enviar arquivo: ' + upErr.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    // Salvar documento
    const { data: doc, error: docErr } = await supabase.from('documents').insert({
      project_id: projectId,
      etapa,
      nome_arquivo: file.name,
      url_storage: publicUrl,
      enviado_por: session.user.id,
      checklist_item_id: item.id,
    }).select().single()

    if (docErr) {
      toast.error('Erro ao registrar documento.')
      setUploading(false)
      return
    }

    // Marcar item como concluído
    const now = new Date().toISOString()
    await supabase.from('checklist_items').update({
      concluido: true,
      concluido_por: session.user.id,
      concluido_em: now,
    }).eq('id', item.id)

    toast.success('Documento anexado e item confirmado!')
    onDone()
    onClose()
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
            {file ? (
              <p className="text-sm font-medium text-blue-700">{file.name}</p>
            ) : (
              <p className="text-sm text-gray-500">Clique para selecionar o arquivo</p>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
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

export default function ChecklistTab({ projectId, etapa, items, onUpdate }) {
  const { session } = useAuth()
  const [updating, setUpdating] = useState(null)
  const [anexoModal, setAnexoModal] = useState(null)

  const done = items.filter((i) => i.concluido).length
  const total = items.length

  async function toggleItem(item) {
    // Se exige documento e ainda não está concluído, abre modal de upload
    if (item.requer_documento && !item.concluido) {
      setAnexoModal(item)
      return
    }

    // Confirmação simples (ou desmarcar)
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
                className="flex-shrink-0 transition-colors disabled:opacity-50"
                title={item.requer_documento && !item.concluido ? 'Anexar documento para confirmar' : ''}
              >
                {item.concluido ? (
                  <CheckCircleSolid className="w-6 h-6 text-green-500" />
                ) : (
                  <CheckCircleIcon className="w-6 h-6 text-gray-300 hover:text-blue-500" />
                )}
              </button>

              <span className={`text-sm flex-1 ${item.concluido ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {item.descricao}
              </span>

              {item.requer_documento && (
                <span
                  title="Requer documento anexado"
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    item.concluido
                      ? 'bg-green-100 text-green-600'
                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                  }`}
                >
                  <PaperClipIcon className="w-3 h-3" />
                  {item.concluido ? 'Doc. anexado' : 'Requer doc.'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {done === total && total > 0 && (
        <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 text-center font-medium">
          ✓ Todos os itens concluídos — você pode avançar para a próxima etapa
        </div>
      )}

      {anexoModal && (
        <ModalAnexo
          item={anexoModal}
          projectId={projectId}
          etapa={etapa}
          onClose={() => setAnexoModal(null)}
          onDone={onUpdate}
        />
      )}
    </div>
  )
}
