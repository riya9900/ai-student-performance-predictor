import { useState } from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import { BarChart3, BrainCircuit, History, Info, LayoutDashboard, Menu, Moon, Sparkles, Sun, X } from 'lucide-react'
import { useTheme } from '../lib/theme.jsx'
import { cx } from './ui.jsx'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/predict', label: 'Predict', icon: Sparkles },
  { to: '/history', label: 'History', icon: History },
  { to: '/about', label: 'About Project', icon: Info },
]

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
        <BrainCircuit className="h-5 w-5" />
      </span>
      <span className="leading-tight">Student<span className="text-indigo-500">Predictor</span></span>
    </Link>
  )
}

export function ThemeButton() {
  const { dark, toggle } = useTheme()
  return (
    <button onClick={toggle} aria-label="Toggle dark mode" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

function NavItems({ onClick }) {
  return NAV.map(({ to, label, icon: Icon }) => (
    <NavLink key={to} to={to} onClick={onClick}
      className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
        isActive ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800')}>
      <Icon className="h-4 w-4" /> {label}
    </NavLink>
  ))
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col">
        <div className="mb-8 px-2 pt-2"><Logo /></div>
        <nav className="flex flex-1 flex-col gap-1"><NavItems /></nav>
        <p className="px-2 text-xs text-slate-400">Estimates only — not guaranteed exam results.</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:justify-end">
          <button className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 dark:border-slate-700 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </button>
          <div className="lg:hidden"><Logo /></div>
          <ThemeButton />
        </header>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white p-4 shadow-xl dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between"><Logo />
                <button onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
              </div>
              <nav className="flex flex-col gap-1"><NavItems onClick={() => setOpen(false)} /></nav>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 animate-fade-up p-4 sm:p-6 lg:p-8"><Outlet /></main>
        <footer className="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400 dark:border-slate-800">
          <BarChart3 className="mr-1 inline h-3 w-3" /> Model trained on the UCI Student Performance dataset (CC BY 4.0).
        </footer>
      </div>
    </div>
  )
}
