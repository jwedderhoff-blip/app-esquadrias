import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/ui/Spinner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

const ACAO_LABEL = {
  projeto_criado: 'Projeto criado',
  projeto_editado: 'Projeto editado',
  projeto_excluido: 'Projeto excluído',
  etapa_avancada: 'Etapa avançada',
  documento_adicionado: 'Documento adicionado',
  checklist_atualizado: 'Checklist atualizado',
}

export default function LogAtividades() {
  const { effectiveCompanyId } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterUser, setFilterUser] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const companyId = effectiveCompanyId()

  useEffect(() => {
    async function load() {
      let projectsQ = supabase.from('projects').select('id, titulo').order('titulo')
      if (companyId) projectsQ = projectsQ.eq('company_id', companyId)

      let usersQ = supabase.from('users').select('id, nome').eq('ativo', true).order('nome')
      if (companyId) usersQ = usersQ.eq('company_id', companyId)

      const [{ data: projectsData }, { data: usersData }] = await Promise.all([projectsQ, usersQ])

      let logsQ = supabase
        .from('activity_log')
        .select('*, users!usuario_id(nome), projects!project_id(titulo)')
        .order('criado_em', { ascending: false })
        .limit(500)
      if (companyId && projectsData?.length) {
        logsQ = logsQ.in('project_id', projectsData.map((p) => p.id))
      }
      const { data: logsData } = await logsQ

      setLogs(logsData || [])
      setUsers(usersData || [])
      setProjects(projectsData || [])
      setLoading(false)
    }
    load()
  }, [companyId])

  const filtered = logs.filter((l) => {
    const matchUser = !filterUser || l.usuario_id === filterUser
    const matchProject = !filterProject || l.project_id === filterProject
    return matchUser && matchProject
  })

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Log de Atividades</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Histórico completo de ações no sistema</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os usuários</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os projetos</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Data</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Usuário</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Projeto</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Ação</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Detalhe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 dark:text-gray-500">Nenhuma atividade encontrada.</td></tr>
              ) : filtered.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {format(new Date(log.criado_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{log.users?.nome ?? '—'}</td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    {log.projects ? (
                      <Link to={`/projetos/${log.project_id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {log.projects.titulo}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{ACAO_LABEL[log.acao] ?? log.acao}</td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400 hidden md:table-cell">{log.detalhe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
