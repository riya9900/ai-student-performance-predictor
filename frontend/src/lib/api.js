export const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(API_BASE + path, { headers: { 'Content-Type': 'application/json' }, ...options })
  } catch {
    throw new ApiError(`Cannot reach the backend at ${API_BASE}. Make sure it is running (see README).`, 0)
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (Array.isArray(body.detail)) {
        msg = body.detail.map((d) => `${(d.loc || []).slice(1).join('.')}: ${d.msg}`).join('; ')
      } else if (body.detail) msg = body.detail
    } catch { /* non-JSON error body */ }
    throw new ApiError(msg, res.status)
  }
  return res.json()
}

export const api = {
  health: () => request('/api/health'),
  predict: (payload) => request('/api/predict', { method: 'POST', body: JSON.stringify(payload) }),
  history: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    return request('/api/history?' + q.toString())
  },
  historyItem: (id) => request(`/api/history/${id}`),
  dashboard: () => request('/api/dashboard'),
  modelInfo: () => request('/api/model-info'),
  plotUrl: (name) => `${API_BASE}/api/model-info/plots/${name}`,
}
