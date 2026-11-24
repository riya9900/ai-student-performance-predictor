import { Link, useParams } from 'react-router-dom'
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { AlertCircle, ArrowLeft, Info, Lightbulb, RefreshCw } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { Badge, Button, CATEGORY_COLORS, Card, ErrorBox, Loading, PageHeader, categoryTone, fmtDate, riskTone, tooltipStyle } from '../components/ui.jsx'

const PRIORITY_TONE = { high: 'red', medium: 'amber', low: 'slate' }
const BASIS_LABEL = { model: 'From model inputs', 'self-reported': 'From your habits (not in model)', general: 'General advice' }

export default function Result() {
  const { id } = useParams()
  const { data, error, loading } = useAsync(() => api.historyItem(id), [id])
  if (loading) return <Loading label="Loading result…" />
  if (error) return <ErrorBox error={error} />

  const r = data.result, i = data.inputs
  const color = CATEGORY_COLORS[r.category] || '#6366f1'
  const gauge = [{ name: 'score', value: r.predicted_score, fill: color }]
  const profile = [
    { k: 'Attendance', v: i.attendance_percent },
    { k: 'Study time', v: Math.min(100, (i.daily_study_hours / 4) * 100) },
    { k: 'Earlier marks', v: i.first_term_marks },
    { k: 'Recent marks', v: i.previous_marks },
    { k: 'Assignments', v: i.assignment_completion },
    { k: 'Sleep', v: Math.min(100, (i.sleep_hours / 8) * 100) },
  ]

  return (
    <div>
      <PageHeader
        title={data.student_name ? `Results for ${data.student_name}` : 'Prediction results'}
        subtitle={`${fmtDate(data.created_at)} · ${data.course === 'math' ? 'Mathematics' : 'Language'}`}
        action={<Button as={Link} to="/predict" variant="ghost"><RefreshCw className="h-4 w-4" /> New prediction</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center text-center">
          <h2 className="self-start text-sm font-semibold text-slate-500">Predicted academic score</h2>
          <div className="relative h-52 w-52">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="78%" outerRadius="100%" data={gauge} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={20} background={{ fill: 'var(--grid)' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center">
              <div><div className="text-4xl font-extrabold tabular-nums">{r.predicted_score}<span className="text-lg">%</span></div>
                <div className="text-xs text-slate-500">{r.predicted_grade_20} / 20</div></div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Badge tone={categoryTone(r.category)}>{r.category}</Badge>
            <Badge tone={riskTone(r.risk_level)}>{r.risk_level} risk</Badge>
          </div>
          <p className="mt-4 text-sm text-slate-500">Likely range: <b className="text-slate-800 dark:text-slate-200">{r.interval_low}% – {r.interval_high}%</b><br />
            <span className="text-xs">(about 80% of similar students in testing fell in this range)</span></p>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-500">Your profile (0–100 scale)</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <RadarChart data={profile} outerRadius="75%">
                <PolarGrid stroke="var(--grid)" />
                <PolarAngleAxis dataKey="k" tick={{ fill: 'currentColor', fontSize: 12 }} />
                <Radar dataKey="v" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                <Tooltip {...tooltipStyle} formatter={(v) => `${Math.round(v)}`} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500">Study time is scaled against 4 h/day and sleep against 8 h for display only.</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><Lightbulb className="h-4 w-4 text-amber-500" /> Personalised study recommendations</h2>
          <ul className="mt-3 space-y-3">
            {r.recommendations.map((rec) => (
              <li key={rec.title} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{rec.title}</span>
                  <Badge tone={PRIORITY_TONE[rec.priority]}>{rec.priority}</Badge>
                  <span className="text-xs text-slate-400">{BASIS_LABEL[rec.basis]}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{rec.detail}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold">What-if (asked of the model)</h2>
          <p className="text-xs text-slate-500">Change in predicted score if one input changed. These are patterns in historical data, not guaranteed outcomes.</p>
          <ul className="mt-4 space-y-4">
            {r.what_if.map((w) => {
              const pct = Math.min(100, (Math.abs(w.delta_score) / 5) * 100)
              const tone = w.delta_score > 0 ? 'bg-emerald-500' : w.delta_score < 0 ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'
              return (
                <li key={w.change}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{w.change}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{w.delta_score > 0 ? '+' : ''}{w.delta_score} pts</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.max(pct, w.delta_score === 0 ? 2 : 4)}%` }} />
                  </div>
                  {w.delta_score === 0 && <p className="mt-1 text-xs text-slate-500">No change predicted by the model for this input.</p>}
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><Info className="h-4 w-4 text-indigo-500" /> How your inputs were used</h2>
        <div className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(r.mapped_features).map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-slate-100 py-1 dark:border-slate-800"><span className="text-slate-500">{k}</span><span className="font-medium tabular-nums">{String(v)}</span></div>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-slate-500"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {r.disclaimer}</p>
      </Card>

      <Link to="/history" className="mt-6 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline dark:text-indigo-400"><ArrowLeft className="h-4 w-4" /> Back to history</Link>
    </div>
  )
}
