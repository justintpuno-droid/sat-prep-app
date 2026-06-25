import { useState, useMemo } from 'react'
import { MATH_FORMULAS } from './data/mathFormulas'

const MATH_KEY = 'sat_prep_math_flash'
const CATEGORY_COLORS = {
  Geometry: 'bg-blue-600',
  Algebra: 'bg-indigo-600',
  Arithmetic: 'bg-emerald-600',
  Statistics: 'bg-violet-600',
}

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(MATH_KEY)) ?? {} } catch { return {} }
}
function saveProgress(data) {
  localStorage.setItem(MATH_KEY, JSON.stringify(data))
}

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

function getNameChoices(card, allFormulas) {
  const correct = { name: card.name, correct: true }
  const pool = allFormulas.filter(f => f.name !== card.name)
  const distractors = shuffle(pool).slice(0, 3).map(f => ({ name: f.name, correct: false }))
  return shuffle([correct, ...distractors])
}

export default function MathFlash({ onBack, onXP }) {
  const [progress, setProgress] = useState(loadProgress)
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [studyMode, setStudyMode] = useState('flash') // 'flash' | 'quiz'
  const [quizAnswer, setQuizAnswer] = useState(null)
  const [quizChoices, setQuizChoices] = useState(null)
  const [filter, setFilter] = useState('all')
  const [done, setDone] = useState(false)
  const [results, setResults] = useState([])
  const [sessionCombo, setSessionCombo] = useState(0)
  const [maxSessionCombo, setMaxSessionCombo] = useState(0)
  const [comboFlash, setComboFlash] = useState(null)
  const [newlyMastered, setNewlyMastered] = useState([])

  const categories = useMemo(() => [...new Set(MATH_FORMULAS.map(f => f.category))], [])

  const deck = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (filter === 'due') {
      return MATH_FORMULAS.filter(f => {
        const p = progress[f.name]
        if (!p) return true
        if (p.mastered) return false
        return !p.nextReview || p.nextReview <= today
      })
    }
    if (filter !== 'all') return MATH_FORMULAS.filter(f => f.category === filter)
    return [...MATH_FORMULAS].sort(() => Math.random() - 0.5)
  }, [filter, progress])

  const card = deck[idx]
  const masteredCount = Object.values(progress).filter(p => p.mastered).length
  const catColor = card ? (CATEGORY_COLORS[card.category] ?? 'bg-gray-600') : 'bg-gray-600'

  const currentQuizChoices = useMemo(() => {
    if (studyMode !== 'quiz' || !card) return null
    if (quizChoices) return quizChoices
    const choices = getNameChoices(card, MATH_FORMULAS)
    setQuizChoices(choices)
    return choices
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyMode, card?.name])

  function rate(knew) {
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const existing = progress[card.name] ?? { streak: 0 }
    const newStreak = knew ? (existing.streak ?? 0) + 1 : 0
    const mastered = newStreak >= 3
    const wasAlreadyMastered = existing.mastered === true
    const next = new Date(today)
    next.setDate(today.getDate() + (knew ? Math.min(newStreak * 3, 21) : 1))
    const updated = {
      ...progress,
      [card.name]: { streak: newStreak, mastered, nextReview: next.toISOString().slice(0, 10), lastSeen: todayStr }
    }
    setProgress(updated)
    saveProgress(updated)
    setResults(prev => [...prev, { name: card.name, knew }])

    if (mastered && !wasAlreadyMastered) {
      setNewlyMastered(prev => [...prev, card.name])
    }

    const newCombo = knew ? sessionCombo + 1 : 0
    setSessionCombo(newCombo)
    if (newCombo > maxSessionCombo) setMaxSessionCombo(newCombo)
    if (knew && (newCombo === 3 || newCombo === 5 || newCombo === 10)) {
      const label = newCombo === 3 ? '🔥 3 in a row!' : newCombo === 5 ? '⚡ 5 in a row!' : '💥 10 in a row!'
      setComboFlash(label)
      setTimeout(() => setComboFlash(null), 1200)
    }

    if (idx + 1 >= deck.length) {
      const sessionKnew = results.filter(r => r.knew).length + (knew ? 1 : 0)
      const sessionNewMastered = newlyMastered.length + (mastered && !wasAlreadyMastered ? 1 : 0)
      const comboBonus = Math.max(newCombo, maxSessionCombo) >= 5 ? 20 : 0
      const totalXP = sessionKnew * 5 + sessionNewMastered * 25 + comboBonus
      const allResults = [...results, { knew }]
      const allKnew = allResults.every(r => r.knew) && allResults.length > 0
      try { localStorage.setItem('sat_prep_math_last_session', JSON.stringify({ allKnew })) } catch {}
      if (totalXP > 0) onXP?.(totalXP)
      setDone(true)
    }
    else { setIdx(i => i + 1); setFlipped(false); setQuizAnswer(null); setQuizChoices(null) }
  }

  function pickAnswer(choice) {
    if (quizAnswer) return
    setQuizAnswer(choice)
    rate(choice.correct)
  }

  if (done) {
    const knew = results.filter(r => r.knew).length
    const pct = results.length > 0 ? Math.round((knew / results.length) * 100) : 0
    const xpEarned = knew * 5 + newlyMastered.length * 25 + (maxSessionCombo >= 5 ? 20 : 0)
    const isMilestone10 = masteredCount >= 10 && masteredCount - newlyMastered.length < 10
    const isMilestoneAll = masteredCount >= MATH_FORMULAS.length && newlyMastered.length > 0
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Milestone banner */}
          {(isMilestoneAll || isMilestone10) && (
            <div className={`rounded-2xl p-5 mb-4 text-white text-center ${isMilestoneAll ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
              <div className="text-4xl mb-2">{isMilestoneAll ? '🧮' : '🔢'}</div>
              <p className="text-xl font-black">{isMilestoneAll ? 'Formula God!' : 'Formula Learner!'}</p>
              <p className="text-sm opacity-80 mt-1">{isMilestoneAll ? 'You mastered ALL 60 formulas!' : 'You mastered 10 formulas!'}</p>
            </div>
          )}

          <div className="text-center mb-6">
            <div className="text-5xl mb-3">{pct === 100 ? '🏆' : pct >= 80 ? '⭐' : pct >= 60 ? '📐' : '🧮'}</div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">Session Complete!</h2>
            <p className="text-gray-500">{results.length} formula{results.length !== 1 ? 's' : ''} reviewed</p>
          </div>

          {/* XP earned */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 mb-4 text-center text-white">
            <p className="text-3xl font-black">+{xpEarned} XP</p>
            <p className="text-xs opacity-70 mt-0.5">
              {knew}×5 correct{newlyMastered.length > 0 ? ` · ${newlyMastered.length}×25 mastered` : ''}{maxSessionCombo >= 5 ? ' · combo bonus' : ''}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
            <div className="grid grid-cols-4 gap-3 text-center mb-4">
              <div><p className="text-xl font-black text-emerald-600">{knew}</p><p className="text-[10px] text-gray-400 mt-0.5">Knew it</p></div>
              <div><p className="text-xl font-black text-rose-500">{results.length - knew}</p><p className="text-[10px] text-gray-400 mt-0.5">Review</p></div>
              <div><p className="text-xl font-black text-indigo-600">{masteredCount}</p><p className="text-[10px] text-gray-400 mt-0.5">Mastered</p></div>
              <div><p className="text-xl font-black text-orange-500">{maxSessionCombo}×</p><p className="text-[10px] text-gray-400 mt-0.5">Best streak</p></div>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                <span>{masteredCount}/{MATH_FORMULAS.length} formulas mastered</span>
                <span>{Math.round((masteredCount / MATH_FORMULAS.length) * 100)}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all" style={{ width: `${(masteredCount / MATH_FORMULAS.length) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Newly mastered formulas */}
          {newlyMastered.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2.5">✨ Newly Mastered ({newlyMastered.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {newlyMastered.map(name => (
                  <span key={name} className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">{name}</span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button onClick={() => { setIdx(0); setFlipped(false); setDone(false); setResults([]); setSessionCombo(0); setMaxSessionCombo(0); setNewlyMastered([]) }}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-2xl hover:bg-blue-700 transition-colors">
              Study Again
            </button>
            <button onClick={onBack} className="w-full bg-white text-gray-600 font-semibold py-3 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-4 pt-safe-10 pb-10">
      {comboFlash && (
        <div className="fixed top-safe-6 left-1/2 -translate-x-1/2 z-50 bg-orange-500 text-white font-black text-sm px-5 py-2.5 rounded-2xl shadow-lg animate-bounce pointer-events-none">
          {comboFlash}
        </div>
      )}
      <div className="w-full max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">← Back</button>
          <div className="text-center">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Math Formulas</p>
            <p className="text-xs text-gray-400">{idx + 1} / {deck.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-500">{masteredCount}/{MATH_FORMULAS.length} ✓</p>
            {sessionCombo >= 2 && <p className="text-xs font-bold text-orange-500">{sessionCombo}🔥</p>}
          </div>
        </div>

        {/* Study mode toggle */}
        <div className="flex gap-2 mb-4">
          {[['flash', '🃏 Flashcards'], ['quiz', '🔢 Name That Formula']].map(([m, label]) => (
            <button key={m} onClick={() => { setStudyMode(m); setQuizAnswer(null); setQuizChoices(null); setFlipped(false) }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-colors ${studyMode === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {['all', 'due', ...categories].map(f => (
            <button key={f} onClick={() => { setFilter(f); setIdx(0); setFlipped(false); setDone(false); setResults([]); setQuizAnswer(null); setQuizChoices(null) }}
              className={`shrink-0 px-3 py-1 text-xs font-semibold rounded-full transition-colors ${filter === f ? 'bg-blue-200 text-blue-800' : 'bg-white text-gray-500 border border-gray-200'}`}>
              {f === 'all' ? `All (${MATH_FORMULAS.length})` : f === 'due' ? `Due` : f}
            </button>
          ))}
        </div>

        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(idx / Math.max(1, deck.length)) * 100}%` }} />
        </div>

        {deck.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎉</div>
            <p className="text-lg font-bold text-gray-800 mb-2">All caught up!</p>
            <p className="text-sm text-gray-500 mb-6">No formulas due today.</p>
            <button onClick={() => setFilter('all')} className="text-sm text-blue-600 font-semibold">Study all formulas →</button>
          </div>
        ) : studyMode === 'quiz' && currentQuizChoices ? (
          /* Quiz Mode — show formula, pick the name */
          <div>
            <div className="bg-white rounded-3xl border-2 border-blue-100 shadow-lg p-7 mb-5 text-center">
              <span className={`text-xs font-bold text-white px-3 py-1 rounded-full ${catColor} inline-block mb-3`}>{card.category}</span>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">What is this formula called?</p>
              <p className="text-3xl font-black text-gray-900 font-mono leading-tight">{card.formula}</p>
            </div>
            <div className="space-y-2.5 mb-4">
              {currentQuizChoices.map((choice, i) => {
                let cls = 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 cursor-pointer'
                if (quizAnswer) {
                  if (choice.correct) cls = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-800'
                  else if (choice === quizAnswer) cls = 'bg-rose-50 border-2 border-rose-400 text-rose-700'
                  else cls = 'bg-white border-2 border-gray-100 text-gray-300'
                }
                return (
                  <button key={i} onClick={() => pickAnswer(choice)} disabled={!!quizAnswer}
                    className={`w-full text-left rounded-2xl px-4 py-3.5 text-sm font-medium transition-all flex items-center gap-3 ${cls}`}>
                    <span className="font-black text-xs w-5 shrink-0">{String.fromCharCode(65+i)}.</span>
                    <span className="flex-1">{choice.name}</span>
                    {quizAnswer && choice.correct && <span className="shrink-0 text-emerald-500 font-bold">✓</span>}
                    {quizAnswer && choice === quizAnswer && !choice.correct && <span className="shrink-0 text-rose-400 font-bold">✗</span>}
                  </button>
                )
              })}
            </div>
            {quizAnswer && (
              <div className={`rounded-2xl p-4 mb-4 ${quizAnswer.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                <p className={`text-xs font-bold mb-1.5 ${quizAnswer.correct ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {quizAnswer.correct ? '✓ Correct!' : `✗ That's the ${card.name}`}
                </p>
                <p className="text-xs text-indigo-600 font-semibold">💡 {card.tip}</p>
                <p className="text-xs text-gray-500 italic mt-1">{card.example}</p>
              </div>
            )}
            {quizAnswer && idx + 1 < deck.length && (
              <button onClick={() => { setQuizAnswer(null); setQuizChoices(null) }}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors">
                Next formula →
              </button>
            )}
          </div>
        ) : (
          /* Flashcard Mode */
          <>
            <button onClick={() => setFlipped(f => !f)} className="w-full text-left">
              <div className={`bg-white rounded-3xl border-2 shadow-lg p-8 mb-6 min-h-64 flex flex-col justify-center transition-all ${flipped ? 'border-blue-300' : 'border-gray-100 hover:border-blue-200'}`}>
                {!flipped ? (
                  <div className="text-center">
                    <span className={`text-xs font-bold text-white px-3 py-1 rounded-full ${catColor} inline-block mb-4`}>{card.category}</span>
                    <p className="text-2xl font-black text-gray-900 mb-4">{card.name}</p>
                    <p className="text-sm text-gray-400">Tap to reveal the formula</p>
                  </div>
                ) : (
                  <div>
                    <span className={`text-xs font-bold text-white px-3 py-1 rounded-full ${catColor} inline-block mb-3`}>{card.category}</span>
                    <p className="text-xs font-semibold text-gray-500 mb-2">{card.name}</p>
                    <p className="text-2xl font-black text-gray-900 mb-4 font-mono">{card.formula}</p>
                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <p className="text-xs text-indigo-600 font-semibold">💡 {card.tip}</p>
                      <p className="text-xs text-gray-500 italic">{card.example}</p>
                    </div>
                  </div>
                )}
              </div>
            </button>
            {flipped ? (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => rate(false)} className="py-4 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-colors">✗ Need more practice</button>
                <button onClick={() => rate(true)} className="py-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-colors">✓ Got it!</button>
              </div>
            ) : (
              <p className="text-center text-xs text-gray-400">Tap card to reveal · then rate yourself</p>
            )}
            {progress[card.name] && (
              <div className="mt-3 flex items-center justify-center gap-3">
                <span className="text-xs text-gray-400">Streak: {progress[card.name].streak}/3</span>
                {progress[card.name].mastered && <span className="text-xs text-emerald-600 font-semibold">✓ Mastered</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
