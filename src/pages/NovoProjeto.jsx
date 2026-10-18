import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function NovoProjeto() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [numeroOrcamento, setNumeroOrcamento] = useState('')
  const [numeroPedido, setNumeroPedido] = useState('')
  const [titulo, setTitulo] = useState('')
  const [cliente, setCliente] = useState('')
  const [clienteFone, setClienteFone] = useState('')
  const [clienteEmail, setClienteEmail] = useState('')
  const [clienteCpfCnpj, setClienteCpfCnpj] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('users').select('id, nome').eq('ativo', true).then(({ data }) => {
      setUsuarios(data || [])
      if (data && profile) {
        setResponsavel(session.user.id)
      }
    })
  }, [profile])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    // Criar projeto
    const { data: project, error } = await supabase
      .from('projects')
      .insert({ numero_orcamento: numeroOrcamento || null, numero_pedido: numeroPedido || null, titulo, cliente, cliente_fone: clienteFone || null, cliente_email: clienteEmail || null, cliente_cpf_cnpj: clienteCpfCnpj || null, criado_por: responsavel || session.user.id, etapa_atual: 'pedido', company_id: profile?.company_id })
      .select()
      .single()

    if (error) {
      toast.error('Erro ao criar projeto')
      setLoading(false)
      return
    }

    // Popular checklist da etapa 'pedido'
    const { data: templates } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('etapa', 'pedido')
      .order('ordem')

    if (templates?.length) {
      await supabase.from('checklist_items').insert(
        templates.map((t) => ({
          project_id: project.id,
          etapa: 'pedido',
          descricao: t.descricao,
          requer_documento: t.requer_documento ?? false,
        }))
      )
    }

    // Registrar etapa inicial
    await supabase.from('project_stages').insert({
      project_id: project.id,
      etapa: 'pedido',
    })

    // Log
    await supabase.from('activity_log').insert({
      project_id: project.id,
      usuario_id: session.user.id,
      acao: 'projeto_criado',
      detalhe: `Projeto "${titulo}" criado`,
    })

    toast.success('Projeto criado com sucesso!')
    navigate(`/projetos/${project.id}`)
  }

  return (
    <div className="max-w-xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Voltar
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Novo Projeto</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

        {/* Numeração */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Numeração</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nº do orçamento</label>
              <input
                value={numeroOrcamento}
                onChange={(e) => setNumeroOrcamento(e.target.value)}
                placeholder="Ex: ORC-2024-001"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nº do pedido / contrato</label>
              <input
                value={numeroPedido}
                onChange={(e) => setNumeroPedido(e.target.value)}
                placeholder="Ex: PED-2024-001"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            </div>
          </div>
        </div>

        {/* Dados do cliente */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dados do cliente</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do cliente *</label>
              <input
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                required
                placeholder="Nome completo ou razão social"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">CPF / CNPJ</label>
              <input
                value={clienteCpfCnpj}
                onChange={(e) => setClienteCpfCnpj(e.target.value)}
                placeholder="000.000.000-00 ou 00.000.000/0001-00"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone / WhatsApp</label>
                <input
                  type="tel"
                  value={clienteFone}
                  onChange={(e) => setClienteFone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email do cliente</label>
                <input
                  type="email"
                  value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Projeto */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Projeto</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Título do projeto *</label>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
                placeholder="Ex: Esquadrias residência Silva"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Responsável *</label>
              <select
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Selecione...</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {loading ? 'Criando...' : 'Criar projeto'}
          </button>
        </div>
      </form>
    </div>
  )
}
