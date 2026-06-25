import { useMemo, useState } from 'react'
import { ACHIEVEMENTS, loadGamification } from './utils/gamification'
import { loadHistory } from './utils/history'

const CATEGORIES = [
  { id: 'all',      label: 'All' },
  { id: 'accuracy', label: 'Accuracy',  ids: ['perfect','sharp','consistent','hat-trick','comeback','improver'] },
  { id: 'volume',   label: 'Volume',    ids: ['century','five-hundred','thousand','combo-5','combo-10','marathon','diversity'] },
  { id: 'streak',   label: 'Streaks',   ids: ['streak-3','streak-7','streak-14','streak-30','early-bird','night-owl','early-riser','night-grinder','grinder','perfect-week'] },
  { id: 'special',  label: 'Special',   ids: ['beast-mode','beast-ace','blitz-10','domain-day','speed','speed-run','comeback-kid','wrong-sprint','adaptive-ace','sudden-death-5','sudden-death-ace','all-formats','timed-ace'] },
  { id: 'milestones', label: 'Progress',ids: ['first-step','xp-1000','xp-5000','xp-10000','hard-worker','hard-elite','grinder','domain-master-5'] },
  { id: 'secret',   label: '🔒 Secret', ids: ['midnight-scholar','perfect-beast','centurion','five-in-a-day','speed-god'] },
]

