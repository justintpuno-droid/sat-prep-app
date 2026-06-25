import { useState, useMemo } from 'react'
import allQuestions from './data/questions'

const KEY = 'sat_prep_daily_challenge'
const STREAK_KEY = 'sat_prep_daily_streak'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function getDailyQuestion() {
  const dateStr = todayStr()
  const seed = dateStr.split('-').reduce((a, b) => a * 100 + parseInt(b), 0)
  const hardQs = allQuestions.filter(q => q.difficulty === 3)
  const idx = Math.floor(seededRandom(seed) * hardQs.length)
  return hardQs[idx]
}

function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null }
}

function loadStreak() {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY) ?? '{"count":0,"lastDate":null}') } catch { return { count: 0, lastDate: null } }
}

function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
}

function saveStreak(streak) {
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(streak)) } catch {}
}

export { loadState as loadDailyChallengeState }

export default function DailyChallenge({ onBack, onXP }) {
  const question = useMemo(() => getDailyQuestion(), [])

  const savedState = useMemo(() => {
    const s = loadState()
    return s?.date === todayStr() ? s : null
  }, [])

  const streak = useMemo(() => loadStreak(), [])

  const [selected, setSelected] = useState(savedState?.selected ?? null)
  const [submitted, setSubmitted] = useState(savedState?.submitted ?? false)
  const [xpAwarded, setXpAwarded] = useState(savedState?.xpAwarded ?? false)

  const correct = selected === question?.answer
  const todayDone = submitted

  function handleSubmit() {
    if (!selected) return
    const isCorrect = selected === question.answer
    const today = todayStr()

    const newState = { date: today, selected, submitted: true, correct: isCorrect, xpAwarded: true }
    saveState(newState)

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const newStreak = {
      count: (streak.lastDate === yesterday || streak.lastDate === today) ? streak.count + (streak.lastDate === today ? 0 : 1) : 1,
      lastDate: today,
    }
    if (streak.lastDate !== today) saveStreak(newStreak)

    setSubmitted(true)
    setXpAwarded(true)

    if (!savedState?.xpAwarded) {
      const xp = isCorrect ? 50 : 10
      onXP?.(xp)
    }
  }

  const currentStreak = (() => {
    const s = loadStreak()
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (s.lastDate === todayStr() || s.lastDate === yesterday) return s.count
    return 0
  })()

  if (!question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-slate-100 px-4 py-10 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No question available today.</p>
          <button onClick={onBack} className="text-sm text-indigo-500">← Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 px-4 pt-safe-8 pb-8">
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-sm text-amber-300/70 hover:text-amber-200 transition-colors">← Back</button>
          <div className="flex items-center gap-2">
            {currentStreak > 0 && (
              <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 rounded-full px-3 py-1">
                <span className="text-sm">🔥</span>
                <span className="text-xs font-bold text-amber-300">{currentStreak} day streak</span>
              </div>
            )}
          </div>
        </div>

        {/* Title Card */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-5 mb-5 text-white shadow-2xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⚡</span>
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">Daily Challenge</p>
          </div>
          <h1 className="text-xl font-black leading-tight">Today's Hard Question</h1>
          <p className="text-white/60 text-xs mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs bg-white/20 rounded-full px-2.5 py-0.5 font-bold">
              {question.domain.replace(/-/g, ' ')}
            </span>
            <span className="text-xs bg-rose-600/40 rounded-full px-2.5 py-0.5 font-bold">Hard</span>
            <span className="text-xs text-white/50">+{submitted && correct ? 50 : submitted ? 10 : 50} XP</span>
          </div>
        </div>

        {/* Already done today */}
        {todayDone && (
          <div className={`rounded-2xl p-4 mb-4 text-center ${correct ? 'bg-emerald-900/40 border border-emerald-500/30' : 'bg-rose-900/40 border border-rose-500/30'}`}>
            <p className="text-2xl mb-1">{correct ? '🎉' : '💪'}</p>
            <p className={`font-black ${correct ? 'text-emerald-300' : 'text-rose-300'}`}>
              {correct ? 'You got it right!' : 'You attempted today\'s challenge'}
            </p>
            <p className="text-xs text-white/40 mt-1">Come back tomorrow for a new question</p>
          </div>
        )}

        {/* Stimulus */}
        {question.stimulus && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-3">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Context</p>
            <p className="text-sm text-white/80 leading-relaxed">{question.stimulus}</p>
          </div>
        )}

        {/* Question */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-4">
          <p className="text-sm font-bold text-white leading-relaxed whitespace-pre-line">{question.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-2 mb-5">
          {question.options.map(opt => {
            const isSelected = selected === opt.id
            const isCorrect = opt.id === question.answer
            let style = 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
            if (submitted) {
              if (isCorrect) style = 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
              else if (isSelected && !isCorrect) style = 'bg-rose-500/20 border-rose-400/50 text-rose-200'
              else style = 'bg-white/5 border-white/5 text-white/30'
            } else if (isSelected) {
              style = 'bg-amber-500/20 border-amber-400/60 text-amber-100'
            }
            return (
              <button
                key={opt.id}
                disabled={submitted}
                onClick={() => !submitted && setSelected(opt.id)}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${style} ${submitted ? '' : 'active:scale-[0.99]'}`}
              >
                <span className="font-bold mr-2 opacity-60">{opt.id}.</span>{opt.text}
              </button>
            )
          })}
        </div>

        {/* Submit / Explanation */}
        {!submitted ? (
          <button
            disabled={!selected}
            onClick={handleSubmit}
            className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
          >
            Submit Answer · +50 XP
          </button>
        ) : (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Explanation</p>
            <p className="text-sm text-white/70 leading-relaxed">{question.explanation}</p>
          </div>
        )}

        {/* XP earned badge */}
        {submitted && (
          <div className="mt-4 text-center">
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold text-sm ${correct ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-white/50 border border-white/10'}`}>
              <span>{correct ? '✅' : '📖'}</span>
              <span>{correct ? '+50 XP earned!' : '+10 XP for trying'}</span>
            </div>
          </div>
        )}

        {/* Streak info */}
        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
          <p className="text-xs text-white/30 mb-1">Daily Challenge Streak</p>
          <p className="text-3xl font-black text-amber-400">{currentStreak}</p>
          <p className="text-xs text-white/40">{currentStreak === 0 ? 'Start your streak today!' : `day${currentStreak !== 1 ? 's' : ''} in a row`}</p>
        </div>

      </div>
    </div>
  )
}
