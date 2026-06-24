const KEY = 'sat_prep_history'

export function loadHistory() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') }
  catch { return [] }
}

export function saveToHistory(session) {
  try {
    const history = loadHistory()
    const updated = [session, ...history].slice(0, 50)
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch { /* Safari private mode or storage full */ }
}

export function clearHistory() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

export function updateSessionName(id, name) {
  try {
    const history = loadHistory()
    const updated = history.map(s => s.id === id ? { ...s, sessionName: name } : s)
    localStorage.setItem(KEY, JSON.stringify(updated))
    return updated
  } catch { return null }
}

export function updateSessionMood(id, mood) {
  try {
    const history = loadHistory()
    const updated = history.map(s => s.id === id ? { ...s, mood } : s)
    localStorage.setItem(KEY, JSON.stringify(updated))
    return updated
  } catch { return null }
}

export function updateSessionNote(id, note) {
  try {
    const history = loadHistory()
    const updated = history.map(s => s.id === id ? { ...s, note } : s)
    localStorage.setItem(KEY, JSON.stringify(updated))
    return updated
  } catch { return null }
}

export function deleteSessions(ids) {
  try {
    const idSet = new Set(ids)
    const updated = loadHistory().filter(s => !idSet.has(s.id))
    localStorage.setItem(KEY, JSON.stringify(updated))
    return updated
  } catch { return null }
}
