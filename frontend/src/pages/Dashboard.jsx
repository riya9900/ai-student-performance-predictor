import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { Activity, AlertTriangle, ArrowRight, Gauge, Sparkles, Users } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { Badge, Button, CATEGORY_COLORS, Card, ErrorBox, Loading, PageHeader, RISK_COLORS, categoryTone, fmtDate, riskTone, tooltipStyle } from '../components/ui.jsx'

function Stat({ icon: Icon, label, value, tone = 'indigo' }) {
  const tones = { indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300', rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300', emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' }
  return (
    <Card className="flex items-center gap-4">
      <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tones[tone]}`}><Icon className="h-6 w-6" /></span>
      <div><div className="text-2xl font-bold tabular-nums">{value}</div><div className="text-sm text-slate-500">{label}</div></div>
    </Card>
  )
}

export default function Dashboard() {
  const { data: d, error, loading } = useAsync(() => api.dashboard(), [])
  if (loading) return <Loading label="Loading dashboard…" />
  if (error) return <ErrorBox error={error} />

  const cats = Object.entries(d.category_distribution).map(([name, value]) => ({ name, value }))
  const risks = ['Low', 'Medium', 'High'].map((name) => ({ name, value: d.risk_distribution[name] || 0 }))
  const trend = d.score_trend.map((t, i) => ({ n: i + 1, score: t.score }))
  const atRisk = d.risk_distribution.High || 0

  if (d.total_predictions === 0) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Your prediction overview will appear here." />
        <Card className="py-16 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-indigo-500" />
          <h2 className="mt-4 text-lg font-semibold">No predictions yet</h2>
          <p className="mt-1 text-sm text-slate-500">Make your first prediction to populate the dashboard.</p>
          <Button as={Link} to="/predict" className="mt-6">Make a prediction <ArrowRight className="h-4 w-4" /></Button>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of all predictions stored in this app." action={<Button as={Link} to="/predict"><Sparkles className="h-4 w-4" /> New prediction</Button>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Users} label="Total predictions" value={d.total_predictions} />
        <Stat icon={Gauge} label="Average predicted score" value={`${d.average_score}%`} tone="emerald" />
        <Stat icon={AlertTriangle} label="High-risk students" value={atRisk} tone="rose" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Activity className="h-4 w-4 text-indigo-500" /> Performance overview (latest {trend.length})</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ left: -16, right: 8 }}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="n" tick={{ fill: 'currentColor', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'currentColor', fontSize: 11 }} />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, 'Predicted score']} labelFormatter={(n) => `Prediction #${n}`} />
                <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Student risk overview</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={risks} margin={{ left: -24 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'currentColor', fontSize: 11 }} />
                <Tooltip {...tooltipStyle} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" name="Students" radius={8}>{risks.map((r) => <Cell key={r.name} fill={RISK_COLORS[r.name]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 font-semibold">Performance categories</h2>
          <div className="h-60">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={cats} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {cats.map((c) => <Cell key={c.name} fill={CATEGORY_COLORS[c.name] || '#6366f1'} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Recent predictions</h2><Link to="/history" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">View all</Link></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400"><tr><th className="pb-2">Student</th><th className="pb-2">Score</th><th className="pb-2">Category</th><th className="pb-2">Risk</th><th className="pb-2">Date</th></tr></thead>
              <tbody>
                {d.recent.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2.5"><Link to={`/result/${r.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">{r.student_name || `Prediction #${r.id}`}</Link></td>
                    <td className="tabular-nums">{r.predicted_score}%</td>
                    <td><Badge tone={categoryTone(r.category)}>{r.category}</Badge></td>
                    <td><Badge tone={riskTone(r.risk_level)}>{r.risk_level}</Badge></td>
                    <td className="whitespace-nowrap text-slate-500">{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
