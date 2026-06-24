import { useState, useMemo, useEffect } from 'react'
import QuestionCard from './components/QuestionCard'
import { formatTime, pct } from './utils/index'
import { domainById, skillById } from './data/taxonomy'
import { updateSessionMood, updateSessionNote, loadHistory } from './utils/history'

function AnimatedXPBar({ gamResult }) {
  const { newLevel, xp, oldXP } = gamResult
  const xpForNext = newLevel.xpForNext
  if (!xpForNext) return null
  const oldPct = Math.min(100, Math.max(0, ((oldXP - (newLevel.minXP ?? 0)) / xpForNext) * 100))
  const newPct = newLevel.pct
  const [width, setWidth] = useState(oldPct)
  useEffect(() => { const t = setTimeout(() => setWidth(newPct), 200); return () => clearTimeout(t) }, [newPct])
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-indigo-200">Lv {newLevel.level} · {newLevel.title}</span>
        <span className="text-xs text-indigo-300">{newLevel.xpIntoLevel} / {xpForNext} XP</span>
      </div>
      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white rounded-full transition-all duration-[1200ms] ease-out" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function LevelUpModal({ gamResult, onDismiss }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => { const t = setTimeout(() => { setVisible(false); onDismiss?.() }, 4000); return () => clearTimeout(t) }, [onDismiss])
  if (!visible || !gamResult?.leveledUp) return null
  const { newLevel } = gamResult
  const colors = { 1: 'from-slate-400 to-slate-600', 5: 'from-indigo-500 to-violet-600', 9: 'from-violet-600 to-purple-700', 13: 'from-amber-400 to-orange-500' }
  const grad = newLevel.level >= 13 ? colors[13] : newLevel.level >= 9 ? colors[9] : newLevel.level >= 5 ? colors[5] : colors[1]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setVisible(false); onDismiss?.() }}>
      <div className={`bg-gradient-to-br ${grad} rounded-3xl p-8 text-white text-center max-w-xs mx-4 shadow-2xl animate-bounce-once`}>
        <p className="text-5xl mb-2">🎉</p>
        <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Level Up!</p>
        <p className="text-4xl font-black mb-1">Level {newLevel.level}</p>
        <p className="text-lg font-semibold opacity-90">{newLevel.title}</p>
        <p className="text-xs opacity-60 mt-3">Tap to continue</p>
      </div>
    </div>
  )
}

const CONFETTI_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316']

function Confetti() {
  const [visible, setVisible] = useState(true)
  useEffect(() => { const t = setTimeout(() => setVisible(false), 3500); return () => clearTimeout(t) }, [])
  const pieces = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${(i / 40) * 100 + (Math.random() * 2 - 1)}%`,
    size: `${7 + Math.floor(Math.random() * 7)}px`,
    bg: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: `${(Math.random() * 0.7).toFixed(2)}s`,
    dur: `${(1.8 + Math.random() * 1.4).toFixed(2)}s`,
    drift: `${Math.round((Math.random() - 0.5) * 160)}px`,
    rot: `${Math.round(Math.random() * 720)}deg`,
  })), [])

  if (!visible) return null
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      <style>{`@keyframes cffall{0%{transform:translateY(-30px) translateX(0) rotate(0);opacity:1}100%{transform:translateY(110vh) translateX(var(--cf-drift)) rotate(var(--cf-rot));opacity:0}}`}</style>
      {pieces.map(p => (
        <div key={p.id} style={{
          position:'absolute', top:'-16px', left:p.left,
          width:p.size, height:p.size, background:p.bg, borderRadius:'2px',
          '--cf-drift':p.drift, '--cf-rot':p.rot,
          animation:`cffall ${p.dur} ${p.delay} ease-in forwards`,
        }} />
      ))}
    </div>
  )
}

function getGrade(pct) {
  if (pct >= 90) return { grade: 'S', text: 'text-violet-600', bg: 'bg-violet-50 border-violet-300', label: 'Outstanding' }
  if (pct >= 80) return { grade: 'A', text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-300', label: 'Great work' }
  if (pct >= 70) return { grade: 'B', text: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-300', label: 'Good job' }
  if (pct >= 60) return { grade: 'C', text: 'text-amber-600', bg: 'bg-amber-50 border-amber-300', label: 'Keep going' }
  return { grade: 'D', text: 'text-rose-600', bg: 'bg-rose-50 border-rose-300', label: 'Keep practicing' }
}

const DIFF_LABEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' }
const DIFF_COLOR = { 1: 'text-emerald-600', 2: 'text-amber-600', 3: 'text-rose-600' }
const DIFF_BAR   = { 1: 'bg-emerald-500',   2: 'bg-amber-500',   3: 'bg-rose-500'   }

const SCORE_PREDICTOR_FORMATS = new Set(['full-practice', 'full-english', 'full-math'])

// Easy path → 200–650, hard path → 400–800, both rounded to nearest 10
function predictSectionScore(correct, total, gotHardMod2) {
  const ratio = correct / total
  if (!gotHardMod2) return Math.min(650, Math.round((200 + ratio * 450) / 10) * 10)
  return Math.min(800, Math.round((400 + ratio * 400) / 10) * 10)
}

function ScorePredictor({ phaseData, answers }) {
  const scores = phaseData.map(p => {
    const correct = p.questions.filter(q => (answers[q.id] ?? null) === q.answer).length
    return {
      label: p.label,
      subject: p.subject,
      score: predictSectionScore(correct, p.questions.length, p.gotHardMod2),
      gotHardMod2: p.gotHardMod2,
    }
  })
  const total = scores.length > 1 ? scores.reduce((sum, s) => sum + s.score, 0) : null
  const isCapped = scores.some(s => !s.gotHardMod2)

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-100 p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Predicted Score</p>
        <span className="text-xs text-gray-400">· rough estimate</span>
      </div>
      <div className="space-y-3">
        {scores.map(s => (
          <div key={s.subject} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{s.label}</span>
            <div className="flex items-center gap-2">
              {!s.gotHardMod2 && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Easy Mod 2 · capped 650</span>
              )}
              <span className="text-xl font-black text-gray-900">~{s.score}</span>
            </div>
          </div>
        ))}
        {total !== null && (
          <>
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-2xl font-black text-indigo-600">~{total}</span>
            </div>
            {isCapped && (
              <p className="text-xs text-gray-400">Score cap lifted by scoring ≥ threshold on Module 1 to unlock the harder Module 2.</p>
            )}
          </>
        )}
      </div>
      <p className="text-xs text-gray-300 mt-3">Based on a simplified scoring model. Actual scores depend on the official CollegeBoard curve.</p>
    </div>
  )
}

function barColor(p) {
  return p >= 80 ? 'bg-emerald-500' : p >= 60 ? 'bg-amber-500' : 'bg-rose-500'
}

function ScoreRing({ percent }) {
  const r = 38
  const circ = 2 * Math.PI * r
  const fill = (percent / 100) * circ
  const hex = percent >= 80 ? '#10b981' : percent >= 60 ? '#f59e0b' : '#f43f5e'
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="104" height="104" className="-rotate-90" aria-hidden>
        <circle cx="52" cy="52" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle
          cx="52" cy="52" r={r} fill="none"
          stroke={hex} strokeWidth="8"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black leading-none" style={{ color: hex }}>{percent}%</span>
        <span className="text-xs text-gray-400 mt-0.5">score</span>
      </div>
    </div>
  )
}

function StatRow({ label, correct, total }) {
  const p = pct(correct, total)
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-sm">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-500 text-xs">{correct}/{total} ({p}%)</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor(p)} rounded-full transition-all duration-500`} style={{ width: `${p}%` }} />
      </div>
    </div>
  )
}

