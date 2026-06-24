import { useMemo } from 'react'
import { loadHistory } from './utils/history'
import { loadGamification, getLevelInfo, ACHIEVEMENTS } from './utils/gamification'
import { pct, formatTime, shuffle } from './utils/index'
import { domainById, skillById } from './data/taxonomy'

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

    // Skill-level breakdown
    const bySkill = {}
    for (const sess of sessions) {
      for (const q of sess.questions) {
        if (!q.skill) continue
        if (!bySkill[q.skill]) bySkill[q.skill] = { correct: 0, total: 0, domain: q.domain }
        bySkill[q.skill].total++
        if ((sess.answers[q.id] ?? null) === q.answer) bySkill[q.skill].correct++
      }
    }
    const skillList = Object.entries(bySkill)
      .filter(([, s]) => s.total >= 5)
      .map(([id, s]) => ({ id, label: skillById[id]?.label ?? id.replace(/-/g, ' '), ...s, p: pct(s.correct, s.total) }))
      .sort((a, b) => a.p - b.p)

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

    // Score plateau detection: last 5 sessions all within ±20 points of each other
    let plateau = null
    const recentEst = sessions.slice(-5).filter(s => s.score.total >= 5).map(s => Math.round((400 + (s.score.percent / 100) * 1200) / 10) * 10)
    if (recentEst.length >= 5) {
      const range = Math.max(...recentEst) - Math.min(...recentEst)
      if (range <= 40) {
        const avg = Math.round(recentEst.reduce((a, b) => a + b, 0) / recentEst.length / 10) * 10
        plateau = { avg, range }
      }
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

    // Wrong answer choice bias
    const wrongChoices = { A: 0, B: 0, C: 0, D: 0 }
    for (const s of sessions) {
      for (const q of s.questions) {
        const chosen = s.answers?.[q.id]
        if (chosen && chosen !== q.answer) wrongChoices[chosen] = (wrongChoices[chosen] ?? 0) + 1
      }
    }
    const biasTotal = Object.values(wrongChoices).reduce((a, b) => a + b, 0)
    const answerBias = biasTotal >= 20 ? wrongChoices : null

    // Weekly accuracy sparkline (last 6 weeks)
    const weeklyAccuracy = []
    for (let w = 5; w >= 0; w--) {
      const start = new Date(); start.setDate(start.getDate() - start.getDay() - w * 7); start.setHours(0,0,0,0)
      const end = new Date(start); end.setDate(end.getDate() + 7)
      const ws = sessions.filter(s => { const d = new Date(s.completedAt); return d >= start && d < end })
      if (ws.length === 0) { weeklyAccuracy.push({ sessions: 0, pct: null }); continue }
      const c = ws.reduce((s, x) => s + x.score.correct, 0)
      const t = ws.reduce((s, x) => s + x.score.total, 0)
      weeklyAccuracy.push({ sessions: ws.length, pct: pct(c, t) })
    }

    // Score distribution histogram
    const scoreDist = [
      { label: '<60%', min: 0, max: 60, color: 'bg-rose-400', count: 0 },
      { label: '60-69', min: 60, max: 70, color: 'bg-amber-400', count: 0 },
      { label: '70-79', min: 70, max: 80, color: 'bg-yellow-400', count: 0 },
      { label: '80-89', min: 80, max: 90, color: 'bg-emerald-400', count: 0 },
      { label: '90%+', min: 90, max: 101, color: 'bg-emerald-600', count: 0 },
    ]
    for (const s of sessions) {
      const bucket = scoreDist.find(b => s.score.percent >= b.min && s.score.percent < b.max)
      if (bucket) bucket.count++
    }

    // Wrong answers per session trend: recent 5 vs prior 5
    let wrongTrend = null
    {
      const eligible = sessions.filter(s => s.score.total >= 5)
      if (eligible.length >= 8) {
        const older = eligible.slice(-10, -5)
        const newer = eligible.slice(-5)
        const oldWrong = older.reduce((s, x) => s + (x.score.total - x.score.correct), 0) / older.length
        const newWrong = newer.reduce((s, x) => s + (x.score.total - x.score.correct), 0) / newer.length
        const delta = Math.round((oldWrong - newWrong) * 10) / 10
        wrongTrend = { oldWrong: Math.round(oldWrong * 10) / 10, newWrong: Math.round(newWrong * 10) / 10, delta, improved: delta > 0.5 }
      }
    }

    // 30-day activity heatmap data
    const heatmap = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const daySessions = sessions.filter(s => s.completedAt?.slice(0, 10) === key)
      const count = daySessions.length
      const avgPct = count ? Math.round(daySessions.reduce((s, x) => s + x.score.percent, 0) / count) : 0
      heatmap.push({ key, count, avgPct, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
    }

    // Average session length
    const avgSessionMin = sessions.length > 0 ? Math.round(totalTime / sessions.length / 60) : null

    // Performance by session format
    const byFormat = {}
    for (const s of sessions) {
      const key = s.formatLabel ?? 'Unknown'
      if (!byFormat[key]) byFormat[key] = { correct: 0, total: 0, count: 0 }
      byFormat[key].count++
      byFormat[key].correct += s.score.correct
      byFormat[key].total += s.score.total
    }
    const formatStats = Object.entries(byFormat)
      .filter(([, v]) => v.count >= 1)
      .map(([label, v]) => ({ label, count: v.count, pct: pct(v.correct, v.total) }))
      .sort((a, b) => b.count - a.count)

    // Personal records
    let bestSessionPct = 0, bestSessionDate = null, bestComboAll = 0, maxXPDay = 0
    for (const s of sessions) {
      if (s.score.percent > bestSessionPct) { bestSessionPct = s.score.percent; bestSessionDate = s.completedAt?.slice(0, 10) }
      if ((s.maxCombo ?? 0) > bestComboAll) bestComboAll = s.maxCombo
    }
    // XP per day from xpLog on gam object is not available here; approximate from history
    const xpByDay = {}
    for (const s of sessions) {
      const day = s.completedAt?.slice(0, 10)
      if (!day) continue
      xpByDay[day] = (xpByDay[day] ?? 0) + s.score.correct * 10 + (s.score.total - s.score.correct) * 5
    }
    maxXPDay = Math.max(0, ...Object.values(xpByDay))
    const personalRecords = { bestSessionPct, bestSessionDate, bestComboAll, maxXPDay }

    // Wrong answer position analysis: do wrong answers cluster at start/middle/end?
    let positionAnalysis = null
    {
      let early = { c: 0, t: 0 }, late = { c: 0, t: 0 }
      for (const s of sessions) {
        const n = s.questions.length
        if (n < 6) continue
        s.questions.forEach((q, i) => {
          const bucket = i < n / 3 ? 'early' : i < 2 * n / 3 ? null : 'late'
          if (!bucket) return
          const data = bucket === 'early' ? early : late
          data.t++
          if ((s.answers?.[q.id] ?? null) === q.answer) data.c++
        })
      }
      if (early.t >= 15 && late.t >= 15) {
        const ep = pct(early.c, early.t), lp = pct(late.c, late.t)
        const diff = ep - lp
        if (diff >= 8) positionAnalysis = { early: ep, late: lp, gap: diff, issue: 'end-fatigue' }
        else if (diff <= -8) positionAnalysis = { early: ep, late: lp, gap: -diff, issue: 'start-slow' }
      }
    }

    // Questions per minute efficiency
    const qPerMin = totalTime > 0 ? (totalQ / (totalTime / 60)).toFixed(1) : null

    // SAT score estimator
    let scoreEstimate = null
    {
      const eligible = sessions.filter(s => s.score.total >= 10).slice(-20)
      if (eligible.length >= 3) {
        const avgAcc = eligible.reduce((s, x) => s + x.score.percent, 0) / eligible.length / 100
        const map = [
          [0.95, 1450, 1550], [0.90, 1350, 1450], [0.85, 1250, 1350],
          [0.80, 1150, 1250], [0.75, 1050, 1150], [0.70, 950, 1050],
          [0.65, 850, 950],   [0.60, 750, 850],   [0.55, 650, 750],
          [0, 400, 649],
        ]
        const band = map.find(([thresh]) => avgAcc >= thresh)
        scoreEstimate = { lo: band[1], hi: band[2], acc: Math.round(avgAcc * 100), sessions: eligible.length }
      }
    }

    // SAT score estimate trend (rolling 5-session window)
    const scoreEstimateTrend = []
    const eligible = sessions.filter(s => s.score.total >= 10)
    for (let i = 4; i < eligible.length; i++) {
      const window = eligible.slice(Math.max(0, i - 4), i + 1)
      const avgAcc = window.reduce((s, x) => s + x.score.percent, 0) / window.length / 100
      const map = [[0.95,1500],[0.90,1400],[0.85,1300],[0.80,1200],[0.75,1100],[0.70,1000],[0.65,900],[0.60,800],[0.55,700],[0,550]]
      const mid = map.find(([t]) => avgAcc >= t)?.[1] ?? 550
      scoreEstimateTrend.push({ i, mid, date: eligible[i].completedAt.slice(0, 10) })
    }

    // Month-over-month accuracy (last 6 calendar months)
    const monthlyAccuracy = []
    for (let m = 5; m >= 0; m--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m)
      const monthKey = d.toISOString().slice(0, 7)
      const monthSessions = sessions.filter(s => s.completedAt.slice(0, 7) === monthKey && s.score.total >= 5)
      const avgPct = monthSessions.length > 0
        ? Math.round(monthSessions.reduce((s, x) => s + x.score.percent, 0) / monthSessions.length)
        : null
      const label = d.toLocaleDateString('en-US', { month: 'short' })
      monthlyAccuracy.push({ monthKey, label, avgPct, count: monthSessions.length })
    }

    // 12-week contribution calendar (84 days, arranged Sun–Sat × 12 weeks)
    const today12 = new Date(); today12.setHours(0,0,0,0)
    const calGrid = []
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today12); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const daySessions = sessions.filter(s => s.completedAt.slice(0, 10) === key)
      const count = daySessions.length
      const avgPct = count > 0 ? Math.round(daySessions.reduce((s, x) => s + x.score.percent, 0) / count) : 0
      calGrid.push({ key, count, avgPct, dow: d.getDay(), weekLabel: i % 7 === 0 ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null })
    }

    // Avg seconds per question by domain
    const speedByDomain = {}
    for (const s of sessions) {
      if (!s.questionTimes) continue
      for (const q of s.questions) {
        const t = s.questionTimes[q.id]
        if (!t || t <= 0 || t > 300) continue
        if (!speedByDomain[q.domain]) speedByDomain[q.domain] = { sum: 0, n: 0 }
        speedByDomain[q.domain].sum += t; speedByDomain[q.domain].n++
      }
    }
    const speedByDomainList = Object.entries(speedByDomain)
      .filter(([, v]) => v.n >= 5)
      .map(([id, v]) => ({ id, label: (domainList.find(d => d.id === id) || {}).label ?? id, avg: Math.round(v.sum / v.n) }))
      .sort((a, b) => b.avg - a.avg)

    return { totalQ, totalC, overallPct: pct(totalC, totalQ), totalTime, domainList, skillList, trend, streak, weakQuestions, diffList, mostImproved, timeOfDay, domainTrends, consistency, answerBias, plateau, qPerMin, positionAnalysis, personalRecords, formatStats, heatmap, avgSessionMin, wrongTrend, scoreDist, weeklyAccuracy, scoreEstimate, scoreEstimateTrend, speedByDomainList, calGrid, monthlyAccuracy }
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

            {/* Smart Insights panel */}
            {sessions.length >= 5 && (() => {
              const tips = []
              // Worst domain
              const domainEntries = Object.entries(stats.domainList.reduce((m, d) => { m[d.id] = d; return m }, {}))
                .filter(([, d]) => d.total >= 10)
              if (domainEntries.length >= 2) {
                const worst = domainEntries.sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))[0]
                const wPct = Math.round((worst[1].correct / worst[1].total) * 100)
                if (wPct < 70) tips.push({ icon: '🎯', text: `Focus on ${worst[1].label ?? worst[0].replace(/-/g,' ')} — you're at ${wPct}% there, your lowest domain.` })
              }
              // Speed
              if (stats.qPerMin && stats.qPerMin < 0.6) {
                tips.push({ icon: '⏱', text: `Your avg pace is ${(60 / stats.qPerMin).toFixed(0)}s/question. SAT targets ~85s. Try timed sessions to build speed.` })
              }
              // Plateau
              if (stats.plateau) {
                tips.push({ icon: '📊', text: 'Your scores have been flat the last 5 sessions. Try Beast Mode or a new domain to break through.' })
              }
              // Best time of day
              if (stats.timeOfDay?.length >= 2) {
                const best = stats.timeOfDay.reduce((a, b) => (b.pct > a.pct ? b : a))
                if (best.pct > 70) tips.push({ icon: '🕐', text: `You perform best during ${best.label} (${best.pct}% accuracy). Schedule tough sessions then.` })
              }
              if (tips.length === 0) return null
              return (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">💡 Personalized Insights</p>
                  <div className="space-y-2">
                    {tips.slice(0, 3).map((t, i) => (
                      <div key={i} className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-800 leading-snug">
                        <span className="mr-2">{t.icon}</span>{t.text}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

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
                {stats.totalTime > 0 && (
                  <div className="text-center shrink-0">
                    <p className="text-2xl font-black">{Math.floor(stats.totalTime / 3600) > 0 ? `${Math.floor(stats.totalTime / 3600)}h` : `${Math.floor(stats.totalTime / 60)}m`}</p>
                    <p className="text-xs text-indigo-200">Total studied</p>
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

            {/* Domain Mastery Map */}
            {stats && stats.domainList.length >= 3 && (() => {
              const DOMAIN_GROUPS = [
                { label: 'Math', color: 'indigo', domains: ['algebra','advanced-math','problem-solving-data','geometry-trig'] },
                { label: 'Reading & Writing', color: 'violet', domains: ['information-ideas','craft-structure','expression-ideas','standard-english'] },
              ]
              const domainMap = Object.fromEntries(stats.domainList.map(d => [d.id, d]))
              return (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Domain Mastery Map</p>
                  {DOMAIN_GROUPS.map(g => (
                    <div key={g.label} className="mb-4 last:mb-0">
                      <p className={`text-xs font-bold text-${g.color}-600 mb-2`}>{g.label}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {g.domains.map(dId => {
                          const d = domainMap[dId]
                          if (!d) return (
                            <div key={dId} className="rounded-xl bg-gray-50 border border-dashed border-gray-200 p-3 flex items-center justify-between">
                              <span className="text-xs text-gray-400 truncate">{dId.replace(/-/g, ' ')}</span>
                              <span className="text-[10px] text-gray-300 ml-1">no data</span>
                            </div>
                          )
                          const { p, label, correct, total } = d
                          const bg = p >= 85 ? 'bg-emerald-100 border-emerald-300' : p >= 70 ? 'bg-amber-50 border-amber-300' : 'bg-rose-50 border-rose-300'
                          const fill = p >= 85 ? 'bg-emerald-400' : p >= 70 ? 'bg-amber-400' : 'bg-rose-400'
                          const txt = p >= 85 ? 'text-emerald-800' : p >= 70 ? 'text-amber-800' : 'text-rose-700'
                          const star = p >= 90 ? '⭐' : p >= 80 ? '✓' : p >= 65 ? '~' : '!'
                          return (
                            <div key={dId} className={`rounded-xl border p-3 ${bg}`}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-gray-700 truncate leading-tight" style={{ maxWidth: '70%' }}>{label}</span>
                                <span className={`text-xs font-black ${txt}`}>{star} {p}%</span>
                              </div>
                              <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                                <div className={`h-full ${fill} rounded-full`} style={{ width: `${p}%` }} />
                              </div>
                              <p className="text-[10px] text-gray-500 mt-1">{correct}/{total} correct</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Mastered (≥85%)</span>
                    <span className="flex items-center gap-1 text-[10px] text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Improving (≥70%)</span>
                    <span className="flex items-center gap-1 text-[10px] text-rose-600"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />Needs work (&lt;70%)</span>
                  </div>
                </div>
              )
            })()}

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
              {stats.avgSessionMin && <StatCard label="Avg Session" value={`${stats.avgSessionMin}m`} sub="per session" />}
              {stats.wrongTrend && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                  <p className={`text-2xl font-black ${stats.wrongTrend.improved ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {stats.wrongTrend.improved ? '↓' : '↑'} {Math.abs(stats.wrongTrend.delta)}
                  </p>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">Wrong / session</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stats.wrongTrend.newWrong} recent vs {stats.wrongTrend.oldWrong} before</p>
                </div>
              )}
              {stats.consistency && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                  <p className={`text-2xl font-black ${stats.consistency.color}`}>{stats.consistency.label}</p>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">Consistency</p>
                  <p className="text-xs text-gray-400 mt-0.5">±{stats.consistency.stdDev}% std dev</p>
                </div>
              )}
              {stats.qPerMin && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
                  <p className="text-2xl font-black text-indigo-600">{stats.qPerMin}</p>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">Qs / min</p>
                  <p className="text-xs text-gray-400 mt-0.5">avg speed</p>
                </div>
              )}
            </div>

            {/* National percentile estimate */}
            {stats.scoreEstimate && (() => {
              const mid = Math.round((stats.scoreEstimate.lo + stats.scoreEstimate.hi) / 2)
              // SAT percentile lookup (approximate 2024 data)
              const percentile = mid >= 1550 ? 99 : mid >= 1500 ? 98 : mid >= 1450 ? 96 : mid >= 1400 ? 94 : mid >= 1350 ? 91 : mid >= 1300 ? 87 : mid >= 1250 ? 82 : mid >= 1200 ? 74 : mid >= 1150 ? 66 : mid >= 1100 ? 58 : mid >= 1050 ? 49 : mid >= 1000 ? 40 : mid >= 950 ? 32 : mid >= 900 ? 25 : mid >= 850 ? 18 : mid >= 800 ? 12 : mid >= 750 ? 8 : 4
              return (
                <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
                  <div className="relative w-12 h-12 shrink-0">
                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="#f1f5f9" strokeWidth="5" />
                      <circle cx="22" cy="22" r="18" fill="none" stroke={percentile >= 75 ? '#10b981' : percentile >= 50 ? '#6366f1' : '#f59e0b'} strokeWidth="5"
                        strokeDasharray={`${(percentile / 100) * 2 * Math.PI * 18} ${2 * Math.PI * 18}`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-black text-gray-700">{percentile}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Est. National Percentile</p>
                    <p className="text-sm font-bold text-gray-800">Top {100 - percentile}% of test-takers</p>
                    <p className="text-xs text-gray-400">Based on {stats.scoreEstimate.lo}–{stats.scoreEstimate.hi} score range</p>
                  </div>
                </div>
              )
            })()}

            {/* SAT Score Estimate */}
            {stats.scoreEstimate && (
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 mb-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">Estimated SAT Score</p>
                <div className="flex items-end gap-3">
                  <div>
                    <p className="text-4xl font-black leading-none">{stats.scoreEstimate.lo}–{stats.scoreEstimate.hi}</p>
                    <p className="text-sm opacity-70 mt-1">Based on {stats.scoreEstimate.sessions} sessions · {stats.scoreEstimate.acc}% avg accuracy</p>
                  </div>
                  <div className="ml-auto shrink-0 text-right">
                    <p className="text-xs opacity-60">Out of 1600</p>
                    <div className="w-20 h-2 bg-white/20 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-white rounded-full" style={{ width: `${Math.round(((stats.scoreEstimate.lo - 400) / 1200) * 100)}%` }} />
                    </div>
                    <p className="text-xs opacity-60 mt-1">
                      {stats.scoreEstimate.hi >= 1400 ? '🎯 Excellent range!' : stats.scoreEstimate.hi >= 1200 ? '📈 Keep pushing!' : '💪 Great progress!'}
                    </p>
                  </div>
                </div>
                <p className="text-xs opacity-50 mt-3">* Rough estimate. Take a full practice test for accurate scoring.</p>
              </div>
            )}

            {/* SAT score trend chart */}
            {stats.scoreEstimateTrend.length >= 3 && (() => {
              const vals = stats.scoreEstimateTrend.map(e => e.mid)
              const minV = Math.min(...vals) - 50, maxV = Math.max(...vals) + 50
              const range = Math.max(maxV - minV, 100)
              const w = 260, h = 50
              const pts = vals.map((v, i) => `${Math.round((i / (vals.length - 1)) * w)},${Math.round(h - ((v - minV) / range) * h)}`)
              const first = vals[0], last = vals[vals.length - 1]
              const up = last > first
              return (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">SAT Score Trajectory</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${up ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-500'}`}>
                      {up ? '↑' : '↓'} {Math.abs(last - first)} pts
                    </span>
                  </div>
                  <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12">
                    <polyline points={pts.join(' ')} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
                    {vals.map((v, i) => (
                      <circle key={i} cx={Math.round((i / (vals.length - 1)) * w)} cy={Math.round(h - ((v - minV) / range) * h)} r={i === vals.length - 1 ? 3 : 2} fill={i === vals.length - 1 ? '#6366f1' : '#c7d2fe'} />
                    ))}
                  </svg>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-300">Earlier</span>
                    <span className="text-xs font-bold text-indigo-600">Now: ~{last}</span>
                  </div>
                </div>
              )
            })()}

            {/* Personal records */}
            {sessions.length >= 3 && stats.personalRecords && (
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-5 mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3">🏆 Personal Records</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Best session', value: `${stats.personalRecords.bestSessionPct}%`, sub: stats.personalRecords.bestSessionDate ? new Date(stats.personalRecords.bestSessionDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null },
                    { label: 'Best streak', value: `${gam.maxStreak ?? 0}d`, sub: 'days in a row' },
                    { label: 'Best combo', value: `${stats.personalRecords.bestComboAll}×`, sub: 'consecutive correct' },
                    { label: 'Best XP day', value: stats.personalRecords.maxXPDay, sub: 'XP in one day' },
                  ].map(r => (
                    <div key={r.label} className="bg-white/70 rounded-xl p-3 text-center">
                      <p className="text-lg font-black text-indigo-700">{r.value}</p>
                      <p className="text-xs font-semibold text-gray-500 mt-0.5">{r.label}</p>
                      {r.sub && <p className="text-xs text-gray-400 mt-0.5">{r.sub}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 12-week contribution calendar */}
            {stats.calGrid.some(d => d.count > 0) && (() => {
              const weeks = []
              for (let w = 0; w < 12; w++) weeks.push(stats.calGrid.slice(w * 7, w * 7 + 7))
              const DOW = ['S','M','T','W','T','F','S']
              const studiedDays = stats.calGrid.filter(d => d.count > 0).length
              return (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">12-Week Activity</p>
                    <span className="text-xs text-gray-400">{studiedDays} day{studiedDays !== 1 ? 's' : ''} studied</span>
                  </div>
                  <div className="flex gap-1">
                    {/* Day-of-week labels */}
                    <div className="flex flex-col gap-1 mr-1">
                      {DOW.map((d, i) => (
                        <div key={i} className="h-3.5 w-3 flex items-center justify-center">
                          {i % 2 === 1 && <span className="text-[8px] text-gray-300 leading-none">{d}</span>}
                        </div>
                      ))}
                    </div>
                    {/* Week columns */}
                    {weeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-1 flex-1">
                        {week.map((d, di) => {
                          const bg = d.count === 0 ? 'bg-gray-100' : d.avgPct >= 85 ? 'bg-emerald-500' : d.avgPct >= 70 ? 'bg-emerald-300' : 'bg-emerald-100'
                          return (
                            <div
                              key={di}
                              className={`rounded-sm aspect-square ${bg}`}
                              title={d.count ? `${d.key}: ${d.count} session${d.count !== 1 ? 's' : ''} · ${d.avgPct}%` : d.key}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <span className="text-xs text-gray-400">Less</span>
                    {['bg-gray-100','bg-emerald-100','bg-emerald-300','bg-emerald-500'].map((c, i) => <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />)}
                    <span className="text-xs text-gray-400">More</span>
                  </div>
                </div>
              )
            })()}

            {/* Score distribution histogram */}
            {sessions.length >= 5 && (() => {
              const maxCount = Math.max(...stats.scoreDist.map(b => b.count), 1)
              const mode = stats.scoreDist.reduce((a, b) => b.count > a.count ? b : a)
              return (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Score Distribution</p>
                  <div className="flex items-end gap-2 h-16">
                    {stats.scoreDist.map(b => (
                      <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full rounded-t-sm ${b.color} transition-all`} style={{ height: `${(b.count / maxCount) * 64}px` }} title={`${b.count} sessions`} />
                        <span className="text-xs text-gray-400 leading-none">{b.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Most sessions: <span className="font-semibold text-gray-700">{mode.label}</span> ({mode.count} sessions)</p>
                </div>
              )
            })()}

            {/* Performance by format */}
            {stats.formatStats.length >= 2 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Accuracy by Session Type</p>
                <div className="space-y-2.5">
                  {stats.formatStats.map(f => (
                    <div key={f.label} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-28 shrink-0 truncate">{f.label}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor(f.pct)}`} style={{ width: `${f.pct}%` }} />
                      </div>
                      <span className={`text-xs font-bold w-10 text-right shrink-0 ${textColor(f.pct)}`}>{f.pct}%</span>
                      <span className="text-xs text-gray-300 w-10 text-right shrink-0">{f.count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly accuracy sparkline */}
            {stats.weeklyAccuracy.some(w => w.pct !== null) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Accuracy by Week (last 6)</p>
                <div className="flex items-end gap-2 h-16">
                  {stats.weeklyAccuracy.map((w, i) => {
                    const isThis = i === 5
                    const h = w.pct !== null ? Math.max(4, Math.round((w.pct / 100) * 64)) : 4
                    const color = w.pct === null ? 'bg-gray-100' : w.pct >= 80 ? 'bg-emerald-500' : w.pct >= 60 ? 'bg-amber-400' : 'bg-rose-400'
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        {w.pct !== null && <span className="text-xs text-gray-400">{w.pct}%</span>}
                        <div className={`w-full rounded-t-sm ${color} ${isThis ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`} style={{ height: `${h}px` }} title={w.pct !== null ? `${w.pct}% · ${w.sessions} sessions` : 'No sessions'} />
                        <span className={`text-xs leading-none ${isThis ? 'text-indigo-500 font-bold' : 'text-gray-300'}`}>{isThis ? 'now' : `W${i - 5}`}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Month-over-month accuracy */}
            {stats.monthlyAccuracy.filter(m => m.avgPct !== null).length >= 2 && (() => {
              const withData = stats.monthlyAccuracy.filter(m => m.avgPct !== null)
              const first = withData[0].avgPct, last = withData[withData.length - 1].avgPct
              const maxPct = Math.max(...withData.map(m => m.avgPct), 60)
              return (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Month-over-Month</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${last > first ? 'bg-emerald-100 text-emerald-700' : last < first ? 'bg-rose-100 text-rose-500' : 'bg-gray-100 text-gray-500'}`}>
                      {last > first ? `↑ +${last - first}%` : last < first ? `↓ ${last - first}%` : '→ Flat'}
                    </span>
                  </div>
                  <div className="flex items-end gap-2 h-16">
                    {stats.monthlyAccuracy.map((m, i) => {
                      const isCur = i === 5
                      const h = m.avgPct !== null ? Math.max(4, Math.round((m.avgPct / maxPct) * 60)) : 4
                      const color = m.avgPct === null ? 'bg-gray-100' : m.avgPct >= 80 ? 'bg-emerald-500' : m.avgPct >= 65 ? 'bg-amber-400' : 'bg-rose-400'
                      return (
                        <div key={m.monthKey} className="flex-1 flex flex-col items-center gap-1">
                          {m.avgPct !== null && <span className="text-xs text-gray-400">{m.avgPct}%</span>}
                          <div className={`w-full rounded-t-sm ${color} ${isCur ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`} style={{ height: `${h}px` }} title={m.avgPct !== null ? `${m.label}: ${m.avgPct}% avg (${m.count} sessions)` : `${m.label}: no data`} />
                          <span className={`text-xs ${isCur ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>{m.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

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
                {/* Difficulty mix stacked bar */}
                {stats.diffList.length >= 2 && (() => {
                  const totalAll = stats.diffList.reduce((s, d) => s + d.total, 0)
                  const mixColors = { Easy: 'bg-emerald-400', Medium: 'bg-amber-400', Hard: 'bg-rose-400' }
                  return (
                    <div className="mt-4">
                      <p className="text-xs text-gray-400 mb-1.5">Question mix (by count)</p>
                      <div className="flex h-3 rounded-full overflow-hidden">
                        {stats.diffList.map(d => (
                          <div key={d.label} className={`${mixColors[d.label]}`} style={{ width: `${Math.round((d.total / totalAll) * 100)}%` }} title={`${d.label}: ${d.total} questions (${Math.round((d.total / totalAll) * 100)}%)`} />
                        ))}
                      </div>
                      <div className="flex gap-3 mt-1.5">
                        {stats.diffList.map(d => (
                          <div key={d.label} className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${mixColors[d.label]}`} />
                            <span className="text-xs text-gray-400">{d.label} {Math.round((d.total / totalAll) * 100)}%</span>
                          </div>
                        ))}
                      </div>
                      {stats.diffList.find(d => d.label === 'Hard')?.total / totalAll < 0.1 && (
                        <p className="text-xs text-amber-600 mt-2">💡 Try more Hard questions to maximize score gains</p>
                      )}
                    </div>
                  )
                })()}
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

            {/* Wrong answer bias */}
            {stats.answerBias && (() => {
              const opts = ['A', 'B', 'C', 'D']
              const total = Object.values(stats.answerBias).reduce((a, b) => a + b, 0)
              const maxV = Math.max(...opts.map(o => stats.answerBias[o] ?? 0))
              return (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Wrong Answer Patterns</p>
                  <p className="text-xs text-gray-400 mb-4">Which option you choose when you're wrong</p>
                  <div className="flex items-end gap-3 h-16">
                    {opts.map(o => {
                      const v = stats.answerBias[o] ?? 0
                      const h = Math.max(4, Math.round((v / maxV) * 64))
                      const pctVal = Math.round((v / total) * 100)
                      const isMost = v === maxV
                      return (
                        <div key={o} className="flex-1 flex flex-col items-center gap-1">
                          <span className={`text-xs font-bold ${isMost ? 'text-rose-500' : 'text-gray-400'}`}>{pctVal}%</span>
                          <div className={`w-full rounded-t-lg ${isMost ? 'bg-rose-400' : 'bg-gray-200'}`} style={{ height: `${h}px` }} />
                          <span className={`text-xs font-black ${isMost ? 'text-rose-500' : 'text-gray-500'}`}>{o}</span>
                        </div>
                      )
                    })}
                  </div>
                  {(() => {
                    const most = opts.reduce((a, o) => (stats.answerBias[o] ?? 0) > (stats.answerBias[a] ?? 0) ? o : a, 'A')
                    return <p className="text-xs text-rose-500 mt-3">You pick "{most}" most often when wrong — be extra careful with this choice</p>
                  })()}
                </div>
              )
            })()}

            {/* Wrong answer position analysis */}
            {stats.positionAnalysis && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-2">
                  {stats.positionAnalysis.issue === 'end-fatigue' ? '⚡ Pacing Insight' : '🐢 Warm-up Pattern'}
                </p>
                <div className="flex items-center gap-4 mb-3">
                  <div className="text-center">
                    <p className="text-xl font-black text-gray-800">{stats.positionAnalysis.early}%</p>
                    <p className="text-xs text-gray-500">First third</p>
                  </div>
                  <div className="flex-1 flex items-center gap-1">
                    <div className="flex-1 h-1 bg-gray-200 rounded-full" />
                    <span className="text-xs text-amber-600 font-bold shrink-0">
                      {stats.positionAnalysis.issue === 'end-fatigue' ? `↘ ${stats.positionAnalysis.gap}%` : `↗ ${stats.positionAnalysis.gap}%`}
                    </span>
                    <div className="flex-1 h-1 bg-gray-200 rounded-full" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-gray-800">{stats.positionAnalysis.late}%</p>
                    <p className="text-xs text-gray-500">Last third</p>
                  </div>
                </div>
                <p className="text-xs text-amber-700 leading-snug">
                  {stats.positionAnalysis.issue === 'end-fatigue'
                    ? `Your accuracy drops ${stats.positionAnalysis.gap}% by the end of sessions — try short breaks every 10 questions.`
                    : `You take time to warm up — first-third accuracy is ${stats.positionAnalysis.gap}% lower. Start each session with 2 easy questions first.`
                  }
                </p>
              </div>
            )}

            {/* Domain radar chart */}
            {stats.domainList.filter(d => d.total >= 5).length >= 4 && (() => {
              const eligible = stats.domainList.filter(d => d.total >= 5).slice(0, 8)
              const n = eligible.length
              const cx = 110, cy = 110, r = 85
              const rings = [0.25, 0.5, 0.75, 1.0]
              const pts = eligible.map((d, i) => {
                const angle = (i / n) * 2 * Math.PI - Math.PI / 2
                const ratio = d.p / 100
                return { x: cx + r * ratio * Math.cos(angle), y: cy + r * ratio * Math.sin(angle), lx: cx + (r + 18) * Math.cos(angle), ly: cy + (r + 18) * Math.sin(angle), d }
              })
              const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
              return (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Domain Coverage Radar</p>
                  <svg viewBox="0 0 220 220" className="w-full max-w-xs mx-auto block">
                    {rings.map(ring => {
                      const rpts = eligible.map((_, i) => {
                        const angle = (i / n) * 2 * Math.PI - Math.PI / 2
                        return `${i === 0 ? 'M' : 'L'}${(cx + r * ring * Math.cos(angle)).toFixed(1)},${(cy + r * ring * Math.sin(angle)).toFixed(1)}`
                      }).join(' ') + ' Z'
                      return <path key={ring} d={rpts} fill="none" stroke="#f1f5f9" strokeWidth="1" />
                    })}
                    {eligible.map((_, i) => {
                      const angle = (i / n) * 2 * Math.PI - Math.PI / 2
                      return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)} stroke="#f1f5f9" strokeWidth="1" />
                    })}
                    <path d={path} fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="1.5" />
                    {pts.map(({ x, y, d }) => (
                      <circle key={d.id} cx={x} cy={y} r="3" fill={d.p >= 80 ? '#10b981' : d.p >= 60 ? '#6366f1' : '#f43f5e'} />
                    ))}
                    {pts.map(({ lx, ly, d }) => (
                      <text key={d.id} x={lx} y={ly} fontSize="7" textAnchor="middle" dominantBaseline="middle" fill="#9ca3af">{d.label.slice(0, 10)}</text>
                    ))}
                  </svg>
                  <div className="flex items-center gap-4 justify-center mt-2">
                    {[['#10b981','≥80%'],['#6366f1','60–80%'],['#f43f5e','<60%']].map(([c, l]) => (
                      <div key={l} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: c }} /><span className="text-xs text-gray-400">{l}</span></div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Top practiced domains */}
            {stats.domainList.length >= 3 && (() => {
              const top = [...stats.domainList].sort((a, b) => b.total - a.total).slice(0, 5)
              const maxT = top[0]?.total || 1
              return (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Where You Spend Your Time</p>
                  <div className="space-y-2.5">
                    {top.map((d, i) => (
                      <div key={d.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-700 truncate max-w-[60%]">{i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{d.label}</span>
                          <span className="text-xs text-gray-400">{d.total} Qs</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.round((d.total / maxT) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

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

              {/* Plateau detection */}
              {stats.plateau && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">📊 Score Plateau Detected</p>
                  <p className="text-sm text-gray-700">
                    Your estimated score has stayed around <span className="font-bold">~{stats.plateau.avg}</span> for the last 5 sessions (within ±{Math.round(stats.plateau.range / 2)} pts).
                  </p>
                  <p className="text-xs text-amber-700 mt-1.5">
                    Try Beast Mode for 2× XP, focus-drill your weakest domain, or attempt a Full Practice Test to break through!
                  </p>
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

            {/* Skill breakdown */}
            {stats.skillList.length >= 3 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Skill Breakdown</p>
                <p className="text-xs text-gray-400 mb-4">Your accuracy on specific SAT skill types (min 5 attempts)</p>
                <div className="space-y-3">
                  {stats.skillList.slice(0, 12).map(sk => (
                    <div key={sk.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-700 font-medium leading-tight capitalize">{sk.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{sk.correct}/{sk.total}</span>
                          <span className={`text-xs font-bold w-8 text-right ${textColor(sk.p)}`}>{sk.p}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor(sk.p)} rounded-full`} style={{ width: `${sk.p}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {stats.skillList.length > 0 && (
                  <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                    <p className="text-xs font-semibold text-rose-600">Weakest skill</p>
                    <p className="text-sm font-bold text-gray-800 capitalize">{stats.skillList[0].label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{stats.skillList[0].p}% accuracy — target this for the biggest score gain</p>
                  </div>
                )}
              </div>
            )}

            {/* Speed by domain */}
            {stats.speedByDomainList.length >= 3 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">⏱ Avg Time per Question by Domain</p>
                <div className="space-y-2.5">
                  {stats.speedByDomainList.slice(0, 6).map(d => {
                    const maxAvg = stats.speedByDomainList[0].avg
                    const color = d.avg > 90 ? 'bg-rose-400' : d.avg > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                    return (
                      <div key={d.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-700 truncate max-w-[60%]">{d.label}</span>
                          <span className={`text-xs font-bold ${d.avg > 90 ? 'text-rose-500' : d.avg > 60 ? 'text-amber-600' : 'text-emerald-600'}`}>{d.avg}s</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.round((d.avg / maxAvg) * 100)}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-300 mt-3">Red = slow (&gt;90s), amber = moderate, green = fast</p>
              </div>
            )}
          </>
        )}

        {/* Daily XP chart — last 14 days */}
        {sessions.length >= 3 && (() => {
          const days = []
          for (let i = 13; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i)
            const key = d.toISOString().slice(0, 10)
            const daySess = sessions.filter(s => s.completedAt?.slice(0, 10) === key)
            const xpEarned = daySess.reduce((n, s) => {
              return n + s.questions.filter(q => (s.answers[q.id] ?? null) === q.answer).length * 10
            }, 0)
            days.push({ key, xp: xpEarned, label: d.getDate(), isToday: i === 0 })
          }
          const maxXP = Math.max(...days.map(d => d.xp), 50)
          const totalXP = days.reduce((n, d) => n + d.xp, 0)
          const studyDays = days.filter(d => d.xp > 0).length
          return (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 mt-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">XP Earned — Last 14 Days</p>
                <div className="text-right">
                  <p className="text-xs font-bold text-indigo-600">{totalXP.toLocaleString()} XP</p>
                  <p className="text-[10px] text-gray-400">{studyDays} active days</p>
                </div>
              </div>
              <div className="flex items-end gap-1 h-16">
                {days.map((d, i) => {
                  const h = d.xp > 0 ? Math.max(4, Math.round((d.xp / maxXP) * 56)) : 2
                  const color = d.isToday ? 'bg-indigo-600' : d.xp > 0 ? 'bg-indigo-300' : 'bg-gray-100'
                  return (
                    <div key={d.key} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className={`w-full rounded-t-sm ${color}`} style={{ height: `${h}px` }} title={`${d.key}: ${d.xp} XP`} />
                      {i % 2 === 0 && <span className={`text-[8px] ${d.isToday ? 'text-indigo-600 font-bold' : 'text-gray-300'}`}>{d.label}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}
