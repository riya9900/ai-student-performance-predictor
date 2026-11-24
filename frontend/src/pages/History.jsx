import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { Badge, Button, Card, ErrorBox, Loading, PageHeader, categoryTone, fmtDate, riskTone } from '../components/ui.jsx'

const sel = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950'

export default function History() {
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [risk, setRisk] = useState('')
  const [category, setCategory] = useState('')

  // debounce typing so we don't hit the API on every keystroke
  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 300); return () => clearTimeout(t) }, [search])

  const { data, error, loading } = useAsync(() => api.history({ search: q, risk, category, limit: 100 }), [q, risk, category])

  return (
    <div>
      <PageHeader title="Prediction History" subtitle="Search, filter and open any previous prediction." />
      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or subject…" aria-label="Search predictions"
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <select className={sel} value={risk} onChange={(e) => setRisk(e.target.value)} aria-label="Filter by risk">
            <option value="">All risk levels</option><option>Low</option><option>Medium</option><option>High</option>
          </select>
          <select className={sel} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option><option>Excellent</option><option>Good</option><option>Average</option><option>Needs Improvement</option>
          </select>
        </div>

        {loading ? <Loading /> : error ? <ErrorBox error={error} /> : data.items.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No predictions found. <Button as={Link} to="/predict" variant="ghost" className="ml-2 !py-1.5">Make one</Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-400"><tr><th className="pb-2">#</th><th className="pb-2">Student</th><th className="pb-2">Subject</th><th className="pb-2">Score</th><th className="pb-2">Range</th><th className="pb-2">Category</th><th className="pb-2">Risk</th><th className="pb-2">Date</th><th /></tr></thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 text-slate-400">{r.id}</td>
                      <td className="font-medium">{r.student_name || '—'}</td>
                      <td className="capitalize">{r.course}</td>
                      <td className="tabular-nums font-semibold">{r.predicted_score}%</td>
                      <td className="whitespace-nowrap tabular-nums text-slate-500">{r.interval_low}–{r.interval_high}%</td>
                      <td><Badge tone={categoryTone(r.category)}>{r.category}</Badge></td>
                      <td><Badge tone={riskTone(r.risk_level)}>{r.risk_level}</Badge></td>
                      <td className="whitespace-nowrap text-slate-500">{fmtDate(r.created_at)}</td>
                      <td><Link to={`/result/${r.id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">Details</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">Showing {data.items.length} of {data.total}.</p>
          </>
        )}
      </Card>
    </div>
  )
}
