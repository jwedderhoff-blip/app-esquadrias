import { useEffect, useState } from 'react'
import { PlusIcon, PencilSquareIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { PERFIL_LABEL } from '../lib/constants'
import Spinner from '../components/ui/Spinner'
import toast from 'react-hot-toast'

function ModalEmpresa({ empresa, onClose, onSaved }) {
  const editing = !!empresa?.id
  const [nome, setNome] = useState(empresa?.nome ?? '')
  const [slug, setSlug] = useState(empresa?.slug ?? '')
  const [ativo, setAtivo] = useState(empresa?.ativo ?? true)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    if (editing) {
      const { error } = await supabase.from('companies').update({ nome, slug, ativo }).eq('id', empresa.id)
      if (error) { toast.error('Erro ao atualizar empresa: ' + error.message); setLoading(false); return }
      toast.success('Empresa atualizada!')
    } else {
      const { error } = await supabase.from('companies').insert({ nome, slug, ativo })
      if (error) { toast.error('Erro ao criar empresa: ' + error.message); setLoading(false); return }
      toast.success('Empresa criada!')
    }

    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">{editing ? 'Editar empresa' : 'Nova empresa'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (identificador único) *</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} required
              placeholder="ex: empresa-abc"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ativo_emp" checked={ativo} onChange={(e) => setAtivo(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="ativo_emp" className="text-sm text-gray-700">Empresa ativa</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalAdminEmpresa({ empresa, onClose, onSaved }) {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)

  useEffect(() => {
    supabase.from('users').select('id, nome, email, perfil, company_id').order('nome').then(({ data }) => {
      setUsers(data || [])
      setLoadingUsers(false)
    })
  }, [])

  async function handleAssign(e) {
    e.preventDefault()
    if (!selectedUser) return
    setLoading(true)

    const { error } = await supabase
      .from('users')
      .update({ company_id: empresa.id, perfil: 'administrador' })
      .eq('id', selectedUser)

    if (error) { toast.error('Erro ao atribuir admin: ' + error.message); setLoading(false); return }
    toast.success('Admin atribuído!')
    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Atribuir admin</h2>
        <p className="text-sm text-gray-500 mb-5">Empresa: <strong>{empresa.nome}</strong></p>
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário *</label>
            {loadingUsers ? <Spinner /> : (
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione um usuário...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} — {u.email} ({PERFIL_LABEL[u.perfil] ?? u.perfil})
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            O usuário selecionado será vinculado a esta empresa e terá perfil <strong>administrador</strong>.
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading || loadingUsers}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
              {loading ? 'Atribuindo...' : 'Atribuir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Admin() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [adminModal, setAdminModal] = useState(null)

  async function fetchCompanies() {
    const { data } = await supabase
      .from('companies')
      .select('*, users(count)')
      .order('nome')
    setCompanies(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCompanies() }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastrada{companies.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          <PlusIcon className="w-4 h-4" />
          Nova empresa
        </button>
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <BuildingOffice2Icon className="w-12 h-12 mb-3" />
          <p className="text-sm">Nenhuma empresa cadastrada</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-600">Empresa</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 hidden sm:table-cell">Slug</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-800">{c.nome}</td>
                  <td className="px-5 py-3.5 text-gray-500 font-mono text-xs hidden sm:table-cell">{c.slug}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setAdminModal(c)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        title="Atribuir admin"
                      >
                        Atribuir admin
                      </button>
                      <button
                        onClick={() => setModal(c)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <ModalEmpresa
          empresa={modal?.id ? modal : null}
          onClose={() => setModal(null)}
          onSaved={fetchCompanies}
        />
      )}

      {adminModal && (
        <ModalAdminEmpresa
          empresa={adminModal}
          onClose={() => setAdminModal(null)}
          onSaved={fetchCompanies}
        />
      )}
    </div>
  )
}
