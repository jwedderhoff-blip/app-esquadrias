import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const { session } = useAuth()
  const [notifications, setNotifications] = useState([])

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

  useEffect(() => {
    fetchNotifications()

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
  }, [session])

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
    <NotificationsContext.Provider value={{ notifications, markAsRead, markAllRead, fetchNotifications }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationsContext)
}
