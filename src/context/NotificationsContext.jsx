import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { ETAPAS } from '../lib/constants'

const NotificationsContext = createContext(null)

const ETAPA_IDX = Object.fromEntries(ETAPAS.map((e, i) => [e.key, i]))

export function NotificationsProvider({ children }) {
  const { session, profile, effectiveCompanyId } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [pendencias, setPendencias] = useState([])

  async function fetchNotifications() {
    if (!session) return
    const { data } = await supabase
      .from('notifications')
      .select('*, projects(titulo)')
      .eq('usuario_id', session.user.id)
      .eq('lida', false)
      .order('criado_em', { ascending: false })
    setNotifications(data || [])
  }

  const fetchPendencias = useCallback(async () => {
    const perfil = profile?.perfil
    const companyId = effectiveCompanyId?.()
    if (!perfil || !companyId) { setPendencias([]); return }
    if (!['comercial', 'financeiro', 'compras', 'administrador', 'super_admin'].includes(perfil)) {
      setPendencias([]); return
    }

    const { data: projects } = await supabase
      .from('projects')
      .select('id, titulo, cliente, numero_pedido, etapa_atual, valor_contrato')
      .eq('company_id', companyId)
      .neq('etapa_atual', 'encerrado')

    if (!projects?.length) { setPendencias([]); return }
    const ids = projects.map((p) => p.id)

    const results = []

    if (perfil === 'comercial' || perfil === 'administrador' || perfil === 'super_admin') {
      for (const p of projects) {
        const motivos = []
        if (!p.titulo) motivos.push('sem título')
        if (!p.cliente) motivos.push('sem cliente')
        if (p.valor_contrato == null) motivos.push('sem valor do contrato')
        if (motivos.length) results.push({ ...p, motivo: motivos.join(' · '), _area: 'Comercial' })
      }
    }

    if (perfil === 'financeiro' || perfil === 'administrador' || perfil === 'super_admin') {
      const withContract = projects.filter((p) => p.valor_contrato != null)
      if (withContract.length) {
        const contractIds = withContract.map((p) => p.id)
        const { data: pags } = await supabase
          .from('pagamentos')
          .select('project_id')
          .in('project_id', contractIds)
        const withPag = new Set((pags || []).map((p) => p.project_id))
        for (const p of withContract) {
          if (!withPag.has(p.id)) {
            results.push({ ...p, motivo: 'contrato sem lançamentos financeiros', _area: 'Financeiro' })
          }
        }
      }
    }

    if (perfil === 'compras' || perfil === 'administrador' || perfil === 'super_admin') {
      const contratoIdx = ETAPA_IDX['contrato'] ?? 1
      const comprasProjects = projects.filter((p) => {
        const idx = ETAPA_IDX[p.etapa_atual] ?? -1
        return idx >= contratoIdx && p.etapa_atual !== 'pos_obra'
      })
      if (comprasProjects.length) {
        const comprasIds = comprasProjects.map((p) => p.id)
        const { data: chk } = await supabase
          .from('checklist_items')
          .select('project_id, concluido')
          .in('project_id', comprasIds)
          .eq('etapa', 'compra_material')
          .eq('concluido', true)
        const withDone = new Set((chk || []).map((c) => c.project_id))
        for (const p of comprasProjects) {
          if (!withDone.has(p.id)) {
            results.push({ ...p, motivo: 'cotação/compra de materiais não iniciada', _area: 'Compras' })
          }
        }
      }
    }

    // deduplica por id+área
    const seen = new Set()
    setPendencias(results.filter((p) => {
      const key = `${p.id}:${p._area}`
      if (seen.has(key)) return false
      seen.add(key); return true
    }))
  }, [profile, effectiveCompanyId])

  useEffect(() => {
    fetchNotifications()
    fetchPendencias()

    if (!session) return
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `usuario_id=eq.${session.user.id}` },
        () => fetchNotifications()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [session, fetchPendencias])

  async function markAsRead(id) {
    await supabase.from('notifications').update({ lida: true }).eq('id', id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  async function markAllRead() {
    if (!session) return
    await supabase
      .from('notifications')
      .update({ lida: true })
      .eq('usuario_id', session.user.id)
      .eq('lida', false)
    setNotifications([])
  }

  return (
    <NotificationsContext.Provider value={{ notifications, pendencias, markAsRead, markAllRead, fetchNotifications, fetchPendencias }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext)
}
