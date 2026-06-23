import { useState, useEffect, useRef } from 'react'
import QuestionCard from './components/QuestionCard'
import { useTimer } from './hooks/useTimer'
import { formatTime, scoreQuestions } from './utils/index'

export default function LearningSession({ config, onComplete, onQuit }) {
  const { questions } = config
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState(false)
  const [flagged, setFlagged] = useState(() => new Set())
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [timerHidden, setTimerHidden] = useState(false)
  const timer = useTimer()

  function toggleFlag(id) {
    setFlagged(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  useEffect(() => { timer.start() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const current = questions[index]
  const selected = answers[current?.id]
  const answeredCount = questions.filter(q => answers[q.id] !== undefined).length
  const correctCount = questions.filter(q => answers[q.id] === q.answer).length
  const isLast = index === questions.length - 1

  function handleSelect(optId) {
    if (revealed) return
    setAnswers(prev => ({ ...prev, [current.id]: optId }))
    setRevealed(true)
  }

  function handleNext() {
    if (isLast) finish()
    else { setIndex(i => i + 1); setRevealed(false) }
  }

  function finish() {
    timer.pause()
    const answered = questions.filter(q => answers[q.id] !== undefined)
    onComplete({
      id: Date.now().toString(),
      completedAt: new Date().toISOString(),
      mode: 'learning',
      format: 'custom',
      formatLabel: config.formatLabel ?? 'Learning Mode',
      sessionName: config.sessionName ?? null,
      elapsedSeconds: timer.elapsed,
      questions: answered,
      answers,
      score: scoreQuestions(answered, answers),
      flaggedIds: [...flagged],
    })
  }

  // Keep refs current so the keyboard handler never goes stale
  const revealedRef = useRef(revealed)
  revealedRef.current = revealed
  const showQuitConfirmRef = useRef(showQuitConfirm)
  showQuitConfirmRef.current = showQuitConfirm
  const currentRef = useRef(current)
  currentRef.current = current
  const isLastRef = useRef(isLast)
  isLastRef.current = isLast
  const finishRef = useRef(finish)
  finishRef.current = finish

  // Keyboard shortcuts: A/B/C/D to select answer, Enter to advance
  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (showQuitConfirmRef.current) return
      const key = e.key.toUpperCase()
      if (!revealedRef.current && ['A', 'B', 'C', 'D'].includes(key)) {
        const q = currentRef.current
        if (q) {
          setAnswers(prev => ({ ...prev, [q.id]: key }))
          setRevealed(true)
        }
      } else if (revealedRef.current && e.key === 'Enter') {
        if (isLastRef.current) finishRef.current()
        else { setIndex(i => i + 1); setRevealed(false) }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null

  const progress = (index / questions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQuitConfirm(true)}
              className="text-gray-300 hover:text-gray-500 text-lg leading-none transition-colors"
              title="Quit session"
            >
              ✕
            </button>
            <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">Learning</span>
            <span className="text-sm text-gray-600">
              <span className="text-emerald-600 font-bold">{correctCount}</span>
              <span className="text-gray-400"> / {answeredCount} correct</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {timerHidden ? (
              <button
                onClick={() => setTimerHidden(false)}
                className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1 transition-colors"
              >
                ⏱ Show timer
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-mono text-gray-500">⏱ {formatTime(timer.seconds)}</span>
                <button
                  onClick={() => setTimerHidden(true)}
                  className="text-xs text-gray-300 hover:text-gray-500 transition-colors leading-none"
                  title="Hide timer"
                >
                  hide
                </button>
              </div>
            )}
            <button
              onClick={finish}
              className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              End Session
            </button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-2">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-xs text-gray-400 mb-5">Question {index + 1} of {questions.length}</p>

        {!revealed && (
          <p className="text-xs text-gray-300 mb-3 hidden sm:block">⌨ Press A–D to answer · Enter to continue</p>
        )}

        <QuestionCard
          question={current}
          selectedAnswer={selected}
          onSelect={handleSelect}
          showFeedback={revealed}
        />

        {/* Feedback */}
        {revealed && (
          <div className={`mt-5 rounded-xl p-4 ${selected === current.answer ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
            <p className={`font-semibold text-sm mb-1 ${selected === current.answer ? 'text-emerald-700' : 'text-rose-600'}`}>
              {selected === current.answer ? '✓ Correct!' : `✗ Incorrect — correct answer: ${current.answer}`}
            </p>
            {current.explanation && (
              <p className="text-sm text-gray-600 leading-relaxed">{current.explanation}</p>
            )}
          </div>
        )}

        {revealed && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => toggleFlag(current.id)}
              className={`flex items-center gap-1.5 text-xs transition-colors px-2 py-1 rounded-lg shrink-0 ${
                flagged.has(current.id)
                  ? 'text-amber-500 bg-amber-50'
                  : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50'
              }`}
              title={flagged.has(current.id) ? 'Remove flag' : 'Flag for review'}
            >
              🚩 {flagged.has(current.id) ? 'Flagged' : 'Flag'}
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
            >
              {isLast ? 'Finish Session' : 'Next Question →'}
            </button>
          </div>
        )}
      </div>

      {/* Quit confirm modal */}
      {showQuitConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="text-2xl mb-3">🚪</div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">Quit session?</h3>
            <p className="text-gray-500 text-sm mb-6">Your progress won't be saved and you'll return to the home screen.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Keep going
              </button>
              <button
                onClick={onQuit}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-sm font-semibold text-white transition-colors"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
