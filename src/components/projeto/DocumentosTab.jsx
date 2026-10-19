import { useEffect, useRef, useState } from 'react'
import { ArrowUpTrayIcon, DocumentIcon, ArrowDownTrayIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ETAPAS, ETAPA_LABEL } from '../../lib/constants'
import Spinner from '../ui/Spinner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function DocumentosTab({ projectId, etapa, project }) {
  const { session, profile } = useAuth()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filterEtapa, setFilterEtapa] = useState(etapa)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [justificativa, setJustificativa] = useState('')
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef()
  const canDelete = ['administrador', 'super_admin', 'supervisor'].includes(profile?.perfil)

  async function fetchDocs() {
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('*, users!enviado_por(nome)')
      .eq('project_id', projectId)
      .eq('etapa', filterEtapa)
      .order('enviado_em', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchDocs() }, [filterEtapa])

  async function handleDelete() {
    if (!justificativa.trim()) { toast.error('Informe a justificativa para excluir.'); return }
    setDeleting(true)
    const { error } = await supabase.from('documents').delete().eq('id', deleteTarget.id)
    if (error) { toast.error('Erro ao excluir: ' + error.message); setDeleting(false); return }
    await supabase.from('activity_log').insert({
      project_id: projectId,
      usuario_id: session.user.id,
      acao: 'documento_excluido',
      detalhe: `Arquivo "${deleteTarget.nome_arquivo}" excluído. Justificativa: ${justificativa.trim()}`,
    })
    toast.success('Documento excluído.')
    setDeleteTarget(null)
    setJustificativa('')
    setDeleting(false)
    await fetchDocs()
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são aceitos.')
      return
    }
    setUploading(true)
    const path = `${projectId}/${filterEtapa}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
    if (uploadError) {
      toast.error('Erro ao fazer upload.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    await supabase.from('documents').insert({
      project_id: projectId,
      etapa: filterEtapa,
      nome_arquivo: file.name,
      url_storage: publicUrl,
      enviado_por: session.user.id,
    })

    // Log
    await supabase.from('activity_log').insert({
      project_id: projectId,
      usuario_id: session.user.id,
      acao: 'documento_adicionado',
      detalhe: `Arquivo "${file.name}" adicionado na etapa ${ETAPA_LABEL[filterEtapa]}`,
    })

    // Notificação para supervisores/administradores
    const { data: notifyUsers } = await supabase
      .from('users')
      .select('id')
      .in('perfil', ['supervisor', 'administrador'])
      .neq('id', session.user.id)

    if (notifyUsers?.length) {
      await supabase.from('notifications').insert(
        notifyUsers.map((u) => ({
          usuario_id: u.id,
          project_id: projectId,
          tipo: 'documento_adicionado',
          mensagem: `Documento "${file.name}" adicionado no projeto "${project.titulo}".`,
        }))
      )
    }

    toast.success('Arquivo enviado com sucesso!')
    fileRef.current.value = ''
    await fetchDocs()
    setUploading(false)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <h2 className="font-semibold text-gray-800">Documentos</h2>
        <div className="flex items-center gap-3">
          <select
            value={filterEtapa}
            onChange={(e) => setFilterEtapa(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ETAPAS.map((e) => (
              <option key={e.key} value={e.key}>{e.label}</option>
            ))}
          </select>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            {uploading ? 'Enviando...' : 'Upload PDF'}
          </button>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <DocumentIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum documento nesta etapa</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl">
              <DocumentIcon className="w-8 h-8 text-red-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.nome_arquivo}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Enviado por {doc.users?.nome ?? '—'} em{' '}
                  {format(new Date(doc.enviado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={doc.url_storage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Abrir
                </a>
                {canDelete && (
                  <button
                    onClick={() => { setDeleteTarget(doc); setJustificativa('') }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Excluir documento"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Excluir documento</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">{deleteTarget.nome_arquivo}</p>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Justificativa da exclusão *
              </label>
              <textarea
                rows={3}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva o motivo da exclusão deste documento..."
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || !justificativa.trim()}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleting ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
