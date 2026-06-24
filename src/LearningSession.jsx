import { useState, useEffect, useRef } from 'react'
import QuestionCard from './components/QuestionCard'
import { useTimer } from './hooks/useTimer'
import { formatTime, scoreQuestions } from './utils/index'

function BlitzCircle({ seconds }) {
  const max = 60, r = 18, circ = 2 * Math.PI * r
  const danger = seconds <= 10
  const stroke = danger ? '#ef4444' : seconds <= 20 ? '#f97316' : '#f59e0b'
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={stroke} strokeWidth="4"
          strokeDasharray={`${(seconds / max) * circ} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.5s' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-black ${danger ? 'text-rose-500 animate-pulse' : 'text-orange-500'}`}>{seconds}</span>
      </div>
    </div>
  )
}

export default function LearningSession({ config, onComplete, onQuit }) {
  const { questions } = config
  const isBeastMode = config.formatLabel === 'Beast Mode'
  const isBlitzMode = config.formatLabel === 'Blitz Mode'
  const hasMathQuestions = questions.some(q => q.subject === 'math')

  const [blitzSeconds, setBlitzSeconds] = useState(60)
  const blitzFinishedRef = useRef(false)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState(false)
  const [flagged, setFlagged] = useState(() => new Set())
  const [showQuitConfirm, setShowQuitConfirm] = useState(false)
  const [timerHidden, setTimerHidden] = useState(false)
  const [sessionXP, setSessionXP] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [xpFlash, setXpFlash] = useState(null)
  const [milestone, setMilestone] = useState(null)
  const [showFormulas, setShowFormulas] = useState(false)
  const [formulaTab, setFormulaTab] = useState('math')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [eliminated, setEliminated] = useState({}) // questionId → eliminated option id
  const questionStartRef = useRef(Date.now())
  const maxComboRef = useRef(0)
  const timer = useTimer()

  function useHint(q) {
    if (eliminated[q.id] || revealed) return
    const wrongOpts = (q.options ?? []).filter(o => o.id !== q.answer)
    if (wrongOpts.length === 0) return
    const victim = wrongOpts[Math.floor(Math.random() * wrongOpts.length)]
    setEliminated(prev => ({ ...prev, [q.id]: victim.id }))
    setSessionXP(prev => Math.max(0, prev - 10))
    setXpFlash({ amount: -10, correct: false, speed: false, id: Date.now() })
    setTimeout(() => setXpFlash(null), 900)
  }

  function toggleFlag(id) {
    setFlagged(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  useEffect(() => { timer.start() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-pause when tab is hidden (prevents timer drift and XP inflation)
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) timer.pause()
      else if (!revealed || !isLast) timer.start()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [timer, revealed, isLast]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts: 1–4 / A–D to answer, Space/Enter to advance
  useEffect(() => {
    function handleKey(e) {
      if (showFormulas || showQuitConfirm) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '?') { e.preventDefault(); setShowShortcuts(s => !s); return }
      if (showShortcuts) { setShowShortcuts(false); return }
      const key = e.key.toUpperCase()
      const optionMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', 'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D' }
      if (!revealed && optionMap[key]) {
        const opts = current?.options ?? []
        const target = opts.find(o => o.id === optionMap[key])
        if (target) { e.preventDefault(); handleSelect(target.id) }
      } else if (revealed && (e.key === ' ' || e.key === 'Enter') && !isBlitzMode) {
        e.preventDefault()
        handleNext()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [revealed, current, showFormulas, showQuitConfirm, showShortcuts, isBlitzMode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isBlitzMode) return
    const iv = setInterval(() => {
      setBlitzSeconds(s => {
        if (s <= 1) {
          clearInterval(iv)
          if (!blitzFinishedRef.current) { blitzFinishedRef.current = true; finishRef.current() }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [isBlitzMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = questions[index]
  const selected = answers[current?.id]
  const answeredCount = questions.filter(q => answers[q.id] !== undefined).length
  const correctCount = questions.filter(q => answers[q.id] === q.answer).length
  const hardQuestions = questions.filter(q => q.difficulty === 3)
  const hardCorrect = hardQuestions.filter(q => answers[q.id] === q.answer).length
  const isLast = index === questions.length - 1

  function handleSelect(optId) {
    if (revealed) return
    setAnswers(prev => ({ ...prev, [current.id]: optId }))
    setRevealed(true)
    const isCorrect = optId === current.answer
    const elapsedSec = (Date.now() - questionStartRef.current) / 1000
    const speedBonus = isCorrect && elapsedSec < 30 ? 5 : 0
    const xpGain = (isCorrect ? (10 + (current.difficulty === 3 ? 10 : 0)) : 5) + speedBonus
    setSessionXP(prev => prev + xpGain)
    const newCombo = isCorrect ? combo + 1 : 0
    setCombo(newCombo)
    if (newCombo > maxComboRef.current) {
      maxComboRef.current = newCombo
      setMaxCombo(newCombo)
    }
    if (isCorrect && (newCombo === 5 || newCombo === 10 || newCombo === 15 || (newCombo > 0 && newCombo % 20 === 0))) {
      const msgs = {
        5:  { icon: '🎯', text: '5-in-a-row!', sub: 'You\'re on fire' },
        10: { icon: '🔥', text: '10-in-a-row!', sub: 'Absolutely crushing it' },
        15: { icon: '⚡', text: '15-in-a-row!', sub: 'Unstoppable!' },
      }
      const msg = msgs[newCombo] ?? { icon: '🌟', text: `${newCombo}-in-a-row!`, sub: 'Legendary!' }
      setMilestone({ ...msg, id: Date.now() })
      setTimeout(() => setMilestone(null), 2000)
    }
    setXpFlash({ amount: xpGain, correct: isCorrect, speed: speedBonus > 0, id: Date.now() })
    setTimeout(() => setXpFlash(null), 900)

    if (isBlitzMode) {
      setTimeout(() => {
        if (blitzFinishedRef.current) return
        if (isLastRef.current) { blitzFinishedRef.current = true; finishRef.current() }
        else { setIndex(i => i + 1); setRevealed(false); questionStartRef.current = Date.now() }
      }, 650)
    }
  }

  function handleNext() {
    if (isLast) finish()
    else { setIndex(i => i + 1); setRevealed(false); questionStartRef.current = Date.now() }
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
      maxCombo: maxComboRef.current,
      xpMultiplier: config.xpMultiplier ?? 1.0,
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
    <div className={`min-h-screen ${isBeastMode ? 'bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900' : isBlitzMode ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100' : 'bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100'}`}>
      {/* Sticky header */}
      <div className={`sticky top-0 z-10 backdrop-blur-sm border-b ${isBeastMode ? 'bg-slate-900/90 border-rose-900' : isBlitzMode ? 'bg-white/90 border-orange-200' : 'bg-white/90 border-gray-200'}`}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQuitConfirm(true)}
              className="text-gray-300 hover:text-gray-500 text-lg leading-none transition-colors"
              title="Quit session"
            >
              ✕
            </button>
            {isBeastMode
              ? <span className="text-xs font-black bg-rose-500 text-white px-2.5 py-1 rounded-full animate-pulse">🔥 BEAST MODE</span>
              : isBlitzMode
              ? <span className="text-xs font-black bg-orange-500 text-white px-2.5 py-1 rounded-full">⚡ BLITZ</span>
              : <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">Learning</span>
            }
            <span className={`text-sm ${isBeastMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <span className="text-emerald-400 font-bold">{correctCount}</span>
              <span className={isBeastMode ? 'text-gray-500' : 'text-gray-400'}> / {answeredCount}</span>
              {answeredCount > 0 && (
                <span className={`ml-1 text-xs font-semibold ${correctCount / answeredCount >= 0.8 ? 'text-emerald-500' : correctCount / answeredCount >= 0.6 ? 'text-amber-500' : 'text-rose-400'}`}>
                  ({Math.round(correctCount / answeredCount * 100)}%)
                </span>
              )}
            </span>
            {/* Live XP + combo + hard */}
            <div className="flex items-center gap-1.5">
              {(() => {
                const day = new Date().getDay()
                const isWeekend = day === 0 || day === 6
                return (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isBeastMode ? 'bg-amber-500 text-white' : 'text-amber-600 bg-amber-50'}`}>
                    ⭐ {sessionXP}{isBeastMode ? ' (2×)' : isWeekend ? ' (1.5×)' : ''}
                  </span>
                )
              })()}
              {hardQuestions.length > 0 && hardCorrect > 0 && (
                <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                  🔥 {hardCorrect}/{hardQuestions.length}
                </span>
              )}
              {combo >= 3 && (
                <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full animate-pulse">
                  {combo}×
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isBlitzMode ? (
              <BlitzCircle seconds={blitzSeconds} />
            ) : timerHidden ? (
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
              onClick={() => setShowFormulas(true)}
              className="text-xs text-indigo-400 hover:text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1.5 transition-colors"
              title="SAT reference sheet"
            >
              📋
            </button>
            <button
              onClick={() => setShowShortcuts(s => !s)}
              className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 transition-colors font-mono"
              title="Keyboard shortcuts (?)"
            >
              ?
            </button>
            <button
              onClick={finish}
              disabled={answeredCount === 0}
              className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={answeredCount === 0 ? 'Answer at least one question first' : undefined}
            >
              Finish & Review
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
        <div className="flex items-center gap-3 mb-5">
          <p className="text-xs text-gray-400">Question {index + 1} of {questions.length}</p>
          {!revealed && !isBlitzMode && (
            <span className="text-xs text-gray-300">1–4 to answer · Enter to next</span>
          )}
        </div>

        {!revealed && (
          <p className="text-xs text-gray-300 mb-3 hidden sm:block">⌨ Press A–D to answer · Enter to continue</p>
        )}

        <QuestionCard
          question={current}
          selectedAnswer={selected}
          onSelect={handleSelect}
          showFeedback={revealed}
          eliminatedOption={eliminated[current?.id]}
        />

        {/* XP flash */}
        {xpFlash && (
          <div key={xpFlash.id} className="flex justify-end mb-2">
            <span className="text-sm font-black text-amber-500 animate-bounce">
              +{xpFlash.amount} XP{xpFlash.speed ? ' ⚡' : ''}
            </span>
          </div>
        )}

        {/* Feedback */}
        {revealed && !isBlitzMode && (
          <div className={`mt-5 rounded-xl p-4 ${selected === current.answer ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
            <p className={`font-semibold text-sm mb-1 ${selected === current.answer ? 'text-emerald-700' : 'text-rose-600'}`}>
              {selected === current.answer ? '✓ Correct!' : `✗ Incorrect — correct answer: ${current.answer}`}
            </p>
            {current.explanation && (
              <p className="text-sm text-gray-600 leading-relaxed">{current.explanation}</p>
            )}
          </div>
        )}
        {revealed && isBlitzMode && (
          <div className={`mt-3 rounded-xl p-3 text-center ${selected === current.answer ? 'bg-emerald-100' : 'bg-rose-100'}`}>
            <p className={`font-black text-lg ${selected === current.answer ? 'text-emerald-600' : 'text-rose-600'}`}>
              {selected === current.answer ? '✓' : `✗ ${current.answer}`}
            </p>
          </div>
        )}

        {!revealed && !isBlitzMode && (current?.options?.length > 1) && (
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => useHint(current)}
              disabled={!!eliminated[current.id]}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                eliminated[current.id]
                  ? 'text-gray-300 border-gray-100 cursor-not-allowed'
                  : 'text-indigo-400 border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              💡 {eliminated[current.id] ? 'Hint used (−10 XP)' : 'Hint (−10 XP)'}
            </button>
          </div>
        )}

        {revealed && !isBlitzMode && (
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

      {/* Combo milestone toast */}
      {milestone && (
        <div key={milestone.id} className="fixed top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-gray-900 text-white rounded-2xl px-6 py-4 text-center shadow-2xl animate-bounce">
            <div className="text-3xl mb-1">{milestone.icon}</div>
            <p className="font-black text-lg leading-tight">{milestone.text}</p>
            <p className="text-xs text-gray-300 mt-0.5">{milestone.sub}</p>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-2.5">
              {[
                { keys: '1 2 3 4', desc: 'Select answer A B C D' },
                { keys: 'A B C D', desc: 'Select answer A B C D' },
                { keys: 'Space / Enter', desc: 'Next question (after reveal)' },
                { keys: 'F', desc: 'Flag question for review' },
                { keys: 'H', desc: 'Use hint (−10 XP)' },
                { keys: '?', desc: 'Toggle this shortcuts panel' },
              ].map(s => (
                <div key={s.keys} className="flex items-center justify-between gap-4">
                  <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono shrink-0">{s.keys}</code>
                  <span className="text-xs text-gray-500">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SAT reference sheet */}
      {showFormulas && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pb-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-bold text-gray-900">📋 SAT Quick Reference</h3>
              <button onClick={() => setShowFormulas(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="flex gap-1 px-5 pt-3 pb-0">
              {['math', 'english'].map(t => (
                <button key={t} onClick={() => setFormulaTab(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${formulaTab === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {t === 'math' ? '📐 Math' : '📖 English'}
                </button>
              ))}
            </div>
            <div className="p-5 space-y-4 text-sm overflow-y-auto">
              {formulaTab === 'math' && [
                { section: 'Algebra', items: [
                  ['Slope', 'm = (y₂−y₁)/(x₂−x₁)'],
                  ['Slope-intercept', 'y = mx + b'],
                  ['Quadratic formula', 'x = [−b ± √(b²−4ac)] / 2a'],
                  ['Percent change', '(new − old) / old × 100'],
                  ['Simple interest', 'I = Prt'],
                ]},
                { section: 'Geometry', items: [
                  ['Pythagorean', 'a² + b² = c²'],
                  ['Circle area', 'A = πr²'],
                  ['Circle circumference', 'C = 2πr'],
                  ['Triangle area', 'A = ½bh'],
                  ['Rectangle area', 'A = lw'],
                  ['Volume of cylinder', 'V = πr²h'],
                ]},
                { section: 'Statistics', items: [
                  ['Mean', 'sum ÷ count'],
                  ['Median', 'middle value when sorted'],
                  ['Rate', 'd = r × t'],
                ]},
                { section: 'Special triangles', items: [
                  ['30-60-90', 'sides: 1 : √3 : 2'],
                  ['45-45-90', 'sides: 1 : 1 : √2'],
                ]},
              ].map(({ section, items }) => (
                <div key={section}>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{section}</p>
                  <div className="space-y-1">
                    {items.map(([label, formula]) => (
                      <div key={label} className="flex items-baseline justify-between gap-3 py-1 border-b border-gray-50">
                        <span className="text-gray-600">{label}</span>
                        <span className="font-mono text-indigo-700 text-xs shrink-0">{formula}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {formulaTab === 'english' && [
                { section: 'Reading Strategy', items: [
                  ['Main idea', 'Read 1st & last sentence of each paragraph first'],
                  ['Tone', 'Look for emotion words; narrow to positive/negative'],
                  ['Evidence', 'Find the line numbers; read 2 lines above & below'],
                  ['Vocabulary', 'Use context — surrounding sentences define the word'],
                  ['Wrong answer tells', 'Too extreme, too narrow, out of scope, opposite'],
                ]},
                { section: 'Writing Strategy', items: [
                  ['Subject-verb', 'Find the true subject (not a prepositional phrase)'],
                  ['Pronoun', 'Pronoun must agree in number and gender with antecedent'],
                  ['Modifier', 'Modifier must be next to the word it modifies'],
                  ['Parallelism', 'Items in a list must have the same grammatical form'],
                  ['Punctuation', 'FANBOYS join clauses with comma; semicolon = period'],
                  ['Conciseness', 'Choose the shortest answer that is grammatically correct'],
                ]},
                { section: 'Common Traps', items: [
                  ['Inference', 'Must be directly supported — never assume beyond the text'],
                  ['Chronology', 'The passage may not be in chronological order'],
                  ['Graph questions', 'Read the title, axes, legend before choosing an answer'],
                ]},
              ].map(({ section, items }) => (
                <div key={section}>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{section}</p>
                  <div className="space-y-1">
                    {items.map(([label, tip]) => (
                      <div key={label} className="py-1.5 border-b border-gray-50">
                        <p className="text-xs font-semibold text-gray-700">{label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
