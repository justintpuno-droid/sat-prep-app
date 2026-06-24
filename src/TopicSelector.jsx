import { useState, useEffect, useRef, useMemo } from 'react'
import { TAXONOMY, MATH_DOMAIN_IDS, ENG_DOMAIN_IDS } from './data/taxonomy'
import { domainById } from './data/taxonomy'
import questions from './data/questions'
import { loadHistory, getSRCount } from './utils/history'
import { SAT_VOCAB } from './data/vocab'
import { loadGamification, getLevelInfo, getLevelColor, getDailyProgress, DAILY_GOAL, loadDailyGoal, saveDailyGoal, getTodayChallenge, getChallengeProgress, getThisWeekChallenge, getWeeklyProgress, ACHIEVEMENTS, loadBoost, saveBoost, useStreakFreeze, getPrestigeInfo, doPrestige, saveGamification } from './utils/gamification'

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

const SAT_TIPS = [
  "Skip hard questions first — come back with fresh eyes.",
  "On Reading: the answer is always supported by evidence in the passage.",
  "Eliminate obviously wrong choices to improve your guessing odds.",
  "On Math: plug in answer choices when algebra feels stuck.",
  "Never leave a question blank — there's no penalty for guessing.",
  "Read the question before the passage excerpt to know what to look for.",
  "On Grammar: shorter answers are usually correct on Writing questions.",
  "Check your work on math by substituting your answer back in.",
  "Manage your time: ~1.5 min per question on average.",
  "The SAT tests concepts, not memorization — understand the 'why'.",
  "For Word-in-Context questions, always read the full sentence.",
  "Mark confusing questions in your mind and return at the end.",
  "On Desmos (calculator section): graph equations to visualize problems.",
  "Passage-based: main idea questions are usually about the whole text.",
  "Always re-read your answer choice in context before confirming.",
]

const MOTIVATIONAL_QUOTES = [
  { text: "The SAT is a skill, and skills can be learned.", author: "Princeton Review" },
  { text: "Every practice question is a step toward your goal score.", author: "" },
  { text: "Progress is progress, no matter how small.", author: "" },
  { text: "Consistency beats intensity every time.", author: "" },
  { text: "Your future self will thank you for studying today.", author: "" },
  { text: "The secret to getting ahead is getting started.", author: "Mark Twain" },
  { text: "Don't practice until you get it right. Practice until you can't get it wrong.", author: "" },
  { text: "Every expert was once a beginner.", author: "" },
  { text: "Hard questions today → easy questions on test day.", author: "" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "" },
  { text: "Mistakes are proof that you're trying.", author: "" },
  { text: "Small daily improvements lead to stunning long-term results.", author: "" },
  { text: "The grind now, the glory later.", author: "" },
  { text: "Your effort today is your score tomorrow.", author: "" },
  { text: "SAT prep is a marathon, not a sprint. Stay consistent.", author: "" },
]

const QOD_KEY = 'sat_prep_qod'
function loadQOD() { try { return JSON.parse(localStorage.getItem(QOD_KEY)) ?? {} } catch { return {} } }
function saveQOD(data) { try { localStorage.setItem(QOD_KEY, JSON.stringify(data)) } catch {} }

const SPIN_KEY = 'sat_prep_spin'
function loadSpin() { try { return JSON.parse(localStorage.getItem(SPIN_KEY)) ?? {} } catch { return {} } }
function saveSpin(data) { try { localStorage.setItem(SPIN_KEY, JSON.stringify(data)) } catch {} }
const SPIN_PRIZES = [
  { label: '+50 XP', icon: '⭐', color: 'text-amber-600 bg-amber-50', xp: 50, prob: 0.40 },
  { label: '+100 XP', icon: '💎', color: 'text-indigo-600 bg-indigo-50', xp: 100, prob: 0.25 },
  { label: '2× next session', icon: '🚀', color: 'text-violet-600 bg-violet-50', xp: 0, boost: true, prob: 0.20 },
  { label: '+200 XP', icon: '🔥', color: 'text-rose-600 bg-rose-50', xp: 200, prob: 0.10 },
  { label: 'Streak Freeze', icon: '🧊', color: 'text-blue-600 bg-blue-50', xp: 0, freeze: true, prob: 0.05 },
]
function spinPrize(seed) {
  let r = seed - Math.floor(seed), cumulative = 0
  for (const p of SPIN_PRIZES) { cumulative += p.prob; if (r < cumulative) return p }
  return SPIN_PRIZES[0]
}

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

function VocabWordOfDay() {
  const w = useMemo(() => {
    const dayIdx = Math.floor(Date.now() / 86400000)
    return SAT_VOCAB[dayIdx % SAT_VOCAB.length]
  }, [])
  const [showExample, setShowExample] = useState(false)
  if (!w) return null
  return (
    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">📖</span>
        <p className="text-xs font-bold text-violet-600 uppercase tracking-widest">SAT Word of the Day</p>
      </div>
      <p className="text-xl font-black text-gray-900 mb-1">{w.word}</p>
      <p className="text-sm text-gray-600 leading-snug">{w.def}</p>
      {showExample ? (
        <p className="mt-2 text-xs text-gray-500 italic leading-snug">"{w.example}"</p>
      ) : (
        <button onClick={() => setShowExample(true)} className="mt-2 text-xs text-violet-500 hover:text-violet-700 font-medium transition-colors">
          See example sentence →
        </button>
      )}
    </div>
  )
}

