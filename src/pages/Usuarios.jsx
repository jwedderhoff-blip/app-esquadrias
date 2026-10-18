import { useEffect, useState } from 'react'
import { PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { PERFIL_LABEL } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/ui/Spinner'
import toast from 'react-hot-toast'

const PERFIS = ['operacional', 'supervisor', 'administrador']

function ModalUsuario({ usuario, onClose, onSaved, companyId }) {
  const editing = !!usuario?.id
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [perfil, setPerfil] = useState(usuario?.perfil ?? 'operacional')
  const [ativo, setAtivo] = useState(usuario?.ativo ?? true)
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    if (editing) {
      // Atualizar perfil
      const { error } = await supabase
        .from('users')
        .update({ nome, perfil, ativo })
        .eq('id', usuario.id)
      if (error) { toast.error('Erro ao atualizar usuário.'); setLoading(false); return }
      toast.success('Usuário atualizado!')
    } else {
      // Criar via Admin API (requer service role — aqui via edge function ou direto se tiver)
      // Neste MVP usamos o signUp padrão + insert em public.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
      })
      if (authError) {
        // Fallback: tenta signUp normal
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password: senha })
        if (signUpError) { toast.error('Erro ao criar usuário: ' + signUpError.message); setLoading(false); return }
        const userId = signUpData.user?.id
        if (!userId) { toast.error('Erro ao obter ID do usuário criado.'); setLoading(false); return }
        await supabase.from('users').insert({ id: userId, nome, email, perfil, ativo, company_id: companyId })
      } else {
        const userId = authData.user?.id
        await supabase.from('users').insert({ id: userId, nome, email, perfil, ativo, company_id: companyId })
      }
      toast.success('Usuário criado!')
    }

    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">{editing ? 'Editar usuário' : 'Novo usuário'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {!editing && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perfil *</label>
            <select value={perfil} onChange={(e) => setPerfil(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {PERFIS.map((p) => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ativo" checked={ativo} onChange={(e) => setAtivo(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="ativo" className="text-sm text-gray-700">Usuário ativo</label>
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

export default function Usuarios() {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | {} | usuario

  async function fetchUsers() {
    const { data } = await supabase.from('users').select('*').order('nome')
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} usuário{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          <PlusIcon className="w-4 h-4" />
          Novo usuário
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-600">Nome</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600 hidden sm:table-cell">Email</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Perfil</th>
              <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-gray-800">{u.nome}</td>
                <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">{u.email}</td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                    {PERFIL_LABEL[u.perfil] ?? u.perfil}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => setModal(u)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title="Editar"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <ModalUsuario
          usuario={modal?.id ? modal : null}
          onClose={() => setModal(null)}
          onSaved={fetchUsers}
          companyId={profile?.company_id}
        />
      )}
    </div>
  )
}
