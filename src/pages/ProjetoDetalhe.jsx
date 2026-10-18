import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
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
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [tab, setTab] = useState('etapas')

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
  }, [id])

  useEffect(() => {
    if (project) fetchChecklist()
  }, [project?.etapa_atual])

  async function handleAdvance() {
    const allDone = checklistItems.length > 0 && checklistItems.every((i) => i.concluido)
    if (!allDone) {
      toast.error('Conclua todos os itens do checklist antes de avançar.')
      // Notificação documento_pendente
      await supabase.from('notifications').insert({
        usuario_id: session.user.id,
        project_id: id,
        tipo: 'documento_pendente',
        mensagem: `Projeto "${project.titulo}" não pode avançar: checklist incompleto.`,
      })
      return
    }

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
      .select('*')
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
    await supabase
      .from('projects')
      .update({ etapa_atual: nextEtapa, atualizado_em: now })
      .eq('id', id)

    // Iniciar nova etapa em project_stages
    await supabase.from('project_stages').insert({
      project_id: id,
      etapa: nextEtapa,
    })

    // Popular checklist da nova etapa
    const { data: templates } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('etapa', nextEtapa)
      .order('ordem')

    if (templates?.length) {
      await supabase.from('checklist_items').insert(
        templates.map((t) => ({
          project_id: id,
          etapa: nextEtapa,
          descricao: t.descricao,
          requer_documento: t.requer_documento ?? false,
        }))
      )
    }

    // Log
    await supabase.from('activity_log').insert({
      project_id: id,
      usuario_id: session.user.id,
      acao: 'etapa_avancada',
      detalhe: `Etapa avançada de "${ETAPAS[currentIdx].label}" para "${ETAPAS[currentIdx + 1].label}"`,
    })

    toast.success(`Avançado para: ${ETAPAS[currentIdx + 1].label}`)
    await fetchProject()
    setAdvancing(false)
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
            </div>
            <div className="flex items-center gap-3 mt-2">
              <EtapaBadge etapa={project.etapa_atual} />
              <span className="text-xs text-gray-400">Responsável: {project.users?.nome ?? '—'}</span>
            </div>
          </div>
          {!isLast && (
            <button
              onClick={handleAdvance}
              disabled={advancing || !allDone}
              title={!allDone ? 'Complete todos os itens do checklist para avançar' : ''}
              className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {advancing ? 'Avançando...' : 'Avançar etapa →'}
            </button>
          )}
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
        />
      )}
      {tab === 'documentos' && (
        <DocumentosTab projectId={id} etapa={project.etapa_atual} project={project} />
      )}
      {tab === 'relatorio' && <RelatorioTab projectId={id} project={project} />}
      {tab === 'log' && <LogTab projectId={id} />}
    </div>
  )
}
