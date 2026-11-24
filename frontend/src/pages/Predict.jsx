import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Sparkles } from 'lucide-react'
import { api } from '../lib/api.js'
import { Badge, Button, Card, ErrorBox, PageHeader } from '../components/ui.jsx'

const DEFAULTS = {
  student_name: '', course: 'math', age: 17,
  daily_study_hours: 2, attendance_percent: 90, first_term_marks: 60, previous_marks: 62,
  past_failures: 0, higher_education: true, internet_access: true, going_out: 3, free_time: 3, health: 3,
  assignment_completion: 80, sleep_hours: 7, class_participation: 3, study_consistency: 3, number_of_subjects: 6,
}

function Slider({ label, hint, value, onChange, min, max, step = 1, unit = '' }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-sm font-semibold tabular-nums text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      {hint && <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
      <span className="text-sm font-medium">{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-indigo-600" />
    </label>
  )
}

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950'

export default function Predict() {
  const nav = useNavigate()
  const [f, setF] = useState(DEFAULTS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const payload = { ...f, student_name: f.student_name.trim() || null }
      const res = await api.predict(payload)
      nav(`/result/${res.id}`)
    } catch (err) {
      setError(err); setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <PageHeader title="Performance Prediction" subtitle="Fill in the student's details. Fields marked “ML model” feed the trained model; “Advice only” fields shape your recommendations but are not part of the model." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Academic profile</h2><Badge tone="violet">ML model</Badge></div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Student name / label <span className="font-normal text-slate-400">(optional)</span></span>
            <input className={inputCls} maxLength={60} value={f.student_name} onChange={(e) => set('student_name')(e.target.value)} placeholder="e.g. Aman" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-sm font-medium">Subject</span>
              <select className={inputCls} value={f.course} onChange={(e) => set('course')(e.target.value)}>
                <option value="math">Mathematics</option><option value="portuguese">Language (Portuguese)</option>
              </select></label>
            <label className="block"><span className="mb-1 block text-sm font-medium">Age</span>
              <input type="number" min={15} max={22} className={inputCls} value={f.age} onChange={(e) => set('age')(Number(e.target.value))} /></label>
          </div>
          <Slider label="Daily study hours" value={f.daily_study_hours} onChange={set('daily_study_hours')} min={0} max={8} step={0.5} unit=" h" hint="Converted to the dataset's weekly study-time band." />
          <Slider label="Attendance" value={f.attendance_percent} onChange={set('attendance_percent')} min={0} max={100} unit="%" hint="Converted to an approximate number of absences." />
          <Slider label="Earlier exam / term marks" value={f.first_term_marks} onChange={set('first_term_marks')} min={0} max={100} unit="%" />
          <Slider label="Most recent exam / term marks" value={f.previous_marks} onChange={set('previous_marks')} min={0} max={100} unit="%" />
          <Slider label="Past class failures" value={f.past_failures} onChange={set('past_failures')} min={0} max={3} hint="3 means three or more." />
        </Card>

        <div className="space-y-6">
          <Card className="space-y-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Lifestyle</h2><Badge tone="violet">ML model</Badge></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label="Wants higher education" value={f.higher_education} onChange={set('higher_education')} />
              <Toggle label="Internet at home" value={f.internet_access} onChange={set('internet_access')} />
            </div>
            <Slider label="Going out with friends" value={f.going_out} onChange={set('going_out')} min={1} max={5} hint="1 = very low, 5 = very high" />
            <Slider label="Free time after school" value={f.free_time} onChange={set('free_time')} min={1} max={5} />
            <Slider label="Current health" value={f.health} onChange={set('health')} min={1} max={5} hint="1 = very bad, 5 = very good" />
          </Card>

          <Card className="space-y-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Habits</h2><Badge>Advice only</Badge></div>
            <Slider label="Assignment completion" value={f.assignment_completion} onChange={set('assignment_completion')} min={0} max={100} unit="%" />
            <Slider label="Sleep per night" value={f.sleep_hours} onChange={set('sleep_hours')} min={3} max={12} step={0.5} unit=" h" />
            <Slider label="Class participation" value={f.class_participation} onChange={set('class_participation')} min={1} max={5} hint="1 = rarely, 5 = very active" />
            <Slider label="Study consistency" value={f.study_consistency} onChange={set('study_consistency')} min={1} max={5} hint="1 = irregular, 5 = every day" />
            <Slider label="Number of subjects" value={f.number_of_subjects} onChange={set('number_of_subjects')} min={1} max={12} />
          </Card>
        </div>
      </div>

      {error && <div className="mt-6"><ErrorBox error={error} /></div>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Predicting…</> : <><Sparkles className="h-4 w-4" /> Predict performance</>}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setF(DEFAULTS)} disabled={busy}>Reset</Button>
      </div>
    </form>
  )
}
