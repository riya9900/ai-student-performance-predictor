import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BookOpen, Database, FlaskConical, ListChecks } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAsync } from '../lib/useAsync.js'
import { Badge, Card, ErrorBox, Loading, PageHeader, tooltipStyle } from '../components/ui.jsx'

const MAPPING = [
  ['Daily study hours', 'studytime', 'Daily hours × 7 → weekly band (<2h, 2–5h, 5–10h, >10h)'],
  ['Attendance %', 'absences', '(100 − attendance) × 90 school days ÷ 100 (an assumption)'],
  ['Earlier / recent marks %', 'G1 / G2', 'Percent ÷ 5 → 0–20 scale'],
  ['Past failures', 'failures', 'Used directly'],
  ['Age, subject, higher-ed, internet, going out, free time, health', 'age, course, higher, internet, goout, freetime, health', 'Used directly'],
]
const NOT_USED = ['Sleep hours', 'Assignment completion', 'Class participation', 'Study consistency', 'Number of subjects']
const f2 = (n) => n.toFixed(2)

export default function About() {
  const { data: m, error, loading } = useAsync(() => api.modelInfo(), [])
  if (loading) return <Loading label="Loading model details…" />
  if (error) return <ErrorBox error={error} />

  const rows = Object.entries(m.model_comparison).map(([name, v]) => ({ name, ...v }))
  const chart = rows.map((r) => ({ name: r.name.replace(' (predict mean)', ''), 'MAE': +r.test.MAE.toFixed(2), 'RMSE': +r.test.RMSE.toFixed(2) }))
  const imp = Object.entries(m.feature_importance).slice(0, 8).map(([k, v]) => ({ name: k, value: +v.toFixed(3) }))
  const best = m.model_comparison[m.best_model]

  return (
    <div className="space-y-6">
      <PageHeader title="About the Project" subtitle="What the model is, what data it learned from, and how predictions are made." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><Database className="h-4 w-4 text-indigo-500" /> Dataset</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <b>Student Performance</b> (Cortez &amp; Silva, 2008) from the UCI Machine Learning Repository: {m.n_rows.toLocaleString()} records of secondary-school
            students in Portugal (395 maths + 649 Portuguese-language), about {m.n_unique_students} distinct students. Target: final grade <b>G3</b> (0–20).
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">License: <Badge tone="green">{m.dataset.license}</Badge> — <a className="text-indigo-600 underline dark:text-indigo-400" href={m.dataset.source} target="_blank" rel="noreferrer">dataset page</a></p>
          <p className="mt-2 text-xs text-slate-500">{m.dataset.citation}</p>
        </Card>
        <Card>
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><FlaskConical className="h-4 w-4 text-indigo-500" /> Selected model: {m.best_model}</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[['MAE', f2(best.test.MAE), 'points of 20'], ['RMSE', f2(best.test.RMSE), 'points of 20'], ['R²', f2(best.test.R2), 'variance explained']].map(([a, b, c]) => (
              <div key={a} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><div className="text-xs text-slate-500">{a}</div><div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{b}</div><div className="text-[11px] text-slate-400">{c}</div></div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Measured on {m.test_rows} held-out records of students the model never saw. The same student never appears in both train and test.</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Model comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400"><tr><th className="pb-2">Model</th><th>CV RMSE</th><th>CV R²</th><th>Test MAE</th><th>Test RMSE</th><th>Test R²</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.name} className="border-t border-slate-100 tabular-nums dark:border-slate-800">
                <td className="py-2 font-medium">{r.name} {r.name === m.best_model && <Badge tone="green">selected</Badge>}</td>
                <td>{f2(r.cv.RMSE)}</td><td>{f2(r.cv.R2)}</td><td>{f2(r.test.MAE)}</td><td>{f2(r.test.RMSE)}</td><td>{f2(r.test.R2)}</td>
              </tr>))}</tbody>
          </table>
        </div>
        <div className="mt-4 h-60">
          <ResponsiveContainer><BarChart data={chart} margin={{ left: -16 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} /><YAxis tick={{ fill: 'currentColor', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} cursor={{ fill: 'transparent' }} /><Legend />
            <Bar dataKey="MAE" fill="#6366f1" radius={6} /><Bar dataKey="RMSE" fill="#a78bfa" radius={6} />
          </BarChart></ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-500">Test error (lower is better). CV = 5-fold cross-validation on the training portion, grouped by student.</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">What drives the prediction</h2>
          <div className="h-64"><ResponsiveContainer><BarChart data={imp} layout="vertical" margin={{ left: 8, right: 12 }}>
            <CartesianGrid stroke="var(--grid)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'currentColor', fontSize: 11 }} /><YAxis type="category" dataKey="name" width={70} tick={{ fill: 'currentColor', fontSize: 12 }} />
            <Tooltip {...tooltipStyle} cursor={{ fill: 'transparent' }} /><Bar dataKey="value" name="RMSE increase when shuffled" fill="#8b5cf6" radius={6} />
          </BarChart></ResponsiveContainer></div>
          <p className="text-xs text-slate-500">Permutation importance on held-out data. G1/G2 (earlier grades) dominate.</p>
        </Card>
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200"><AlertTriangle className="h-4 w-4" /> Honest limitations</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-amber-900/90 dark:text-amber-100/90">
            <li>Predictions are <b>estimates</b>, not guaranteed exam results.</li>
            <li>Earlier grades carry most of the signal. Without G1 and G2, the same model's test R² falls to <b>{f2(m.ablation_without_G1_G2.R2)}</b> (MAE {f2(m.ablation_without_G1_G2.MAE)}).</li>
            <li>The data comes from two Portuguese schools in one period; it may not transfer to other countries, grading systems or years.</li>
            <li>The model finds <b>correlations</b>; “what-if” results do not prove cause and effect.</li>
            <li>Attendance and study hours are converted to the dataset's absences and weekly study bands using stated assumptions (below).</li>
            <li>Not a tool for grading, admissions or any high-stakes decision.</li>
          </ul>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><ListChecks className="h-4 w-4 text-indigo-500" /> How a prediction is made</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
          <li>Your form values are validated by the API (Pydantic).</li>
          <li>They are mapped to the dataset's columns (table below).</li>
          <li>A scikit-learn pipeline scales numbers, one-hot-encodes categories, and the {m.best_model} predicts G3 (0–20).</li>
          <li>The score is G3 × 5 (%). The range comes from the model's real cross-validation errors (10th–90th percentile).</li>
          <li>Category: ≥80 Excellent, ≥65 Good, ≥50 Average, otherwise Needs Improvement. Risk is High when predicted G3 &lt; 10 (the pass mark).</li>
        </ol>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400"><tr><th className="pb-2">Form field</th><th>Dataset column</th><th>Conversion</th></tr></thead>
            <tbody>{MAPPING.map(([a, b, c]) => <tr key={a} className="border-t border-slate-100 align-top dark:border-slate-800"><td className="py-2 pr-3">{a}</td><td className="pr-3 font-mono text-xs">{b}</td><td className="text-slate-500">{c}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400"><b>Not in the dataset, so not used by the model</b> (used only for advice): {NOT_USED.join(', ')}.</p>
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4 text-indigo-500" /> Exploratory data analysis</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[['g3_distribution', 'Distribution of final grades'], ['correlation', 'Correlation matrix'], ['g3_by_factors', 'Grade vs. key factors'], ['actual_vs_predicted', 'Actual vs. predicted (test set)']].map(([n, t]) => (
            <figure key={n} className="rounded-xl bg-white p-2 dark:bg-slate-100"><img src={api.plotUrl(n)} alt={t} loading="lazy" className="mx-auto w-full" /><figcaption className="pb-1 text-center text-xs text-slate-500">{t}</figcaption></figure>
          ))}
        </div>
      </Card>
    </div>
  )
}
