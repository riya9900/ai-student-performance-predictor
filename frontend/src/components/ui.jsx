import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

export const cx = (...c) => c.filter(Boolean).join(' ')

export function Card({ className, children, ...p }) {
  return (
    <div className={cx('min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900', className)} {...p}>
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Loading({ label = 'Loading…' }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setSlow(true), 5000); return () => clearTimeout(t) }, [])
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-slate-500" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      <span className="text-sm">{label}</span>
      {slow && <span className="max-w-sm text-center text-xs">Still working — a free-tier server can take up to a minute to wake up.</span>}
    </div>
  )
}

export function ErrorBox({ error }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error?.message || String(error)}</span>
    </div>
  )
}

const TONES = {
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  blue: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  red: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
}
export function Badge({ tone = 'slate', children }) {
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', TONES[tone])}>{children}</span>
}

export const riskTone = (r) => ({ Low: 'green', Medium: 'amber', High: 'red' }[r] || 'slate')
export const categoryTone = (c) => ({ Excellent: 'green', Good: 'blue', Average: 'amber', 'Needs Improvement': 'red' }[c] || 'slate')
export const CHART_COLORS = ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e']
export const RISK_COLORS = { Low: '#10b981', Medium: '#f59e0b', High: '#f43f5e' }
export const CATEGORY_COLORS = { Excellent: '#10b981', Good: '#0ea5e9', Average: '#f59e0b', 'Needs Improvement': '#f43f5e' }
export const tooltipStyle = {
  contentStyle: { background: 'var(--tt-bg)', border: '1px solid var(--tt-border)', borderRadius: 12, color: 'var(--tt-text)', fontSize: 12 },
  itemStyle: { color: 'var(--tt-text)' },
  labelStyle: { color: 'var(--tt-text)' },
}

export function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) } catch { return iso }
}

export function Button({ as: Tag = 'button', variant = 'primary', className, ...p }) {
  const v = {
    primary: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500',
    ghost: 'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
  }[variant]
  return <Tag className={cx('inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60', v, className)} {...p} />
}
