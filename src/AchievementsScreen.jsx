import { useMemo, useState } from 'react'
import { ACHIEVEMENTS, loadGamification } from './utils/gamification'
import { loadHistory } from './utils/history'

const CATEGORIES = [
  { id: 'all',      label: 'All' },
  { id: 'accuracy', label: 'Accuracy',  ids: ['perfect','sharp','consistent','hat-trick','comeback'] },
  { id: 'volume',   label: 'Volume',    ids: ['century','five-hundred','thousand','combo-5','combo-10'] },
  { id: 'streak',   label: 'Streaks',   ids: ['streak-3','streak-7','streak-14','early-bird','night-owl','grinder'] },
  { id: 'special',  label: 'Special',   ids: ['beast-mode','beast-ace','blitz-10','domain-day','speed','comeback-kid'] },
  { id: 'milestones', label: 'Progress',ids: ['first-step','xp-1000','hard-worker','grinder'] },
]

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
    case 'beast-mode':   return h('Beast Mode sessions', stats.beastSessions, 1)
    case 'blitz-10':     return h('Best Blitz correct', stats.bestBlitzCorrect, 10)
    default:             return null
  }
}

export default function AchievementsScreen({ onBack }) {
  const [activeTab, setActiveTab] = useState('all')
  const gam = useMemo(() => loadGamification(), [])
  const history = useMemo(() => loadHistory(), [])
  const unlocked = Object.keys(gam.achievements).length
  const total = ACHIEVEMENTS.length
  const pct = Math.round((unlocked / total) * 100)
  const circ = 2 * Math.PI * 24

  const stats = useMemo(() => {
    let totalQ = 0, hardCorrect = 0, bestCombo = 0, beastSessions = 0, bestBlitzCorrect = 0
    for (const s of history) {
      totalQ += s.score.total
      for (const q of s.questions)
        if (q.difficulty === 3 && (s.answers[q.id] ?? null) === q.answer) hardCorrect++
      if (s.maxCombo) bestCombo = Math.max(bestCombo, s.maxCombo)
      if (s.formatLabel === 'Beast Mode') beastSessions++
      if (s.formatLabel === 'Blitz Mode') bestBlitzCorrect = Math.max(bestBlitzCorrect, s.score.correct)
    }
    const dates = new Set(history.map(s => s.completedAt.slice(0, 10)))
    const d = new Date(); let streak = 0
    while (dates.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
    return { totalQ, hardCorrect, bestCombo, streak, beastSessions, bestBlitzCorrect }
  }, [history])

  const visibleAchievements = useMemo(() => {
    if (activeTab === 'all') return ACHIEVEMENTS
    const cat = CATEGORIES.find(c => c.id === activeTab)
    if (!cat?.ids) return ACHIEVEMENTS
    return ACHIEVEMENTS.filter(a => cat.ids.includes(a.id))
  }, [activeTab])

  const tabCounts = useMemo(() => {
    const counts = {}
    for (const cat of CATEGORIES) {
      if (cat.id === 'all') { counts.all = unlocked; continue }
      if (!cat.ids) continue
      counts[cat.id] = cat.ids.filter(id => gam.achievements[id]).length
    }
    return counts
  }, [gam, unlocked])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 px-4 py-10">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center justify-between mb-6">
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

        {/* Category tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === cat.id ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-indigo-300'
              }`}
            >
              {cat.label}
              {tabCounts[cat.id] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === cat.id ? 'bg-indigo-500' : 'bg-indigo-100 text-indigo-600'}`}>
                  {tabCounts[cat.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleAchievements.map(ach => {
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