function QuestionRow({ question, userAnswer, index, isFlagged, timeSpent, highlight }) {
  const isCorrect = userAnswer === question.answer
  const [expanded, setExpanded] = useState(!isCorrect && highlight)
  const skipped = userAnswer === null || userAnswer === undefined

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all ${isCorrect ? 'border-emerald-200' : 'border-rose-200'}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className={`w-full text-left px-4 py-3 flex items-start gap-3 ${isCorrect ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-rose-50 hover:bg-rose-100'} transition-colors`}
      >
        <span className={`shrink-0 font-bold text-sm mt-0.5 ${isCorrect ? 'text-emerald-600' : 'text-rose-500'}`}>
          {isCorrect ? '✓' : '✗'}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-gray-400 mr-2">Q{index + 1}</span>
          {isFlagged && <span className="text-amber-400 text-xs mr-1" title="Flagged for review">🚩</span>}
          <span className="text-sm text-gray-700 line-clamp-1">
            {question.question.replace(/\n/g, ' ').slice(0, 80)}{question.question.length > 80 ? '…' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {skipped && <span className="text-xs text-gray-400">skipped</span>}
          {timeSpent != null && (
            <span className={`text-xs font-mono ${timeSpent > 120 ? 'text-rose-400' : timeSpent > 60 ? 'text-amber-500' : 'text-gray-400'}`} title="Time spent">
              {timeSpent >= 60 ? `${Math.floor(timeSpent / 60)}:${String(timeSpent % 60).padStart(2, '0')}` : `${timeSpent}s`}
            </span>
          )}
          <span className={`text-xs ${DIFF_COLOR[question.difficulty]}`}>{DIFF_LABEL[question.difficulty]}</span>
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-3 bg-white">
          <QuestionCard question={question} selectedAnswer={userAnswer} onSelect={() => {}} showFeedback />
          {question.explanation && (
            <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-600 mb-1 uppercase tracking-wide">Explanation</p>
              <p className="text-sm text-gray-700 leading-relaxed">{question.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SessionSummary({ session, gamResult, onNewSession, onHistory, onRetry }) {
  const { mode, format, formatLabel, elapsedSeconds, timeLimit, questions, answers, score, sessionName, phaseData, flaggedIds, questionTimes, maxCombo } = session
  const flaggedSet = useMemo(() => new Set(flaggedIds ?? []), [flaggedIds])
  const [breakdownTab, setBreakdownTab] = useState('subject')
  const [reviewFilter, setReviewFilter] = useState('all')
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState(session.note ?? '')
  const [noteSaved, setNoteSaved] = useState(false)
  const xpTarget = gamResult ? gamResult.newXP - gamResult.oldXP : 0
  const [displayedXP, setDisplayedXP] = useState(0)
  useEffect(() => {
    if (!xpTarget) return
    let start = 0; const step = Math.max(1, Math.round(xpTarget / 30))
    const timer = setInterval(() => {
      start += step
      if (start >= xpTarget) { setDisplayedXP(xpTarget); clearInterval(timer) }
      else setDisplayedXP(start)
    }, 30)
    return () => clearInterval(timer)
  }, [xpTarget])

  function handleCopyResults() {
    const date = new Date(session.completedAt ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const pct = score.percent
    const bar = ['🟥','🟥','🟥','🟥','🟥','🟥','🟥','🟥','🟥','🟥'].map((_, i) => i < Math.round(pct / 10) ? '🟩' : '⬜').join('')
    const grade = getGrade(pct)
    const streak = gamResult?.gamification?.streak ?? 0
    const xp = gamResult?.earnedXP ?? 0
    const lvl = gamResult?.newLevel?.level ?? gamResult?.gamification?.level ?? '?'
    const lines = [
      `📚 SAT Prep App — ${date}`,
      ``,
      `${grade}  ${pct}%  (${score.correct}/${score.total} correct)`,
      `${bar}`,
      ``,
      `⭐ +${xp} XP · Level ${lvl}${streak > 1 ? ` · 🔥 ${streak}-day streak` : ''}`,
      `📋 ${formatLabel}`,
      ``,
      `Practicing for the SAT 💪 Try to beat me!`,
    ]
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }).catch(() => {})
  }

  const modeColor = mode === 'learning' ? 'bg-indigo-100 text-indigo-700' : 'bg-violet-100 text-violet-700'

  const bySubject = useMemo(() => {
    const acc = {}
    for (const q of questions) {
      if (!acc[q.subject]) acc[q.subject] = { correct: 0, total: 0 }
      acc[q.subject].total++
      if ((answers[q.id] ?? null) === q.answer) acc[q.subject].correct++
    }
    return acc
  }, [questions, answers])

  const bySkill = useMemo(() => {
    const acc = {}
    for (const q of questions) {
      if (!acc[q.skill]) acc[q.skill] = { correct: 0, total: 0 }
      acc[q.skill].total++
      if ((answers[q.id] ?? null) === q.answer) acc[q.skill].correct++
    }
    return acc
  }, [questions, answers])

  const byDifficulty = useMemo(() => {
    const acc = { 1: { correct: 0, total: 0 }, 2: { correct: 0, total: 0 }, 3: { correct: 0, total: 0 } }
    for (const q of questions) {
      acc[q.difficulty].total++
      if ((answers[q.id] ?? null) === q.answer) acc[q.difficulty].correct++
    }
    return acc
  }, [questions, answers])

  const answerDist = useMemo(() => {
    const dist = { A: 0, B: 0, C: 0, D: 0 }
    for (const q of questions) {
      const ans = answers[q.id]
      if (ans && dist[ans] !== undefined) dist[ans]++
    }
    return dist
  }, [questions, answers])

  const lastSession = useMemo(() => {
    const history = loadHistory()
    return history.find(s => s.id !== session.id) ?? null
  }, [session.id])

  const vsLast = useMemo(() => {
    if (!lastSession || lastSession.score.total < 5 || score.total < 5) return null
    const diff = score.percent - lastSession.score.percent
    return { diff, label: Math.abs(diff) < 2 ? 'About the same' : diff > 0 ? `+${diff}% vs last` : `${diff}% vs last`, up: diff > 1, down: diff < -1 }
  }, [lastSession, score])

  const correctCount = questions.filter(q => (answers[q.id] ?? null) === q.answer).length
  const incorrectCount = questions.length - correctCount
  const wrongQuestions = useMemo(
    () => questions.filter(q => (answers[q.id] ?? null) !== q.answer),
    [questions, answers]
  )

  const toughestWrong = useMemo(() => {
    return wrongQuestions
      .filter(q => q.difficulty === 3)
      .slice(0, 1)[0] ?? null
  }, [wrongQuestions])

  const sessionQuality = useMemo(() => {
    if (score.total === 0) return null
    const hardCount = questions.filter(q => q.difficulty === 3).length
    const difficultyBonus = hardCount / score.total
    const raw = score.percent / 100 * (1 + 0.3 * difficultyBonus)
    const stars = Math.min(5, Math.max(1, Math.round(raw * 5)))
    const labels = ['', 'Keep trying', 'Getting there', 'Good work', 'Great session!', 'Perfect! 🌟']
    return { stars, label: labels[stars] }
  }, [score, questions])

  const insights = useMemo(() => {
    if (questions.length < 5) return []
    const tips = []

    // Worst domain
    const domainEntries = Object.entries(score.byDomain).filter(([, s]) => s.total >= 3)
    if (domainEntries.length >= 2) {
      const [worstId, worstStats] = domainEntries.reduce((a, b) => (b[1].correct / b[1].total < a[1].correct / a[1].total) ? b : a)
      const worstPct = Math.round((worstStats.correct / worstStats.total) * 100)
      if (worstPct < 70) {
        const label = worstId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        tips.push({ icon: '📍', text: `${label} was your weakest area this session (${worstPct}%). Drill it to boost your score.`, color: 'bg-rose-50 border-rose-100 text-rose-800' })
      }
    }

    // Fatigue: last 3 accuracy vs first 3
    const firstThree = questions.slice(0, 3).filter(q => (answers[q.id] ?? null) === q.answer).length / 3
    const lastThree = questions.slice(-3).filter(q => (answers[q.id] ?? null) === q.answer).length / 3
    if (firstThree - lastThree >= 0.4 && questions.length >= 10) {
      tips.push({ icon: '⚡', text: 'Your accuracy dropped toward the end — possible fatigue. Try shorter sessions or take a short break between questions.', color: 'bg-amber-50 border-amber-100 text-amber-800' })
    }

    // Answer bias
    const max = Math.max(...Object.values(answerDist))
    const biasedLetter = Object.entries(answerDist).find(([, v]) => v === max && v > questions.length * 0.4)?.[0]
    if (biasedLetter && questions.length >= 10) {
      tips.push({ icon: '🎯', text: `You chose "${biasedLetter}" on ${answerDist[biasedLetter]} of ${questions.length} questions. If that wasn't intentional, try re-reading before committing to an answer.`, color: 'bg-blue-50 border-blue-100 text-blue-800' })
    }

    // Speed: if avg time > 90s → pacing issue
    if (questionTimes && Object.keys(questionTimes).length >= 5) {
      const times = Object.values(questionTimes)
      const avg = times.reduce((a, b) => a + b, 0) / times.length
      if (avg > 100) {
        tips.push({ icon: '⏱', text: `Your average pace was ${Math.round(avg)}s/question — above the ~85s SAT target. Practice scanning questions faster to build speed.`, color: 'bg-violet-50 border-violet-100 text-violet-800' })
      } else if (avg < 25 && score.percent < 70) {
        tips.push({ icon: '🐢', text: `You averaged only ${Math.round(avg)}s/question but scored ${score.percent}%. Slowing down slightly may improve accuracy.`, color: 'bg-orange-50 border-orange-100 text-orange-800' })
      }
    }

    // Hard questions: if 0 correct on hard
    if (byDifficulty[3]?.total >= 3 && byDifficulty[3].correct === 0) {
      tips.push({ icon: '💪', text: `You didn't get any Hard questions right this session. Focus on understanding the concept behind each one — they carry the most score impact.`, color: 'bg-rose-50 border-rose-100 text-rose-800' })
    }

    return tips.slice(0, 3)
  }, [questions, answers, score, questionTimes, byDifficulty, answerDist])

  const filteredQuestions = useMemo(() => {
    if (reviewFilter === 'correct') return questions.filter(q => (answers[q.id] ?? null) === q.answer)
    if (reviewFilter === 'incorrect') return wrongQuestions
    if (reviewFilter === 'flagged') return questions.filter(q => flaggedSet.has(q.id))
    return questions
  }, [questions, answers, reviewFilter, wrongQuestions, flaggedSet])

  const [levelUpDismissed, setLevelUpDismissed] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 px-4 py-10">
      {gamResult?.leveledUp && !levelUpDismissed && <LevelUpModal gamResult={gamResult} onDismiss={() => setLevelUpDismissed(true)} />}
      {(gamResult?.leveledUp || score.percent === 100) && <Confetti />}
      <div className="max-w-2xl mx-auto">

        {/* Boss defeated banner */}
        {gamResult?.bossResult?.defeated && !gamResult?.bossResult?.wasAlreadyDefeated && (() => {
          const b = gamResult.bossResult
          return (
            <div className="rounded-2xl p-5 mb-5 text-center bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 text-white shadow-xl">
              <p className="text-4xl mb-2">{b.icon} 💥</p>
              <p className="text-xl font-black mb-1">Boss Defeated!</p>
              <p className="font-bold text-white/90">{b.name}</p>
              <p className="text-white/70 text-xs mt-2">You destroyed the weekly boss · <span className="font-bold text-yellow-300">+{b.xp} XP</span></p>
            </div>
          )
        })()}

        {/* Head-to-Head result */}
        {session.rivalResult && (() => {
          const r = session.rivalResult
          const myPct = score.percent
          const rivalPct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0
          const won = myPct > rivalPct
          const tied = myPct === rivalPct
          return (
            <div className={`rounded-2xl p-5 mb-5 text-center ${won ? 'bg-gradient-to-r from-indigo-600 to-violet-600' : tied ? 'bg-gradient-to-r from-gray-500 to-gray-600' : 'bg-gradient-to-r from-rose-500 to-rose-700'} text-white`}>
              <p className="text-3xl mb-2">{won ? '🏆' : tied ? '🤝' : '😤'}</p>
              <p className="text-lg font-black mb-1">{won ? 'You Won!' : tied ? 'It\'s a Tie!' : 'You Lost!'}</p>
              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="text-center">
                  <p className="text-2xl font-black">{myPct}%</p>
                  <p className="text-white/70 text-xs">You</p>
                </div>
                <p className="text-white/40 text-lg font-bold">VS</p>
                <div className="text-center">
                  <p className="text-2xl font-black">{rivalPct}%</p>
                  <p className="text-white/70 text-xs">{r.name}</p>
                </div>
              </div>
              {won && <p className="text-white/70 text-xs mt-3">+50 bonus XP for winning!</p>}
              {!won && !tied && <p className="text-white/70 text-xs mt-3">Rematch? Try again!</p>}
            </div>
          )
        })()}

        {/* Personal record banner */}
        {gamResult?.sessionRank?.isSessionPB && score.total >= 10 && (
          <div className="mb-5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-lg">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="font-black text-white text-base leading-tight">New Personal Record!</p>
              <p className="text-amber-100 text-xs mt-0.5">{score.percent}% — your best session score ever</p>
            </div>
            <div className="ml-auto text-3xl animate-bounce">🎉</div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Session Complete</h1>
            {sessionName && <p className="text-sm text-gray-500 mt-0.5">{sessionName}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={onHistory} className="text-sm text-gray-400 hover:text-gray-700 border border-gray-200 bg-white rounded-lg px-3 py-1.5 transition-colors">
              History
            </button>
            <button onClick={onNewSession} className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5 transition-colors">
              New Session
            </button>
          </div>
        </div>

        {/* XP reward */}
        {gamResult && (
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-5 mb-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">XP Earned</p>
              <p className="text-3xl font-black tabular-nums">+{displayedXP}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-indigo-200 mb-4">
              <span>Base: +{gamResult.xp.base}</span>
              {gamResult.xp.bonus > 0 && <span>Bonus: +{gamResult.xp.bonus}</span>}
              {gamResult.xp.streakMult > 1.05 && <span>Streak {Math.round(gamResult.xp.streakMult * 10) / 10}×</span>}
              {gamResult.xp.modeMult > 1.05 && <span className="text-rose-300 font-bold">2× Beast Mode!</span>}
              {gamResult.challengeBonus > 0 && <span>+{gamResult.challengeBonus} daily challenge</span>}
              {gamResult.weeklyBonus > 0 && <span className="text-violet-300 font-bold">+{gamResult.weeklyBonus} weekly challenge!</span>}
              {gamResult.comebackBonus > 0 && <span className="text-amber-300 font-bold">+{gamResult.comebackBonus} comeback!</span>}
              {gamResult.improvementBonus > 0 && <span className="text-emerald-300 font-bold">+{gamResult.improvementBonus} improved!</span>}
              {gamResult.milestoneBonus > 0 && <span className="text-emerald-300 font-bold">+{gamResult.milestoneBonus} milestone!</span>}
              {gamResult.boostActive && <span className="text-amber-300 font-bold animate-pulse">🚀 2× BOOST!</span>}
              {gamResult.earnedBoost && <span className="text-amber-200 font-bold">🚀 Boost earned!</span>}
              {gamResult.earnedFreeze && <span className="text-blue-200 font-bold">🧊 Streak Freeze earned!</span>}
            </div>
            {gamResult.sessionMilestone && (
              <div className="flex items-center gap-2.5 bg-white/20 rounded-xl px-3 py-2.5 mb-3">
                <span className="text-2xl">🎊</span>
                <div>
                  <p className="text-sm font-bold leading-tight">Session #{gamResult.sessionMilestone} Milestone!</p>
                  <p className="text-xs text-indigo-200">+{gamResult.milestoneBonus} XP milestone bonus</p>
                </div>
              </div>
            )}

            {gamResult.comebackBonus > 0 && (
              <div className="flex items-center gap-2.5 bg-white/20 rounded-xl px-3 py-2.5 mb-3">
                <span className="text-xl">🔄</span>
                <div>
                  <p className="text-sm font-bold leading-tight">Welcome Back!</p>
                  <p className="text-xs text-indigo-200">+{gamResult.comebackBonus} XP comeback bonus</p>
                </div>
              </div>
            )}
            {gamResult.improvementBonus > 0 && (
              <div className="flex items-center gap-2.5 bg-white/20 rounded-xl px-3 py-2.5 mb-3">
                <span className="text-xl">📈</span>
                <div>
                  <p className="text-sm font-bold leading-tight">Score Improved!</p>
                  <p className="text-xs text-indigo-200">+{gamResult.improvementBonus} XP improvement bonus</p>
                </div>
              </div>
            )}

            {gamResult.leveledUp ? (
              <div className="bg-white/20 rounded-xl p-3 mb-3 flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="font-bold text-sm">Level Up!</p>
                  <p className="text-xs text-indigo-200">{gamResult.oldLevel.title} → {gamResult.newLevel.title}</p>
                </div>
                <div className="ml-auto w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                  <span className="text-indigo-600 font-black text-sm">{gamResult.newLevel.level}</span>
                </div>
              </div>
            ) : (
              <AnimatedXPBar gamResult={gamResult} />
            )}

            {gamResult.challengeCompleted && (
              <div className="flex items-center gap-2.5 bg-white/20 rounded-xl px-3 py-2.5 mt-1">
                <span className="text-xl">🎯</span>
                <div>
                  <p className="text-sm font-bold leading-tight">Daily Challenge Complete!</p>
                  <p className="text-xs text-indigo-200">+{gamResult.challengeBonus} bonus XP</p>
                </div>
              </div>
            )}

            {gamResult.personalBests?.length > 0 && (
              <div className="flex items-start gap-2.5 bg-white/20 rounded-xl px-3 py-2.5 mt-1">
                <span className="text-xl">🏅</span>
                <div>
                  <p className="text-sm font-bold leading-tight">Personal Best{gamResult.personalBests.length > 1 ? 's' : ''}!</p>
                  {gamResult.personalBests.map(pb => (
                    <p key={pb.domainId} className="text-xs text-indigo-200 mt-0.5">
                      {domainById[pb.domainId]?.label ?? pb.domainId}: {pb.curPct}%
                      {pb.prevBest !== null ? ` (was ${pb.prevBest}%)` : ' — first high score!'}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {gamResult.newAchievements.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">
                  {gamResult.newAchievements.length === 1 ? 'Achievement Unlocked!' : `${gamResult.newAchievements.length} Achievements Unlocked!`}
                </p>
                {gamResult.newAchievements.map(ach => (
                  <div key={ach.id} className="flex items-center gap-2.5 bg-white/20 rounded-xl px-3 py-2.5">
                    <span className="text-xl">{ach.icon}</span>
                    <div>
                      <p className="text-sm font-bold leading-tight">{ach.title}</p>
                      <p className="text-xs text-indigo-200">{ach.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Analysis */}
        {score.total > 0 && score.correct < score.total && (() => {
          const wrongQs = session.questions.filter(q => (answers[q.id] ?? null) !== q.answer)
          if (wrongQs.length === 0) return null
          const timings = session.questionTimings ?? {}
          const buckets = { rushed: [], easy: [], concept: [], reread: [] }
          for (const q of wrongQs) {
            const sec = timings[q.id] ?? 60
            if (sec < 15) buckets.rushed.push(q)
            else if (q.difficulty === 1) buckets.easy.push(q)
            else if (q.difficulty === 3) buckets.concept.push(q)
            else buckets.reread.push(q)
          }
          const entries = [
            { key: 'rushed', icon: '⚡', label: 'Rushed', tip: 'Slow down — read the full question before clicking.', color: 'text-orange-600 bg-orange-50 border-orange-200' },
            { key: 'easy', icon: '😵', label: 'Careless', tip: 'Easy questions missed — double-check your answers.', color: 'text-amber-600 bg-amber-50 border-amber-200' },
            { key: 'concept', icon: '📚', label: 'Concept Gap', tip: 'Hard concepts need review — drill these domains.', color: 'text-violet-600 bg-violet-50 border-violet-200' },
            { key: 'reread', icon: '🔍', label: 'Re-read', tip: 'Medium questions missed — re-read the question carefully.', color: 'text-rose-600 bg-rose-50 border-rose-200' },
          ].filter(e => buckets[e.key].length > 0)
          if (entries.length === 0) return null
          const top = entries.sort((a, b) => buckets[b.key].length - buckets[a.key].length)[0]
          return (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Error Analysis</p>
              <div className="space-y-2 mb-3">
                {entries.map(e => (
                  <div key={e.key} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${e.color}`}>
                    <span className="text-lg">{e.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold">{e.label} <span className="font-normal">({buckets[e.key].length} wrong)</span></p>
                    </div>
                    <div className="h-1.5 w-16 bg-white/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-current opacity-60" style={{ width: `${(buckets[e.key].length / wrongQs.length) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 italic">💡 {top.tip}</p>
            </div>
          )
        })()}

        {/* Score predictor (full adaptive tests only) */}
        {SCORE_PREDICTOR_FORMATS.has(format) && phaseData?.length > 0 && phaseData.every(p => p.gotHardMod2 !== null) && (
          <ScorePredictor phaseData={phaseData} answers={answers} />
        )}

        {/* Score card */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 mb-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <ScoreRing percent={score.percent} />
              <div>
                {(() => {
                  const g = getGrade(score.percent)
                  const isPerfect = score.percent === 100
                  return (
                    <div className={`relative w-14 h-14 rounded-2xl border-2 flex items-center justify-center ${g.bg} ${isPerfect ? 'ring-4 ring-amber-300 ring-offset-1 animate-pulse' : ''}`}>
                      <span className={`text-3xl font-black ${g.text}`}>{g.grade}</span>
                    </div>
                  )
                })()}
                <p className="text-gray-400 text-xs mt-1 text-center">
                  {score.percent === 100 ? '🌟 Perfect!' : getGrade(score.percent).label}
                </p>
                {sessionQuality && (
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={`text-base leading-none ${n <= sessionQuality.stars ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                    ))}
                  </div>
                )}
                {gamResult?.sessionRank && gamResult.sessionRank.isSessionPB && (
                  <p className="text-amber-500 text-xs font-bold mt-0.5 text-center">🏆 Best session!</p>
                )}
                {gamResult?.sessionRank && !gamResult.sessionRank.isSessionPB && gamResult.sessionRank.pctBetter >= 75 && (
                  <p className="text-emerald-600 text-xs font-medium mt-0.5 text-center">Top {100 - gamResult.sessionRank.pctBetter}% ↑</p>
                )}
              </div>
            </div>
            <div className="text-right space-y-1.5">
              <p className="text-gray-500 text-sm">{score.correct} of {score.total} correct</p>
              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${modeColor}`}>{formatLabel}</span>
              <div className="text-sm text-gray-500">⏱ {formatTime(elapsedSeconds)}</div>
              {questions.length > 0 && (() => {
                const avgS = Math.round(elapsedSeconds / questions.length)
                const slow = avgS > 90
                return (
                  <div className={`text-xs ${slow ? 'text-amber-500 font-semibold' : 'text-gray-400'}`}>
                    ~{avgS}s / question {slow ? '⚠️ pacing' : ''}
                  </div>
                )
              })()}
              {maxCombo >= 3 && (
                <div className="text-xs font-semibold text-orange-500">
                  🔥 Best combo: {maxCombo}×
                </div>
              )}
              {vsLast && (
                <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${vsLast.up ? 'bg-emerald-100 text-emerald-700' : vsLast.down ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'}`}>
                  {vsLast.up ? '↑' : vsLast.down ? '↓' : '→'} {vsLast.label}
                </div>
              )}
              {timeLimit && <div className="text-xs text-gray-400">Limit: {formatTime(timeLimit)}</div>}
              {/* Difficulty distribution */}
              {(() => {
                const counts = { 1: 0, 2: 0, 3: 0 }
                for (const q of questions) counts[q.difficulty ?? 2]++
                if (counts[1] + counts[2] + counts[3] === 0) return null
                const parts = []
                if (counts[1]) parts.push(`E:${counts[1]}`)
                if (counts[2]) parts.push(`M:${counts[2]}`)
                if (counts[3]) parts.push(`H:${counts[3]}`)
                return (
                  <div className="flex gap-1.5">
                    {counts[1] > 0 && <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">Easy ×{counts[1]}</span>}
                    {counts[2] > 0 && <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">Med ×{counts[2]}</span>}
                    {counts[3] > 0 && <span className="text-xs px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full">Hard ×{counts[3]}</span>}
                  </div>
                )
              })()}
            </div>
          </div>

          {/* vs. last session comparison */}
          {lastSession && (
            <div className="border-t border-gray-100 pt-4 pb-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-2">vs. Last Session</p>
              <div className="flex gap-4">
                {[
                  { label: 'Score', cur: score.percent, prev: lastSession.score.percent, suffix: '%' },
                  { label: 'Questions', cur: score.total, prev: lastSession.score.total, suffix: '', noColor: true },
                  { label: 'Accuracy', cur: score.correct, prev: lastSession.score.correct, suffix: ' correct', noColor: true },
                ].map(({ label, cur, prev, suffix, noColor }) => {
                  const delta = cur - prev
                  const color = noColor ? 'text-gray-500' : delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-500' : 'text-gray-500'
                  return (
                    <div key={label} className="flex-1">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className={`text-sm font-bold ${color}`}>
                        {cur}{suffix}
                        {delta !== 0 && <span className="text-xs ml-1">{delta > 0 ? '↑' : '↓'}{Math.abs(delta)}</span>}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Breakdown tabs */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
              {[
                { id: 'subject',    label: 'Subject' },
                { id: 'domain',     label: 'Domain' },
                { id: 'skill',      label: 'Skill' },
                { id: 'difficulty', label: 'Difficulty' },
                { id: 'answers',    label: 'Answers' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setBreakdownTab(tab.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    breakdownTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {breakdownTab === 'subject' && (
              <div className="space-y-3">
                {[
                  { id: 'math',    label: 'Math' },
                  { id: 'english', label: 'Reading & Writing' },
                ].map(({ id, label }) => {
                  const stats = bySubject[id]
                  if (!stats || stats.total === 0) return null
                  return <StatRow key={id} label={label} correct={stats.correct} total={stats.total} />
                })}
              </div>
            )}

            {breakdownTab === 'domain' && (
              <div className="space-y-3">
                {Object.entries(score.byDomain).map(([id, stats]) => (
                  <StatRow key={id} label={domainById[id]?.label ?? id} correct={stats.correct} total={stats.total} />
                ))}
              </div>
            )}

            {breakdownTab === 'skill' && (
              <div className="space-y-3">
                {Object.entries(bySkill).map(([id, stats]) => (
                  <StatRow key={id} label={skillById[id]?.label ?? id} correct={stats.correct} total={stats.total} />
                ))}
              </div>
            )}

            {breakdownTab === 'difficulty' && (
              <div className="space-y-3">
                {[1, 2, 3].map(d => {
                  const stats = byDifficulty[d]
                  if (!stats || stats.total === 0) return null
                  const p = pct(stats.correct, stats.total)
                  return (
                    <div key={d}>
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span className={`font-medium ${DIFF_COLOR[d]}`}>{DIFF_LABEL[d]}</span>
                        <span className="text-gray-500 text-xs">{stats.correct}/{stats.total} ({p}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${DIFF_BAR[d]} rounded-full transition-all duration-500`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {breakdownTab === 'answers' && (
              <div>
                <p className="text-xs text-gray-400 mb-3">How often you chose each answer</p>
                <div className="grid grid-cols-4 gap-3">
                  {['A','B','C','D'].map(opt => {
                    const count = answerDist[opt] ?? 0
                    const total = questions.length
                    const w = total > 0 ? (count / total) * 100 : 0
                    return (
                      <div key={opt} className="text-center">
                        <div className="h-16 bg-gray-100 rounded-lg overflow-hidden flex items-end">
                          <div className="w-full bg-indigo-400 rounded-lg transition-all duration-500" style={{ height: `${w}%` }} />
                        </div>
                        <p className="text-sm font-bold text-gray-700 mt-1">{opt}</p>
                        <p className="text-xs text-gray-400">{count}×</p>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-300 mt-3 text-center">Even distribution across A–D is a good sign of careful reading vs. guessing</p>
              </div>
            )}
          </div>
        </div>

        {/* Session timeline: colored dots in answer order */}
        {questions.length >= 5 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
            <p className="text-xs text-gray-400 font-semibold mb-2">Answer timeline</p>
            <div className="flex flex-wrap gap-1">
              {questions.map((q, i) => {
                const correct = (answers[q.id] ?? null) === q.answer
                const flagged = flaggedSet.has(q.id)
                return (
                  <div
                    key={q.id}
                    className={`w-4 h-4 rounded-sm ${correct ? 'bg-emerald-400' : 'bg-rose-400'} ${flagged ? 'ring-2 ring-amber-400 ring-offset-0.5' : ''}`}
                    title={`Q${i + 1}: ${correct ? 'Correct' : 'Wrong'}${flagged ? ' 🚩' : ''}`}
                  />
                )
              })}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Correct</span>
              <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-3 h-3 rounded-sm bg-rose-400 inline-block" /> Wrong</span>
              {flaggedSet.size > 0 && <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-3 h-3 rounded-sm bg-gray-200 ring-2 ring-amber-400 inline-block" /> Flagged</span>}
            </div>
          </div>
        )}

        {/* Session Highlights */}
        {session.questions.length >= 5 && (() => {
          const timings = session.questionTimings ?? {}
          const highlights = []
          const correctQs = session.questions.filter(q => (answers[q.id] ?? null) === q.answer)
          const wrongQs = session.questions.filter(q => (answers[q.id] ?? null) !== q.answer && answers[q.id] !== undefined)
          // Fastest correct answer
          const fastCorrect = correctQs
            .filter(q => timings[q.id])
            .sort((a, b) => timings[a.id] - timings[b.id])[0]
          if (fastCorrect && timings[fastCorrect.id] < 20) {
            highlights.push({ icon: '⚡', text: `Fastest answer: "${(fastCorrect.stem ?? fastCorrect.text ?? '').slice(0, 40)}…" — ${Math.round(timings[fastCorrect.id])}s` })
          }
          // Hardest question gotten right
          const hardRight = correctQs.filter(q => q.difficulty === 3)[0]
          if (hardRight) highlights.push({ icon: '💪', text: `Cracked a Hard (Difficulty 3) question in ${domainById[hardRight.domain]?.label ?? hardRight.domain}` })
          // Longest question (most time spent, still got right)
          const persisted = correctQs.filter(q => timings[q.id] && timings[q.id] > 60).sort((a, b) => timings[b.id] - timings[a.id])[0]
          if (persisted) highlights.push({ icon: '🧠', text: `Persisted ${Math.round(timings[persisted.id])}s on a tough question — and got it right!` })
          // Max combo
          if ((session.maxCombo ?? 0) >= 5) highlights.push({ icon: '🔥', text: `Hit a ${session.maxCombo}-answer combo streak!` })
          // All correct
          if (wrongQs.length === 0 && session.questions.length >= 10) highlights.push({ icon: '🏆', text: 'Perfect session — every question correct!' })
          if (highlights.length === 0) return null
          return (
            <div className="bg-gradient-to-r from-slate-50 to-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2.5">Session Highlights</p>
              <div className="space-y-2">
                {highlights.slice(0, 3).map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-base shrink-0">{h.icon}</span>
                    <p className="text-xs text-gray-700 leading-relaxed">{h.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Question review */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Question Review</h2>
              {reviewFilter === 'all' && wrongQuestions.length > 0 && (
                <button onClick={() => setReviewFilter('incorrect')}
                  className="text-xs text-rose-500 hover:text-rose-700 font-medium transition-colors">
                  Skip to wrong ({wrongQuestions.length}) →
                </button>
              )}
              {onRetry && wrongQuestions.length > 0 && (
                <button onClick={() => onRetry(wrongQuestions)}
                  className="text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg px-2.5 py-1 transition-colors">
                  🔁 Retry wrong
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All', count: questions.length },
                { id: 'correct', label: 'Correct', count: correctCount },
                { id: 'incorrect', label: 'Incorrect', count: incorrectCount },
                ...(flaggedSet.size > 0 ? [{ id: 'flagged', label: '🚩 Flagged', count: flaggedSet.size }] : []),
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setReviewFilter(f.id)}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                    reviewFilter === f.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {f.label}
                  <span className={`text-xs px-1 py-px rounded-full ${reviewFilter === f.id ? 'bg-indigo-500' : 'bg-gray-100 text-gray-400'}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredQuestions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No questions to show</p>
            ) : (
              filteredQuestions.map((q, i) => {
                const isWrong = (answers[q.id] ?? null) !== q.answer
                return <QuestionRow key={q.id} question={q} userAnswer={answers[q.id] ?? null} index={i} isFlagged={flaggedSet.has(q.id)} timeSpent={questionTimes?.[q.id]} highlight={isWrong && reviewFilter !== 'correct'} />
              })
            )}
          </div>
        </div>

        {toughestWrong && (
          <div className="mt-6 bg-rose-50 border border-rose-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">💪 Toughest Question Missed</p>
            <p className="text-sm text-gray-700 leading-snug line-clamp-3">{toughestWrong.question}</p>
            <p className="text-xs text-gray-400 mt-2">Correct answer: <span className="font-semibold text-emerald-700">{toughestWrong.answer}</span></p>
          </div>
        )}

        {insights.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">🔍 Session Insights</p>
            <div className="space-y-2">
              {insights.map((ins, i) => (
                <div key={i} className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${ins.color}`}>
                  <span className="mr-2">{ins.icon}</span>{ins.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mood picker */}
        {(() => {
          const MOODS = [
            { id: 'fire', emoji: '🔥', label: 'On fire' },
            { id: 'good', emoji: '😊', label: 'Good' },
            { id: 'okay', emoji: '😐', label: 'Okay' },
            { id: 'tired', emoji: '😤', label: 'Tired' },
            { id: 'rough', emoji: '😵', label: 'Rough' },
          ]
          const [mood, setMood] = useState(session.mood ?? null)
          function pickMood(id) {
            setMood(id)
            updateSessionMood(session.id, id)
          }
          return (
            <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-400 mb-3">How did this session feel?</p>
              <div className="flex gap-2">
                {MOODS.map(m => (
                  <button key={m.id} onClick={() => pickMood(m.id)}
                    className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border-2 transition-all ${
                      mood === m.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 hover:border-gray-300'
                    }`}>
                    <span className="text-xl">{m.emoji}</span>
                    <span className="text-xs text-gray-500 mt-0.5">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Personalized tip */}
        {(() => {
          const avgTime = elapsedSeconds && questions.length ? elapsedSeconds / questions.length : null
          const wrongDomains = [...new Set(wrongQuestions.map(q => q.domain))].slice(0, 2)
          const hardWrong = wrongQuestions.filter(q => q.difficulty === 3).length
          const tips = []
          if (score.percent === 100) tips.push({ icon: '🌟', text: 'Perfect! Try Beast Mode to push harder.' })
          else if (score.percent < 60) tips.push({ icon: '💡', text: 'Under 60%? Focus on one domain at a time this week.' })
          if (hardWrong >= 3) tips.push({ icon: '🏋️', text: `${hardWrong} hard questions missed — revisit them in a dedicated Hard drill.` })
          if (avgTime && avgTime > 90) tips.push({ icon: '⏱', text: `Avg ${Math.round(avgTime)}s/question — try Blitz Mode to build speed.` })
          if (avgTime && avgTime < 20 && score.percent < 70) tips.push({ icon: '🐢', text: 'You\'re going fast but missing questions — slow down and read carefully.' })
          if (wrongDomains.length > 0 && score.percent < 80) tips.push({ icon: '🎯', text: `Practice more ${wrongDomains.map(id => domainById[id]?.label ?? id).join(' & ')} to boost your score.` })
          const tip = tips[0]
          if (!tip) return null
          return (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4 flex items-start gap-2.5">
              <span className="text-base shrink-0 mt-0.5">{tip.icon}</span>
              <p className="text-sm text-indigo-700">{tip.text}</p>
            </div>
          )
        })()}

        {/* What to do next */}
        {(() => {
          const avgTime = elapsedSeconds && questions.length ? elapsedSeconds / questions.length : null
          const topWrongDomain = wrongQuestions.length > 0
            ? Object.entries(wrongQuestions.reduce((acc, q) => { acc[q.domain] = (acc[q.domain] ?? 0) + 1; return acc }, {}))
                .sort((a, b) => b[1] - a[1])[0]?.[0]
            : null
          const recs = []
          if (score.percent >= 90 && formatLabel !== 'Beast Mode') recs.push({ icon: '🔥', label: 'Try Beast Mode', sub: 'You\'re crushing it — go harder', action: null })
          else if (score.percent < 60 && topWrongDomain) recs.push({ icon: '🎯', label: `Focus: ${domainById[topWrongDomain]?.label ?? topWrongDomain}`, sub: 'Your weakest area this session', action: null })
          else if (avgTime && avgTime > 100) recs.push({ icon: '⚡', label: 'Try Blitz Mode', sub: 'Build speed with 40 rapid-fire questions', action: null })
          else if (wrongQuestions.length >= 5) recs.push({ icon: '🔁', label: 'Review wrong answers', sub: `${wrongQuestions.length} questions to revisit`, action: onRetry ? () => onRetry(wrongQuestions) : null })
          else recs.push({ icon: '📚', label: 'Keep the streak alive', sub: 'Come back tomorrow for bonus XP', action: null })
          const rec = recs[0]
          return (
            <div className="bg-white border-2 border-gray-100 rounded-2xl px-4 py-3.5 mb-3 flex items-center gap-3">
              <span className="text-2xl shrink-0">{rec.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">Up next: {rec.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{rec.sub}</p>
              </div>
              {rec.action && (
                <button onClick={rec.action} className="shrink-0 text-xs font-bold text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1.5 hover:bg-indigo-50 transition-colors">
                  Go →
                </button>
              )}
            </div>
          )
        })()}

        <div className="mt-4 space-y-3">
          {wrongQuestions.length > 0 && onRetry && (
            <button
              onClick={() => onRetry(wrongQuestions)}
              className="w-full py-3 rounded-xl border-2 border-rose-200 bg-rose-50 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
            >
              Retry {wrongQuestions.length} wrong answer{wrongQuestions.length !== 1 ? 's' : ''} →
            </button>
          )}
          <div className="flex gap-3">
            <button onClick={onHistory} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-colors">
              View History
            </button>
            <button onClick={onNewSession} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">
              New Session →
            </button>
          </div>
          <button onClick={handleCopyResults}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors">
            {copied ? '✅ Copied! Paste it anywhere 🎉' : '📤 Share your score'}
          </button>
        </div>

        {/* Study log note */}
        <div className="mt-6 bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-2">📝 Session Note</p>
          <textarea
            value={note}
            onChange={e => { setNote(e.target.value); setNoteSaved(false) }}
            placeholder="What did you learn? What to review next time?"
            rows={2}
            className="w-full text-sm bg-white border border-amber-100 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 placeholder-amber-200 text-gray-700"
          />
          <button
            onClick={() => { updateSessionNote(session.id, note); setNoteSaved(true) }}
            disabled={noteSaved}
            className={`mt-2 w-full py-1.5 rounded-xl text-xs font-semibold transition-colors ${noteSaved ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-400 text-white hover:bg-amber-500'}`}
          >
            {noteSaved ? '✓ Saved' : 'Save Note'}
          </button>
        </div>

      </div>
    </div>
  )
}
