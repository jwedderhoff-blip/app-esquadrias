import { useEffect, useState } from 'react'
import { PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { PERFIL_LABEL } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/ui/Spinner'
import toast from 'react-hot-toast'

const PERFIS = ['operacional', 'comercial', 'administrador']

function ModalUsuario({ usuario, onClose, onSaved, defaultCompanyId, isSuperAdmin }) {
  const editing = !!usuario?.id
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [perfil, setPerfil] = useState(usuario?.perfil ?? 'operacional')
  const [ativo, setAtivo] = useState(usuario?.ativo ?? true)
  const [senha, setSenha] = useState('')
  const [companyId, setCompanyId] = useState(usuario?.company_id ?? defaultCompanyId ?? '')
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isSuperAdmin) {
      supabase.from('companies').select('id, nome').eq('ativo', true).order('nome')
        .then(({ data }) => setCompanies(data || []))
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    if (editing) {
      const update = { nome, perfil, ativo }
      if (isSuperAdmin) update.company_id = companyId || null
      const { error } = await supabase.from('users').update(update).eq('id', usuario.id)
      if (error) { toast.error('Erro ao atualizar usuário.'); setLoading(false); return }

      // Redefinir senha se informada
      if (senha.trim()) {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ user_id: usuario.id, new_password: senha.trim() }),
        })
        const result = await res.json()
        if (!res.ok) { toast.error('Senha não atualizada: ' + (result.error || res.statusText)); setLoading(false); return }
      }

      toast.success('Usuário atualizado!')
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password: senha, nome, perfil, ativo, company_id: companyId || null }),
      })
      const result = await res.json()
      if (!res.ok) { toast.error('Erro ao criar usuário: ' + (result.error || res.statusText)); setLoading(false); return }
      toast.success('Usuário criado!')
    }

    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-5">{editing ? 'Editar usuário' : 'Novo usuário'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {!editing ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha *</label>
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nova senha <span className="text-gray-400 font-normal">(opcional — deixe em branco para manter)</span>
              </label>
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Perfil *</label>
            <select value={perfil} onChange={(e) => setPerfil(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {PERFIS.map((p) => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
            </select>
          </div>
          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Empresa</label>
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sem empresa</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ativo" checked={ativo} onChange={(e) => setAtivo(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="ativo" className="text-sm text-gray-700 dark:text-gray-300">Usuário ativo</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
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

export default function Usuarios() {
  const { profile, effectiveCompanyId } = useAuth()
  const isSuperAdmin = profile?.perfil === 'super_admin'
  const canCreateUsers = isSuperAdmin || profile?.perfil === 'administrador'
  const companyId = effectiveCompanyId()
  const [users, setUsers] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  async function fetchUsers() {
    let q = supabase.from('users').select('*, companies(nome)').order('nome')
    if (companyId) q = q.eq('company_id', companyId)
    const { data } = await q
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [companyId])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Usuários</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{users.length} usuário{users.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreateUsers && (
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
          >
            <PlusIcon className="w-4 h-4" />
            Novo usuário
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Nome</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Email</th>
              {isSuperAdmin && <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Empresa</th>}
              <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Perfil</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-200">{u.nome}</td>
                <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{u.email}</td>
                {isSuperAdmin && (
                  <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 text-xs hidden md:table-cell">
                    {u.companies?.nome ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                )}
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {PERFIL_LABEL[u.perfil] ?? u.perfil}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.ativo ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => setModal(u)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Editar">
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && canCreateUsers && (
        <ModalUsuario
          usuario={modal?.id ? modal : null}
          onClose={() => setModal(null)}
          onSaved={fetchUsers}
          defaultCompanyId={companyId}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  )
}
