import { useEffect, useRef, useState } from 'react'
import { ArrowUpTrayIcon, DocumentIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
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
  const fileRef = useRef()

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
              <a
                href={doc.url_storage}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Abrir
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
