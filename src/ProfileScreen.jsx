import { useMemo } from 'react'
import { loadGamification, getLevelInfo, getLevelColor, ACHIEVEMENTS, getPrestigeInfo } from './utils/gamification'
import { loadHistory } from './utils/history'

const AVATAR_ICONS = ['🎓', '⭐', '🔥', '⚡', '🦁', '🧠', '🚀', '💎', '🏆', '🌟']

function getAvatar(level) { return AVATAR_ICONS[Math.min(level - 1, AVATAR_ICONS.length - 1)] }

function computeStreak(sessions) {
  const dates = new Set(sessions.map(s => s.completedAt.slice(0, 10)))
  const d = new Date(); let streak = 0
  while (dates.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}

export default function ProfileScreen({ onBack }) {
  const gam = useMemo(() => loadGamification(), [])
  const history = useMemo(() => loadHistory(), [])
  const levelInfo = useMemo(() => getLevelInfo(gam.totalXP), [gam])
  const levelColor = useMemo(() => getLevelColor(levelInfo.level), [levelInfo])
  const prestigeInfo = useMemo(() => getPrestigeInfo(gam), [gam])

  const stats = useMemo(() => {
    if (history.length === 0) return null
    const totalQ = history.reduce((n, s) => n + s.score.total, 0)
    const totalC = history.reduce((n, s) => n + s.score.correct, 0)
    const overallPct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0
    const streak = computeStreak(history)
    const bestPct = Math.max(...history.map(s => s.score.percent))
    const bestCombo = Math.max(...history.map(s => s.maxCombo ?? 0))
    const totalTime = history.reduce((n, s) => n + (s.elapsedSeconds ?? 0), 0)
    const studyDays = new Set(history.map(s => s.completedAt.slice(0, 10))).size
    const hardCorrect = history.reduce((n, s) =>
      n + s.questions.filter(q => q.difficulty === 3 && (s.answers[q.id] ?? null) === q.answer).length, 0)
    const estScore = Math.round((400 + (overallPct / 100) * 1200) / 10) * 10
    return { totalQ, totalC, overallPct, streak, bestPct, bestCombo, totalTime, studyDays, hardCorrect, estScore }
  }, [history])

  const recentAchs = useMemo(() => {
    return Object.entries(gam.achievements ?? {})
      .sort(([, a], [, b]) => new Date(b) - new Date(a))
      .slice(0, 6)
      .map(([id, date]) => ({ ...ACHIEVEMENTS.find(a => a.id === id), date }))
      .filter(Boolean)
  }, [gam])

  const weekStudy = useMemo(() => {
    const out = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const sessions = history.filter(s => s.completedAt?.slice(0, 10) === key)
      const avgPct = sessions.length ? Math.round(sessions.reduce((n, s) => n + s.score.percent, 0) / sessions.length) : 0
      out.push({ key, sessions: sessions.length, avgPct, day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] })
    }
    return out
  }, [history])

  const avatar = getAvatar(levelInfo.level)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 px-4 py-10">
      <div className="max-w-md mx-auto">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">← Back</button>

        {/* Profile header */}
        <div className={`rounded-3xl border-2 ${levelColor.border} bg-white p-6 mb-5 text-center`}>
          <div className={`w-20 h-20 rounded-full ${levelColor.ring} flex items-center justify-center text-4xl mx-auto mb-3`}>
            {avatar}
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <p className={`text-xl font-black ${levelColor.text}`}>Level {levelInfo.level}</p>
            {prestigeInfo.title && <span className="text-xs font-bold text-amber-600">{prestigeInfo.title}</span>}
          </div>
          <p className="text-sm text-gray-500 mb-4">{levelInfo.title}</p>

          {levelInfo.xpForNext ? (
            <div className="mb-1">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                <span>{levelInfo.xpIntoLevel} XP</span>
                <span>{levelInfo.xpForNext} XP to next level</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${levelColor.ring} rounded-full transition-all`} style={{ width: `${levelInfo.pct}%` }} />
              </div>
            </div>
          ) : (
            <p className="text-sm font-bold text-amber-600">Max Level Reached!</p>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
            <div><p className="text-xs text-gray-400">Total XP</p><p className={`text-lg font-black ${levelColor.text}`}>{(gam.totalXP ?? 0).toLocaleString()}</p></div>
            <div><p className="text-xs text-gray-400">Streak</p><p className="text-lg font-black text-orange-500">{stats?.streak ?? 0}🔥</p></div>
            <div><p className="text-xs text-gray-400">Achievements</p><p className="text-lg font-black text-indigo-600">{Object.keys(gam.achievements ?? {}).length}</p></div>
          </div>
        </div>

        {/* This week */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">This Week</p>
          <div className="flex gap-1.5">
            {weekStudy.map(d => {
              const color = d.sessions === 0 ? 'bg-gray-100' : d.avgPct >= 80 ? 'bg-emerald-400' : d.avgPct >= 65 ? 'bg-amber-400' : 'bg-rose-300'
              return (
                <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className={`w-full rounded-lg ${color} transition-all`} style={{ height: `${d.sessions === 0 ? 24 : 24 + d.avgPct * 0.3}px` }}
                    title={d.sessions > 0 ? `${d.avgPct}% avg (${d.sessions} session${d.sessions !== 1 ? 's' : ''})` : 'No study'} />
                  <span className="text-[10px] text-gray-400">{d.day}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Key stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Est. SAT Score', value: stats.estScore, sub: 'out of 1600', color: 'text-indigo-700' },
              { label: 'Overall Accuracy', value: `${stats.overallPct}%`, sub: `${stats.totalC}/${stats.totalQ} correct`, color: 'text-emerald-600' },
              { label: 'Study Days', value: stats.studyDays, sub: `across all time`, color: 'text-violet-600' },
              { label: 'Hard Qs Correct', value: stats.hardCorrect, sub: 'difficulty level 3', color: 'text-rose-600' },
              { label: 'Best Session', value: `${stats.bestPct}%`, sub: 'all-time high', color: 'text-amber-600' },
              { label: 'Best Combo', value: `${stats.bestCombo}x`, sub: 'consecutive correct', color: 'text-orange-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs font-semibold text-gray-500 mt-0.5">{s.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recent achievements */}
        {recentAchs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Recent Badges</p>
            <div className="grid grid-cols-3 gap-3">
              {recentAchs.map(a => (
                <div key={a.id} className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl mx-auto mb-1.5">
                    {a.icon}
                  </div>
                  <p className="text-xs font-bold text-gray-700 leading-tight">{a.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Inventory</p>
          <div className="flex gap-3">
            <div className="flex-1 bg-violet-50 border border-violet-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-violet-700">{gam.boosts ?? 0}</p>
              <p className="text-xs text-violet-500">🚀 XP Boosts</p>
            </div>
            <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-blue-700">{gam.streakFreezes ?? 0}</p>
              <p className="text-xs text-blue-500">🧊 Freezes</p>
            </div>
            <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-amber-700">{gam.hintCredits ?? 0}</p>
              <p className="text-xs text-amber-500">💡 Hints</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
