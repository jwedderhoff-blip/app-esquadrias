import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem('app_theme') ?? 'system')
  const [notifBrowser, setNotifBrowserState] = useState(
    () => localStorage.getItem('notif_browser') !== 'false'
  )
  const [notifInApp, setNotifInAppState] = useState(
    () => localStorage.getItem('notif_inapp') !== 'false'
  )

  useEffect(() => {
    function apply(isDark) {
      document.documentElement.classList.toggle('dark', isDark)
    }
    if (theme === 'dark') {
      apply(true)
      return
    }
    if (theme === 'light') {
      apply(false)
      return
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    apply(mq.matches)
    const handler = (e) => apply(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  function setTheme(val) {
    localStorage.setItem('app_theme', val)
    setThemeState(val)
  }
  function setNotifBrowser(val) {
    localStorage.setItem('notif_browser', String(val))
    setNotifBrowserState(val)
  }
  function setNotifInApp(val) {
    localStorage.setItem('notif_inapp', String(val))
    setNotifInAppState(val)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, notifBrowser, setNotifBrowser, notifInApp, setNotifInApp }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