function AchievementCard({ ach, unlockedAt, hint, hintPct }) {
  if (ach.hidden && !unlockedAt) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 flex items-center gap-3">
        <div className="text-2xl shrink-0 grayscale opacity-20">🔒</div>
        <div>
          <p className="font-bold text-sm text-gray-300">???</p>
          <p className="text-xs text-gray-300 mt-0.5">Hidden achievement — keep playing to discover it</p>
        </div>
      </div>
    )
  }
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
    case 'sharp':        return h('Sessions with 90%+', stats.ninety, 5)
    case 'hat-trick':    return h('Consecutive 80%+ sessions', stats.currentHatTrickRun, 3)
    case 'consistent':   return h('Consecutive 70%+ sessions', stats.currentConsistentRun, 10)
    case 'grinder':      return h('Day streak', stats.streak, 5)
    case 'perfect-week': return { hint: 'Study 7 consecutive days with 80%+', pct: Math.min(100, Math.round((stats.streak / 7) * 100)) }
    case 'marathon':     return { hint: 'Study 60+ min in one day', pct: 0 }
    case 'improver':     return { hint: 'Beat your last session score by 20+ points', pct: 0 }
    case 'speed-run':    return { hint: 'Avg under 30s/question in a session', pct: 0 }
    case 'diversity':        return { hint: 'Practice 8+ domains in one week', pct: 0 }
    case 'domain-master-5': return h('Domains mastered (≥80%, ≥20 Qs)', stats.masteredDomains, 5)
    case 'xp-5000':          return h('Total XP', gam.totalXP, 5000)
    case 'wrong-sprint':     return { hint: 'Score 80%+ on a Wrong Answer Sprint', pct: 0 }
    case 'adaptive-ace':     return { hint: 'Score 90%+ on an Adaptive Quiz', pct: 0 }
    case 'streak-30':        return h('Current streak', stats.streak, 30)
    case 'night-grinder':    return h('Sessions after 11pm', stats.nightSessions, 5)
    case 'early-riser':      return h('Sessions before 7am', stats.earlyMorningSessions, 5)
    case 'hard-elite':       return h('Hard questions correct', stats.hardCorrect, 50)
    case 'all-formats':      return { hint: 'Try Quick 5, Beast, Blitz, Adaptive, and Sudden Death modes', pct: Math.min(100, Math.round((stats.formatsUsed / 5) * 100)) }
    case 'timed-ace':        return { hint: 'Score 90%+ on a Timed Challenge', pct: 0 }
    case 'xp-10000':         return h('Total XP', gam.totalXP, 10000)
    case 'ramp-master':      return { hint: 'Complete Ramp Mode with 15/15', pct: 0 }
    case 'hearts-iron':      return { hint: 'Finish Hearts Mode without losing a life', pct: 0 }
    case 'sat-ace':          return { hint: 'Score 90%+ on SAT Timed Mode', pct: 0 }
    case 'scholar':          return h('Days studied', stats.studyDays, 30)
    case 'comeback-king':    return h('Comeback sessions (60%→80%)', stats.comebacks, 3)
    case 'algebra-ace':     return h('Algebra questions answered', stats.dom('algebra').t, 30)
    case 'grammar-guru':    return h('Conventions questions answered', stats.dom('conventions').t, 25)
    case 'math-master':     return h('Math questions answered', stats.mathT, 60)
    case 'reading-pro':     return h('Reading & Writing questions', stats.rwT, 25)
    case 'stats-star':      return h('Problem Solving & Data questions', stats.dom('problem-solving-data').t, 20)
    case 'geometry-genius': return h('Geometry questions answered', stats.dom('geometry-trig').t, 20)
    case 'session-5':       return h('Sessions completed', stats.sessions, 5)
    case 'session-10':      return h('Sessions completed', stats.sessions, 10)
    case 'session-25':      return h('Sessions completed', stats.sessions, 25)
    case 'session-50':      return h('Sessions completed', stats.sessions, 50)
    case 'session-100':     return h('Sessions completed', stats.sessions, 100)
    case 'vocab-10':        return h('Vocab words mastered', stats.vocabMastered, 10)
    case 'vocab-30':        return h('Vocab words mastered', stats.vocabMastered, 30)
    case 'vocab-50':        return h('Vocab words mastered', stats.vocabMastered, 50)
    case 'vocab-all':       return h('Vocab words mastered', stats.vocabMastered, 93)
    case 'formula-10':      return h('Formulas mastered', stats.formulaMastered, 10)
    case 'formula-all':     return h('Formulas mastered', stats.formulaMastered, 36)
    default:                 return null
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
    let totalQ = 0, hardCorrect = 0, bestCombo = 0, beastSessions = 0, bestBlitzCorrect = 0, ninety = 0
    for (const s of history) {
      totalQ += s.score.total
      for (const q of s.questions)
        if (q.difficulty === 3 && (s.answers[q.id] ?? null) === q.answer) hardCorrect++
      if (s.maxCombo) bestCombo = Math.max(bestCombo, s.maxCombo)
      if (s.formatLabel === 'Beast Mode') beastSessions++
      if (s.formatLabel === 'Blitz Mode') bestBlitzCorrect = Math.max(bestBlitzCorrect, s.score.correct)
      if (s.score.percent >= 90) ninety++
    }
    const dates = new Set(history.map(s => s.completedAt.slice(0, 10)))
    const d = new Date(); let streak = 0
    while (dates.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
    // Compute current consecutive 80%+ and 70%+ runs
    let currentHatTrickRun = 0, currentConsistentRun = 0
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].score.percent >= 80) currentHatTrickRun++; else break
    }
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].score.percent >= 70) currentConsistentRun++; else break
    }
    const byDomain = {}
    for (const s of history) for (const q of s.questions) {
      if (!byDomain[q.domain]) byDomain[q.domain] = { c: 0, t: 0 }
      byDomain[q.domain].t++
      if ((s.answers?.[q.id] ?? null) === q.answer) byDomain[q.domain].c++
    }
    const masteredDomains = Object.values(byDomain).filter(v => v.t >= 20 && v.c / v.t >= 0.8).length
    const nightSessions = history.filter(s => new Date(s.completedAt).getHours() >= 23).length
    const earlyMorningSessions = history.filter(s => new Date(s.completedAt).getHours() < 7).length
    const formatSet = new Set(history.map(s => s.formatLabel))
    const formatsUsed = ['Quick 5','Beast Mode','Blitz Mode','Adaptive Quiz','Sudden Death'].filter(f => formatSet.has(f)).length
    const studyDays = new Set(history.map(s => s.completedAt.slice(0, 10))).size
    let comebacks = 0
    for (let i = 1; i < history.length; i++) {
      if (history[i-1].score.percent < 60 && history[i].score.percent >= 80) comebacks++
    }
    const dom = (id) => ({ c: byDomain[id]?.c ?? 0, t: byDomain[id]?.t ?? 0 })
    const RW = ['information-ideas','craft-structure','expression-ideas','conventions']
    const MATH = ['algebra','advanced-math','geometry-trig','problem-solving-data']
    const rwC = RW.reduce((s, d) => s + (byDomain[d]?.c ?? 0), 0)
    const rwT = RW.reduce((s, d) => s + (byDomain[d]?.t ?? 0), 0)
    const mathC = MATH.reduce((s, d) => s + (byDomain[d]?.c ?? 0), 0)
    const mathT = MATH.reduce((s, d) => s + (byDomain[d]?.t ?? 0), 0)
    let vocabMastered = 0, formulaMastered = 0
    try { vocabMastered = Object.values(JSON.parse(localStorage.getItem('sat_prep_vocab') ?? '{}')).filter(p => p.mastered).length } catch {}
    try { formulaMastered = Object.values(JSON.parse(localStorage.getItem('sat_prep_math_flash') ?? '{}')).filter(p => p.mastered).length } catch {}
    return { totalQ, hardCorrect, bestCombo, streak, beastSessions, bestBlitzCorrect, ninety, currentHatTrickRun, currentConsistentRun, masteredDomains, nightSessions, earlyMorningSessions, formatsUsed, studyDays, comebacks, byDomain, dom, rwC, rwT, mathC, mathT, sessions: history.length, vocabMastered, formulaMastered }
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
