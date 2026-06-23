import { useState, useEffect, useRef, useMemo } from 'react'
import QuestionCard from './components/QuestionCard'
import { useTimer } from './hooks/useTimer'
import { formatTime, scoreQuestions, shuffle } from './utils/index'

// Build mod2 question list. Falls back to full pool if unused questions are scarce.
function buildMod2(pool, usedIds, gotHardMod2, count) {
  const unused = pool.filter(q => !usedIds.has(q.id))
  const source = unused.length > 0 ? unused : pool
  const filtered = gotHardMod2
    ? source.filter(q => q.difficulty >= 2)
    : source.filter(q => q.difficulty <= 2)
  return shuffle(filtered.length >= Math.min(3, count) ? filtered : source).slice(0, count)
}

export default function QuizSession({ config, onComplete }) {
  const { format, formatLabel, sessionName, phases } = config

  const [phaseIdx, setPhaseIdx] = useState(0)
  // 'mod1' | 'interstitial' | 'mod2' | 'phase-transition'
  const [subPhase, setSubPhase] = useState('mod1')
  const [activeQs, setActiveQs] = useState(phases[0].mod1Questions)
  const [mod2Info, setMod2Info] = useState(null)     // set after adaptive mod1
  const [transitionInfo, setTransitionInfo] = useState(null) // set for subject transition

  const [allAnswers, setAllAnswers] = useState({})
  const answersRef = useRef({})
  answersRef.current = allAnswers

  const [donePhases, setDonePhases] = useState([])
  const donePhasesRef = useRef([])

  const [index, setIndex] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [timerHidden, setTimerHidden] = useState(false)
  const autoRevealedRef = useRef(false)

  const [moduleTimeSec, setModuleTimeSec] = useState(phases[0].mod1TimeSec)
  const isTimed = moduleTimeSec > 0
  const elapsedAccum = useRef(0)

  const timer = useTimer({
    countDown: isTimed,
    limitSeconds: moduleTimeSec,
    onExpire: () => handleModuleExpire(answersRef.current),
  })

  useEffect(() => { timer.start() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-reveal timer when under 5 minutes remain (fires once per module)
  useEffect(() => {
    if (isTimed && timer.seconds > 0 && timer.seconds < 300 && !autoRevealedRef.current) {
      autoRevealedRef.current = true
      setTimerHidden(false)
    }
  }, [timer.seconds, isTimed])

  const currentPhase = phases[phaseIdx]
  const totalInModule = activeQs.length
  const isLastPhase = phaseIdx === phases.length - 1
  const isLastModule = isLastPhase && (currentPhase.adaptive == null || subPhase === 'mod2')
  const unanswered = activeQs.filter(q => allAnswers[q.id] === undefined).length
  const timerDanger = isTimed && timer.seconds < 120

  const moduleLabel = useMemo(() => {
    const isMulti = phases.length > 1 || currentPhase.adaptive
    if (subPhase === 'mod2') return `${currentPhase.label} — Module 2`
    if (isMulti) return `${currentPhase.label} — Module 1`
    return currentPhase.label
  }, [currentPhase, subPhase, phases.length])

  function handleSelect(optId) {
    setAllAnswers(prev => ({ ...prev, [activeQs[index].id]: optId }))
  }

  function navigate(dir) {
    setIndex(i => Math.max(0, Math.min(totalInModule - 1, i + dir)))
  }

  function handleModuleExpire(currentAnswers) {
    completeCurrentModule(currentAnswers)
  }

  function completeCurrentModule(currentAnswers = allAnswers) {
    timer.pause()
    elapsedAccum.current += timer.elapsed

    const phase = phases[phaseIdx]

    // Adaptive mod1 — score and show interstitial
    if (phase.adaptive && subPhase === 'mod1') {
      const mod1Score = scoreQuestions(activeQs, currentAnswers)
      const gotHardMod2 = (mod1Score.correct / activeQs.length) >= phase.adaptive.thresholdRatio
      const usedIds = new Set(activeQs.map(q => q.id))
      const mod2Questions = buildMod2(phase.adaptive.pool, usedIds, gotHardMod2, phase.adaptive.count)
      setMod2Info({ questions: mod2Questions, gotHardMod2, mod1Score })
      setSubPhase('interstitial')
      return
    }

    // Module complete — build phase record
    const phaseQuestions = phase.adaptive
      ? [...phase.mod1Questions, ...(mod2Info?.questions ?? [])]
      : activeQs

    const phaseRecord = {
      subject: phase.subject,
      label: phase.label,
      questions: phaseQuestions,
      gotHardMod2: mod2Info?.gotHardMod2 ?? null,
    }

    const newDonePhases = [...donePhasesRef.current, phaseRecord]
    setDonePhases(newDonePhases)
    donePhasesRef.current = newDonePhases

    if (!isLastPhase) {
      setTransitionInfo({ completedLabel: phase.label, nextPhase: phases[phaseIdx + 1] })
      setSubPhase('phase-transition')
    } else {
      const allQuestions = newDonePhases.flatMap(p => p.questions)
      onComplete({
        id: Date.now().toString(),
        completedAt: new Date().toISOString(),
        mode: 'quiz',
        format,
        formatLabel,
        sessionName: sessionName ?? null,
        elapsedSeconds: elapsedAccum.current,
        questions: allQuestions,
        answers: currentAnswers,
        score: scoreQuestions(allQuestions, currentAnswers),
        phaseData: newDonePhases,
      })
    }
  }

  function startMod2() {
    autoRevealedRef.current = false
    setTimerHidden(false)
    setActiveQs(mod2Info.questions)
    setIndex(0)
    setSubPhase('mod2')
    setModuleTimeSec(currentPhase.adaptive.timeSec)
    timer.reset()
    timer.start()
  }

  function startNextPhase() {
    autoRevealedRef.current = false
    setTimerHidden(false)
    const next = phases[phaseIdx + 1]
    setPhaseIdx(phaseIdx + 1)
    setActiveQs(next.mod1Questions)
    setIndex(0)
    setMod2Info(null)
    setTransitionInfo(null)
    setSubPhase('mod1')
    setModuleTimeSec(next.mod1TimeSec)
    timer.reset()
    timer.start()
  }

  function handleFinishClick() {
    setShowConfirm(true)
  }

  // ─── Adaptive interstitial ─────────────────────────────────────────────────
  if (subPhase === 'interstitial' && mod2Info) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentPhase.label} — Module 1 Complete</h2>
          <p className="text-gray-500 mb-6">Take a short break if needed. When you're ready, continue to Module 2.</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-500">
            <p>{mod2Info.questions.length} questions · {formatTime(currentPhase.adaptive.timeSec)}</p>
          </div>
          <button onClick={startMod2} className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">
            Start Module 2 →
          </button>
        </div>
      </div>
    )
  }

  // ─── Subject transition ────────────────────────────────────────────────────
  if (subPhase === 'phase-transition' && transitionInfo) {
    const { completedLabel, nextPhase } = transitionInfo
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-8 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{completedLabel} Complete!</h2>
          <p className="text-gray-500 mb-8">Up next: <span className="font-semibold text-gray-700">{nextPhase.label}</span></p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-500">
            <p>{nextPhase.mod1Questions.length} questions · {formatTime(nextPhase.mod1TimeSec)}</p>
            {nextPhase.adaptive && (
              <p className="text-xs mt-1 text-gray-400">Adaptive — Module 2 assigned based on your performance</p>
            )}
          </div>
          <button onClick={startNextPhase} className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">
            Start {nextPhase.label} →
          </button>
        </div>
      </div>
    )
  }

  if (!activeQs[index]) return null
  const isLastQuestion = index === totalInModule - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">{moduleLabel}</span>
            <span className="text-sm text-gray-500">Q {index + 1}/{totalInModule}</span>
          </div>
          <div className="flex items-center gap-3">
            {isTimed ? (
              timerHidden ? (
                <button
                  onClick={() => setTimerHidden(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1 transition-colors"
                >
                  ⏱ Show timer
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-mono font-semibold tabular-nums ${timerDanger ? 'text-rose-600 animate-pulse' : 'text-gray-600'}`}>
                    ⏱ {formatTime(timer.seconds)}
                  </span>
                  <button
                    onClick={() => setTimerHidden(true)}
                    className="text-xs text-gray-300 hover:text-gray-500 transition-colors leading-none"
                    title="Hide timer"
                  >
                    hide
                  </button>
                </div>
              )
            ) : (
              <span className="text-sm font-mono text-gray-400">{formatTime(timer.seconds)}</span>
            )}
            <button
              onClick={handleFinishClick}
              className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5 transition-colors"
            >
              {isLastModule ? 'Submit' : 'Finish Module'}
            </button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-2">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${((index + 1) / totalInModule) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-1.5 mb-5">
          {activeQs.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setIndex(i)}
              className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${
                i === index ? 'bg-indigo-600 text-white'
                : allAnswers[q.id] !== undefined ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <QuestionCard
          question={activeQs[index]}
          selectedAnswer={allAnswers[activeQs[index].id]}
          onSelect={handleSelect}
          showFeedback={false}
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate(-1)}
            disabled={index === 0}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          {isLastQuestion ? (
            <button
              onClick={handleFinishClick}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition-colors"
            >
              {isLastModule ? 'Submit Quiz' : 'Finish Module →'}
            </button>
          ) : (
            <button
              onClick={() => navigate(1)}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Next →
            </button>
          )}
        </div>
      </div>

      {/* Submit confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="text-2xl mb-3">⚠️</div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">
              {isLastModule ? 'Ready to submit?' : 'Submit this module?'}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {isLastModule
                ? 'You won\'t be able to change your answers after submitting.'
                : 'You won\'t be able to return to this module once you move on.'}
            </p>
            <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-2">
              {isTimed && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Time remaining</span>
                  <span className={`font-mono font-semibold ${timerDanger ? 'text-rose-600' : 'text-gray-700'}`}>{formatTime(timer.seconds)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Answered</span>
                <span className="font-semibold text-gray-700">{totalInModule - unanswered} / {totalInModule}</span>
              </div>
              {unanswered > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-rose-500">Unanswered</span>
                  <span className="font-semibold text-rose-600">{unanswered} (will be marked wrong)</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ← Keep reviewing
              </button>
              <button
                onClick={() => { setShowConfirm(false); completeCurrentModule() }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition-colors"
              >
                {isLastModule ? 'Submit Quiz' : 'Submit Module'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
