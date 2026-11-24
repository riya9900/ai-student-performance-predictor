import { useCallback, useEffect, useState } from 'react'

export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    run().then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (error) => alive && setState({ data: null, error, loading: false }),
    )
    return () => { alive = false }
  }, [run])
  return state
}
