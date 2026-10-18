import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ETAPAS, ETAPA_LABEL } from '../lib/constants'
import EtapaBadge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function Projetos() {
  const { profile, effectiveCompanyId } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEtapa, setFilterEtapa] = useState('')
  const companyId = effectiveCompanyId()

  async function fetchProjects() {
    setLoading(true)
    let q = supabase
      .from('projects')
      .select('*, users!criado_por(nome)')
      .order('atualizado_em', { ascending: false })

    if (companyId) q = q.eq('company_id', companyId)

    const { data, error } = await q
    if (error) toast.error('Erro ao carregar projetos')
    setProjects(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchProjects() }, [companyId])

  const filtered = projects.filter((p) => {
    const matchSearch = !search ||
      p.titulo.toLowerCase().includes(search.toLowerCase()) ||
      p.cliente.toLowerCase().includes(search.toLowerCase())
    const matchEtapa = !filterEtapa || p.etapa_atual === filterEtapa
    return matchSearch && matchEtapa
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} projeto{projects.length !== 1 ? 's' : ''} no total</p>
        </div>
        <Link
          to="/projetos/novo"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          <PlusIcon className="w-4 h-4" />
          Novo projeto
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou cliente..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterEtapa}
            onChange={(e) => setFilterEtapa(e.target.value)}
            className="pl-9 pr-8 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none"
          >
            <option value="">Todas as etapas</option>
            {ETAPAS.map((e) => (
              <option key={e.key} value={e.key}>{e.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">Nenhum projeto encontrado</p>
          <p className="text-sm mt-1">Tente ajustar os filtros ou crie um novo projeto.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Projeto</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 hidden sm:table-cell">Cliente</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Etapa</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 hidden md:table-cell">Responsável</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 hidden lg:table-cell">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link to={`/projetos/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                      {p.titulo}
                    </Link>
                    <p className="text-xs text-gray-400 sm:hidden mt-0.5">{p.cliente}</p>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 hidden sm:table-cell">{p.cliente}</td>
                  <td className="px-5 py-3.5"><EtapaBadge etapa={p.etapa_atual} /></td>
                  <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">{p.users?.nome ?? '—'}</td>
                  <td className="px-5 py-3.5 text-gray-400 hidden lg:table-cell">
                    {formatDistanceToNow(new Date(p.atualizado_em), { addSuffix: true, locale: ptBR })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
