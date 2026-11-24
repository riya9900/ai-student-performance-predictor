import { createContext, useContext, useEffect, useState } from 'react'

const Ctx = createContext({ dark: false, toggle() {} })
export const useTheme = () => useContext(Ctx)

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch { /* storage blocked */ }
  }, [dark])
  return <Ctx.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>{children}</Ctx.Provider>
}
