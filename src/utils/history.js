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

// ─── Spaced repetition ─────────────────────────────────────────────────────
const SR_KEY = 'sat_prep_sr'
const SR_INTERVALS = [1, 3, 7] // days between reviews

export function loadSR() {
  try { return JSON.parse(localStorage.getItem(SR_KEY) || '{}') }
  catch { return {} }
}

function saveSR(data) {
  try { localStorage.setItem(SR_KEY, JSON.stringify(data)) } catch {}
}

export function recordSRAnswer(questionId, correct) {
  const sr = loadSR()
  const entry = sr[questionId] ?? { stage: 0, nextReview: null }
  if (correct) {
    const next = SR_INTERVALS[entry.stage] ?? null
    if (next === null) {
      delete sr[questionId] // graduated
    } else {
      const d = new Date(); d.setDate(d.getDate() + SR_INTERVALS[entry.stage])
      sr[questionId] = { stage: entry.stage + 1, nextReview: d.toISOString().slice(0, 10) }
    }
  } else {
    const d = new Date(); d.setDate(d.getDate() + SR_INTERVALS[0])
    sr[questionId] = { stage: 0, nextReview: d.toISOString().slice(0, 10) }
  }
  saveSR(sr)
}

export function getDueReviews(allQuestions) {
  const sr = loadSR()
  const today = new Date().toISOString().slice(0, 10)
  const dueIds = Object.entries(sr)
    .filter(([, e]) => e.nextReview && e.nextReview <= today)
    .map(([id]) => id)
  const byId = Object.fromEntries(allQuestions.map(q => [q.id, q]))
  return dueIds.map(id => byId[id]).filter(Boolean)
}

export function getSRCount() {
  const sr = loadSR()
  const today = new Date().toISOString().slice(0, 10)
  return Object.values(sr).filter(e => e.nextReview && e.nextReview <= today).length
}

export function deleteSessions(ids) {
  try {
    const idSet = new Set(ids)
    const updated = loadHistory().filter(s => !idSet.has(s.id))
    localStorage.setItem(KEY, JSON.stringify(updated))
    return updated
  } catch { return null }
}
