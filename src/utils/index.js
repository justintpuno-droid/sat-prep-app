export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function pct(correct, total) {
  return total === 0 ? 0 : Math.round((correct / total) * 100)
}

export function scoreQuestions(questions, answers) {
  const byDomain = {}
  let correct = 0
  for (const q of questions) {
    const isCorrect = (answers[q.id] ?? null) === q.answer
    if (isCorrect) correct++
    if (!byDomain[q.domain]) byDomain[q.domain] = { correct: 0, total: 0 }
    byDomain[q.domain].total++
    if (isCorrect) byDomain[q.domain].correct++
  }
  return { correct, total: questions.length, percent: pct(correct, questions.length), byDomain }
}
