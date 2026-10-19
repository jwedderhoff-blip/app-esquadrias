import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [viewingCompanyId, setViewingCompanyIdState] = useState(
    () => sessionStorage.getItem('viewingCompanyId') || null
  )
  const [viewingCompany, setViewingCompany] = useState(null)
  const [userCompany, setUserCompany] = useState(null)

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    if (data?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('id, nome, logo_url')
        .eq('id', data.company_id)
        .single()
      setUserCompany(company)
    }
  }

  async function loadViewingCompany(id) {
    if (!id) { setViewingCompany(null); return }
    const { data } = await supabase.from('companies').select('id, nome, logo_url').eq('id', id).single()
    setViewingCompany(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setSession(null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
      else { setSession(null); setProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    loadViewingCompany(viewingCompanyId)
  }, [viewingCompanyId])

  function setViewingCompanyId(id) {
    if (id) sessionStorage.setItem('viewingCompanyId', id)
    else sessionStorage.removeItem('viewingCompanyId')
    setViewingCompanyIdState(id)
  }

  // Retorna o company_id efetivo para usar nas queries
  function effectiveCompanyId() {
    if (profile?.perfil === 'super_admin') return viewingCompanyId || null
    return profile?.company_id || null
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }

  async function signOut() {
    setViewingCompanyId(null)
    await supabase.auth.signOut()
  }

  const loading = session === undefined

  return (
    <AuthContext.Provider value={{
      session, profile, loading,
      viewingCompanyId, viewingCompany, setViewingCompanyId,
      userCompany,
      currentCompany: viewingCompany || userCompany,
      effectiveCompanyId,
      signIn, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
