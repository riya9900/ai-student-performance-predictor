import { lazy, Suspense } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Landing from './pages/Landing.jsx'
import { Loading } from './components/ui.jsx'

// Heavy pages (they pull in the charting library) load on demand.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Predict = lazy(() => import('./pages/Predict.jsx'))
const Result = lazy(() => import('./pages/Result.jsx'))
const History = lazy(() => import('./pages/History.jsx'))
const About = lazy(() => import('./pages/About.jsx'))

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/result/:id" element={<Result />} />
          <Route path="/history" element={<History />} />
          <Route path="/about" element={<About />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
