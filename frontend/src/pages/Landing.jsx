import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, BrainCircuit, CheckCircle2, Database, FileSearch, Lightbulb, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { Logo, ThemeButton } from '../components/Layout.jsx'
import { Button, Card } from '../components/ui.jsx'

const FEATURES = [
  { icon: BrainCircuit, title: 'Real machine learning', text: 'A Random Forest trained and cross-validated on 1,044 real student records — no hard-coded scores.' },
  { icon: BarChart3, title: 'Clear visual results', text: 'Predicted score, performance category, risk level and an honest uncertainty range.' },
  { icon: Lightbulb, title: 'Personal study advice', text: 'Actionable recommendations plus "what-if" estimates from the model itself.' },
  { icon: Database, title: 'Prediction history', text: 'Every prediction is saved in SQLite so you can search, filter and revisit it.' },
  { icon: ShieldCheck, title: 'Transparent limits', text: 'The About page explains the data, metrics and exactly what the model can and cannot do.' },
  { icon: SlidersHorizontal, title: 'Light & dark, any device', text: 'Responsive dashboard that works on desktop, tablet and phone.' },
]
const STEPS = [
  { icon: FileSearch, title: '1. Enter your details', text: 'Study hours, attendance, previous marks and a few lifestyle factors.' },
  { icon: BrainCircuit, title: '2. The model predicts', text: 'Your inputs are mapped to the dataset features and run through the trained pipeline.' },
  { icon: Lightbulb, title: '3. Get your plan', text: 'See your estimated score, risk level and where to focus next.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link to="/about" className="hidden text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 sm:block">About</Link>
          <Link to="/dashboard" className="hidden text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 sm:block">Dashboard</Link>
          <ThemeButton />
        </nav>
      </header>

      <section className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-indigo-100 via-violet-50 to-transparent dark:from-indigo-950/60 dark:via-violet-950/20" />
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-12 text-center sm:px-6 sm:pt-20">
          <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Trained on the UCI Student Performance dataset
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl animate-fade-up text-4xl font-extrabold tracking-tight sm:text-6xl">
            Understand your academic performance <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">before the exam</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl animate-fade-up text-base text-slate-600 dark:text-slate-400 sm:text-lg">
            Enter your study habits and marks. A trained machine-learning model estimates your final grade, flags risk early and suggests where to improve.
          </p>
          <div className="mt-8 flex animate-fade-up flex-wrap justify-center gap-3">
            <Button as={Link} to="/predict">Get Started <ArrowRight className="h-4 w-4" /></Button>
            <Button as={Link} to="/about" variant="ghost">How the model works</Button>
          </div>

          <div className="mx-auto mt-14 grid max-w-3xl animate-float grid-cols-3 gap-3 sm:gap-5">
            {[['1,044', 'student records'], ['R² 0.89', 'on unseen students'], ['±0.8', 'avg. error (of 20)']].map(([a, b]) => (
              <Card key={b} className="py-4"><div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 sm:text-3xl">{a}</div><div className="text-xs text-slate-500 sm:text-sm">{b}</div></Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Everything you need to act on your results</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="transition hover:-translate-y-1 hover:shadow-md">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-white py-14 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6">
        <Card className="bg-gradient-to-br from-indigo-600 to-violet-600 !border-0 py-10 text-white">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to see your estimate?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-indigo-100">Takes under a minute. Predictions are statistical estimates, not guaranteed exam results.</p>
          <Link to="/predict" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50">
            <CheckCircle2 className="h-4 w-4" /> Start predicting
          </Link>
        </Card>
      </section>
    </div>
  )
}