function DailySpin() {
  const today = new Date().toISOString().slice(0, 10)
  const initData = useMemo(() => loadSpin(), [])
  const alreadySpun = initData.date === today
  const [spinning, setSpinning] = useState(false)
  const [prize, setPrize] = useState(alreadySpun ? initData.prize : null)

  if (alreadySpun && prize === null) return null

  function doSpin() {
    if (spinning || prize) return
    setSpinning(true)
    setTimeout(() => {
      const won = spinPrize(Math.random())
      setPrize(won)
      saveSpin({ date: today, prize: won })
      if (won.boost) saveBoost(true)
      if (won.freeze) { const g = loadGamification(); g.streakFreezes = (g.streakFreezes ?? 0) + 1; saveGamification(g) }
      if (won.xp > 0) { const g = loadGamification(); g.totalXP = (g.totalXP ?? 0) + won.xp; g.xpLog = [...(g.xpLog ?? []), { date: today, xp: won.xp }].slice(-90); saveGamification(g) }
      setSpinning(false)
    }, 1200)
  }

  return (
    <div className={`rounded-2xl border-2 p-4 mb-4 ${prize ? 'border-amber-200 bg-amber-50' : 'border-indigo-100 bg-white'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🎰</span>
        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Daily Spin</p>
        {prize && <span className="ml-auto text-xs text-amber-500 font-semibold">Today's reward</span>}
      </div>
      {prize ? (
        <div className="flex items-center gap-3">
          <span className={`text-3xl px-4 py-2 rounded-xl ${prize.color}`}>{prize.icon}</span>
          <div>
            <p className="font-black text-gray-900 text-lg">{prize.label}</p>
            <p className="text-xs text-gray-400">Claimed today · Come back tomorrow!</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {SPIN_PRIZES.map((p, i) => (
              <div key={i} className={`text-lg ${spinning ? 'animate-bounce' : ''}`} style={{ animationDelay: `${i * 100}ms` }}>{p.icon}</div>
            ))}
          </div>
          <button
            onClick={doSpin}
            disabled={spinning}
            className={`ml-auto text-sm font-black px-5 py-2 rounded-xl transition-all ${spinning ? 'bg-gray-200 text-gray-400' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-lg active:scale-95'}`}
          >
            {spinning ? 'Spinning...' : '🎰 Spin!'}
          </button>
        </div>
      )}
    </div>
  )
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
      {revealed && q.explanation && (
        <div className={`mt-3 rounded-xl p-3 text-xs leading-relaxed ${isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-50 text-gray-600'}`}>
          <span className="font-semibold">Explanation: </span>{q.explanation}
        </div>
      )}
      {revealed && (
        <p className={`mt-2 text-xs font-semibold text-center ${isCorrect ? 'text-emerald-500' : 'text-gray-400'}`}>
          {isCorrect ? '⚡ +15 XP — come back tomorrow for a new question!' : 'Review this — come back tomorrow for a new question!'}
        </p>
      )}
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

export default function TopicSelector({ onStart, onHistory, onQuestionBank, onQuickPractice, onQuick5, onAdaptiveQuiz, onWrongAnswerSprint, onProblemAreasDrill, onSuddenDeath, onTimedChallenge, onFullPractice, onAchievements, onFocusPractice, onBeastMode, onBlitzMode, onFlaggedReview, onSpacedRepetition, onVocab, pendingXP, onClearPendingXP }) {
  const history = useMemo(() => loadHistory(), [])
  const streak = useMemo(() => computeStreak(history), [history])
  const streakAtRisk = useMemo(() => {
    if (streak < 2) return false
    const hour = new Date().getHours()
    if (hour < 18) return false
    const today = new Date().toISOString().slice(0, 10)
    return !history.some(s => s.completedAt.slice(0, 10) === today)
  }, [streak, history])
  const [boostActive, setBoostActive] = useState(() => loadBoost())
  const [freezeCount, setFreezeCount] = useState(() => loadGamification().streakFreezes ?? 0)
  const [freezeUsed, setFreezeUsed] = useState(false)
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

  const [prestigeInfo, setPrestigeInfo] = useState(() => getPrestigeInfo(loadGamification()))
  const [showPrestigeConfirm, setShowPrestigeConfirm] = useState(false)

  function handlePrestige() {
    const currentGam = loadGamification()
    const updated = doPrestige(currentGam)
    saveGamification(updated)
    setPrestigeInfo(getPrestigeInfo(updated))
    setShowPrestigeConfirm(false)
    window.location.reload()
  }

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

  const streakRecovery = useMemo(() => {
    if (streak > 0 || history.length < 3) return null
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    const dayBefore = new Date(today); dayBefore.setDate(today.getDate() - 2)
    const yStr = yesterday.toISOString().slice(0, 10)
    const dbStr = dayBefore.toISOString().slice(0, 10)
    // Check if student had a streak that ended yesterday or day before
    const studiedDates = new Set(history.map(s => s.completedAt.slice(0, 10)))
    if (!studiedDates.has(yStr) && !studiedDates.has(dbStr)) return null
    // Compute what the streak was
    let prevStreak = 0
    let d = new Date(yesterday)
    while (studiedDates.has(d.toISOString().slice(0, 10))) {
      prevStreak++
      d.setDate(d.getDate() - 1)
    }
    if (prevStreak < 2) return null
    const todaySessCount = history.filter(s => s.completedAt.startsWith(today.toISOString().slice(0, 10))).length
    return { prevStreak, todaySessCount }
  }, [streak, history])

  const dailyTip = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const seed = today.split('-').reduce((a, b) => a + parseInt(b, 10), 0)
    return SAT_TIPS[(seed + 7) % SAT_TIPS.length]
  }, [])

  const dailyQuote = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const seed = today.split('-').reduce((a, b) => a + parseInt(b, 10), 0)
    return MOTIVATIONAL_QUOTES[seed % MOTIVATIONAL_QUOTES.length]
  }, [])

  const weeklyFocusPlan = useMemo(() => {
    if (history.length < 5) return null
    const byDomain = {}
    for (const s of history) {
      for (const q of s.questions) {
        if (!byDomain[q.domain]) byDomain[q.domain] = { c: 0, t: 0 }
        byDomain[q.domain].t++
        if ((s.answers[q.id] ?? null) === q.answer) byDomain[q.domain].c++
      }
    }
    const allDomainIds = new Set(questions.map(q => q.domain))
    const unpracticed = [...allDomainIds]
      .filter(id => !byDomain[id] || byDomain[id].t < 3)
      .slice(0, 2)
      .map(id => ({ id, label: domainById[id]?.label ?? id, status: 'new' }))
    const struggling = Object.entries(byDomain)
      .filter(([, v]) => v.t >= 5 && (v.c / v.t) < 0.7)
      .sort(([, a], [, b]) => (a.c / a.t) - (b.c / b.t))
      .slice(0, 3)
      .map(([id, v]) => ({ id, label: domainById[id]?.label ?? id, pct: Math.round((v.c / v.t) * 100), status: 'weak' }))
    const focus = [...struggling, ...unpracticed].slice(0, 3)
    if (focus.length === 0) return null
    return focus
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

  const persistentMistakes = useMemo(() => {
    const wrongCount = {}
    const correctCount = {}
    for (const s of history) {
      for (const q of s.questions) {
        const answered = s.answers[q.id] ?? null
        if (answered !== null) {
          if (answered === q.answer) correctCount[q.id] = (correctCount[q.id] ?? 0) + 1
          else wrongCount[q.id] = (wrongCount[q.id] ?? 0) + 1
        }
      }
    }
    return Object.entries(wrongCount)
      .filter(([id, w]) => w >= 2 && !(correctCount[id] >= w))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, w]) => ({ id, wrongCount: w }))
  }, [history])

  const masteredTopics = useMemo(() => {
    const byDomain = {}
    for (const s of history) {
      for (const q of s.questions) {
        if (!byDomain[q.domain]) byDomain[q.domain] = { c: 0, t: 0 }
        byDomain[q.domain].t++
        if ((s.answers[q.id] ?? null) === q.answer) byDomain[q.domain].c++
      }
    }
    return Object.entries(byDomain).filter(([, v]) => v.t >= 20 && v.c / v.t >= 0.8).length
  }, [history])

  const recentWrongCount = useMemo(() => {
    const ids = new Set()
    for (const s of history.slice(-10)) {
      for (const q of s.questions) {
        if ((s.answers[q.id] ?? null) !== q.answer) ids.add(q.id)
      }
    }
    return ids.size
  }, [history])

  const scoreEstimate = useMemo(() => {
    const eligible = history.filter(s => s.score.total >= 10).slice(-20)
    if (eligible.length < 3) return null
    const avgAcc = eligible.reduce((sum, x) => sum + x.score.percent, 0) / eligible.length / 100
    const map = [
      [0.95, 1450, 1550], [0.90, 1350, 1450], [0.85, 1250, 1350],
      [0.80, 1150, 1250], [0.75, 1050, 1150], [0.70, 950, 1050],
      [0.65, 850, 950],   [0.60, 750, 850],   [0.55, 650, 750], [0, 400, 649],
    ]
    const band = map.find(([thresh]) => avgAcc >= thresh)
    if (!band) return null

    // Per-section estimates
    const mathSections = history.filter(s => {
      const ids = s.questions?.map(q => q.domain) ?? []
      return ids.some(d => ['algebra','advanced-math','problem-solving-data','geometry-trig'].includes(d))
    }).slice(-15)
    const engSections = history.filter(s => {
      const ids = s.questions?.map(q => q.domain) ?? []
      return ids.some(d => ['information-ideas','craft-structure','expression-ideas','standard-english'].includes(d))
    }).slice(-15)
    const mathAcc = mathSections.length >= 2
      ? mathSections.reduce((s, x) => s + x.score.percent, 0) / mathSections.length / 100
      : avgAcc
    const engAcc = engSections.length >= 2
      ? engSections.reduce((s, x) => s + x.score.percent, 0) / engSections.length / 100
      : avgAcc
    const toSection = (acc) => Math.round((200 + acc * 600) / 10) * 10
    const mathScore = toSection(mathAcc)
    const engScore = toSection(engAcc)

    // Trend vs 5 sessions ago
    const old5 = history.filter(s => s.score.total >= 10).slice(-10, -5)
    const oldAcc = old5.length >= 2 ? old5.reduce((s, x) => s + x.score.percent, 0) / old5.length / 100 : null
    const trend = oldAcc !== null ? (avgAcc > oldAcc + 0.03 ? 'up' : avgAcc < oldAcc - 0.03 ? 'down' : 'flat') : null

    return { lo: band[1], hi: band[2], mathScore, engScore, trend }
  }, [history])

  const momentum = useMemo(() => {
    const recent = history.filter(s => s.score.total >= 5).slice(-7)
    if (recent.length < 4) return null
    const pts = recent.map(s => s.score.percent)
    const last3avg = pts.slice(-3).reduce((a, b) => a + b, 0) / 3
    const prev3avg = pts.slice(-6, -3).reduce((a, b) => a + b, 0) / Math.max(1, pts.slice(-6, -3).length)
    const trend = last3avg - prev3avg
    return { pts, trend, label: trend > 5 ? '🔥 Hot zone!' : trend < -5 ? '📉 Bounce back!' : '💪 Steady' }
  }, [history])

  const miniCalendar = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i))
      const key = d.toISOString().slice(0, 10)
      const daySessions = history.filter(s => s.completedAt.startsWith(key))
      if (daySessions.length === 0) return { key, status: 'none' }
      const best = Math.max(...daySessions.map(s => s.score.percent))
      return { key, status: best >= 80 ? 'great' : best >= 60 ? 'ok' : 'low' }
    })
    const studied = days.filter(d => d.status !== 'none').length
    return { days, studied }
  }, [history])

  const scoreTrend = useMemo(() => {
    const eligible = history.filter(s => s.score.total >= 5).slice(-15)
    if (eligible.length < 4) return null
    return eligible.map(s => s.score.percent)
  }, [history])

  const lastSessionSummary = useMemo(() => {
    if (history.length === 0) return null
    const s = history[history.length - 1]
    const ago = (() => {
      const diff = (Date.now() - new Date(s.completedAt)) / 60000
      if (diff < 60) return `${Math.round(diff)}m ago`
      if (diff < 1440) return `${Math.round(diff / 60)}h ago`
      return `${Math.round(diff / 1440)}d ago`
    })()
    const domains = [...new Set(s.questions.map(q => q.domain))]
      .slice(0, 2).map(id => domainById[id]?.label ?? id).join(', ')
    return { pct: s.score.percent, correct: s.score.correct, total: s.score.total, ago, formatLabel: s.formatLabel, domains }
  }, [history])

  const timeToNextLevel = useMemo(() => {
    if (history.length < 3) return null
    const recent5 = history.slice(-5)
    const xpPerSession = recent5.reduce((sum, s) => sum + s.score.correct * 10 + (s.score.total - s.score.correct) * 5, 0) / recent5.length
    if (xpPerSession < 10) return null
    const gap = levelInfo.xpForNext ? (levelInfo.xpForNext - levelInfo.xpIntoLevel) : null
    if (!gap) return null
    const sessions = Math.ceil(gap / xpPerSession)
    return sessions <= 50 ? sessions : null
  }, [history, levelInfo])

  const bestStudyTime = useMemo(() => {
    if (history.length < 8) return null
    const tod = { morning: { c: 0, t: 0 }, afternoon: { c: 0, t: 0 }, evening: { c: 0, t: 0 } }
    for (const s of history) {
      const h = new Date(s.completedAt).getHours()
      const b = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
      tod[b].t += s.score.total; tod[b].c += s.score.correct
    }
    const best = Object.entries(tod)
      .filter(([, v]) => v.t >= 10)
      .sort(([, a], [, b]) => (b.c / b.t) - (a.c / a.t))[0]
    if (!best) return null
    const [name, stats] = best
    const pct = Math.round((stats.c / stats.t) * 100)
    const emoji = { morning: '🌅', afternoon: '☀️', evening: '🌙' }[name]
    const label = { morning: 'morning', afternoon: 'afternoon', evening: 'evening' }[name]
    return { label, emoji, pct }
  }, [history])

  const dailyTarget = useMemo(() => {
    if (history.length < 3) return null
    const todayStr = new Date().toISOString().slice(0, 10)
    const studiedToday = history.some(s => s.completedAt.startsWith(todayStr))
    if (studiedToday) return null
    if (weakDomain && weakDomain.pct < 60) {
      const label = domainById[weakDomain.id]?.label ?? weakDomain.id
      return { text: `Drill 10 ${label} questions`, icon: '🎯', color: 'text-rose-600 bg-rose-50 border-rose-200' }
    }
    const recent5 = history.filter(s => s.score.total >= 5).slice(-5)
    if (recent5.length >= 3) {
      const avg = recent5.reduce((s, x) => s + x.score.percent, 0) / recent5.length
      if (avg < 65) return { text: 'Focus on accuracy today — aim for 70%+', icon: '📈', color: 'text-amber-600 bg-amber-50 border-amber-200' }
      if (avg >= 80) return { text: 'Ready for Hard mode? Push your limits today', icon: '💪', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' }
    }
    return { text: 'Complete a 15-question session to keep your streak', icon: '🔥', color: 'text-orange-600 bg-orange-50 border-orange-200' }
  }, [history, weakDomain])

  const hotDomainThisWeek = useMemo(() => {
    const mon = new Date()
    const day = mon.getDay()
    mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
    const monStr = mon.toISOString().slice(0, 10)
    const weekSessions = history.filter(s => s.completedAt.slice(0, 10) >= monStr)
    if (weekSessions.length < 2) return null
    const byDomain = {}
    for (const s of weekSessions) {
      for (const q of s.questions) {
        if (!byDomain[q.domain]) byDomain[q.domain] = { correct: 0, total: 0 }
        byDomain[q.domain].total++
        if ((s.answers[q.id] ?? null) === q.answer) byDomain[q.domain].correct++
      }
    }
    const best = Object.entries(byDomain)
      .filter(([, v]) => v.total >= 5 && (v.correct / v.total) >= 0.8)
      .sort(([, a], [, b]) => (b.correct / b.total) - (a.correct / a.total))[0]
    if (!best) return null
    const [id, st] = best
    return { id, label: domainById[id]?.label ?? id, pct: Math.round((st.correct / st.total) * 100), total: st.total }
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

  const srDueCount = useMemo(() => getSRCount(), [history])

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

  const weeklyChallenge = useMemo(() => {
    const challenge = getThisWeekChallenge()
    const now = new Date(); const day = now.getDay()
    const monday = new Date(now); monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1)); monday.setHours(0,0,0,0)
    const weekSessions = history.filter(s => new Date(s.completedAt) >= monday)
    const progress = getWeeklyProgress(weekSessions, challenge)
    const gam = loadGamification()
    const weekKey = (() => {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + 4 - (d.getDay() || 7))
      const y = d.getFullYear(); const w = Math.ceil(((d - new Date(y,0,1))/86400000+1)/7)
      return `${y}-W${String(w).padStart(2,'0')}`
    })()
    const done = gam.weeklyChallengeWeek === weekKey
    return { challenge, progress, done, weekSessions: weekSessions.length }
  }, [history])

  const weeklySessionCount = useMemo(() => {
    const mon = new Date()
    const day = mon.getDay()
    mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
    const monStr = mon.toISOString().slice(0, 10)
    return history.filter(s => s.completedAt.slice(0, 10) >= monStr).length
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

  const xpWeekRace = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const thisMonday = new Date(now); thisMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); thisMonday.setHours(0,0,0,0)
    const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7)
    const calcXP = (from, to) => history
      .filter(s => { const d = new Date(s.completedAt); return d >= from && d < to })
      .reduce((n, s) => n + s.score.correct * 10 + (s.score.total - s.score.correct) * 5, 0)
    const thisWeek = calcXP(thisMonday, new Date(thisMonday.getTime() + 7 * 86400000))
    const lastWeek = calcXP(lastMonday, thisMonday)
    return { thisWeek, lastWeek, diff: thisWeek - lastWeek, dayOfWeek }
  }, [history])

  const recentAchievements = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    return Object.entries(gam.achievements)
      .filter(([, v]) => new Date(v.unlockedAt).getTime() > cutoff)
      .map(([id]) => ACHIEVEMENTS.find(a => a.id === id))
      .filter(Boolean)
  }, [gam])

  const nearUnlocks = useMemo(() => {
    const byDomain = {}
    for (const s of history) for (const q of s.questions) {
      if (!byDomain[q.domain]) byDomain[q.domain] = { c: 0, t: 0 }
      byDomain[q.domain].t++
      if ((s.answers?.[q.id] ?? null) === q.answer) byDomain[q.domain].c++
    }
    const hardCorrect = history.reduce((n, s) => {
      for (const q of s.questions) if (q.difficulty === 3 && (s.answers[q.id] ?? null) === q.answer) n++
      return n
    }, 0)
    const dates = new Set(history.map(s => s.completedAt.slice(0, 10)))
    const d = new Date(); let streak = 0
    while (dates.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
    const totalQ = history.reduce((n, s) => n + s.score.total, 0)
    const masteredDomains = Object.values(byDomain).filter(v => v.t >= 20 && v.c / v.t >= 0.8).length
    const progressFor = {
      'century':      Math.min(100, Math.round((totalQ / 100) * 100)),
      'five-hundred': Math.min(100, Math.round((totalQ / 500) * 100)),
      'thousand':     Math.min(100, Math.round((totalQ / 1000) * 100)),
      'xp-1000':      Math.min(100, Math.round((gam.totalXP / 1000) * 100)),
      'xp-5000':      Math.min(100, Math.round((gam.totalXP / 5000) * 100)),
      'xp-10000':     Math.min(100, Math.round((gam.totalXP / 10000) * 100)),
      'streak-3':     Math.min(100, Math.round((streak / 3) * 100)),
      'streak-7':     Math.min(100, Math.round((streak / 7) * 100)),
      'streak-14':    Math.min(100, Math.round((streak / 14) * 100)),
      'hard-worker':  Math.min(100, Math.round((hardCorrect / 25) * 100)),
      'hard-elite':   Math.min(100, Math.round((hardCorrect / 50) * 100)),
      'domain-master-5': Math.min(100, Math.round((masteredDomains / 5) * 100)),
    }
    return ACHIEVEMENTS
      .filter(a => !gam.achievements[a.id] && progressFor[a.id] !== undefined && progressFor[a.id] >= 30)
      .map(a => ({ ...a, pct: progressFor[a.id] }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3)
  }, [history, gam])

  const domainCoverage = useMemo(() => {
    const totalByDomain = {}
    for (const q of questions) totalByDomain[q.domain] = (totalByDomain[q.domain] ?? 0) + 1
    const seenByDomain = {}
    for (const s of history) for (const q of s.questions) {
      if (!seenByDomain[q.domain]) seenByDomain[q.domain] = new Set()
      seenByDomain[q.domain].add(q.id)
    }
    return Object.entries(totalByDomain).map(([id, total]) => ({
      id, total, seen: seenByDomain[id]?.size ?? 0,
      pct: Math.round(((seenByDomain[id]?.size ?? 0) / total) * 100)
    })).sort((a, b) => b.pct - a.pct)
  }, [history])

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

  const [showXPToast, setShowXPToast] = useState(false)
  useEffect(() => {
    if (!pendingXP) return
    setShowXPToast(true)
    const t = setTimeout(() => { setShowXPToast(false); onClearPendingXP?.() }, 3000)
    return () => clearTimeout(t)
  }, [pendingXP])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 flex items-start justify-center px-4 py-12">
      {/* Prestige confirm modal */}
      {showPrestigeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowPrestigeConfirm(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-3">⭐</div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Prestige {prestigeInfo.prestige + 1}?</h3>
            <p className="text-sm text-gray-600 mb-1">Your XP resets to 0, but you earn a permanent <span className="font-bold text-amber-600">Prestige {prestigeInfo.prestige + 1}</span> badge.</p>
            <p className="text-xs text-gray-400 mb-6">All your history, streak, and achievements are kept. This just shows everyone you've mastered the game.</p>
            <div className="space-y-3">
              <button onClick={handlePrestige} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl transition-colors">
                ✨ Yes, Prestige!
              </button>
              <button onClick={() => setShowPrestigeConfirm(false)} className="w-full text-gray-500 font-semibold py-2 text-sm hover:text-gray-700 transition-colors">
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* XP toast */}
      {showXPToast && pendingXP > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none">
          <div className="bg-indigo-600 text-white text-sm font-black px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2">
            <span>⚡</span>
            <span>+{pendingXP} XP</span>
          </div>
        </div>
      )}
      <div className="w-full max-w-2xl">

        {/* Exam countdown banner */}
        {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && (
          <div className={`rounded-2xl px-4 py-3 mb-4 flex items-center gap-3 ${daysLeft <= 7 ? 'bg-rose-600 text-white' : daysLeft <= 14 ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'}`}>
            <span className="text-2xl shrink-0">{daysLeft <= 7 ? '🚨' : daysLeft <= 14 ? '⚠️' : '📅'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black leading-tight">
                {daysLeft <= 7 ? `${daysLeft} day${daysLeft > 1 ? 's' : ''} until your SAT!` : `${daysLeft} days until your SAT`}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {daysLeft <= 7 ? 'Focus on your weakest domains — every session counts!' : daysLeft <= 14 ? 'Two weeks left — push hard on weak areas!' : 'One month to go — stay consistent!'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-black leading-none">{daysLeft}</p>
              <p className="text-xs opacity-70">days</p>
            </div>
          </div>
        )}

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
              {freezeCount > 0 && (
                <span className="text-xs font-semibold text-blue-400 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full" title={`${freezeCount} streak freeze${freezeCount !== 1 ? 's' : ''} available`}>
                  🧊×{freezeCount}
                </span>
              )}
              {weeklyChallenge.done && (
                <span className="text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                  📋 Week ✓
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {onProblemAreasDrill && persistentMistakes.length >= 2 && (
                <button onClick={onProblemAreasDrill} className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 bg-red-50 rounded-lg px-3 py-1.5 transition-colors" title={`Drill your ${persistentMistakes.length} most persistent problem questions`}>
                  ⚠️ Problem Areas
                </button>
              )}
              {onWrongAnswerSprint && recentWrongCount > 0 && (
                <button onClick={onWrongAnswerSprint} className="text-xs font-semibold text-rose-600 hover:text-rose-800 border border-rose-200 bg-rose-50 rounded-lg px-3 py-1.5 transition-colors" title={`Drill ${Math.min(recentWrongCount, 15)} recent wrong answers`}>
                  🔁 Wrong ({recentWrongCount})
                </button>
              )}
              {onAdaptiveQuiz && history.length >= 3 && (
                <button onClick={onAdaptiveQuiz} className="text-xs font-semibold text-violet-600 hover:text-violet-800 border border-violet-200 bg-violet-50 rounded-lg px-3 py-1.5 transition-colors" title="Smart quiz weighted to your weak spots">
                  🧠 Adaptive
                </button>
              )}
              {onQuick5 && (
                <button onClick={onQuick5} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-1.5 transition-colors" title="Quick 5-question warmup">
                  ⚡ Quick 5
                </button>
              )}
              {onFlaggedReview && totalFlagged > 0 && (
                <button onClick={onFlaggedReview} className="relative text-xs font-semibold text-amber-700 hover:text-amber-900 border border-amber-200 bg-amber-50 rounded-lg px-3 py-1.5 transition-colors" title={`Review ${totalFlagged} flagged question${totalFlagged !== 1 ? 's' : ''}`}>
                  🚩 Flagged ({totalFlagged})
                </button>
              )}
              {onSpacedRepetition && srDueCount > 0 && (
                <button onClick={onSpacedRepetition} className="relative text-xs font-semibold text-teal-700 hover:text-teal-900 border border-teal-200 bg-teal-50 rounded-lg px-3 py-1.5 transition-colors animate-pulse" title={`${srDueCount} question${srDueCount !== 1 ? 's' : ''} scheduled for review today`}>
                  🔁 Due ({srDueCount})
                </button>
              )}
              {onVocab && (
                <button onClick={onVocab} className="text-xs font-semibold text-violet-600 hover:text-violet-800 border border-violet-200 bg-violet-50 rounded-lg px-3 py-1.5 transition-colors" title="SAT Vocabulary Flashcards">
                  📖 Vocab
                </button>
              )}
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
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-gray-700 truncate">{levelInfo.title}</p>
                {prestigeInfo.prestige > 0 && (
                  <span className="text-xs font-bold text-amber-600 shrink-0">{prestigeInfo.title}</span>
                )}
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div className={`h-full ${levelColor.ring} rounded-full transition-all`} style={{ width: `${levelInfo.pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {levelInfo.xpForNext
                  ? `${gam.totalXP.toLocaleString()} XP · ${levelInfo.xpIntoLevel}/${levelInfo.xpForNext} to Lv ${levelInfo.level + 1}`
                  : `${gam.totalXP.toLocaleString()} XP · Max Level`}
                {timeToNextLevel && <span className="text-indigo-400"> · ~{timeToNextLevel} session{timeToNextLevel !== 1 ? 's' : ''}</span>}
                {prestigeInfo.canPrestige && (
                  <button onClick={() => setShowPrestigeConfirm(true)} className="ml-2 text-amber-600 font-bold hover:text-amber-800 transition-colors">
                    ✨ Prestige
                  </button>
                )}
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

          {masteredTopics > 0 && (
            <>
              <div className="h-12 w-px bg-gray-100 shrink-0" />
              <div className="shrink-0 text-center">
                <p className="text-xl">⭐</p>
                <p className="text-xs text-gray-400 mt-1">{masteredTopics} mastered</p>
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

        {/* Weekly Leaderboard */}
        {gam.totalXP > 0 && (() => {
          const PEERS = [
            { name: 'Aiden K.', seed: 17 }, { name: 'Sofia M.', seed: 31 }, { name: 'Jayden L.', seed: 7 },
            { name: 'Emma R.', seed: 53 }, { name: 'Noah P.', seed: 43 }, { name: 'Olivia T.', seed: 23 },
            { name: 'Liam W.', seed: 61 }, { name: 'Ava S.', seed: 11 }, { name: 'Ethan C.', seed: 37 },
          ]
          const weekMs = 7 * 24 * 3600 * 1000
          const weekStart = new Date(); weekStart.setHours(0,0,0,0); weekStart.setDate(weekStart.getDate() - weekStart.getDay())
          const weekXP = history
            .filter(s => new Date(s.completedAt) >= weekStart)
            .reduce((sum, s) => sum + (s.score.total * 10), 0)
          const seed = weekStart.getTime()
          const rng = (n, s) => { let x = (n * 9301 + s * 49297 + seed / 1000000) % 233280; return x / 233280 }
          const peers = PEERS.map((p, i) => ({
            name: p.name,
            xp: Math.round(rng(p.seed, i) * 900 + 50),
            isMe: false,
          }))
          const me = { name: 'You', xp: weekXP, isMe: true }
          const board = [...peers, me].sort((a, b) => b.xp - a.xp)
          const myRank = board.findIndex(r => r.isMe) + 1
          const medals = ['🥇','🥈','🥉']
          return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">This Week's Leaderboard</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${myRank <= 3 ? 'bg-amber-100 text-amber-700' : myRank <= 5 ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                  #{myRank} of {board.length}
                </span>
              </div>
              <div className="space-y-2">
                {board.slice(0, 5).map((entry, i) => (
                  <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-xl ${entry.isMe ? 'bg-indigo-50 border border-indigo-200' : ''}`}>
                    <span className="w-5 text-center text-sm">{medals[i] ?? `${i+1}`}</span>
                    <span className={`flex-1 text-sm font-semibold ${entry.isMe ? 'text-indigo-700' : 'text-gray-700'}`}>{entry.name}</span>
                    <span className={`text-xs font-bold ${entry.isMe ? 'text-indigo-600' : 'text-gray-400'}`}>{entry.xp.toLocaleString()} XP</span>
                  </div>
                ))}
                {myRank > 5 && (
                  <>
                    <div className="text-center text-gray-300 text-xs py-0.5">· · ·</div>
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200">
                      <span className="w-5 text-center text-xs font-bold text-gray-500">#{myRank}</span>
                      <span className="flex-1 text-sm font-semibold text-indigo-700">You</span>
                      <span className="text-xs font-bold text-indigo-600">{weekXP.toLocaleString()} XP</span>
                    </div>
                  </>
                )}
              </div>
              {myRank > 1 && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {board[myRank - 2].xp - weekXP} XP behind #{myRank - 1} · Study more to climb! 🚀
                </p>
              )}
              {myRank === 1 && (
                <p className="text-xs text-emerald-600 font-semibold mt-2 text-center">🏆 You're #1 this week — keep it up!</p>
              )}
            </div>
          )
        })()}

        {/* Domain mastery map */}
        {history.length >= 3 && (() => {
          const byDomain = {}
          for (const s of history) for (const q of s.questions) {
            if (!byDomain[q.domain]) byDomain[q.domain] = { c: 0, t: 0 }
            byDomain[q.domain].t++
            if ((s.answers?.[q.id] ?? null) === q.answer) byDomain[q.domain].c++
          }
          const math = TAXONOMY.find(s => s.id === 'math')?.domains ?? []
          const eng  = TAXONOMY.find(s => s.id === 'english')?.domains ?? []
          const Cell = ({ domain }) => {
            const d = byDomain[domain.id]
            const pct = d ? Math.round((d.c / d.t) * 100) : null
            const bg = pct === null ? 'bg-gray-100 text-gray-300' :
                       pct >= 80 ? 'bg-emerald-500 text-white' :
                       pct >= 65 ? 'bg-amber-400 text-white' : 'bg-rose-400 text-white'
            return (
              <button
                onClick={() => onFocusPractice?.(domain.id)}
                className={`flex-1 rounded-xl py-2 px-1 text-center transition-all hover:scale-105 ${bg}`}
                title={`${domain.label}${pct !== null ? `: ${pct}% (${d.t} Qs)` : ': not yet practiced'}`}
              >
                <p className="text-xs font-bold leading-tight">{pct !== null ? `${pct}%` : '—'}</p>
                <p className="text-[9px] leading-tight mt-0.5 opacity-80 truncate">{domain.label.split(' ')[0]}</p>
              </button>
            )
          }
          return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Domain Map — tap to drill</p>
              <div className="mb-2">
                <p className="text-[10px] text-gray-300 mb-1 uppercase tracking-widest">Math</p>
                <div className="flex gap-1.5">{math.map(d => <Cell key={d.id} domain={d} />)}</div>
              </div>
              <div>
                <p className="text-[10px] text-gray-300 mb-1 uppercase tracking-widest">English</p>
                <div className="flex gap-1.5">{eng.map(d => <Cell key={d.id} domain={d} />)}</div>
              </div>
              <div className="flex items-center gap-2 mt-2.5">
                {[['bg-emerald-500','≥80%'],['bg-amber-400','65-79%'],['bg-rose-400','<65%'],['bg-gray-100 border border-gray-200','New']].map(([cls,lbl]) => (
                  <div key={lbl} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
                    <span className="text-[9px] text-gray-400">{lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Domain Rankings */}
        {(() => {
          const ranked = Object.entries(domainStats)
            .filter(([, s]) => s.total >= 5)
            .map(([id, s]) => ({ id, pct: s.pct, label: TAXONOMY.flatMap(x => x.domains).find(d => d.id === id)?.label ?? id }))
            .sort((a, b) => b.pct - a.pct)
          if (ranked.length < 3) return null
          const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
          const tier = (p) => p >= 85 ? { label: 'Master', cls: 'text-amber-500 bg-amber-50' } : p >= 70 ? { label: 'Strong', cls: 'text-emerald-600 bg-emerald-50' } : p >= 55 ? { label: 'Building', cls: 'text-indigo-500 bg-indigo-50' } : { label: 'Needs work', cls: 'text-rose-500 bg-rose-50' }
          return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Domain Rankings</p>
              <div className="space-y-2">
                {ranked.map((d, i) => {
                  const t = tier(d.pct)
                  return (
                    <button key={d.id} onClick={() => onFocusPractice?.(d.id)} className="w-full flex items-center gap-3 group">
                      <span className="w-5 text-base shrink-0">{medal(i) ?? <span className="text-xs text-gray-400 font-bold">#{i + 1}</span>}</span>
                      <span className="text-sm text-gray-700 flex-1 text-left truncate group-hover:text-indigo-600 transition-colors">{d.label}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-20">
                        <div className={`h-full rounded-full ${d.pct >= 80 ? 'bg-emerald-500' : d.pct >= 65 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${d.pct}%` }} />
                      </div>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-lg shrink-0 ${t.cls}`}>{d.pct}%</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Question coverage tracker */}
        {domainCoverage.some(d => d.seen > 0) && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Question Coverage</p>
              <span className="text-xs text-gray-400">
                {domainCoverage.reduce((n, d) => n + d.seen, 0)} / {domainCoverage.reduce((n, d) => n + d.total, 0)} unique Qs seen
              </span>
            </div>
            <div className="space-y-2">
              {domainCoverage.map(d => {
                const dom = TAXONOMY.flatMap(s => s.domains).find(x => x.id === d.id)
                return (
                  <div key={d.id}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-600 truncate">{dom?.label ?? d.id}</span>
                      <span className="text-xs font-semibold text-gray-500 ml-2 shrink-0">{d.seen}/{d.total}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${d.pct >= 80 ? 'bg-emerald-500' : d.pct >= 40 ? 'bg-indigo-400' : 'bg-gray-300'}`}
                        style={{ width: `${d.pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Study Momentum sparkline */}
        {momentum && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-medium mb-1">Recent momentum</p>
              <svg viewBox={`0 0 ${(momentum.pts.length - 1) * 20} 28`} className="w-full h-7" preserveAspectRatio="none">
                <polyline
                  points={momentum.pts.map((v, i) => `${i * 20},${28 - (v / 100) * 28}`).join(' ')}
                  fill="none"
                  stroke={momentum.trend > 5 ? '#10b981' : momentum.trend < -5 ? '#f87171' : '#818cf8'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {momentum.pts.map((v, i) => (
                  <circle key={i} cx={i * 20} cy={28 - (v / 100) * 28} r="2.5"
                    fill={i === momentum.pts.length - 1 ? (momentum.trend > 5 ? '#10b981' : momentum.trend < -5 ? '#f87171' : '#6366f1') : 'white'}
                    stroke={momentum.trend > 5 ? '#10b981' : momentum.trend < -5 ? '#f87171' : '#818cf8'}
                    strokeWidth="1.5"
                  />
                ))}
              </svg>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-xs font-bold ${momentum.trend > 5 ? 'text-emerald-500' : momentum.trend < -5 ? 'text-rose-500' : 'text-indigo-500'}`}>
                {momentum.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">last {momentum.pts.length} sessions</p>
            </div>
          </div>
        )}

        {/* SAT Score Estimate */}
        {scoreEstimate && (
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest">Est. SAT Score</p>
              {scoreEstimate.trend && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreEstimate.trend === 'up' ? 'bg-emerald-100 text-emerald-600' : scoreEstimate.trend === 'down' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'}`}>
                  {scoreEstimate.trend === 'up' ? '↑ Improving' : scoreEstimate.trend === 'down' ? '↓ Slipping' : '→ Steady'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-black text-indigo-700">{scoreEstimate.lo}–{scoreEstimate.hi}</p>
                <p className="text-xs text-indigo-300">out of 1600</p>
              </div>
              <div className="h-10 w-px bg-indigo-100" />
              <div className="flex gap-4 text-center">
                <div>
                  <p className="text-xs text-indigo-400 font-medium">Math</p>
                  <p className="text-base font-black text-indigo-600">{scoreEstimate.mathScore}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-400 font-medium">R&W</p>
                  <p className="text-base font-black text-violet-600">{scoreEstimate.engScore}</p>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* Streak recovery card */}
        {streakRecovery && (
          <div className="bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💔</span>
              <div className="flex-1">
                <p className="text-sm font-black text-gray-800">Your {streakRecovery.prevStreak}-day streak broke!</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {streakRecovery.todaySessCount >= 2
                    ? '✅ Comeback complete! Study tomorrow to start a new streak.'
                    : `Complete ${2 - streakRecovery.todaySessCount} more session${2 - streakRecovery.todaySessCount > 1 ? 's' : ''} today for a +100 XP comeback bonus!`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-rose-600">{streakRecovery.todaySessCount}/2</p>
                <p className="text-xs text-gray-400">sessions</p>
              </div>
            </div>
            <div className="mt-2 h-1.5 bg-rose-100 rounded-full overflow-hidden">
              <div className="h-full bg-rose-400 rounded-full transition-all" style={{ width: `${(streakRecovery.todaySessCount / 2) * 100}%` }} />
            </div>
          </div>
        )}

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

        {/* Streak at risk warning */}
        {streakAtRisk && !freezeUsed && (
          <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl px-4 py-3 mb-4 text-white flex items-center gap-3 animate-pulse">
            <span className="text-2xl shrink-0">🔥</span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm leading-tight">{streak}-day streak at risk!</p>
              <p className="text-xs text-rose-100 mt-0.5">Study before midnight to keep it alive</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {freezeCount > 0 && (
                <button
                  onClick={() => { if (useStreakFreeze()) { setFreezeCount(c => c - 1); setFreezeUsed(true) } }}
                  className="bg-white/20 hover:bg-white/30 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors"
                  title={`Use a Streak Freeze (${freezeCount} left)`}
                >
                  🧊 Freeze
                </button>
              )}
              <button onClick={onQuick5} className="bg-white/20 hover:bg-white/30 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors">
                Quick 5 →
              </button>
            </div>
          </div>
        )}
        {freezeUsed && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-xl">🧊</span>
            <div>
              <p className="text-sm font-bold text-blue-700">Streak Freeze used!</p>
              <p className="text-xs text-blue-400">Your {streak}-day streak is protected for today</p>
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

        {/* Near-unlock achievements */}
        {nearUnlocks.length > 0 && (
          <div className="bg-white border border-indigo-100 rounded-2xl px-4 py-3 mb-4">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2.5">Almost there...</p>
            <div className="space-y-2">
              {nearUnlocks.map(a => (
                <div key={a.id} className="flex items-center gap-2.5">
                  <span className="text-lg shrink-0">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-gray-700 truncate">{a.title}</span>
                      <span className="text-xs text-indigo-500 font-bold ml-1">{a.pct}%</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${a.pct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
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

        {/* Weekly Challenge */}
        <div className={`rounded-2xl border-2 p-4 mb-4 ${weeklyChallenge.done ? 'border-violet-200 bg-violet-50' : 'border-violet-100 bg-white'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Weekly Challenge</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${weeklyChallenge.done ? 'bg-violet-500 text-white' : 'bg-violet-100 text-violet-600'}`}>
              {weeklyChallenge.done ? '✓ Complete!' : `+${weeklyChallenge.challenge.bonus} XP`}
            </span>
          </div>
          <p className="text-sm font-semibold mb-3 text-gray-900">{weeklyChallenge.challenge.desc}</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-violet-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${weeklyChallenge.done ? 'bg-violet-500' : 'bg-violet-400'}`}
                style={{ width: `${Math.min(100, Math.round((weeklyChallenge.progress / weeklyChallenge.challenge.goal) * 100))}%` }}
              />
            </div>
            <span className="text-xs font-bold text-violet-600 shrink-0">
              {Math.min(weeklyChallenge.progress, weeklyChallenge.challenge.goal)}/{weeklyChallenge.challenge.goal}
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

        {/* XP Week-over-Week Race */}
        {xpWeekRace.lastWeek > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">⚔️ This Week vs. Last Week</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-center">
                <p className="text-2xl font-black text-indigo-600">{xpWeekRace.thisWeek.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">This week</p>
              </div>
              <div className="text-center">
                <span className={`text-lg font-black ${xpWeekRace.diff >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                  {xpWeekRace.diff >= 0 ? '↑' : '↓'}{Math.abs(xpWeekRace.diff)}
                </span>
              </div>
              <div className="flex-1 text-center">
                <p className="text-2xl font-black text-gray-300">{xpWeekRace.lastWeek.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">Last week</p>
              </div>
            </div>
            <p className="text-xs text-center mt-2 text-gray-400">
              {xpWeekRace.diff > 0 ? `🔥 Ahead by ${xpWeekRace.diff} XP — keep it up!` :
               xpWeekRace.diff < 0 ? `💪 ${Math.abs(xpWeekRace.diff)} XP behind — you got this!` :
               '👀 Exactly tied with last week!'}
            </p>
          </div>
        )}

        {/* This week's focus plan */}
        {weeklyFocusPlan && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">📋 This Week's Focus</p>
            <div className="space-y-1.5">
              {weeklyFocusPlan.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedDomains(new Set([f.id]))}
                  className="w-full flex items-center gap-2 group text-left"
                >
                  <span className={`shrink-0 w-4 h-4 rounded-full text-white text-center text-xs leading-4 font-bold ${f.status === 'weak' ? 'bg-rose-400' : 'bg-indigo-400'}`}>
                    {f.status === 'weak' ? '!' : '+'}
                  </span>
                  <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors flex-1">{f.label}</span>
                  {f.pct !== undefined
                    ? <span className="text-xs text-rose-400 font-semibold">{f.pct}%</span>
                    : <span className="text-xs text-indigo-400 font-medium">not started</span>
                  }
                  <span className="text-xs text-gray-300 group-hover:text-indigo-400">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Best study time tip */}
        {bestStudyTime && (() => {
          const h = new Date().getHours()
          const isBestTime = (bestStudyTime.label === 'morning' && h < 12) || (bestStudyTime.label === 'afternoon' && h >= 12 && h < 17) || (bestStudyTime.label === 'evening' && h >= 17)
          if (!isBestTime) return null
          return (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
              <span className="text-sm">{bestStudyTime.emoji}</span>
              <p className="text-xs text-amber-700">Peak performance time! You score {bestStudyTime.pct}% in the {bestStudyTime.label}.</p>
            </div>
          )
        })()}

        {/* Personalized daily target */}
        {dailyTarget && (
          <div className={`rounded-2xl border px-4 py-3 mb-4 flex items-center gap-3 ${dailyTarget.color}`}>
            <span className="text-lg shrink-0">{dailyTarget.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold opacity-70 mb-0.5">Today's target</p>
              <p className="text-sm font-bold">{dailyTarget.text}</p>
            </div>
          </div>
        )}

        {/* Hot domain this week */}
        {hotDomainThisWeek && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-lg shrink-0">🔥</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 font-medium">Hot domain this week</p>
              <p className="text-sm font-bold text-gray-800">{hotDomainThisWeek.label}</p>
              <p className="text-xs text-gray-400">{hotDomainThisWeek.pct}% · {hotDomainThisWeek.total} questions</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
              {hotDomainThisWeek.pct}% ✓
            </span>
          </div>
        )}

        {/* Weekly session count */}
        {weeklySessionCount > 0 && (
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-xs text-gray-500">📅 Sessions this week</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <div key={n} className={`w-4 h-4 rounded-sm ${n <= weeklySessionCount ? 'bg-indigo-500' : 'bg-gray-100'}`} />
                ))}
              </div>
              <span className="text-xs font-bold text-indigo-600">{weeklySessionCount}/5</span>
            </div>
          </div>
        )}

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
                      {/* Estimated time to goal */}
                      {goalTarget && estimatedScore && estimatedScore < goalTarget && history.length >= 5 && (() => {
                        const recent = history.filter(s => s.score.total >= 5)
                        if (recent.length < 4) return null
                        const older = recent.slice(-6, -3)
                        const newer = recent.slice(-3)
                        const oldAvg = older.reduce((s, x) => s + x.score.percent, 0) / older.length
                        const newAvg = newer.reduce((s, x) => s + x.score.percent, 0) / newer.length
                        const gainPer3 = newAvg - oldAvg
                        if (gainPer3 <= 0) return null
                        const ptPerSession = gainPer3 * 12 / 3
                        const sessionsNeeded = Math.ceil((goalTarget - estimatedScore) / ptPerSession)
                        const weeksNeeded = Math.ceil(sessionsNeeded / 5)
                        return <p className="text-xs text-indigo-400 mt-0.5 text-center">~{weeksNeeded}w at current pace</p>
                      })()}
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

        {/* SAT Vocab Word of the Day */}
        <VocabWordOfDay />

        {/* Daily Spin */}
        <DailySpin />

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
            {onTimedChallenge && (
              <button
                onClick={onTimedChallenge}
                className="text-left rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 hover:from-cyan-100 hover:to-sky-100 hover:border-cyan-400 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">⏱</div>
                <div className="font-bold text-sm text-cyan-900">Timed Challenge</div>
                <div className="text-xs text-cyan-600 mt-0.5">15 Qs · 10 min · 1.5× XP</div>
              </button>
            )}
            {onSuddenDeath && history.length >= 5 && (
              <button
                onClick={onSuddenDeath}
                className="text-left rounded-2xl border-2 border-red-900 bg-gradient-to-br from-red-950 to-red-800 hover:from-red-900 hover:to-red-700 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">💀</div>
                <div className="font-bold text-sm text-red-100">Sudden Death</div>
                <div className="text-xs text-red-300 mt-0.5">One wrong = game over · 3× XP</div>
              </button>
            )}
          </div>
        )}

        {/* Subjects & Topics */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
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
          {/* Quick section selectors */}
          <div className="flex gap-2 mb-3">
            <button onClick={() => setSelectedDomains(new Set(MATH_DOMAIN_IDS))}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                MATH_DOMAIN_IDS.every(id => selectedDomains.has(id)) && !ENG_DOMAIN_IDS.some(id => selectedDomains.has(id))
                  ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
              }`}>
              📐 Math only
            </button>
            <button onClick={() => setSelectedDomains(new Set(ENG_DOMAIN_IDS))}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                ENG_DOMAIN_IDS.every(id => selectedDomains.has(id)) && !MATH_DOMAIN_IDS.some(id => selectedDomains.has(id))
                  ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300'
              }`}>
              📖 English only
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

        {/* Last session recap */}
        {lastSessionSummary && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${lastSessionSummary.pct >= 80 ? 'bg-emerald-100 text-emerald-700' : lastSessionSummary.pct >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
              {lastSessionSummary.pct}%
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">{lastSessionSummary.ago} · {lastSessionSummary.formatLabel}</p>
              <p className="text-sm font-semibold text-gray-700">{lastSessionSummary.correct}/{lastSessionSummary.total} correct</p>
              {lastSessionSummary.domains && <p className="text-xs text-gray-400 truncate">{lastSessionSummary.domains}</p>}
            </div>
          </div>
        )}

        {/* 14-day mini study calendar */}
        {miniCalendar.studied > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Last 14 Days</p>
              <p className="text-xs text-gray-400">{miniCalendar.studied}/14 days studied</p>
            </div>
            <div className="flex gap-1">
              {miniCalendar.days.map(({ key, status }) => (
                <div key={key} className={`flex-1 h-5 rounded-sm ${
                  status === 'great' ? 'bg-emerald-400' : status === 'ok' ? 'bg-amber-300' : status === 'low' ? 'bg-rose-300' : 'bg-gray-100'
                }`} title={key} />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              {[['bg-emerald-400','≥80%'],['bg-amber-300','60–80%'],['bg-rose-300','<60%'],['bg-gray-100','No study']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1"><div className={`w-2 h-2 rounded-sm ${c}`}/><span className="text-xs text-gray-300">{l}</span></div>
              ))}
            </div>
          </div>
        )}

        {/* Score trend mini-chart */}
        {scoreTrend && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Score Trend</p>
            <svg viewBox={`0 0 ${(scoreTrend.length - 1) * 20 + 8} 40`} className="w-full h-10">
              <polyline
                points={scoreTrend.map((p, i) => `${i * 20 + 4},${38 - (p / 100) * 34}`).join(' ')}
                fill="none" stroke="#e0e7ff" strokeWidth="2" strokeLinejoin="round"
              />
              {scoreTrend.map((p, i) => (
                <circle key={i} cx={i * 20 + 4} cy={38 - (p / 100) * 34} r={i === scoreTrend.length - 1 ? 3 : 2}
                  fill={i === scoreTrend.length - 1 ? (p >= 80 ? '#10b981' : p >= 60 ? '#6366f1' : '#f43f5e') : '#c7d2fe'} />
              ))}
            </svg>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-300">Oldest</p>
              <p className={`text-xs font-bold ${scoreTrend[scoreTrend.length - 1] >= 80 ? 'text-emerald-600' : scoreTrend[scoreTrend.length - 1] >= 60 ? 'text-indigo-600' : 'text-rose-500'}`}>
                Latest: {scoreTrend[scoreTrend.length - 1]}%
              </p>
            </div>
          </div>
        )}

        {/* XP Boost power-up */}
        {(gam.boosts ?? 0) > 0 && (
          <div className={`rounded-2xl border-2 px-4 py-3 mb-4 flex items-center gap-3 transition-all ${boostActive ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'}`}>
            <span className="text-lg shrink-0">🚀</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800">
                XP Boost {boostActive ? '— ACTIVE!' : `available (×${gam.boosts})`}
              </p>
              <p className="text-xs text-gray-400">{boostActive ? '2× XP applies to your next session' : 'Earned from 5-day streak milestone'}</p>
            </div>
            {!boostActive && (
              <button
                onClick={() => { saveBoost(true); setBoostActive(true) }}
                className="shrink-0 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg px-3 py-1.5 transition-colors"
              >
                Activate
              </button>
            )}
            {boostActive && (
              <button
                onClick={() => { saveBoost(false); setBoostActive(false) }}
                className="shrink-0 text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {/* Daily SAT tip + motivational quote */}
        <div className="border-t border-gray-100 pt-4 mb-4 space-y-3">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <span className="text-sm shrink-0 mt-0.5">💡</span>
            <div>
              <p className="text-xs font-bold text-indigo-600 mb-0.5">SAT Tip of the Day</p>
              <p className="text-xs text-indigo-700 leading-snug">{dailyTip}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 italic leading-snug">"{dailyQuote.text}"</p>
            {dailyQuote.author && <p className="text-xs text-gray-300 mt-1">— {dailyQuote.author}</p>}
          </div>
        </div>

        {/* Start button */}
        {matchingCount > 0 && (
          <p className="text-xs text-gray-400 text-center mb-2">
            ~{Math.max(1, Math.round(matchingCount * 75 / 60))} min estimated
          </p>
        )}
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
