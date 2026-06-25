import { useState, useMemo } from 'react'
import { SAT_VOCAB } from './data/vocab'

const VOCAB_KEY = 'sat_prep_vocab'

function loadVocabProgress() {
  try { return JSON.parse(localStorage.getItem(VOCAB_KEY)) ?? {} } catch { return {} }
}
function saveVocabProgress(data) {
  localStorage.setItem(VOCAB_KEY, JSON.stringify(data))
}

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

function getQuizChoices(word, allWords) {
  const correct = { def: word.def, correct: true }
  const distractors = shuffle(allWords.filter(w => w.word !== word.word)).slice(0, 3).map(w => ({ def: w.def, correct: false }))
  return shuffle([correct, ...distractors])
}

function getContextChoices(word, allWords) {
  const correct = { word: word.word, correct: true }
  const distractors = shuffle(allWords.filter(w => w.word !== word.word)).slice(0, 3).map(w => ({ word: w.word, correct: false }))
  return shuffle([correct, ...distractors])
}

function blankSentence(sentence, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return sentence.replace(new RegExp(escaped, 'i'), '______')
}

export default function VocabFlash({ onBack, onXP }) {
  const [progress, setProgress] = useState(loadVocabProgress)
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [studyMode, setStudyMode] = useState('flash') // 'flash' | 'quiz' | 'context'
  const [mode, setMode] = useState('all') // 'all' | 'due'
  const [done, setDone] = useState(false)
  const [sessionResults, setSessionResults] = useState([])
  const [quizAnswer, setQuizAnswer] = useState(null) // null | { def, correct }
  const [quizChoices, setQuizChoices] = useState(null)
  const [contextAnswer, setContextAnswer] = useState(null) // null | { word, correct }
  const [contextChoices, setContextChoices] = useState(null)
  const [sessionCombo, setSessionCombo] = useState(0)
  const [maxSessionCombo, setMaxSessionCombo] = useState(0)
  const [comboFlash, setComboFlash] = useState(null)
  const [newlyMastered, setNewlyMastered] = useState([])

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
    const wasAlreadyMastered = existing.mastered === true
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

    if (mastered && !wasAlreadyMastered) {
      setNewlyMastered(prev => [...prev, card.word])
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
      const allResults = [...sessionResults, { word: card.word, knew }]
      const xpEarned = allResults.filter(r => r.knew).length * 5
      const allKnew = allResults.every(r => r.knew) && allResults.length > 0
      try { localStorage.setItem('sat_prep_vocab_last_session', JSON.stringify({ allKnew })) } catch {}
      if (studyMode === 'quiz' || studyMode === 'context') {
        setTimeout(() => {
          setDone(true)
          if (xpEarned > 0) onXP?.(xpEarned)
        }, 1400)
      } else {
        setDone(true)
        if (xpEarned > 0) onXP?.(xpEarned)
      }
    } else {
      setIdx(i => i + 1)
      setFlipped(false)
      setQuizAnswer(null)
      setQuizChoices(null)
      setContextAnswer(null)
      setContextChoices(null)
    }
  }

  function pickQuizAnswer(choice) {
    if (quizAnswer) return
    setQuizAnswer(choice)
    rate(choice.correct)
  }

  function pickContextAnswer(choice) {
    if (contextAnswer) return
    setContextAnswer(choice)
    rate(choice.correct)
  }

  const currentQuizChoices = useMemo(() => {
    if (studyMode !== 'quiz' || !card) return null
    if (quizChoices) return quizChoices
    const choices = getQuizChoices(card, SAT_VOCAB)
    setQuizChoices(choices)
    return choices
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyMode, card?.word])

  const currentContextChoices = useMemo(() => {
    if (studyMode !== 'context' || !card) return null
    if (contextChoices) return contextChoices
    const choices = getContextChoices(card, SAT_VOCAB)
    setContextChoices(choices)
    return choices
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyMode, card?.word])

  if (done) {
    const knew = sessionResults.filter(r => r.knew).length
    const total = sessionResults.length
    const pct = total > 0 ? Math.round((knew / total) * 100) : 0
    const xpEarned = knew * 5 + newlyMastered.length * 25 + (maxSessionCombo >= 5 ? 20 : 0)
    const isMilestone10 = masteredCount >= 10 && masteredCount - newlyMastered.length < 10
    const isMilestone30 = masteredCount >= 30 && masteredCount - newlyMastered.length < 30
    const isMilestoneAll = masteredCount >= SAT_VOCAB.length && newlyMastered.length > 0
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Milestone banner */}
          {(isMilestoneAll || isMilestone30 || isMilestone10) && (
            <div className={`rounded-2xl p-5 mb-4 text-white text-center ${isMilestoneAll ? 'bg-gradient-to-r from-amber-500 to-orange-500' : isMilestone30 ? 'bg-gradient-to-r from-violet-600 to-purple-700' : 'bg-gradient-to-r from-violet-500 to-indigo-600'}`}>
              <div className="text-4xl mb-2">{isMilestoneAll ? '🎓' : isMilestone30 ? '📚' : '📖'}</div>
              <p className="text-xl font-black">{isMilestoneAll ? 'Word Master!' : isMilestone30 ? 'Vocabulary Pro!' : 'Word Collector!'}</p>
              <p className="text-sm opacity-80 mt-1">
                {isMilestoneAll ? 'You mastered all 128 SAT words!' : isMilestone30 ? '30 words mastered!' : '10 words mastered!'}
              </p>
            </div>
          )}

          <div className="text-center mb-6">
            <div className="text-5xl mb-3">{pct === 100 ? '🏆' : pct >= 80 ? '⭐' : pct >= 60 ? '📖' : '📚'}</div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">Session Complete!</h2>
            <p className="text-gray-500">{total} word{total !== 1 ? 's' : ''} reviewed</p>
          </div>

          {/* XP earned */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 mb-4 text-center text-white">
            <p className="text-3xl font-black">+{xpEarned} XP</p>
            <p className="text-xs opacity-70 mt-0.5">
              {knew}×5 correct{newlyMastered.length > 0 ? ` · ${newlyMastered.length}×25 mastered` : ''}{maxSessionCombo >= 5 ? ' · combo bonus' : ''}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
            <div className="grid grid-cols-4 gap-3 text-center mb-4">
              <div><p className="text-xl font-black text-emerald-600">{knew}</p><p className="text-[10px] text-gray-400 mt-0.5">Knew it</p></div>
              <div><p className="text-xl font-black text-rose-500">{total - knew}</p><p className="text-[10px] text-gray-400 mt-0.5">Review</p></div>
              <div><p className="text-xl font-black text-indigo-600">{masteredCount}</p><p className="text-[10px] text-gray-400 mt-0.5">Mastered</p></div>
              <div><p className="text-xl font-black text-orange-500">{maxSessionCombo}×</p><p className="text-[10px] text-gray-400 mt-0.5">Best streak</p></div>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                <span>{masteredCount}/{SAT_VOCAB.length} words mastered</span>
                <span>{Math.round((masteredCount / SAT_VOCAB.length) * 100)}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all" style={{ width: `${(masteredCount / SAT_VOCAB.length) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Newly mastered words */}
          {newlyMastered.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2.5">✨ Newly Mastered ({newlyMastered.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {newlyMastered.map(word => (
                  <span key={word} className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">{word}</span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button onClick={() => { setIdx(0); setFlipped(false); setDone(false); setSessionResults([]); setSessionCombo(0); setMaxSessionCombo(0); setNewlyMastered([]) }}
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
      {comboFlash && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-violet-600 text-white font-black text-sm px-5 py-2.5 rounded-2xl shadow-lg animate-bounce pointer-events-none">
          {comboFlash}
        </div>
      )}
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
            {sessionCombo >= 2 ? <p className="text-xs font-bold text-violet-500">{sessionCombo}🔥</p> : <p className="text-xs text-gray-400">mastered</p>}
          </div>
        </div>

        {/* Study mode + deck toggle */}
        <div className="flex gap-1.5 mb-4">
          {[['flash', '🃏 Flash'], ['quiz', '🎯 Def Quiz'], ['context', '✍️ In Context']].map(([m, label]) => (
            <button key={m} onClick={() => { setStudyMode(m); setQuizAnswer(null); setQuizChoices(null); setContextAnswer(null); setContextChoices(null); setFlipped(false) }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-colors ${studyMode === m ? 'bg-violet-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-6">
          {['all', 'due'].map(m => (
            <button key={m} onClick={() => { setMode(m); setIdx(0); setFlipped(false); setDone(false); setSessionResults([]); setQuizAnswer(null); setQuizChoices(null); setContextAnswer(null); setContextChoices(null); setSessionCombo(0); setMaxSessionCombo(0); setNewlyMastered([]) }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-colors ${mode === m ? 'bg-violet-200 text-violet-800' : 'bg-white text-gray-500 border border-gray-200'}`}>
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
            {studyMode === 'context' && currentContextChoices ? (
              /* In-Context Mode */
              <div>
                <div className="bg-white rounded-3xl border-2 border-violet-100 shadow-lg p-7 mb-5">
                  <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3 text-center">Fill in the blank</p>
                  <p className="text-base text-gray-800 leading-relaxed text-center italic">
                    "{card.example ? blankSentence(card.example, card.word) : `The word "______" fits perfectly in this sentence.`}"
                  </p>
                  {contextAnswer && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-1">Definition</p>
                      <p className="text-sm text-gray-700 leading-snug">{card.def}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2.5 mb-4">
                  {currentContextChoices.map((choice, i) => {
                    let cls = 'bg-white border-2 border-gray-200 text-gray-700 hover:border-violet-300 cursor-pointer'
                    if (contextAnswer) {
                      if (choice.correct) cls = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-800'
                      else if (choice === contextAnswer) cls = 'bg-rose-50 border-2 border-rose-400 text-rose-700'
                      else cls = 'bg-white border-2 border-gray-100 text-gray-300'
                    }
                    return (
                      <button key={i} onClick={() => pickContextAnswer(choice)} disabled={!!contextAnswer}
                        className={`w-full text-left rounded-2xl px-4 py-3 text-sm font-semibold transition-all flex items-center gap-3 ${cls}`}>
                        <span className="font-black text-xs w-5 shrink-0">{String.fromCharCode(65+i)}.</span>
                        <span className="flex-1">{choice.word}</span>
                        {contextAnswer && choice.correct && <span className="shrink-0 text-emerald-500 font-bold">✓</span>}
                        {contextAnswer && choice === contextAnswer && !choice.correct && <span className="shrink-0 text-rose-400 font-bold">✗</span>}
                      </button>
                    )
                  })}
                </div>
                {contextAnswer && (
                  <div className={`rounded-2xl p-4 mb-4 ${contextAnswer.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                    <p className={`text-xs font-bold ${contextAnswer.correct ? 'text-emerald-700' : 'text-rose-600'} mb-1`}>
                      {contextAnswer.correct ? '✓ Correct! +5 XP' : `✗ The word was "${card.word}"`}
                    </p>
                    {!contextAnswer.correct && <p className="text-sm text-gray-600">{card.def}</p>}
                  </div>
                )}
                {contextAnswer && idx + 1 < deck.length && (
                  <button onClick={() => { setContextAnswer(null); setContextChoices(null) }}
                    className="w-full py-3 bg-violet-600 text-white font-bold rounded-2xl hover:bg-violet-700 transition-colors">
                    Next word →
                  </button>
                )}
              </div>
            ) : studyMode === 'quiz' && currentQuizChoices ? (
              /* Quiz Mode */
              <div>
                <div className="bg-white rounded-3xl border-2 border-violet-100 shadow-lg p-7 mb-5 text-center">
                  <p className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3">What does this word mean?</p>
                  <p className="text-4xl font-black text-gray-900 mb-1">{card.word}</p>
                  {card.partOfSpeech && <p className="text-xs text-gray-400 italic">{card.partOfSpeech}</p>}
                </div>
                <div className="space-y-2.5 mb-4">
                  {currentQuizChoices.map((choice, i) => {
                    let cls = 'bg-white border-2 border-gray-200 text-gray-700 hover:border-violet-300 cursor-pointer'
                    if (quizAnswer) {
                      if (choice.correct) cls = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-800'
                      else if (choice === quizAnswer) cls = 'bg-rose-50 border-2 border-rose-400 text-rose-700'
                      else cls = 'bg-white border-2 border-gray-100 text-gray-300'
                    }
                    return (
                      <button key={i} onClick={() => pickQuizAnswer(choice)} disabled={!!quizAnswer}
                        className={`w-full text-left rounded-2xl px-4 py-3.5 text-sm font-medium transition-all flex items-start gap-3 ${cls}`}>
                        <span className="font-black text-xs w-5 shrink-0 mt-0.5">{String.fromCharCode(65+i)}.</span>
                        <span className="flex-1 leading-snug">{choice.def}</span>
                        {quizAnswer && choice.correct && <span className="shrink-0 text-emerald-500 font-bold">✓</span>}
                        {quizAnswer && choice === quizAnswer && !choice.correct && <span className="shrink-0 text-rose-400 font-bold">✗</span>}
                      </button>
                    )
                  })}
                </div>
                {quizAnswer && (
                  <div className={`rounded-2xl p-4 mb-4 ${quizAnswer.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                    <p className={`text-xs font-bold ${quizAnswer.correct ? 'text-emerald-700' : 'text-rose-600'} mb-1`}>
                      {quizAnswer.correct ? '✓ Correct! +5 XP' : '✗ Incorrect'}
                    </p>
                    <p className="text-sm text-gray-700 leading-snug"><span className="font-bold">{card.word}</span>: {card.def}</p>
                    {card.example && <p className="text-xs text-gray-500 italic mt-1">"{card.example}"</p>}
                  </div>
                )}
                {quizAnswer && idx + 1 < deck.length && (
                  <button onClick={() => { setQuizAnswer(null); setQuizChoices(null) }}
                    className="w-full py-3 bg-violet-600 text-white font-bold rounded-2xl hover:bg-violet-700 transition-colors">
                    Next word →
                  </button>
                )}
              </div>
            ) : (
              /* Flashcard Mode */
              <>
                <button onClick={() => setFlipped(f => !f)} className="w-full text-left">
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
                {flipped ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => rate(false)} className="py-4 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-colors">✗ Missed it</button>
                    <button onClick={() => rate(true)} className="py-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-colors">✓ Got it!</button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center">Tap the card to reveal definition, then rate yourself</p>
                )}
                {progress[card.word] && (
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <span className="text-xs text-gray-400">Streak: {progress[card.word].streak}/3</span>
                    {progress[card.word].mastered && <span className="text-xs text-emerald-600 font-semibold">✓ Mastered</span>}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
