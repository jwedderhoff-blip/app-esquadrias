import { useEffect, useRef, useState } from 'react'
import { PlusIcon, PencilSquareIcon, BuildingOffice2Icon, XMarkIcon, LinkIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { PERFIL_LABEL } from '../lib/constants'
import Spinner from '../components/ui/Spinner'
import toast from 'react-hot-toast'

function ModalEmpresa({ empresa, onClose, onSaved }) {
  const editing = !!empresa?.id
  const [nome, setNome] = useState(empresa?.nome ?? '')
  const [slug, setSlug] = useState(empresa?.slug ?? '')
  const [ativo, setAtivo] = useState(empresa?.ativo ?? true)
  const [endereco, setEndereco] = useState(empresa?.endereco ?? '')
  const [cidade, setCidade] = useState(empresa?.cidade ?? '')
  const [estado, setEstado] = useState(empresa?.estado ?? '')
  const [whatsapp, setWhatsapp] = useState(empresa?.whatsapp ?? '')
  const [emailResp, setEmailResp] = useState(empresa?.email_responsavel ?? '')
  const [site, setSite] = useState(empresa?.site ?? '')
  const [instagram, setInstagram] = useState(empresa?.instagram ?? '')
  const [driveFolderUrl, setDriveFolderUrl] = useState(empresa?.drive_folder_url ?? '')
  const [logoUrl, setLogoUrl] = useState(empresa?.logo_url ?? '')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(empresa?.logo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  function handleLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    let finalLogoUrl = logoUrl

    if (logoFile) {
      setUploading(true)
      const ext = logoFile.name.split('.').pop()
      const path = `logos/${slug || 'empresa'}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, logoFile, { upsert: true })
      if (upErr) { toast.error('Erro ao enviar logo: ' + upErr.message); setLoading(false); setUploading(false); return }
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      finalLogoUrl = urlData.publicUrl
      setUploading(false)
    }

    const payload = {
      nome, slug, ativo, logo_url: finalLogoUrl || null,
      endereco: endereco || null, cidade: cidade || null, estado: estado || null,
      whatsapp: whatsapp || null, email_responsavel: emailResp || null,
      site: site || null, instagram: instagram || null,
      drive_folder_url: driveFolderUrl || null,
    }

    if (editing) {
      const { error } = await supabase.from('companies').update(payload).eq('id', empresa.id)
      if (error) { toast.error('Erro ao atualizar: ' + error.message); setLoading(false); return }
      toast.success('Empresa atualizada!')
    } else {
      const { error } = await supabase.from('companies').insert(payload)
      if (error) { toast.error('Erro ao criar: ' + error.message); setLoading(false); return }
      toast.success('Empresa criada!')
    }

    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editing ? 'Editar empresa' : 'Nova empresa'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">

          {/* Logo */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Logo da empresa</p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain" />
                  : <BuildingOffice2Icon className="w-8 h-8 text-gray-300 dark:text-gray-600" />}
              </div>
              <div>
                <button type="button" onClick={() => fileRef.current.click()}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  {logoPreview ? 'Trocar logo' : 'Enviar logo'}
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG ou SVG. Máx 2MB.</p>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </div>
            </div>
          </div>

          {/* Identificação */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Identificação</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da empresa *</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug (identificador único) *</label>
                <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} required
                  placeholder="ex: empresa-abc"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo_emp" checked={ativo} onChange={(e) => setAtivo(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="ativo_emp" className="text-sm text-gray-700 dark:text-gray-300">Empresa ativa</label>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Endereço</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço</label>
                <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cidade</label>
                  <input value={cidade} onChange={(e) => setCidade(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UF</label>
                  <input value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))} maxLength={2} placeholder="SP"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
                </div>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Contato</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WhatsApp</label>
                  <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email do responsável</label>
                  <input type="email" value={emailResp} onChange={(e) => setEmailResp(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site</label>
                  <input type="url" value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://..."
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instagram</label>
                  <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@empresa"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard público */}
          {editing && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Dashboard público</p>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5 border border-gray-200 dark:border-gray-700">
                <LinkIcon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span className="text-xs text-gray-600 dark:text-gray-300 font-mono truncate flex-1 select-all">
                  {`${window.location.origin}/dashboard/${empresa.id}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/dashboard/${empresa.id}`)
                    toast.success('Link copiado!')
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-600 text-white rounded-md text-xs font-semibold hover:bg-purple-700 transition flex-shrink-0"
                >
                  <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                  Copiar
                </button>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Compartilhe este link para que clientes visualizem o andamento dos projetos.</p>
            </div>
          )}

          {/* Integração */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Integração Google Drive</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL da pasta raiz no Drive</label>
              <input type="url" value={driveFolderUrl} onChange={(e) => setDriveFolderUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Pasta onde serão criadas as subpastas de cada projeto.</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading || uploading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition">
              {uploading ? 'Enviando logo...' : loading ? 'Salvando...' : 'Salvar'}
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
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Atribuir admin</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Empresa: <strong>{empresa.nome}</strong></p>
        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuário *</label>
            {loadingUsers ? <Spinner /> : (
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Selecione um usuário...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} — {u.email} ({PERFIL_LABEL[u.perfil] ?? u.perfil})
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
            O usuário selecionado será vinculado a esta empresa e terá perfil <strong>administrador</strong>.
          </p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Empresas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastrada{companies.length !== 1 ? 's' : ''}</p>
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
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Empresa</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Slug</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {c.logo_url
                        ? <img src={c.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                        : <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0"><BuildingOffice2Icon className="w-4 h-4 text-gray-400 dark:text-gray-500" /></div>
                      }
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{c.nome}</p>
                        {c.cidade && <p className="text-xs text-gray-400 dark:text-gray-500">{c.cidade}{c.estado ? ` / ${c.estado}` : ''}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 dark:text-gray-400 font-mono text-xs hidden sm:table-cell">{c.slug}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.ativo ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {c.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          const link = `${window.location.origin}/dashboard/${c.id}`
                          navigator.clipboard.writeText(link)
                          toast.success('Link copiado!')
                        }}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium transition-colors"
                        title="Copiar link do dashboard público"
                      >
                        📊 Dashboard
                      </button>
                      <button
                        onClick={() => setAdminModal(c)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                        title="Atribuir admin"
                      >
                        Atribuir admin
                      </button>
                      <button
                        onClick={() => setModal(c)}
                        className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
