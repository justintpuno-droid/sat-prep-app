import { useMemo } from 'react'
import { loadHistory } from './utils/history'
import { loadGamification, getLevelInfo, ACHIEVEMENTS } from './utils/gamification'
import { pct, formatTime, shuffle } from './utils/index'
import { domainById } from './data/taxonomy'

function barColor(p) {
  return p >= 80 ? 'bg-emerald-500' : p >= 60 ? 'bg-amber-500' : 'bg-rose-500'
}

function textColor(p) {
  return p >= 80 ? 'text-emerald-600' : p >= 60 ? 'text-amber-600' : 'text-rose-500'
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function computeStreak(sessions) {
  const dates = new Set(sessions.map(s => s.completedAt.slice(0, 10)))
  const today = new Date().toISOString().slice(0, 10)
  let streak = 0
  const d = new Date(today)
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export default function AnalyticsScreen({ onBack, onDrillWeak, onAchievements }) {
  const sessions = useMemo(() => loadHistory(), [])
  const gam = useMemo(() => loadGamification(), [])
  const levelInfo = useMemo(() => getLevelInfo(gam.totalXP), [gam])
  const achievementsCount = Object.keys(gam.achievements).length
  const weekXP = useMemo(() => {
    const mon = new Date()
    const day = mon.getDay()
    mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
    const monStr = mon.toISOString().slice(0, 10)
    return (gam.xpLog ?? []).filter(e => e.date >= monStr).reduce((sum, e) => sum + e.xp, 0)
  }, [gam])

  const weekComparison = useMemo(() => {
    if (sessions.length === 0) return null
    const now = new Date()
    const mon = new Date(now)
    mon.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
    mon.setHours(0, 0, 0, 0)
    const prevMon = new Date(mon); prevMon.setDate(prevMon.getDate() - 7)
    const thisWeek = sessions.filter(s => new Date(s.completedAt) >= mon)
    const lastWeek = sessions.filter(s => { const d = new Date(s.completedAt); return d >= prevMon && d < mon })
    const thisQs = thisWeek.reduce((sum, s) => sum + s.score.total, 0)
    const lastQs = lastWeek.reduce((sum, s) => sum + s.score.total, 0)
    return { thisQs, lastQs, delta: thisQs - lastQs }
  }, [sessions])

  const stats = useMemo(() => {
    if (sessions.length === 0) return null

    const totalQ = sessions.reduce((s, sess) => s + sess.score.total, 0)
    const totalC = sessions.reduce((s, sess) => s + sess.score.correct, 0)
    const totalTime = sessions.reduce((s, sess) => s + sess.elapsedSeconds, 0)

    const byDomain = {}
    for (const sess of sessions) {
      for (const [id, ds] of Object.entries(sess.score.byDomain)) {
        if (!byDomain[id]) byDomain[id] = { correct: 0, total: 0 }
        byDomain[id].correct += ds.correct
        byDomain[id].total += ds.total
      }
    }
    const domainList = Object.entries(byDomain)
      .map(([id, ds]) => ({ id, label: domainById[id]?.label ?? id, ...ds, p: pct(ds.correct, ds.total) }))
      .sort((a, b) => b.total - a.total)

    const trend = sessions.slice(0, 15).reverse()
    const streak = computeStreak(sessions)

    // Difficulty breakdown
    const byDiff = { 1: { correct: 0, total: 0 }, 2: { correct: 0, total: 0 }, 3: { correct: 0, total: 0 } }
    for (const sess of sessions) {
      for (const q of sess.questions) {
        const ok = (sess.answers[q.id] ?? null) === q.answer
        byDiff[q.difficulty].total++
        if (ok) byDiff[q.difficulty].correct++
      }
    }
    const diffList = [
      { d: 1, label: 'Easy',   color: 'bg-emerald-500', text: 'text-emerald-600' },
      { d: 2, label: 'Medium', color: 'bg-amber-500',   text: 'text-amber-600'   },
      { d: 3, label: 'Hard',   color: 'bg-rose-500',    text: 'text-rose-600'    },
    ].filter(({ d }) => byDiff[d].total > 0).map(({ d, label, color, text }) => ({
      label, color, text, ...byDiff[d], p: pct(byDiff[d].correct, byDiff[d].total)
    }))

    // Weak questions: most frequently missed across all sessions (deduplicated by question ID)
    const qStats = {}
    for (const sess of sessions) {
      for (const q of sess.questions) {
        if (!qStats[q.id]) qStats[q.id] = { question: q, wrong: 0, total: 0 }
        qStats[q.id].total++
        if ((sess.answers[q.id] ?? null) !== q.answer) qStats[q.id].wrong++
      }
    }
    const weakQuestions = Object.values(qStats)
      .filter(s => s.wrong > 0)
      .sort((a, b) => (b.wrong / b.total) - (a.wrong / a.total) || b.wrong - a.wrong)
      .slice(0, 25)
      .map(s => s.question)

    // Most improved domain (recent 5 sessions vs. prior)
    let mostImproved = null
    if (sessions.length >= 10) {
      const calcPcts = (sesses) => {
        const byD = {}
        for (const s of sesses)
          for (const [d, ds] of Object.entries(s.score.byDomain)) {
            if (!byD[d]) byD[d] = { correct: 0, total: 0 }
            byD[d].correct += ds.correct; byD[d].total += ds.total
          }
        const result = {}
        for (const [d, ds] of Object.entries(byD))
          if (ds.total >= 5) result[d] = pct(ds.correct, ds.total)
        return result
      }
      const recentPcts = calcPcts(sessions.slice(-5))
      const olderPcts = calcPcts(sessions.slice(0, -5))
      let bestDelta = 5
      for (const [id, rp] of Object.entries(recentPcts)) {
        if (olderPcts[id] == null) continue
        const delta = rp - olderPcts[id]
        if (delta > bestDelta) { mostImproved = { id, label: domainById[id]?.label ?? id, rp, op: olderPcts[id], delta }; bestDelta = delta }
      }
    }

    // Time of day analysis
    const tod = { morning: { correct: 0, total: 0 }, afternoon: { correct: 0, total: 0 }, evening: { correct: 0, total: 0 } }
    for (const s of sessions) {
      const h = new Date(s.completedAt).getHours()
      const bucket = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
      tod[bucket].correct += s.score.correct; tod[bucket].total += s.score.total
    }
    const timeOfDay = Object.entries(tod)
      .filter(([, b]) => b.total >= 10)
      .map(([name, b]) => ({ name, emoji: name === 'morning' ? '🌅' : name === 'afternoon' ? '☀️' : '🌙', label: name.charAt(0).toUpperCase() + name.slice(1), p: pct(b.correct, b.total), ...b }))
      .sort((a, b) => b.p - a.p)

    // Domain accuracy trends (recent 5 sessions vs. older)
    const domainTrends = {}
    for (const d of domainList) {
      const dSess = sessions.filter(s => s.score.byDomain[d.id]?.total > 0)
      if (dSess.length < 6) { domainTrends[d.id] = 0; continue }
      const calc = (arr) => {
        const c = arr.reduce((sum, s) => sum + (s.score.byDomain[d.id]?.correct ?? 0), 0)
        const t = arr.reduce((sum, s) => sum + (s.score.byDomain[d.id]?.total ?? 0), 0)
        return t ? pct(c, t) : 0
      }
      domainTrends[d.id] = calc(dSess.slice(0, 5)) - calc(dSess.slice(5))
    }

    // Consistency: standard deviation of recent 10 session accuracies
    let consistency = null
    if (sessions.length >= 5) {
      const recent = sessions.slice(-10).map(s => s.score.percent)
      const mean = recent.reduce((a, b) => a + b, 0) / recent.length
      const stdDev = Math.round(Math.sqrt(recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length))
      const label = stdDev < 8 ? 'Consistent' : stdDev < 16 ? 'Variable' : 'Inconsistent'
      const color = stdDev < 8 ? 'text-emerald-600' : stdDev < 16 ? 'text-amber-600' : 'text-rose-500'
      consistency = { stdDev, label, color }
    }

    return { totalQ, totalC, overallPct: pct(totalC, totalQ), totalTime, domainList, trend, streak, weakQuestions, diffList, mostImproved, timeOfDay, domainTrends, consistency }
  }, [sessions])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 px-4 py-10">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-700 transition-colors mb-2 flex items-center gap-1">
            ← Back
          </button>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <p className="text-sm text-gray-500 mt-0.5">All-time performance across {sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
            </div>
            {sessions.length > 0 && (
              <button
                onClick={() => {
                  const recentPct = stats?.overallPct ?? 0
                  const text = `📚 SAT Prep Progress\nLevel ${levelInfo.level} ${levelInfo.title} · ${gam.totalXP.toLocaleString()} XP\n${stats?.streak > 0 ? `🔥 ${stats.streak}-day streak\n` : ''}📊 ${recentPct}% overall accuracy\n⭐ ${achievementsCount}/${ACHIEVEMENTS.length} achievements\n#SATPrep`
                  navigator.clipboard.writeText(text).catch(() => {})
                  alert('Progress copied to clipboard!')
                }}
                className="shrink-0 text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 rounded-xl px-3 py-1.5 transition-colors"
              >
                Share 📋
              </button>
            )}
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-gray-500">Complete your first session to see analytics.</p>
          </div>
        ) : (
          <>
            {/* Streak */}
            {stats.streak > 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-5 py-3 mb-4 flex items-center gap-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="font-bold text-amber-700">{stats.streak}-day study streak!</p>
                  <p className="text-xs text-amber-600">Keep it going — consistency beats cramming.</p>
                </div>
              </div>
            )}

            {/* Drill weak questions */}
            {onDrillWeak && stats.weakQuestions.length > 0 && (
              <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl px-5 py-4 mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-rose-700 text-sm">Practice your weak spots</p>
                  <p className="text-xs text-rose-500 mt-0.5">{stats.weakQuestions.length} question{stats.weakQuestions.length !== 1 ? 's' : ''} you've missed most</p>
                </div>
                <button
                  onClick={() => onDrillWeak(shuffle(stats.weakQuestions))}
                  className="shrink-0 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl px-4 py-2 transition-colors"
                >
                  Drill now →
                </button>
              </div>
            )}

            {/* Gamification stats */}
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-4 mb-4 text-white">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <span className="font-black text-lg">{levelInfo.level}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm">{levelInfo.title}</p>
                    <p className="text-xs text-indigo-200">{gam.totalXP.toLocaleString()} XP total</p>
                    {levelInfo.xpForNext && (
                      <div className="mt-1.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: `${levelInfo.pct}%` }} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-center shrink-0">
                  <p className="text-2xl font-black">{achievementsCount}<span className="text-base font-medium text-indigo-300">/{ACHIEVEMENTS.length}</span></p>
                  <p className="text-xs text-indigo-200">Achievements</p>
                  {onAchievements && (
                    <button onClick={onAchievements} className="text-xs text-indigo-200 hover:text-white underline mt-1 transition-colors">
                      View all →
                    </button>
                  )}
                </div>
                {gam.maxStreak > 0 && (
                  <div className="text-center shrink-0">
                    <p className="text-2xl font-black">{gam.maxStreak}</p>
                    <p className="text-xs text-indigo-200">Best streak</p>
                  </div>
                )}
                {weekXP > 0 && (
                  <div className="text-center shrink-0">
                    <p className="text-2xl font-black">+{weekXP}</p>
                    <p className="text-xs text-indigo-200">XP this week</p>
                  </div>
                )}
                {weekComparison && weekComparison.thisQs > 0 && (
                  <div className="text-center shrink-0">
                    <p className="text-2xl font-black">{weekComparison.thisQs}</p>
                    <p className="text-xs text-indigo-200">
                      Qs this week
                      {weekComparison.delta !== 0 && (
                        <span className={weekComparison.delta > 0 ? ' text-emerald-300' : ' text-rose-300'}>
                          {' '}{weekComparison.delta > 0 ? '+' : ''}{weekComparison.delta} vs last
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* XP history chart */}
            {(() => {
              const today = new Date()
              const days = Array.from({ length: 14 }, (_, i) => {
                const d = new Date(today)
                d.setDate(d.getDate() - (13 - i))
                return d.toISOString().slice(0, 10)
              })
              const byDay = {}
              for (const { date, xp } of (gam.xpLog ?? [])) byDay[date] = (byDay[date] ?? 0) + xp
              const values = days.map(d => byDay[d] ?? 0)
              const max = Math.max(...values, 1)
              const totalRecent = values.reduce((a, b) => a + b, 0)
              if (totalRecent === 0) return null
              return (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">XP Earned — Last 14 Days</p>
                    <span className="text-xs font-bold text-indigo-600">+{totalRecent.toLocaleString()} XP</span>
                  </div>
                  <div className="flex items-end gap-1 h-16">
                    {values.map((v, i) => {
                      const h = v > 0 ? Math.max(4, Math.round((v / max) * 64)) : 2
                      const isToday = days[i] === today.toISOString().slice(0, 10)
                      return (
                        <div key={days[i]} className="flex-1 flex flex-col items-center gap-1" title={`${days[i]}: +${v} XP`}>
                          <div
                            className={`w-full rounded-t-md transition-all ${v > 0 ? (isToday ? 'bg-indigo-600' : 'bg-indigo-300') : 'bg-gray-100'}`}
                            style={{ height: `${h}px` }}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-300">14d ago</span>
                    <span className="text-xs text-indigo-600 font-medium">Today</span>
                  </div>
                </div>
              )
            })()}

            {/* Estimated score trend */}
            {sessions.length >= 3 && (() => {
              const eligible = sessions.filter(s => s.score.total >= 5)
              if (eligible.length < 3) return null
              const last10 = eligible.slice(-10)
              const toScore = (p) => Math.round((400 + (p / 100) * 1200) / 10) * 10
              const scores = last10.map(s => toScore(s.score.percent))
              const min = Math.min(...scores) - 20
              const max = Math.max(...scores) + 20
              const range = max - min || 1
              const w = 100 / (scores.length - 1)
              const pts = scores.map((s, i) => `${i * w},${100 - ((s - min) / range) * 100}`).join(' ')
              const first = scores[0], last = scores[scores.length - 1]
              const delta = last - first
              return (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Estimated Score Trend</p>
                    <span className={`text-xs font-bold ${delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-500' : 'text-gray-400'}`}>
                      {delta > 0 ? '+' : ''}{delta} pts
                    </span>
                  </div>
                  <svg viewBox={`0 0 100 60`} className="w-full h-20" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="score-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points={`0,100 ${pts} 100,100`} fill="url(#score-grad)" />
                    <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {scores.map((s, i) => (
                      <circle key={i} cx={i * w} cy={100 - ((s - min) / range) * 100} r="2.5" fill="#6366f1" />
                    ))}
                  </svg>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-400">{first}</span>
                    <span className="text-xs text-indigo-600 font-bold">{last} est.</span>
                  </div>
                </div>
              )
            })()}

            {/* Top stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatCard label="Sessions" value={sessions.length} />
              <StatCard label="Questions" value={stats.totalQ.toLocaleString()} />
              <StatCard
                label="Overall Accuracy"
                value={<span className={textColor(stats.overallPct)}>{stats.overallPct}%</span>}
                sub={`${stats.totalC}/${stats.totalQ} correct`}
              />
              <StatCard label="Time Studied" value={formatTime(stats.totalTime)} />
              {stats.consistency && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                  <p className={`text-2xl font-black ${stats.consistency.color}`}>{stats.consistency.label}</p>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">Consistency</p>
                  <p className="text-xs text-gray-400 mt-0.5">±{stats.consistency.stdDev}% std dev</p>
                </div>
              )}
            </div>

            {/* Recent trend */}
            {stats.trend.length > 1 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                  Recent Sessions (last {stats.trend.length})
                </p>
                <div className="flex items-end gap-1 h-20">
                  {stats.trend.map((sess, i) => {
                    const h = Math.max(4, Math.round((sess.score.percent / 100) * 80))
                    const color = sess.score.percent >= 80 ? 'bg-emerald-500' : sess.score.percent >= 60 ? 'bg-amber-400' : 'bg-rose-400'
                    return (
                      <div key={sess.id} className="flex-1 flex flex-col items-center gap-1" title={`${sess.score.percent}% · ${new Date(sess.completedAt).toLocaleDateString()}`}>
                        <span className="text-xs text-gray-400 font-medium">{sess.score.percent}%</span>
                        <div className={`w-full rounded-t-md ${color}`} style={{ height: `${h}px` }} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Difficulty breakdown */}
            {stats.diffList.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Accuracy by Difficulty</p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {stats.diffList.map(({ label, color, text, correct, total, p }) => (
                    <div key={label} className="text-center">
                      <p className={`text-2xl font-black ${text}`}>{p}%</p>
                      <p className="text-xs text-gray-500 font-medium">{label}</p>
                      <p className="text-xs text-gray-400">{correct}/{total}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {stats.diffList.map(({ label, color, p }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-14 shrink-0">{label}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full`} style={{ width: `${p}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{p}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time of day analysis */}
            {stats.timeOfDay?.length >= 2 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Accuracy by Time of Day</p>
                <div className="space-y-3">
                  {stats.timeOfDay.map((t, i) => (
                    <div key={t.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">{t.emoji} {t.label} {i === 0 && <span className="text-xs text-emerald-600 font-semibold">· Best time</span>}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{t.correct}/{t.total}</span>
                          <span className={`text-sm font-bold ${textColor(t.p)}`}>{t.p}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor(t.p)} rounded-full`} style={{ width: `${t.p}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Domain breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">All-Time by Domain</p>
              <div className="space-y-4">
                {stats.domainList.map(d => {
                  const trend = stats.domainTrends[d.id] ?? 0
                  return (
                  <div key={d.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 font-medium">{d.label}</span>
                      <div className="flex items-center gap-2">
                        {Math.abs(trend) >= 5 && (
                          <span className={`text-xs font-semibold ${trend > 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                            {trend > 0 ? '↑' : '↓'}{Math.abs(trend)}%
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{d.correct}/{d.total}</span>
                        <span className={`text-sm font-bold w-10 text-right ${textColor(d.p)}`}>{d.p}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor(d.p)} rounded-full transition-all duration-500`} style={{ width: `${d.p}%` }} />
                    </div>
                  </div>
                )})}
              </div>

              {/* Most improved callout */}
              {stats.mostImproved && (
                <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-2xl">📈</span>
                  <div>
                    <p className="text-xs font-semibold text-emerald-600">Most Improved (last 5 sessions)</p>
                    <p className="text-sm font-bold text-gray-800">{stats.mostImproved.label}</p>
                    <p className="text-xs text-gray-500">+{stats.mostImproved.delta}% · from {stats.mostImproved.op}% → {stats.mostImproved.rp}%</p>
                  </div>
                </div>
              )}

              {/* Focus area recommendation */}
              {stats.domainList.filter(d => d.total >= 15).length >= 2 && (() => {
                const eligible = stats.domainList.filter(d => d.total >= 15).sort((a, b) => a.p - b.p)
                const focus = eligible[0]
                const avgPct = Math.round(stats.domainList.reduce((s, d) => s + d.p, 0) / stats.domainList.length)
                const gap = avgPct - focus.p
                if (gap < 10) return null
                return (
                  <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">🎯 Focus Area Recommendation</p>
                    <p className="text-sm font-bold text-gray-800">{focus.label}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Your accuracy here is {focus.p}% vs. your average of {avgPct}% — a {gap}-point gap.
                      Closing this gap could add the most points to your SAT score.
                    </p>
                  </div>
                )
              })()}

              {/* Strongest / weakest callout */}
              {stats.domainList.length >= 2 && (() => {
                const sorted = [...stats.domainList].sort((a, b) => a.p - b.p)
                const weakest = sorted[0]
                const strongest = sorted[sorted.length - 1]
                return (
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-rose-500 mb-0.5">Needs work</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{weakest.label}</p>
                      <p className={`text-lg font-black ${textColor(weakest.p)}`}>{weakest.p}%</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-emerald-600 mb-0.5">Strongest</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{strongest.label}</p>
                      <p className={`text-lg font-black ${textColor(strongest.p)}`}>{strongest.p}%</p>
                    </div>
                  </div>
                )
              })()}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
