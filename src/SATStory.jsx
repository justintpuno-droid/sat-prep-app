import { useState, useMemo } from 'react'
import { loadHistory } from './utils/history'
import { loadGamification, getLevelInfo, ACHIEVEMENTS } from './utils/gamification'
import { TAXONOMY } from './data/taxonomy'

const ALL_DOMAINS = TAXONOMY.flatMap(s => s.domains)

function pct(c, t) { return t === 0 ? 0 : Math.round((c / t) * 100) }

export default function SATStory({ onBack }) {
  const [copied, setCopied] = useState(false)

  const story = useMemo(() => {
    const history = loadHistory()
    const gam = loadGamification()
    if (history.length === 0) return null

    const totalQ = history.reduce((s, x) => s + x.score.total, 0)
    const totalC = history.reduce((s, x) => s + x.score.correct, 0)
    const overall = pct(totalC, totalQ)

    const first = new Date(history[0].completedAt)
    const daysSince = Math.round((Date.now() - first) / 86400000) || 1
    const firstStr = first.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    const levelInfo = getLevelInfo(gam.totalXP ?? 0)
    const achievementCount = (gam.achievements ?? []).length
    const streak = gam.streak ?? 0
    const maxStreak = gam.maxStreak ?? streak

    // Early vs recent accuracy (first vs last 5 sessions with ≥5 Qs)
    const eligible = history.filter(s => s.score.total >= 5)
    const earlyPct = eligible.length >= 3
      ? pct(eligible.slice(0, 3).reduce((s, x) => s + x.score.correct, 0), eligible.slice(0, 3).reduce((s, x) => s + x.score.total, 0))
      : null
    const recentPct = eligible.length >= 3
      ? pct(eligible.slice(-3).reduce((s, x) => s + x.score.correct, 0), eligible.slice(-3).reduce((s, x) => s + x.score.total, 0))
      : null
    const improvement = earlyPct !== null && recentPct !== null ? recentPct - earlyPct : null

    // Domain stats
    const domainStats = {}
    for (const s of history) {
      for (const q of s.questions) {
        if (!domainStats[q.domain]) domainStats[q.domain] = { c: 0, t: 0 }
        domainStats[q.domain].t++
        if ((s.answers?.[q.id] ?? null) === q.answer) domainStats[q.domain].c++
      }
    }
    const domainList = ALL_DOMAINS
      .map(d => ({ ...d, ...domainStats[d.id], p: pct(domainStats[d.id]?.c ?? 0, domainStats[d.id]?.t ?? 0) }))
      .filter(d => (d.t ?? 0) >= 5)
      .sort((a, b) => b.p - a.p)

    const strongest = domainList[0] ?? null
    const weakest = [...domainList].sort((a, b) => a.p - b.p)[0] ?? null

    // Best session
    const best = [...history].sort((a, b) => b.score.percent - a.score.percent)[0]

    // Total study time
    const totalMins = Math.round(history.reduce((s, x) => s + (x.elapsedSeconds ?? 0), 0) / 60)

    // Estimated score
    const recentSessions = history.filter(s => s.score.total >= 10).slice(-10)
    let estScore = null
    if (recentSessions.length >= 3) {
      const avg = recentSessions.reduce((s, x) => s + x.score.percent, 0) / recentSessions.length / 100
      const bands = [[0.95,1500],[0.90,1400],[0.85,1300],[0.80,1200],[0.75,1100],[0.70,1000],[0.65,900],[0.60,800],[0,650]]
      estScore = (bands.find(([t]) => avg >= t) ?? bands[bands.length-1])[1]
    }

    return { totalQ, totalC, overall, first, firstStr, daysSince, levelInfo, achievementCount, streak, maxStreak, earlyPct, recentPct, improvement, strongest, weakest, best, totalMins, estScore, sessionCount: history.length, gam }
  }, [])

  function handleShare() {
    if (!story) return
    const { totalQ, overall, levelInfo, streak, achievementCount, strongest, estScore, sessionCount, improvement, firstStr } = story
    const lines = [
      '📚 My SAT Prep Story',
      '',
      `🗓️ Studying since ${firstStr}`,
      `📊 ${totalQ.toLocaleString()} questions · ${overall}% accuracy`,
      estScore ? `🎯 Estimated SAT score: ~${estScore}` : null,
      improvement !== null ? `📈 Improved ${improvement > 0 ? '+' : ''}${improvement}% since I started` : null,
      `🔥 ${streak}-day streak`,
      `⭐ Level ${levelInfo.level} — ${levelInfo.title}`,
      `🏆 ${achievementCount} achievement${achievementCount !== 1 ? 's' : ''} unlocked`,
      strongest ? `💪 Best domain: ${strongest.label} (${strongest.p}%)` : null,
      `📱 ${sessionCount} sessions completed`,
      '',
      'Practicing daily with SAT Prep App 💯',
    ].filter(Boolean).join('\n')

    if (navigator.share) {
      navigator.share({ text: lines }).catch(() => {})
    } else {
      navigator.clipboard.writeText(lines).catch(() => {})
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-pink-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-lg">
          <p className="text-5xl mb-4">📖</p>
          <p className="text-xl font-black text-gray-800 mb-2">No story yet!</p>
          <p className="text-sm text-gray-500 mb-6">Complete your first practice session to start building your SAT story.</p>
          <button onClick={onBack} className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors">
            Start practicing →
          </button>
        </div>
      </div>
    )
  }

  const { totalQ, totalC, overall, firstStr, daysSince, levelInfo, achievementCount, streak, maxStreak, earlyPct, recentPct, improvement, strongest, weakest, best, totalMins, estScore, sessionCount } = story

  const improvementColor = improvement === null ? 'text-gray-400' : improvement > 0 ? 'text-emerald-600' : improvement < 0 ? 'text-rose-500' : 'text-gray-500'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-pink-50 px-4 pt-safe-10 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors">← Back</button>

        {/* Hero card */}
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-7 mb-4 text-white shadow-xl">
          <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">My SAT Prep Story</p>
          <p className="text-3xl font-black mb-1">Level {levelInfo.level}</p>
          <p className="text-base font-semibold opacity-80 mb-5">{levelInfo.title}</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-black">{totalQ.toLocaleString()}</p>
              <p className="text-xs opacity-60 mt-0.5">Questions</p>
            </div>
            <div>
              <p className="text-2xl font-black">{overall}%</p>
              <p className="text-xs opacity-60 mt-0.5">Accuracy</p>
            </div>
            <div>
              <p className="text-2xl font-black">{streak}🔥</p>
              <p className="text-xs opacity-60 mt-0.5">Day Streak</p>
            </div>
          </div>
        </div>

        {/* Journey stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Journey</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Started studying</span>
              <span className="text-sm font-bold text-gray-800">{firstStr} · {daysSince}d ago</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Sessions completed</span>
              <span className="text-sm font-bold text-gray-800">{sessionCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total study time</span>
              <span className="text-sm font-bold text-gray-800">{totalMins >= 60 ? `${Math.floor(totalMins/60)}h ${totalMins % 60}m` : `${totalMins}m`}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total XP earned</span>
              <span className="text-sm font-bold text-indigo-600">{(story.gam.totalXP ?? 0).toLocaleString()} XP</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Achievements unlocked</span>
              <span className="text-sm font-bold text-amber-600">{achievementCount} / {ACHIEVEMENTS.length} 🏆</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Longest streak ever</span>
              <span className="text-sm font-bold text-orange-600">{maxStreak} days 🔥</span>
            </div>
          </div>
        </div>

        {/* Score improvement */}
        {improvement !== null && (
          <div className={`rounded-2xl border p-5 mb-4 shadow-sm ${improvement > 0 ? 'bg-emerald-50 border-emerald-100' : improvement < 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-gray-100'}`}>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Accuracy Over Time</p>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-2xl font-black text-gray-500">{earlyPct}%</p>
                <p className="text-xs text-gray-400 mt-0.5">When you started</p>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className={`text-2xl font-black ${improvementColor}`}>
                    {improvement > 0 ? '+' : ''}{improvement}%
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{improvement > 0 ? 'improvement' : improvement < 0 ? 'decline' : 'no change'}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-gray-800">{recentPct}%</p>
                <p className="text-xs text-gray-400 mt-0.5">Recently</p>
              </div>
            </div>
          </div>
        )}

        {/* Estimated score */}
        {estScore && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 mb-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2">Estimated SAT Score</p>
            <p className="text-4xl font-black text-amber-700">{estScore}</p>
            <p className="text-xs text-amber-600 mt-1">Based on recent {story.gam.totalXP > 0 ? 'session accuracy' : 'performance'}</p>
          </div>
        )}

        {/* Domain highlights */}
        {(strongest || weakest) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Domain Highlights</p>
            {strongest && (
              <div className="flex items-center gap-3 mb-3">
                <span className="text-lg">💪</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800">Strongest: {strongest.label}</p>
                  <p className="text-xs text-emerald-600">{strongest.p}% accuracy · {strongest.t} questions</p>
                </div>
              </div>
            )}
            {weakest && weakest.id !== strongest?.id && (
              <div className="flex items-center gap-3">
                <span className="text-lg">🎯</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800">Growth area: {weakest.label}</p>
                  <p className="text-xs text-rose-500">{weakest.p}% accuracy — focus here to boost your score</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Best session */}
        {best && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Best Session</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-black text-violet-600">{best.score.percent}%</p>
                <p className="text-xs text-gray-400 mt-0.5">{best.score.correct}/{best.score.total} correct · {best.formatLabel ?? 'Practice'}</p>
              </div>
              <p className="text-xs text-gray-400">{new Date(best.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
        )}

        {/* Share */}
        <button onClick={handleShare}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-2xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg mb-3">
          {copied ? '✅ Copied! Share it 🎉' : '📤 Share My SAT Story'}
        </button>
        <button onClick={onBack} className="w-full py-3 border-2 border-gray-200 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-white transition-colors">
          Back to Home
        </button>
      </div>
    </div>
  )
}
