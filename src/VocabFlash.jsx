import { useState, useMemo } from 'react'
import { SAT_VOCAB } from './data/vocab'

const VOCAB_KEY = 'sat_prep_vocab'

function loadVocabProgress() {
  try { return JSON.parse(localStorage.getItem(VOCAB_KEY)) ?? {} } catch { return {} }
}
function saveVocabProgress(data) {
  localStorage.setItem(VOCAB_KEY, JSON.stringify(data))
}

export default function VocabFlash({ onBack, onXP }) {
  const [progress, setProgress] = useState(loadVocabProgress)
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [mode, setMode] = useState('all') // 'all' | 'due'
  const [done, setDone] = useState(false)
  const [sessionResults, setSessionResults] = useState([])

  const deck = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (mode === 'due') {
      return SAT_VOCAB.filter(w => {
        const p = progress[w.word]
        if (!p) return true
        if (p.mastered) return false
        return !p.nextReview || p.nextReview <= today
      })
    }
    return [...SAT_VOCAB].sort(() => Math.random() - 0.5)
  }, [mode, progress])

  const card = deck[idx]
  const masteredCount = Object.values(progress).filter(p => p.mastered).length
  const totalDue = SAT_VOCAB.filter(w => {
    const p = progress[w.word]
    const today = new Date().toISOString().slice(0, 10)
    if (!p) return true
    if (p.mastered) return false
    return !p.nextReview || p.nextReview <= today
  }).length

  function rate(knew) {
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const existing = progress[card.word] ?? { streak: 0 }
    let newStreak = knew ? (existing.streak ?? 0) + 1 : 0
    let mastered = newStreak >= 3
    const next = new Date(today)
    next.setDate(today.getDate() + (knew ? Math.min(newStreak * 2, 14) : 1))

    const updated = {
      ...progress,
      [card.word]: { streak: newStreak, mastered, nextReview: next.toISOString().slice(0, 10), lastSeen: todayStr }
    }
    setProgress(updated)
    saveVocabProgress(updated)
    setSessionResults(prev => [...prev, { word: card.word, knew }])

    if (idx + 1 >= deck.length) {
      setDone(true)
      const xpEarned = sessionResults.filter(r => r.knew).length * 5 + (knew ? 5 : 0)
      if (xpEarned > 0) onXP?.(xpEarned)
    } else {
      setIdx(i => i + 1)
      setFlipped(false)
    }
  }

  if (done) {
    const knew = sessionResults.filter(r => r.knew).length + 0
    const total = sessionResults.length
    const xpEarned = knew * 5
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{knew === total ? '🎉' : knew >= total * 0.7 ? '⭐' : '📚'}</div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">Session Complete!</h2>
            <p className="text-gray-500">{deck.length} cards reviewed</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <p className="text-2xl font-black text-emerald-600">{knew}</p>
                <p className="text-xs text-gray-400 mt-0.5">Knew it</p>
              </div>
              <div>
                <p className="text-2xl font-black text-rose-500">{total - knew}</p>
                <p className="text-xs text-gray-400 mt-0.5">Need review</p>
              </div>
              <div>
                <p className="text-2xl font-black text-indigo-600">+{xpEarned}</p>
                <p className="text-xs text-gray-400 mt-0.5">XP earned</p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">{masteredCount} / {SAT_VOCAB.length} words mastered overall</p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(masteredCount / SAT_VOCAB.length) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <button onClick={() => { setIdx(0); setFlipped(false); setDone(false); setSessionResults([]) }}
              className="w-full bg-violet-600 text-white font-bold py-3 rounded-2xl hover:bg-violet-700 transition-colors">
              Study Again
            </button>
            <button onClick={onBack}
              className="w-full bg-white text-gray-600 font-semibold py-3 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 px-4 py-10">
      <div className="w-full max-w-md mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1">
            ← Back
          </button>
          <div className="text-center">
            <p className="text-xs font-bold text-violet-600 uppercase tracking-widest">SAT Vocab</p>
            <p className="text-xs text-gray-400">{idx + 1} / {deck.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-500">{masteredCount}/{SAT_VOCAB.length}</p>
            <p className="text-xs text-gray-400">mastered</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          {['all', 'due'].map(m => (
            <button key={m} onClick={() => { setMode(m); setIdx(0); setFlipped(false); setDone(false); setSessionResults([]) }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-colors ${mode === m ? 'bg-violet-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
              {m === 'all' ? `All (${SAT_VOCAB.length})` : `Review Due (${totalDue})`}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${(idx / deck.length) * 100}%` }} />
        </div>

        {deck.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎓</div>
            <p className="text-lg font-bold text-gray-800 mb-2">All caught up!</p>
            <p className="text-sm text-gray-500 mb-6">No words due for review today. Come back tomorrow!</p>
            <button onClick={() => setMode('all')} className="text-sm text-violet-600 font-semibold">Study all words instead →</button>
          </div>
        ) : (
          <>
            {/* Flashcard */}
            <button
              onClick={() => setFlipped(f => !f)}
              className="w-full text-left"
            >
              <div className={`bg-white rounded-3xl border-2 shadow-lg p-8 mb-6 min-h-64 flex flex-col justify-center transition-all ${flipped ? 'border-violet-300' : 'border-gray-100 hover:border-violet-200'}`}>
                {!flipped ? (
                  <div className="text-center">
                    <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-4">Word</p>
                    <p className="text-4xl font-black text-gray-900 mb-4">{card.word}</p>
                    <p className="text-sm text-gray-400">Tap to reveal definition</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">{card.word}</p>
                    <p className="text-lg font-semibold text-gray-900 mb-4 leading-snug">{card.def}</p>
                    <p className="text-sm text-gray-500 italic leading-snug border-t border-gray-100 pt-3">"{card.example}"</p>
                  </div>
                )}
              </div>
            </button>

            {/* Rating buttons */}
            {flipped ? (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => rate(false)}
                  className="py-4 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-colors">
                  ✗ Missed it
                </button>
                <button onClick={() => rate(true)}
                  className="py-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-colors">
                  ✓ Got it!
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xs text-gray-400">Tap the card to reveal definition, then rate yourself</p>
              </div>
            )}

            {/* Word stats */}
            {progress[card.word] && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <span className="text-xs text-gray-400">Streak: {progress[card.word].streak}/3</span>
                {progress[card.word].mastered && <span className="text-xs text-emerald-600 font-semibold">✓ Mastered</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
