import { useMemo } from 'react'
import { ACHIEVEMENTS, loadGamification } from './utils/gamification'
import { loadHistory } from './utils/history'

function AchievementCard({ ach, unlockedAt, hint, hintPct }) {
  const dateStr = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className={`rounded-2xl border-2 p-4 flex items-start gap-3 transition-all ${
      unlockedAt ? 'border-indigo-200 bg-white' : 'border-gray-100 bg-gray-50'
    }`}>
      <div className={`text-2xl shrink-0 mt-0.5 ${unlockedAt ? '' : 'grayscale opacity-25'}`}>
        {ach.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-bold text-sm ${unlockedAt ? 'text-gray-900' : 'text-gray-400'}`}>{ach.title}</p>
        <p className={`text-xs mt-0.5 leading-snug ${unlockedAt ? 'text-gray-500' : 'text-gray-300'}`}>{ach.desc}</p>
        {dateStr && <p className="text-xs text-indigo-400 mt-1 font-medium">Unlocked {dateStr}</p>}
        {!unlockedAt && hint && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-xs text-gray-400">{hint}</p>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${hintPct}%` }} />
            </div>
          </div>
        )}
      </div>
      {unlockedAt && (
        <div className="shrink-0 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center mt-0.5">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  )
}

function getHint(achId, stats, gam) {
  const h = (label, val, max) => ({ hint: `${label}: ${Math.min(val, max)}/${max}`, pct: Math.min(100, Math.round((val / max) * 100)) })
  switch (achId) {
    case 'century':      return h('Questions answered', stats.totalQ, 100)
    case 'five-hundred': return h('Questions answered', stats.totalQ, 500)
    case 'thousand':     return h('Questions answered', stats.totalQ, 1000)
    case 'hard-worker':  return h('Hard questions correct', stats.hardCorrect, 25)
    case 'streak-3':     return h('Current streak', stats.streak, 3)
    case 'streak-7':     return h('Current streak', stats.streak, 7)
    case 'streak-14':    return h('Current streak', stats.streak, 14)
    case 'combo-5':      return h('Best combo', stats.bestCombo, 5)
    case 'combo-10':     return h('Best combo', stats.bestCombo, 10)
    case 'xp-1000':      return h('Total XP', gam.totalXP, 1000)
    default:             return null
  }
}

export default function AchievementsScreen({ onBack }) {
  const gam = useMemo(() => loadGamification(), [])
  const history = useMemo(() => loadHistory(), [])
  const unlocked = Object.keys(gam.achievements).length
  const total = ACHIEVEMENTS.length
  const pct = Math.round((unlocked / total) * 100)
  const circ = 2 * Math.PI * 24

  const stats = useMemo(() => {
    let totalQ = 0, hardCorrect = 0, bestCombo = 0
    for (const s of history) {
      totalQ += s.score.total
      for (const q of s.questions)
        if (q.difficulty === 3 && (s.answers[q.id] ?? null) === q.answer) hardCorrect++
      if (s.maxCombo) bestCombo = Math.max(bestCombo, s.maxCombo)
    }
    const dates = new Set(history.map(s => s.completedAt.slice(0, 10)))
    const d = new Date(); let streak = 0
    while (dates.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
    return { totalQ, hardCorrect, bestCombo, streak }
  }, [history])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 px-4 py-10">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-700 transition-colors mb-2 flex items-center gap-1">
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
            <p className="text-sm text-gray-500 mt-0.5">{unlocked} of {total} unlocked</p>
          </div>
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="#f3f4f6" strokeWidth="6" />
              <circle
                cx="28" cy="28" r="24" fill="none" stroke="#6366f1" strokeWidth="6"
                strokeDasharray={`${(unlocked / total) * circ} ${circ}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black text-indigo-600">{pct}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACHIEVEMENTS.map(ach => {
            const unlockedAt = gam.achievements[ach.id]?.unlockedAt ?? null
            const hintData = !unlockedAt ? getHint(ach.id, stats, gam) : null
            return (
              <AchievementCard
                key={ach.id}
                ach={ach}
                unlockedAt={unlockedAt}
                hint={hintData?.hint}
                hintPct={hintData?.pct}
              />
            )
          })}
        </div>

      </div>
    </div>
  )
}
