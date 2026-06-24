import { useState, useEffect, useRef, useMemo } from 'react'
import { TAXONOMY } from './data/taxonomy'
import { domainById } from './data/taxonomy'
import questions from './data/questions'
import { loadHistory } from './utils/history'
import { loadGamification, getLevelInfo, getLevelColor, getDailyProgress, DAILY_GOAL, loadDailyGoal, saveDailyGoal, getTodayChallenge, getChallengeProgress, ACHIEVEMENTS } from './utils/gamification'

const DIFFICULTIES = [
  { id: 1, label: 'Easy',   classes: { chip: 'border-emerald-200 bg-emerald-50 text-emerald-800', active: 'border-emerald-500 bg-emerald-500 text-white' } },
  { id: 2, label: 'Medium', classes: { chip: 'border-amber-200 bg-amber-50 text-amber-800',   active: 'border-amber-500 bg-amber-500 text-white'   } },
  { id: 3, label: 'Hard',   classes: { chip: 'border-rose-200 bg-rose-50 text-rose-800',     active: 'border-rose-500 bg-rose-500 text-white'     } },
]

// Custom checkbox that supports indeterminate state
function Checkbox({ checked, indeterminate = false, onChange, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked
  }, [indeterminate, checked])

  return (
    <div className={`relative flex-shrink-0 w-4 h-4 ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      {/* Box */}
      <div
        onClick={onChange}
        className={`
          w-4 h-4 rounded border-2 cursor-pointer flex items-center justify-center transition-all duration-100
          ${checked
            ? 'bg-indigo-600 border-indigo-600'
            : indeterminate
            ? 'bg-indigo-100 border-indigo-400'
            : 'bg-white border-gray-300 hover:border-indigo-400'}
        `}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {!checked && indeterminate && (
          <div className="w-2 h-0.5 bg-indigo-500 rounded-full" />
        )}
      </div>
    </div>
  )
}

function computeStreak(sessions) {
  const dates = new Set(sessions.map(s => s.completedAt.slice(0, 10)))
  const d = new Date()
  let streak = 0
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function estimateScore(sessions) {
  const relevant = sessions.filter(s => s.score.total >= 10).slice(0, 8)
  if (relevant.length === 0) return null
  const avg = relevant.reduce((sum, s) => sum + s.score.percent, 0) / relevant.length
  return Math.round((400 + (avg / 100) * 1200) / 10) * 10
}

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Every expert was once a beginner.", author: "Helen Hayes" },
  { text: "Small daily improvements lead to staggering long-term results.", author: "Robin Sharma" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Anonymous" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Anonymous" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { text: "With the right preparation, any score is possible.", author: "SAT Prep Wisdom" },
  { text: "Consistency beats talent when talent doesn't work consistently.", author: "Anonymous" },
  { text: "Your future self will thank you for every study session today.", author: "Anonymous" },
]

function scoreMilestone(score) {
  if (score >= 1500) return { label: 'Top 1%', color: 'text-amber-600 bg-amber-50' }
  if (score >= 1400) return { label: 'Top 5%', color: 'text-violet-600 bg-violet-50' }
  if (score >= 1340) return { label: 'Top 10%', color: 'text-indigo-600 bg-indigo-50' }
  if (score >= 1200) return { label: 'Top 25%', color: 'text-emerald-600 bg-emerald-50' }
  if (score >= 1060) return { label: 'Above avg', color: 'text-emerald-600 bg-emerald-50' }
  if (score >= 1000) return { label: 'Near avg', color: 'text-amber-600 bg-amber-50' }
  return { label: 'Building up', color: 'text-gray-500 bg-gray-100' }
}

function getTodayQuote() {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  const idx = Math.floor((d - start) / 86400000)
  return QUOTES[idx % QUOTES.length]
}

function getDomainOfDay() {
  const domains = TAXONOMY.flatMap(s => s.domains.map(d => ({ id: d.id, label: d.label, subject: s.label, icon: s.icon })))
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  const idx = Math.floor((d - start) / 86400000)
  return domains[idx % domains.length]
}

const QOD_KEY = 'sat_prep_qod'
function loadQOD() { try { return JSON.parse(localStorage.getItem(QOD_KEY)) ?? {} } catch { return {} } }
function saveQOD(data) { try { localStorage.setItem(QOD_KEY, JSON.stringify(data)) } catch {} }

const WEEKLY_XP_KEY = 'sat_prep_weekly_xp_goal'
function loadWeeklyXPGoal() { try { return parseInt(localStorage.getItem(WEEKLY_XP_KEY) ?? '500', 10) } catch { return 500 } }
function saveWeeklyXPGoal(v) { try { localStorage.setItem(WEEKLY_XP_KEY, String(v)) } catch {} }

const GOAL_KEY = 'sat_prep_goal'
function loadGoalData() { try { return JSON.parse(localStorage.getItem(GOAL_KEY)) ?? {} } catch { return {} } }
function loadGoal() { return loadGoalData().target ?? null }
function loadExamDate() { return loadGoalData().examDate ?? null }
function saveGoalData(data) { try { localStorage.setItem(GOAL_KEY, JSON.stringify({ ...loadGoalData(), ...data })) } catch {} }
function saveGoal(t) { saveGoalData({ target: t }) }
function saveExamDate(d) { saveGoalData({ examDate: d }) }

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr + 'T12:00:00') - new Date()
  return Math.ceil(diff / 86400000)
}

function QuestionOfDay({ allQuestions }) {
  const today = new Date().toISOString().slice(0, 10)
  const qodData = useMemo(() => loadQOD(), [])
  const [answer, setAnswer] = useState(qodData.date === today ? qodData.answer : null)
  const [revealed, setRevealed] = useState(qodData.date === today && qodData.answer !== undefined)

  const q = useMemo(() => {
    const dayIdx = Math.floor(new Date() / 86400000)
    const seed = dayIdx % Math.max(1, allQuestions.length)
    return allQuestions[seed]
  }, [allQuestions])

  if (!q) return null
  const isCorrect = answer === q.answer

  function handlePick(optId) {
    if (revealed) return
    setAnswer(optId)
    setRevealed(true)
    saveQOD({ date: today, answer: optId, questionId: q.id })
  }

  const DIFF_COLOR = { 1: 'text-emerald-600', 2: 'text-amber-600', 3: 'text-rose-600' }
  const DIFF_LABEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' }

  return (
    <div className="bg-white border-2 border-indigo-100 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">⭐ Question of the Day</span>
        <span className={`text-xs font-semibold ${DIFF_COLOR[q.difficulty] ?? 'text-gray-400'}`}>
          {DIFF_LABEL[q.difficulty] ?? ''}
        </span>
        {revealed && (
          <span className={`ml-auto text-sm font-black ${isCorrect ? 'text-emerald-600' : 'text-rose-500'}`}>
            {isCorrect ? '✓ Correct!' : '✗ Missed'}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-800 leading-relaxed mb-3 whitespace-pre-line line-clamp-4">{q.question}</p>
      <div className="space-y-2">
        {(q.options ?? []).map(opt => {
          let cls = 'border-gray-200 bg-white text-gray-700 hover:border-indigo-200 cursor-pointer'
          if (revealed) {
            if (opt.id === q.answer) cls = 'border-emerald-500 bg-emerald-50 text-emerald-800'
            else if (opt.id === answer) cls = 'border-rose-400 bg-rose-50 text-rose-700'
            else cls = 'border-gray-100 bg-white text-gray-300'
          } else if (answer === opt.id) {
            cls = 'border-indigo-500 bg-indigo-50 text-indigo-900'
          }
          return (
            <button key={opt.id} onClick={() => handlePick(opt.id)} disabled={revealed}
              className={`w-full text-left rounded-xl border-2 px-3 py-2 text-xs flex items-center gap-2 transition-all ${cls}`}>
              <span className="font-bold w-4 shrink-0">{opt.id}</span>
              <span className="flex-1">{opt.text}</span>
              {revealed && opt.id === q.answer && <span className="shrink-0 text-emerald-500 font-bold">✓</span>}
              {revealed && opt.id === answer && opt.id !== q.answer && <span className="shrink-0 text-rose-400 font-bold">✗</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StudyCalendar({ sessions }) {
  const weeks = useMemo(() => {
    const qByDate = {}
    for (const s of sessions) {
      const d = s.completedAt.slice(0, 10)
      qByDate[d] = (qByDate[d] || 0) + s.score.total
    }
    const days = []
    const today = new Date()
    for (let i = 90; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({ key, count: qByDate[key] || 0 })
    }
    const wks = []
    for (let i = 0; i < days.length; i += 7) wks.push(days.slice(i, i + 7))
    return wks
  }, [sessions])

  function cellColor(count) {
    if (count === 0) return 'bg-gray-100'
    if (count < 10) return 'bg-indigo-200'
    if (count < 25) return 'bg-indigo-400'
    return 'bg-indigo-600'
  }

  const activeDays = weeks.flat().filter(d => d.count > 0).length

  const weekQs = useMemo(() => {
    const mon = new Date()
    const day = mon.getDay()
    mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
    const monStr = mon.toISOString().slice(0, 10)
    return sessions.filter(s => s.completedAt.slice(0, 10) >= monStr).reduce((sum, s) => sum + s.score.total, 0)
  }, [sessions])

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Study Activity</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-indigo-600 font-semibold">{weekQs} Qs this week</span>
          <span className="text-xs text-gray-400">{activeDays} days active</span>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        <div className="flex flex-col gap-1 mr-0.5 shrink-0">
          {['S','M','T','W','T','F','S'].map((l, i) => (
            <span key={i} className="text-[9px] text-gray-300 h-2.5 flex items-center w-2">{i % 2 === 1 ? l : ''}</span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 shrink-0">
            {week.map((day, di) => (
              <div key={di} className={`w-2.5 h-2.5 rounded-sm ${cellColor(day.count)}`} title={`${day.key}: ${day.count} Qs`} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[10px] text-gray-300">Less</span>
        {['bg-gray-100','bg-indigo-200','bg-indigo-400','bg-indigo-600'].map((c, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
        ))}
        <span className="text-[10px] text-gray-300">More</span>
      </div>
    </div>
  )
}

export default function TopicSelector({ onStart, onHistory, onQuestionBank, onQuickPractice, onFullPractice, onAchievements, onFocusPractice, onBeastMode, onBlitzMode }) {
  const history = useMemo(() => loadHistory(), [])
  const streak = useMemo(() => computeStreak(history), [history])
  const gam = useMemo(() => loadGamification(), [])
  const levelInfo = useMemo(() => getLevelInfo(gam.totalXP), [gam])
  const levelColor = useMemo(() => getLevelColor(levelInfo.level), [levelInfo])
  const [examDate, setExamDate] = useState(() => loadExamDate())
  const [editingExam, setEditingExam] = useState(false)
  const daysLeft = useMemo(() => daysUntil(examDate), [examDate])
  const [customDailyGoal, setCustomDailyGoal] = useState(() => loadDailyGoal())
  const [editingDailyGoal, setEditingDailyGoal] = useState(false)
  const [dailyGoalInput, setDailyGoalInput] = useState('')
  const effectiveDailyGoal = customDailyGoal
  const dailyProgress = useMemo(() => getDailyProgress(history), [history])
  const dailyDone = dailyProgress >= effectiveDailyGoal
  const achievementsCount = Object.keys(gam.achievements).length
  const estimatedScore = useMemo(() => estimateScore(history), [history])

  const [goalTarget, setGoalTarget] = useState(() => loadGoal())
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  const todayChallenge = useMemo(() => getTodayChallenge(), [])
  const todaySessions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return history.filter(s => s.completedAt.startsWith(today))
  }, [history])
  const challengeProgress = useMemo(() => getChallengeProgress(todaySessions, todayChallenge), [todaySessions, todayChallenge])
  const challengeDone = challengeProgress >= todayChallenge.goal
  const challengeAlreadyCredited = gam.dailyChallengeDate === new Date().toISOString().slice(0, 10)

  const todayQuote = useMemo(() => getTodayQuote(), [])
  const domainOfDay = useMemo(() => getDomainOfDay(), [])
  const weekQs = useMemo(() => {
    const mon = new Date()
    const day = mon.getDay()
    mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
    const monStr = mon.toISOString().slice(0, 10)
    return history.filter(s => s.completedAt.slice(0, 10) >= monStr).reduce((sum, s) => sum + s.score.total, 0)
  }, [history])
  const daysIntoWeek = useMemo(() => {
    const d = new Date().getDay()
    return d === 0 ? 7 : d
  }, [])

  const totalStudyTime = useMemo(() => history.reduce((sum, s) => sum + (s.elapsedSeconds ?? 0), 0), [history])
  const bestScore = useMemo(() => {
    if (history.length === 0) return null
    const best = Math.max(...history.map(s => s.score.percent))
    return { pct: best, est: Math.round((400 + (best / 100) * 1200) / 10) * 10 }
  }, [history])

  const uniqueQCount = useMemo(() => {
    const seen = new Set()
    for (const s of history) for (const q of s.questions) seen.add(q.id)
    return seen.size
  }, [history])

  const tomorrowFocus = useMemo(() => {
    if (history.length < 5) return null
    const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const cutoff = threeDaysAgo.toISOString().slice(0, 10)
    const recentDomains = new Set(
      history.filter(s => s.completedAt.slice(0, 10) >= cutoff).flatMap(s => s.questions.map(q => q.domain))
    )
    const byDomain = {}
    for (const s of history) {
      const day = s.completedAt.slice(0, 10)
      for (const q of s.questions) {
        if (!byDomain[q.domain]) byDomain[q.domain] = { correct: 0, total: 0, lastSeen: day }
        byDomain[q.domain].total++
        byDomain[q.domain].lastSeen = day > byDomain[q.domain].lastSeen ? day : byDomain[q.domain].lastSeen
        if ((s.answers[q.id] ?? null) === q.answer) byDomain[q.domain].correct++
      }
    }
    const candidate = Object.entries(byDomain)
      .filter(([id, s]) => s.total >= 5 && !recentDomains.has(id) && (s.correct / s.total) < 0.75)
      .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))[0]
    if (!candidate) return null
    const [id, st] = candidate
    const daysSince = Math.round((Date.now() - new Date(st.lastSeen + 'T12:00:00').getTime()) / 86400000)
    return { id, label: domainById[id]?.label ?? id, pct: Math.round((st.correct / st.total) * 100), daysSince }
  }, [history])

  const bestOfWeek = useMemo(() => {
    const mon = new Date()
    const day = mon.getDay()
    mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
    const monStr = mon.toISOString().slice(0, 10)
    const weekSessions = history.filter(s => s.completedAt.slice(0, 10) >= monStr && s.score.total >= 5)
    if (weekSessions.length < 2) return null
    const best = weekSessions.reduce((a, b) => b.score.percent > a.score.percent ? b : a)
    const dateStr = new Date(best.completedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    return { pct: best.score.percent, date: dateStr, label: best.formatLabel }
  }, [history])

  const totalFlagged = useMemo(() => {
    let count = 0
    for (const s of history) count += (s.flaggedIds ?? []).length
    return count
  }, [history])

  const examReadiness = useMemo(() => {
    if (history.length < 5) return null
    const recent10 = history.filter(s => s.score.total >= 5).slice(-10)
    if (recent10.length < 5) return null
    const pcts = recent10.map(s => s.score.percent)
    const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length
    const stdDev = Math.sqrt(pcts.reduce((s, v) => s + (v - mean) ** 2, 0) / pcts.length)
    const older = pcts.slice(0, Math.floor(pcts.length / 2))
    const newer = pcts.slice(Math.floor(pcts.length / 2))
    const trend = (newer.reduce((a, b) => a + b, 0) / newer.length) - (older.reduce((a, b) => a + b, 0) / older.length)
    const accuracyScore = mean
    const trendScore = Math.max(0, Math.min(100, 50 + trend * 2))
    const consistencyScore = Math.max(0, 100 - stdDev * 3)
    const score = Math.round(0.5 * accuracyScore + 0.3 * trendScore + 0.2 * consistencyScore)
    const label = score >= 85 ? 'Test Ready!' : score >= 70 ? 'Almost there' : score >= 55 ? 'Making progress' : 'Keep studying'
    const color = score >= 85 ? 'text-emerald-600' : score >= 70 ? 'text-indigo-600' : score >= 55 ? 'text-amber-600' : 'text-rose-500'
    return { score, label, color }
  }, [history])

  const qMilestone = useMemo(() => {
    const totalQ = history.reduce((sum, s) => sum + s.score.total, 0)
    const milestones = [100, 500, 1000, 2000, 5000]
    const next = milestones.find(m => m > totalQ)
    if (!next) return null
    return { next, gap: next - totalQ, totalQ }
  }, [history])

  const [weeklyXPGoal, setWeeklyXPGoal] = useState(() => loadWeeklyXPGoal())
  const [editingWeeklyXP, setEditingWeeklyXP] = useState(false)
  const [weeklyXPInput, setWeeklyXPInput] = useState('')
  const weekXP = useMemo(() => {
    const mon = new Date()
    const day = mon.getDay()
    mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
    const monStr = mon.toISOString().slice(0, 10)
    // Approximate XP from sessions this week using stored totalXP delta - not tracked per session, so use question count as proxy
    // Each correct answer ≈ 10 XP, each wrong ≈ 5 XP
    let xp = 0
    for (const s of history) {
      if (s.completedAt.slice(0, 10) < monStr) continue
      xp += s.score.correct * 10 + (s.score.total - s.score.correct) * 5
    }
    return xp
  }, [history])

  const dailyXPSparkline = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      let xp = 0
      for (const s of history) {
        if (s.completedAt.slice(0, 10) === key) {
          xp += s.score.correct * 10 + (s.score.total - s.score.correct) * 5
        }
      }
      days.push({ key, xp, label: ['S','M','T','W','T','F','S'][d.getDay()] })
    }
    return days
  }, [history])

  const recentAchievements = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    return Object.entries(gam.achievements)
      .filter(([, v]) => new Date(v.unlockedAt).getTime() > cutoff)
      .map(([id]) => ACHIEVEMENTS.find(a => a.id === id))
      .filter(Boolean)
  }, [gam])

  const domainMastery = useMemo(() => {
    const stats = {}
    for (const sess of history) {
      for (const q of sess.questions) {
        if (!stats[q.domain]) stats[q.domain] = { correct: 0, total: 0 }
        stats[q.domain].total++
        if ((sess.answers[q.id] ?? null) === q.answer) stats[q.domain].correct++
      }
    }
    const result = {}
    for (const [id, s] of Object.entries(stats)) {
      const p = s.total > 0 ? s.correct / s.total : 0
      if (s.total >= 100 && p >= 0.85) result[id] = { icon: '🏆', label: 'Master', color: 'text-amber-500' }
      else if (s.total >= 60 && p >= 0.75) result[id] = { icon: '🏅', label: 'Skilled', color: 'text-indigo-500' }
      else if (s.total >= 30 && p >= 0.60) result[id] = { icon: '⭐', label: 'Capable', color: 'text-violet-500' }
      else if (s.total >= 10) result[id] = { icon: '📚', label: 'Learner', color: 'text-emerald-500' }
    }
    return result
  }, [history])

  const domainStats = useMemo(() => {
    const stats = {}
    for (const sess of history) {
      for (const q of sess.questions) {
        if (!stats[q.domain]) stats[q.domain] = { correct: 0, total: 0, sessions: [] }
        stats[q.domain].total++
        if ((sess.answers[q.id] ?? null) === q.answer) stats[q.domain].correct++
      }
    }
    const result = {}
    for (const [id, s] of Object.entries(stats)) {
      if (s.total < 3) continue
      const overall = Math.round((s.correct / s.total) * 100)
      result[id] = { pct: overall }
    }
    // Compute trend: recent 3 sessions accuracy vs older 3
    const recentSessions = history.slice(-6)
    const olderSessions = history.slice(-12, -6)
    for (const id of Object.keys(result)) {
      const calc = (sesses) => {
        let c = 0, t = 0
        for (const sess of sesses) {
          for (const q of sess.questions) {
            if (q.domain !== id) continue
            t++
            if ((sess.answers[q.id] ?? null) === q.answer) c++
          }
        }
        return t >= 3 ? Math.round((c / t) * 100) : null
      }
      const r = calc(recentSessions), o = calc(olderSessions)
      if (r !== null && o !== null) {
        const delta = r - o
        result[id].trend = delta >= 5 ? '↑' : delta <= -5 ? '↓' : null
        result[id].trendColor = delta >= 5 ? 'text-emerald-500' : delta <= -5 ? 'text-rose-500' : 'text-gray-400'
      }
    }
    return result
  }, [history])

  const nextAchievement = useMemo(() => {
    const totalQ = history.reduce((t, s) => t + s.score.total, 0)
    const hardCorrect = history.reduce((t, s) => t + s.questions.filter(q => q.difficulty === 3 && (s.answers[q.id] ?? null) === q.answer).length, 0)
    const maxStreakSoFar = gam.maxStreak
    const trackable = [
      { id: 'century',     label: 'Century',         icon: '💪', cur: totalQ,         goal: 100  },
      { id: 'five-hundred',label: 'Question Crusher', icon: '🚀', cur: totalQ,         goal: 500  },
      { id: 'thousand',    label: 'Thousand Club',    icon: '🌟', cur: totalQ,         goal: 1000 },
      { id: 'hard-worker', label: 'Hard Worker',      icon: '🔥', cur: hardCorrect,    goal: 25   },
      { id: 'xp-1000',     label: 'Star Scholar',     icon: '⭐', cur: gam.totalXP,    goal: 1000 },
      { id: 'streak-3',    label: 'On a Roll',        icon: '🔥', cur: maxStreakSoFar, goal: 3    },
      { id: 'streak-7',    label: 'Week Warrior',     icon: '⚡', cur: maxStreakSoFar, goal: 7    },
      { id: 'streak-14',   label: 'Dedicated',        icon: '🏆', cur: maxStreakSoFar, goal: 14   },
    ]
    return trackable
      .filter(a => !gam.achievements[a.id] && a.cur < a.goal)
      .map(a => ({ ...a, pct: Math.round((a.cur / a.goal) * 100) }))
      .sort((a, b) => b.pct - a.pct)[0] ?? null
  }, [history, gam])

  const scoreTrajectory = useMemo(() => {
    if (!goalTarget || !daysLeft || daysLeft <= 0) return null
    const tenPlus = history.filter(s => s.score.total >= 10)
    if (tenPlus.length < 6) return null
    const toScore = (pct) => Math.round((400 + (pct / 100) * 1200) / 10) * 10
    const avg = (arr) => arr.reduce((sum, s) => sum + s.score.percent, 0) / arr.length
    const recent = tenPlus.slice(-3)
    const older = tenPlus.slice(-6, -3)
    const recentScore = toScore(avg(recent))
    const olderScore = toScore(avg(older))
    const gainPer3Sess = recentScore - olderScore
    const sessionsPerWeek = (history.length / Math.max(1, (Date.now() - new Date(history[0].completedAt)) / 604800000))
    const weeksLeft = daysLeft / 7
    const projected = Math.min(1600, Math.round(recentScore + gainPer3Sess * (sessionsPerWeek * weeksLeft / 3)))
    return { recentScore, projected, onTrack: projected >= goalTarget, gainPer3Sess }
  }, [history, goalTarget, daysLeft])

  const weakDomain = useMemo(() => {
    const byDomain = {}
    for (const sess of history) {
      for (const q of sess.questions) {
        if (!byDomain[q.domain]) byDomain[q.domain] = { correct: 0, total: 0 }
        byDomain[q.domain].total++
        if ((sess.answers[q.id] ?? null) === q.answer) byDomain[q.domain].correct++
      }
    }
    return Object.entries(byDomain)
      .filter(([, s]) => s.total >= 5)
      .map(([id, s]) => ({ id, pct: Math.round((s.correct / s.total) * 100) }))
      .sort((a, b) => a.pct - b.pct)[0] ?? null
  }, [history])

  const powerDay = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const todaySess = history.filter(s => s.completedAt.startsWith(todayStr))
    if (todaySess.length < 3) return false
    return todaySess.reduce((sum, s) => sum + s.score.percent, 0) / todaySess.length >= 80
  }, [history])

  const diffReady = useMemo(() => {
    if (history.length < 5) return null
    const recent = history.slice(-5)
    let medC = 0, medT = 0, hardT = 0
    for (const s of recent) for (const q of s.questions) {
      if (q.difficulty === 2) { medT++; if ((s.answers[q.id] ?? null) === q.answer) medC++ }
      if (q.difficulty === 3) hardT++
    }
    const medPct = medT >= 10 ? Math.round((medC / medT) * 100) : null
    return medPct !== null && medPct >= 80 && hardT < 20 ? medPct : null
  }, [history])

  const practiceTestReady = useMemo(() => {
    const eligible = history.filter(s => s.score.total >= 5).slice(-5)
    if (eligible.length < 5) return false
    return eligible.every(s => s.score.percent >= 75)
  }, [history])

  const recommendation = useMemo(() => {
    if (history.length === 0) return null
    const today = new Date().toISOString().slice(0, 10)
    const studiedToday = history.some(s => s.completedAt.startsWith(today))
    const day = new Date().getDay()
    const isWeekend = day === 0 || day === 6
    if (!studiedToday && streak >= 3) return { label: 'Beast Mode 🔥', desc: `Keep your ${streak}-day streak with 2× XP`, type: 'beast' }
    if (weakDomain && history.length >= 5) return { label: `Focus: ${weakDomain.label}`, desc: `${weakDomain.pct}% accuracy — biggest score opportunity`, type: 'focus', domainId: weakDomain.id }
    if (isWeekend && history.length >= 3) return { label: 'Full Practice Test', desc: 'Weekend is perfect for a timed practice run', type: 'full' }
    if (dailyDone) return { label: 'Blitz Mode ⚡', desc: 'Goal done! Bonus questions for extra XP', type: 'blitz' }
    return { label: 'Quick Practice', desc: '10 questions — fast and focused', type: 'quick' }
  }, [history, streak, weakDomain, dailyDone])

  const nudge = useMemo(() => {
    if (daysLeft !== null && daysLeft <= 7 && daysLeft > 0) {
      return { icon: '📅', title: `SAT in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`, body: 'Crunch time — focus on your weak spots and do at least one full session today.', color: 'border-rose-100 bg-rose-50' }
    }
    if (daysLeft !== null && daysLeft <= 14 && daysLeft > 7) {
      return { icon: '⏰', title: `SAT in ${daysLeft} days`, body: 'Two weeks out — keep studying daily and take at least one full practice test.', color: 'border-amber-100 bg-amber-50' }
    }
    if (levelInfo.xpForNext && (levelInfo.xpForNext - levelInfo.xpIntoLevel) <= 60) {
      const gap = levelInfo.xpForNext - levelInfo.xpIntoLevel
      return { icon: '⭐', title: `Almost Level ${levelInfo.level + 1}!`, body: `Just ${gap} XP to go. Complete one more session!`, color: 'border-amber-100 bg-amber-50' }
    }
    if (streak > 2 && dailyProgress === 0) {
      return { icon: '⚠️', title: `Don't break your ${streak}-day streak!`, body: 'You haven\'t studied today yet. Complete a session before midnight.', color: 'border-rose-100 bg-rose-50' }
    }
    if (dailyDone) {
      return { icon: '✅', title: 'Daily goal complete!', body: `${dailyProgress} questions answered today. Great work — keep the streak going!`, color: 'border-emerald-100 bg-emerald-50' }
    }
    if (diffReady) {
      return { icon: '🔥', title: 'Ready for Hard mode?', body: `You're hitting ${diffReady}% on Medium questions. Try Beast Mode or filter by Hard to level up!`, color: 'border-orange-100 bg-orange-50' }
    }
    if (qMilestone && qMilestone.gap <= 50) {
      return { icon: '💎', title: `${qMilestone.gap} questions to ${qMilestone.next} milestone!`, body: `You're at ${qMilestone.totalQ.toLocaleString()} total questions. So close!`, color: 'border-violet-100 bg-violet-50' }
    }
    return null
  }, [levelInfo, streak, dailyProgress, dailyDone, daysLeft, diffReady])

  // Start with everything selected
  const allDomainIds = useMemo(
    () => TAXONOMY.flatMap(s => s.domains.map(d => d.id)),
    []
  )

  const [selectedDomains, setSelectedDomains] = useState(() => new Set(allDomainIds))
  const [selectedDifficulties, setSelectedDifficulties] = useState(() => new Set([1, 2, 3]))

  const matchingCount = useMemo(
    () => questions.filter(q =>
      selectedDomains.has(q.domain) && selectedDifficulties.has(q.difficulty)
    ).length,
    [selectedDomains, selectedDifficulties]
  )

  // Domain helpers
  function toggleDomain(id) {
    setSelectedDomains(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSubject(subjectId) {
    const domainIds = TAXONOMY.find(s => s.id === subjectId).domains.map(d => d.id)
    const allSelected = domainIds.every(id => selectedDomains.has(id))
    setSelectedDomains(prev => {
      const next = new Set(prev)
      if (allSelected) {
        domainIds.forEach(id => next.delete(id))
      } else {
        domainIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  function subjectCheckState(subjectId) {
    const domainIds = TAXONOMY.find(s => s.id === subjectId).domains.map(d => d.id)
    const selected = domainIds.filter(id => selectedDomains.has(id))
    if (selected.length === 0) return 'none'
    if (selected.length === domainIds.length) return 'all'
    return 'some'
  }

  // Difficulty helpers
  function toggleDifficulty(id) {
    setSelectedDifficulties(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleStart() {
    if (matchingCount === 0 || !onStart) return
    onStart({
      domains: [...selectedDomains],
      difficulties: [...selectedDifficulties],
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <span className="text-sm font-semibold tracking-widest text-indigo-500 uppercase">
                {(() => {
                  const h = new Date().getHours()
                  if (h >= 5 && h < 12) return 'Good morning'
                  if (h >= 12 && h < 17) return 'Keep it up'
                  if (h >= 17 && h < 21) return 'Evening grind'
                  return 'Night study'
                })()}
              </span>
              {streak > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full" title={gam.maxStreak > streak ? `Best streak: ${gam.maxStreak} days` : 'Personal best streak!'}>
                  🔥 {streak}d {gam.maxStreak > streak ? <span className="opacity-60 font-normal">(best {gam.maxStreak}d)</span> : '🏆'}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {onQuestionBank && (
                <button onClick={onQuestionBank} className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 bg-white rounded-lg px-3 py-1.5 transition-colors">
                  Question Bank
                </button>
              )}
              {onHistory && (
                <button onClick={onHistory} className="relative text-xs text-gray-400 hover:text-gray-700 border border-gray-200 bg-white rounded-lg px-3 py-1.5 transition-colors">
                  History
                  {totalFlagged > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none" title={`${totalFlagged} flagged question${totalFlagged !== 1 ? 's' : ''} pending review`}>
                      {totalFlagged > 9 ? '9+' : totalFlagged}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">Customize your quiz</h1>
          <p className="mt-1 text-gray-500 text-base">Select the subjects, topics, and difficulties you want to practice.</p>
        </div>

        {/* Level / XP / Daily goal widget */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-6 flex items-center gap-4">
          {/* Level + XP bar */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-full ${levelColor.ring} flex items-center justify-center text-white font-black text-sm shrink-0`}>
              {levelInfo.level}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-700 truncate">{levelInfo.title}</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div className={`h-full ${levelColor.ring} rounded-full transition-all`} style={{ width: `${levelInfo.pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {levelInfo.xpForNext
                  ? `${gam.totalXP.toLocaleString()} XP · ${levelInfo.xpIntoLevel}/${levelInfo.xpForNext} to Lv ${levelInfo.level + 1}`
                  : `${gam.totalXP.toLocaleString()} XP · Max Level`}
              </p>
            </div>
          </div>

          <div className="h-12 w-px bg-gray-100 shrink-0" />

          {/* Daily goal ring */}
          <div className="shrink-0 text-center">
            <div className="relative w-11 h-11 mx-auto">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                <circle
                  cx="22" cy="22" r="18" fill="none"
                  stroke={dailyDone ? '#10b981' : '#6366f1'} strokeWidth="4"
                  strokeDasharray={`${Math.min(1, dailyProgress / effectiveDailyGoal) * 113.1} 113.1`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-black ${dailyDone ? 'text-emerald-600' : 'text-indigo-600'}`}>
                  {dailyDone ? '✓' : dailyProgress}
                </span>
              </div>
            </div>
            {editingDailyGoal ? (
              <div className="flex items-center gap-1 mt-1">
                <input type="number" value={dailyGoalInput} onChange={e => setDailyGoalInput(e.target.value)}
                  className="w-12 text-xs border border-gray-300 rounded px-1 py-0.5 text-center" min="5" max="200" />
                <button onClick={() => { const v = parseInt(dailyGoalInput, 10); if (v >= 5) { setCustomDailyGoal(v); saveDailyGoal(v) } setEditingDailyGoal(false) }}
                  className="text-xs text-indigo-600 font-semibold">✓</button>
              </div>
            ) : (
              <button onClick={() => { setDailyGoalInput(String(effectiveDailyGoal)); setEditingDailyGoal(true) }}
                className="text-xs text-gray-400 mt-1 hover:text-indigo-500 transition-colors">
                {dailyDone ? 'Done!' : `/ ${effectiveDailyGoal} Qs`}
              </button>
            )}
          </div>

          {totalStudyTime > 0 && (
            <>
              <div className="h-12 w-px bg-gray-100 shrink-0" />
              <div className="shrink-0 text-center">
                <p className="text-base font-black text-gray-700">{Math.round(totalStudyTime / 60)}m</p>
                <p className="text-xs text-gray-400 mt-0.5">studied</p>
              </div>
            </>
          )}

          {bestScore && (
            <>
              <div className="h-12 w-px bg-gray-100 shrink-0" />
              <div className="shrink-0 text-center" title={`Best session: ${bestScore.pct}%`}>
                <p className="text-base font-black text-amber-500">~{bestScore.est}</p>
                <p className="text-xs text-gray-400 mt-0.5">best est.</p>
              </div>
            </>
          )}
          {uniqueQCount > 0 && (
            <>
              <div className="h-12 w-px bg-gray-100 shrink-0" />
              <div className="shrink-0 text-center" title="Unique questions practiced">
                <p className="text-base font-black text-violet-500">{uniqueQCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">unique Qs</p>
              </div>
            </>
          )}

          {qMilestone && qMilestone.gap <= 30 && (
            <>
              <div className="h-12 w-px bg-gray-100 shrink-0" />
              <div className="shrink-0 text-center">
                <p className="text-base font-black text-indigo-500">{qMilestone.gap}</p>
                <p className="text-xs text-gray-400 mt-0.5">to {qMilestone.next}</p>
              </div>
            </>
          )}

          {onAchievements && (
            <>
              <div className="h-12 w-px bg-gray-100 shrink-0" />
              <button onClick={onAchievements} className="shrink-0 text-center group">
                <p className="text-xl group-hover:scale-110 transition-transform">🏆</p>
                <p className="text-xs text-gray-400 mt-1">{achievementsCount}/{ACHIEVEMENTS.length}</p>
              </button>
            </>
          )}
        </div>

        {/* Exam readiness composite score */}
        {examReadiness && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Exam Readiness</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${examReadiness.color}`}>{examReadiness.score}</span>
                <span className="text-xs text-gray-400">/ 100</span>
                <span className={`text-xs font-semibold ${examReadiness.color}`}>{examReadiness.label}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                <div className={`h-full rounded-full transition-all duration-700 ${
                  examReadiness.score >= 85 ? 'bg-emerald-500' : examReadiness.score >= 70 ? 'bg-indigo-500' : examReadiness.score >= 55 ? 'bg-amber-500' : 'bg-rose-500'
                }`} style={{ width: `${examReadiness.score}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Onboarding checklist (shown for first ~5 sessions) */}
        {history.length < 5 && (() => {
          const hasBeastMode = history.some(s => s.formatLabel === 'Beast Mode')
          const hasGoal = goalTarget !== null
          const hasAchievement = achievementsCount > 0
          const steps = [
            { done: history.length >= 1, label: 'Complete your first session' },
            { done: hasGoal, label: 'Set a target SAT score' },
            { done: hasBeastMode, label: 'Try Beast Mode 🔥' },
            { done: hasAchievement, label: 'Unlock your first achievement 🏆' },
            { done: streak >= 2, label: 'Study 2 days in a row 🔥' },
          ]
          const done = steps.filter(s => s.done).length
          if (done === steps.length) return null
          return (
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-100 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Getting Started</p>
                <span className="text-xs text-indigo-600 font-semibold">{done}/{steps.length}</span>
              </div>
              <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(done / steps.length) * 100}%` }} />
              </div>
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${step.done ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                      {step.done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-xs ${step.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* 7-day streak calendar */}
        {history.length > 0 && (() => {
          const studiedDates = new Set(history.map(s => s.completedAt.slice(0, 10)))
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - (6 - i))
            return { key: d.toISOString().slice(0, 10), label: ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()], isToday: i === 6 }
          })
          const hasStreak = days.slice(0, 6).some(d => studiedDates.has(d.key))
          if (!hasStreak && !studiedDates.has(days[6].key)) return null
          return (
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
              <span className="text-sm text-gray-400 shrink-0">Last 7 days</span>
              <div className="flex gap-1.5 flex-1 justify-end">
                {days.map(({ key, label, isToday }) => {
                  const studied = studiedDates.has(key)
                  return (
                    <div key={key} className="flex flex-col items-center gap-0.5">
                      <div className={`w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold transition-colors ${
                        studied ? 'bg-emerald-500 text-white' : isToday ? 'border-2 border-dashed border-gray-300 text-gray-300' : 'bg-gray-100 text-gray-300'
                      }`}>
                        {studied ? '✓' : ''}
                      </div>
                      <span className="text-[9px] text-gray-300">{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Recent activity feed */}
        {history.length >= 2 && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Recent Activity</p>
            <div className="space-y-1.5">
              {history.slice(0, 4).map(s => {
                const age = Math.round((Date.now() - new Date(s.completedAt)) / 60000)
                const ageStr = age < 60 ? `${age}m ago` : age < 1440 ? `${Math.round(age / 60)}h ago` : `${Math.round(age / 1440)}d ago`
                const icon = s.formatLabel === 'Beast Mode' ? '🔥' : s.formatLabel === 'Blitz Mode' ? '⚡' : s.formatLabel?.includes('Focus') ? '🎯' : '📝'
                const pctColor = s.score.percent >= 80 ? 'text-emerald-600' : s.score.percent >= 60 ? 'text-amber-600' : 'text-rose-500'
                return (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <span className="shrink-0">{icon}</span>
                    <span className="text-gray-600 flex-1 truncate">{s.sessionName || s.formatLabel}</span>
                    <span className={`font-bold shrink-0 ${pctColor}`}>{s.score.percent}%</span>
                    <span className="text-gray-300 shrink-0">{ageStr}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Last session recap */}
        {history.length > 0 && (() => {
          const last = history[history.length - 1]
          const g = last.score.percent >= 90 ? { text: 'text-amber-500', label: 'Excellent' } : last.score.percent >= 80 ? { text: 'text-emerald-600', label: 'Great' } : last.score.percent >= 60 ? { text: 'text-amber-600', label: 'Good' } : { text: 'text-rose-500', label: 'Keep going' }
          const age = Math.round((Date.now() - new Date(last.completedAt)) / 60000)
          const ageStr = age < 60 ? `${age}m ago` : age < 1440 ? `${Math.round(age / 60)}h ago` : `${Math.round(age / 1440)}d ago`
          return (
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 truncate">{last.formatLabel}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{ageStr}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{last.score.total} questions · {g.label}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-xl font-black ${g.text}`}>{last.score.percent}%</p>
              </div>
            </div>
          )
        })()}

        {/* Power Day banner */}
        {powerDay && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 mb-4 text-white flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-black text-sm">Power Day!</p>
              <p className="text-xs text-emerald-100">3+ sessions at 80%+ average. You're absolutely crushing it today!</p>
            </div>
          </div>
        )}

        {/* Daily quote */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-700 to-slate-800 p-4 mb-4 text-white">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Quote of the Day</p>
          <p className="text-sm font-medium leading-snug">"{todayQuote.text}"</p>
          <p className="text-xs text-slate-400 mt-1.5">— {todayQuote.author}</p>
        </div>

        {/* Recently unlocked achievements */}
        {recentAchievements.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-xl shrink-0">🏆</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-700">Achievement{recentAchievements.length > 1 ? 's' : ''} Unlocked!</p>
              <p className="text-xs text-amber-600 truncate">{recentAchievements.map(a => `${a.icon} ${a.title}`).join(' · ')}</p>
            </div>
          </div>
        )}

        {/* Test day checklist — shown when exam is within 7 days */}
        {daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && (
          <div className="rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 p-4 mb-4 text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📅</span>
              <p className="font-black text-sm">{daysLeft === 0 ? 'SAT Day Is Here!' : `${daysLeft} Day${daysLeft !== 1 ? 's' : ''} Until Your SAT!`}</p>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Admission ticket printed', key: 'ticket' },
                { label: 'Photo ID ready', key: 'id' },
                { label: 'Pencils & eraser packed', key: 'pencils' },
                { label: 'Approved calculator', key: 'calc' },
                { label: 'Snacks & water bottle', key: 'snacks' },
                { label: 'Sleep 8+ hours tonight', key: 'sleep' },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-rose-300 shrink-0" />
                  <span className="text-xs text-rose-100">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-rose-300 mt-3">💡 Light review only — trust your preparation!</p>
          </div>
        )}

        {/* Next Up recommendation */}
        {recommendation && (
          <div className="bg-indigo-600 rounded-2xl p-4 mb-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-0.5">Next Up</p>
              <p className="text-sm font-black text-white">{recommendation.label}</p>
              <p className="text-xs text-indigo-300 mt-0.5">{recommendation.desc}</p>
            </div>
            <button
              onClick={() => {
                if (recommendation.type === 'beast') onBeastMode?.()
                else if (recommendation.type === 'blitz') onBlitzMode?.()
                else if (recommendation.type === 'focus') onFocusPractice?.(recommendation.domainId)
                else if (recommendation.type === 'full') onFullPractice?.()
                else onQuickPractice?.()
              }}
              className="shrink-0 bg-white text-indigo-600 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Start →
            </button>
          </div>
        )}

        {/* Practice test ready prompt */}
        {practiceTestReady && onFullPractice && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-xl shrink-0">🎯</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-700 font-semibold">You're on a 75%+ streak!</p>
              <p className="text-xs text-emerald-600 mt-0.5">5 strong sessions in a row — try a Full Practice Test</p>
            </div>
            <button onClick={onFullPractice} className="shrink-0 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl transition-colors">
              Full Test →
            </button>
          </div>
        )}

        {/* Tomorrow's focus suggestion */}
        {tomorrowFocus && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-lg shrink-0">📅</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-violet-400 font-semibold mb-0.5">Suggested next focus</p>
              <p className="text-sm font-bold text-violet-800">{tomorrowFocus.label}</p>
              <p className="text-xs text-violet-400">{tomorrowFocus.pct}% accuracy · not practiced in {tomorrowFocus.daysSince}d</p>
            </div>
            <button
              onClick={() => setSelectedDomains(new Set([tomorrowFocus.id]))}
              className="shrink-0 text-xs font-semibold text-violet-600 bg-white border border-violet-200 px-3 py-1.5 rounded-xl hover:bg-violet-50 transition-colors"
            >
              Drill it
            </button>
          </div>
        )}

        {/* Weak domain quick-drill shortcuts */}
        {weakDomain && history.length >= 5 && recommendation?.type !== 'focus' && (() => {
          const weakLabel = domainById[weakDomain.id]?.label ?? weakDomain.id
          return (
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              <span className="text-xs text-gray-400 shrink-0">Quick drill:</span>
              <button
                onClick={() => {
                  setSelectedDomains(new Set([weakDomain.id]))
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
                }}
                className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-full hover:bg-rose-100 transition-colors"
              >
                🎯 {weakLabel} ({weakDomain.pct}%)
              </button>
            </div>
          )
        })()}

        {/* Motivational nudge */}
        {nudge && (
          <div className={`rounded-2xl border-2 p-4 mb-4 flex items-start gap-3 ${nudge.color}`}>
            <span className="text-lg mt-0.5 shrink-0">{nudge.icon}</span>
            <div>
              <p className="text-sm font-bold text-gray-900">{nudge.title}</p>
              <p className="text-xs text-gray-600 mt-0.5">{nudge.body}</p>
            </div>
          </div>
        )}

        {/* Next achievement progress */}
        {nextAchievement && (
          <div className="bg-white border-2 border-amber-100 rounded-2xl p-4 mb-4 flex items-center gap-4">
            <span className="text-2xl shrink-0">{nextAchievement.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-700">Next: {nextAchievement.label}</p>
                <span className="text-xs text-amber-600 font-bold">{nextAchievement.pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${nextAchievement.pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{nextAchievement.cur.toLocaleString()} / {nextAchievement.goal.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Daily challenge */}
        <div className={`rounded-2xl border-2 p-4 mb-4 ${challengeDone ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🎯</span>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Daily Challenge</p>
            </div>
            {(challengeDone || challengeAlreadyCredited) && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                {challengeAlreadyCredited ? `+${todayChallenge.bonus} XP earned!` : `+${todayChallenge.bonus} XP on complete`}
              </span>
            )}
            {!challengeDone && !challengeAlreadyCredited && (
              <span className="text-xs text-gray-400">+{todayChallenge.bonus} XP reward</span>
            )}
          </div>
          <p className={`text-sm font-semibold mb-3 ${challengeDone ? 'text-emerald-800' : 'text-gray-900'}`}>
            {todayChallenge.desc}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${challengeDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(100, (challengeProgress / todayChallenge.goal) * 100)}%` }}
              />
            </div>
            <span className={`text-xs font-bold shrink-0 ${challengeDone ? 'text-emerald-600' : 'text-gray-600'}`}>
              {Math.min(challengeProgress, todayChallenge.goal)}/{todayChallenge.goal}
            </span>
          </div>
        </div>

        {/* Weekly XP goal tracker */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Weekly XP Goal</p>
            {editingWeeklyXP ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number" value={weeklyXPInput} onChange={e => setWeeklyXPInput(e.target.value)}
                  className="w-20 text-xs border border-gray-300 rounded-lg px-2 py-1 text-center"
                  min="50" max="5000" step="50"
                />
                <button onClick={() => { const v = parseInt(weeklyXPInput, 10); if (v >= 50) { setWeeklyXPGoal(v); saveWeeklyXPGoal(v) } setEditingWeeklyXP(false) }}
                  className="text-xs text-indigo-600 font-semibold">Save</button>
                <button onClick={() => setEditingWeeklyXP(false)} className="text-xs text-gray-400">✕</button>
              </div>
            ) : (
              <button onClick={() => { setWeeklyXPInput(String(weeklyXPGoal)); setEditingWeeklyXP(true) }}
                className="text-xs text-indigo-500 hover:text-indigo-700 border border-indigo-200 rounded-lg px-2 py-0.5 transition-colors">
                Edit
              </button>
            )}
          </div>
          <div className="flex items-end justify-between mb-2">
            <span className={`text-2xl font-black ${weekXP >= weeklyXPGoal ? 'text-emerald-600' : 'text-indigo-600'}`}>{weekXP.toLocaleString()}</span>
            <span className="text-sm text-gray-400">/ {weeklyXPGoal.toLocaleString()} XP</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${weekXP >= weeklyXPGoal ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${Math.min(100, Math.round((weekXP / weeklyXPGoal) * 100))}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {weekXP >= weeklyXPGoal ? '✅ Weekly goal reached!' : `${(weeklyXPGoal - weekXP).toLocaleString()} XP to go this week`}
          </p>
          {/* Daily XP sparkline */}
          {dailyXPSparkline.some(d => d.xp > 0) && (() => {
            const maxXP = Math.max(...dailyXPSparkline.map(d => d.xp), 1)
            return (
              <div className="flex items-end gap-1 mt-3 h-8">
                {dailyXPSparkline.map((d, i) => {
                  const today = i === 6
                  const h = Math.max(4, Math.round((d.xp / maxXP) * 32))
                  return (
                    <div key={d.key} className="flex flex-col items-center gap-0.5 flex-1">
                      <div
                        className={`w-full rounded-t-sm transition-all ${today ? (d.xp ? 'bg-indigo-500' : 'bg-indigo-200') : d.xp ? 'bg-indigo-300' : 'bg-gray-100'}`}
                        style={{ height: `${h}px` }}
                        title={`${d.key}: ${d.xp} XP`}
                      />
                      <span className={`text-xs leading-none ${today ? 'text-indigo-500 font-bold' : 'text-gray-300'}`}>{d.label}</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* Best of the week highlight */}
        {bestOfWeek && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-lg">🌟</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 font-medium">Best this week</p>
              <p className="text-sm font-bold text-gray-800">{bestOfWeek.pct}% · {bestOfWeek.label}</p>
              <p className="text-xs text-gray-400">{bestOfWeek.date}</p>
            </div>
          </div>
        )}

        {/* SAT score goal tracker */}
        {(goalTarget !== null || estimatedScore !== null) && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">SAT Score Goal</p>
              {!editingGoal && !editingExam && (
                <div className="flex gap-2">
                  {daysLeft !== null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${daysLeft <= 7 ? 'bg-rose-100 text-rose-600' : daysLeft <= 14 ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      📅 {daysLeft}d
                    </span>
                  )}
                  <button
                    onClick={() => { setGoalInput(goalTarget ? String(goalTarget) : ''); setEditingGoal(true) }}
                    className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    {goalTarget ? 'Edit' : 'Set goal'}
                  </button>
                </div>
              )}
            </div>
            {editingGoal ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="number"
                  min="400" max="1600" step="10"
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const t = Math.round(Math.min(1600, Math.max(400, Number(goalInput))) / 10) * 10
                      setGoalTarget(t); saveGoal(t); setEditingGoal(false)
                    }
                    if (e.key === 'Escape') setEditingGoal(false)
                  }}
                  placeholder="e.g. 1400"
                  className="flex-1 border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  onClick={() => {
                    const t = Math.round(Math.min(1600, Math.max(400, Number(goalInput))) / 10) * 10
                    setGoalTarget(t); saveGoal(t); setEditingGoal(false)
                  }}
                  className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Save
                </button>
                <button onClick={() => setEditingGoal(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            ) : (
              <>
                <div className="flex items-end gap-4">
                  <div>
                    {estimatedScore && (
                      <div className="mb-2">
                        <span className="text-xs text-gray-400">Estimated current</span>
                        <div className="flex items-baseline gap-2">
                          <div className="text-2xl font-black text-gray-900">~{estimatedScore}</div>
                          {(() => {
                            const m = scoreMilestone(estimatedScore)
                            return <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${m.color}`}>{m.label}</span>
                          })()}
                        </div>
                      </div>
                    )}
                    {goalTarget && (
                      <div>
                        <span className="text-xs text-gray-400">Goal</span>
                        <div className="text-lg font-black text-indigo-600">{goalTarget}</div>
                      </div>
                    )}
                    {!goalTarget && !estimatedScore && (
                      <p className="text-sm text-gray-400">Complete a few sessions to see your estimated score.</p>
                    )}
                  </div>
                  {goalTarget && estimatedScore && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">400</span>
                        <span className="text-xs text-gray-400">1600</span>
                      </div>
                      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="absolute h-full bg-indigo-500 rounded-full"
                          style={{ width: `${((estimatedScore - 400) / 1200) * 100}%` }}
                        />
                        <div
                          className="absolute top-0 h-full w-0.5 bg-indigo-900"
                          style={{ left: `${((goalTarget - 400) / 1200) * 100}%` }}
                          title={`Goal: ${goalTarget}`}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1 text-center">
                        {estimatedScore >= goalTarget
                          ? '🎉 Goal reached! Set a higher target.'
                          : `${goalTarget - estimatedScore} points to go`}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Exam date:</span>
                    {editingExam ? (
                      <input
                        autoFocus
                        type="date"
                        defaultValue={examDate ?? ''}
                        min={new Date().toISOString().slice(0, 10)}
                        onBlur={e => { if (e.target.value) { setExamDate(e.target.value); saveExamDate(e.target.value) } setEditingExam(false) }}
                        onKeyDown={e => { if (e.key === 'Escape') setEditingExam(false) }}
                        className="text-xs border border-indigo-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      />
                    ) : (
                      <button onClick={() => setEditingExam(true)} className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
                        {examDate ? new Date(examDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '+ Add date'}
                      </button>
                    )}
                  </div>
                  {daysLeft !== null && (
                    <span className={`text-xs font-semibold ${daysLeft <= 7 ? 'text-rose-600' : daysLeft <= 14 ? 'text-amber-600' : 'text-indigo-600'}`}>
                      {daysLeft > 0 ? `${daysLeft} days away` : daysLeft === 0 ? 'Today!' : 'Exam passed'}
                    </span>
                  )}
                </div>
                {daysLeft > 0 && weekQs > 0 && (() => {
                  const dailyAvg = Math.round(weekQs / daysIntoWeek)
                  const projected = dailyAvg * daysLeft
                  return (
                    <p className="text-xs text-gray-400 mt-2">
                      At ~{dailyAvg} Qs/day, you'll answer ~{projected.toLocaleString()} questions before your exam.
                      {goalTarget && estimatedScore && estimatedScore < goalTarget && dailyAvg < 30 && (
                        <span className="text-indigo-600 font-medium"> Try for 30/day to close the gap faster.</span>
                      )}
                    </p>
                  )
                })()}
                {scoreTrajectory && (
                  <div className={`mt-2 flex items-center gap-2 text-xs font-semibold px-2 py-1.5 rounded-lg ${scoreTrajectory.onTrack ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                    <span>{scoreTrajectory.onTrack ? '✅' : '⚠️'}</span>
                    <span>{scoreTrajectory.onTrack ? `On track! Projected: ~${scoreTrajectory.projected}` : `Need to accelerate — projected: ~${scoreTrajectory.projected} (goal: ${goalTarget})`}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* If no goal set and no estimate, show a prompt to set goal */}
        {goalTarget === null && estimatedScore === null && (
          <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-900">Set your SAT goal</p>
              <p className="text-xs text-indigo-500 mt-0.5">Track your progress toward a target score</p>
            </div>
            <button
              onClick={() => { setGoalInput(''); setEditingGoal(true) }}
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-xl transition-colors shrink-0"
            >
              Set Goal →
            </button>
          </div>
        )}

        {/* Activity heatmap (shown when there are sessions) */}
        {history.length > 0 && <StudyCalendar sessions={history} />}

        {/* Domain of the Day */}
        {onFocusPractice && (
          <div className="rounded-2xl border-2 border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-0.5">Domain of the Day ✨</p>
              <p className="text-sm font-bold text-gray-900 truncate">{domainOfDay.label}</p>
              <p className="text-xs text-violet-500 mt-0.5">{domainOfDay.subject} · +25% bonus XP today</p>
            </div>
            <button
              onClick={() => onFocusPractice(domainOfDay.id, 1.25)}
              className="shrink-0 text-xs font-semibold text-white bg-violet-500 hover:bg-violet-600 px-3 py-2 rounded-xl transition-colors"
            >
              Practice →
            </button>
          </div>
        )}

        {/* Weak spot focus card */}
        {weakDomain && onFocusPractice && (
          <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-400 mb-0.5">Weak Spot Detected</p>
              <p className="text-sm font-bold text-gray-900 truncate">{domainById[weakDomain.id]?.label ?? weakDomain.id}</p>
              <p className="text-xs text-rose-500 mt-0.5">Only {weakDomain.pct}% accuracy · focus here to improve your score</p>
            </div>
            <button
              onClick={() => onFocusPractice(weakDomain.id)}
              className="shrink-0 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 px-3 py-2 rounded-xl transition-colors"
            >
              Practice →
            </button>
          </div>
        )}

        {/* Weekend XP bonus banner */}
        {(() => { const d = new Date().getDay(); return (d === 0 || d === 6) })() && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl px-4 py-3 mb-4 text-white">
            <span className="text-lg shrink-0">🌟</span>
            <div>
              <p className="text-sm font-black">Weekend Bonus: 1.5× XP</p>
              <p className="text-xs text-indigo-200">Every session earns 50% more XP today — make it count!</p>
            </div>
          </div>
        )}

        {/* Question of the Day */}
        <QuestionOfDay allQuestions={questions} />

        {/* Quick-start shortcuts */}
        {(onQuickPractice || onFullPractice || onBeastMode || onBlitzMode) && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {onQuickPractice && (
              <button
                onClick={onQuickPractice}
                className="text-left rounded-2xl border-2 border-indigo-100 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">⚡</div>
                <div className="font-bold text-sm text-indigo-900">Quick Practice</div>
                <div className="text-xs text-indigo-500 mt-0.5">15 random questions</div>
              </button>
            )}
            {onFullPractice && (
              <button
                onClick={onFullPractice}
                className="text-left rounded-2xl border-2 border-violet-100 bg-violet-50 hover:bg-violet-100 hover:border-violet-300 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">📝</div>
                <div className="font-bold text-sm text-violet-900">Full Practice Test</div>
                <div className="text-xs text-violet-500 mt-0.5">4 modules · ~2 hr 14 min</div>
              </button>
            )}
            {onBeastMode && (
              <button
                onClick={onBeastMode}
                className="text-left rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 hover:from-rose-100 hover:to-orange-100 hover:border-rose-400 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">🔥</div>
                <div className="font-bold text-sm text-rose-900">Beast Mode</div>
                <div className="text-xs text-rose-500 mt-0.5">Hard only · 2× XP</div>
              </button>
            )}
            {onBlitzMode && (
              <button
                onClick={onBlitzMode}
                className="text-left rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 hover:border-amber-400 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">⚡</div>
                <div className="font-bold text-sm text-amber-900">Blitz Mode</div>
                <div className="text-xs text-amber-600 mt-0.5">60 sec · rapid fire</div>
              </button>
            )}
          </div>
        )}

        {/* Subjects & Topics */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Subjects & Topics</h2>
            <button
              onClick={() => {
                const allSelected = allDomainIds.every(id => selectedDomains.has(id))
                setSelectedDomains(allSelected ? new Set() : new Set(allDomainIds))
              }}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              {allDomainIds.every(id => selectedDomains.has(id)) ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TAXONOMY.map(subject => {
              const state = subjectCheckState(subject.id)
              return (
                <div key={subject.id} className="rounded-2xl border-2 border-gray-200 bg-white overflow-hidden">
                  {/* Subject header row */}
                  <button
                    onClick={() => toggleSubject(subject.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Checkbox
                      checked={state === 'all'}
                      indeterminate={state === 'some'}
                      onChange={() => toggleSubject(subject.id)}
                    />
                    <span className="text-xl font-black font-mono text-indigo-400 leading-none w-7 shrink-0">
                      {subject.icon}
                    </span>
                    <span className="font-bold text-gray-900">{subject.label}</span>
                  </button>

                  {/* Domain list */}
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {subject.domains.map(domain => (
                      <label
                        key={domain.id}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedDomains.has(domain.id)}
                          onChange={() => toggleDomain(domain.id)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-gray-800">{domain.label}</span>
                            {domainMastery[domain.id] && (
                              <span className={`text-xs ${domainMastery[domain.id].color}`} title={domainMastery[domain.id].label}>
                                {domainMastery[domain.id].icon}
                              </span>
                            )}
                            {domainStats[domain.id] && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                {domainStats[domain.id].pct}%
                                {domainStats[domain.id].trend && (
                                  <span className={`font-bold ${domainStats[domain.id].trendColor}`}>
                                    {domainStats[domain.id].trend}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{domain.description}</div>
                          {domainStats[domain.id] && domainStats[domain.id].total >= 3 && (
                            <div className="mt-1 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${domainStats[domain.id].pct >= 80 ? 'bg-emerald-400' : domainStats[domain.id].pct >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                style={{ width: `${domainStats[domain.id].pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Difficulty</h2>
            <button
              onClick={() => {
                const allSelected = [1, 2, 3].every(id => selectedDifficulties.has(id))
                setSelectedDifficulties(allSelected ? new Set() : new Set([1, 2, 3]))
              }}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              {[1, 2, 3].every(id => selectedDifficulties.has(id)) ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="flex gap-3">
            {DIFFICULTIES.map(d => {
              const active = selectedDifficulties.has(d.id)
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDifficulty(d.id)}
                  className={`flex-1 rounded-xl border-2 py-3.5 px-3 text-center transition-all duration-150 font-semibold ${
                    active ? d.classes.active + ' shadow-md' : d.classes.chip + ' hover:opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      active ? 'border-white bg-white/20' : 'border-current'
                    }`}>
                      {active && (
                        <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm">{d.label}</span>
                  </div>

                </button>
              )
            })}
          </div>
        </div>

        {/* Late-night study reminder */}
        {history.length >= 3 && new Date().getHours() >= 22 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
            <span className="text-sm">🌙</span>
            <p className="text-xs text-amber-700">Late night study? Sleep helps memory consolidation — don't skip rest before exam day!</p>
          </div>
        )}

        {/* Question bank stats */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
          <span>📚 {questions.length.toLocaleString()} questions in bank</span>
          <span>·</span>
          <span>{matchingCount.toLocaleString()} matching your filters</span>
        </div>

        {/* Adaptive difficulty hint */}
        {history.length >= 10 && (() => {
          const diffAcc = { 1: { c: 0, t: 0 }, 2: { c: 0, t: 0 }, 3: { c: 0, t: 0 } }
          for (const s of history.slice(-15)) {
            for (const q of s.questions) {
              if (!diffAcc[q.difficulty]) continue
              diffAcc[q.difficulty].t++
              if ((s.answers[q.id] ?? null) === q.answer) diffAcc[q.difficulty].c++
            }
          }
          const pcts = { 1: diffAcc[1].t >= 5 ? Math.round(diffAcc[1].c / diffAcc[1].t * 100) : null, 2: diffAcc[2].t >= 5 ? Math.round(diffAcc[2].c / diffAcc[2].t * 100) : null, 3: diffAcc[3].t >= 5 ? Math.round(diffAcc[3].c / diffAcc[3].t * 100) : null }
          let msg = null
          if (pcts[1] !== null && pcts[1] >= 85 && !selectedDifficulties.has(2)) msg = `You're ${pcts[1]}% on Easy — try adding Medium`
          else if (pcts[2] !== null && pcts[2] >= 80 && !selectedDifficulties.has(3)) msg = `You're ${pcts[2]}% on Medium — try adding Hard`
          else if (pcts[3] !== null && pcts[3] >= 75) msg = `Great job on Hard (${pcts[3]}%) — keep pushing!`
          if (!msg) return null
          return <p className="text-xs text-indigo-500 mt-2">💡 {msg}</p>
        })()}

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={matchingCount === 0}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-150 ${
            matchingCount > 0
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {matchingCount === 0 ? 'No questions match — adjust your filters' : 'Start Quiz →'}
        </button>

      </div>
    </div>
  )
}
