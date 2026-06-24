import { useState, useEffect, useRef } from 'react'

const TECHNIQUES = [
  {
    id: '478',
    name: '4-7-8 Breathing',
    desc: 'Calms the nervous system. Great before a test.',
    phases: [
      { label: 'Inhale', seconds: 4, scale: 1 },
      { label: 'Hold', seconds: 7, scale: 1 },
      { label: 'Exhale', seconds: 8, scale: 0 },
    ],
    rounds: 4,
    color: 'from-indigo-500 to-violet-600',
  },
  {
    id: 'box',
    name: 'Box Breathing',
    desc: 'Used by Navy SEALs. Regulates focus and calm.',
    phases: [
      { label: 'Inhale', seconds: 4, scale: 1 },
      { label: 'Hold', seconds: 4, scale: 1 },
      { label: 'Exhale', seconds: 4, scale: 0 },
      { label: 'Hold', seconds: 4, scale: 0 },
    ],
    rounds: 4,
    color: 'from-teal-500 to-emerald-600',
  },
  {
    id: 'quick',
    name: 'Quick Reset',
    desc: 'A fast 3-breath reset between questions.',
    phases: [
      { label: 'Inhale', seconds: 3, scale: 1 },
      { label: 'Hold', seconds: 1, scale: 1 },
      { label: 'Exhale', seconds: 5, scale: 0 },
    ],
    rounds: 3,
    color: 'from-amber-500 to-orange-500',
  },
]

export default function BreathingExercise({ onBack }) {
  const [selected, setSelected] = useState(null)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [round, setRound] = useState(1)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [phaseProgress, setPhaseProgress] = useState(0)
  const intervalRef = useRef(null)

  const technique = TECHNIQUES.find(t => t.id === selected)

  function startExercise(id) {
    setSelected(id)
    setRunning(true)
    setDone(false)
    setRound(1)
    setPhaseIdx(0)
    setPhaseProgress(0)
  }

  function stopExercise() {
    clearInterval(intervalRef.current)
    setRunning(false)
    setSelected(null)
    setDone(false)
  }

  useEffect(() => {
    if (!running || !technique) return
    const phases = technique.phases

    let currentPhase = phaseIdx
    let progress = phaseProgress
    let currentRound = round

    intervalRef.current = setInterval(() => {
      progress += 0.1
      const phaseDuration = phases[currentPhase].seconds
      if (progress >= phaseDuration) {
        progress = 0
        currentPhase++
        if (currentPhase >= phases.length) {
          currentPhase = 0
          currentRound++
          if (currentRound > technique.rounds) {
            clearInterval(intervalRef.current)
            setRunning(false)
            setDone(true)
            return
          }
          setRound(currentRound)
        }
        setPhaseIdx(currentPhase)
      }
      setPhaseProgress(progress)
    }, 100)

    return () => clearInterval(intervalRef.current)
  }, [running]) // eslint-disable-line react-hooks/exhaustive-deps

  if (done && technique) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${technique.color} flex flex-col items-center justify-center px-6 text-white`}>
        <span className="text-6xl mb-5">✨</span>
        <p className="text-2xl font-black mb-2 text-center">Well done!</p>
        <p className="text-white/70 text-center mb-8 leading-relaxed">
          {technique.rounds} rounds of {technique.name} complete.<br />
          You're calm, focused, and ready.
        </p>
        <div className="space-y-3 w-full max-w-xs">
          <button
            onClick={onBack}
            className="w-full py-3.5 rounded-2xl bg-white text-indigo-700 font-black text-sm transition-colors hover:bg-white/90"
          >
            Start studying →
          </button>
          <button
            onClick={() => startExercise(selected)}
            className="w-full py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-semibold text-sm transition-colors"
          >
            Go again
          </button>
        </div>
      </div>
    )
  }

  if (running && technique) {
    const phases = technique.phases
    const phase = phases[phaseIdx]
    const totalDur = phase.seconds
    const rawScale = phase.scale
    const progress = phaseProgress / totalDur

    const prevPhase = phaseIdx > 0 ? phases[phaseIdx - 1] : phases[phases.length - 1]
    const fromScale = prevPhase.scale
    const circleScale = fromScale + (rawScale - fromScale) * progress

    const circleSize = 120 + circleSize * 0 + 120 * circleScale

    return (
      <div className={`min-h-screen bg-gradient-to-br ${technique.color} flex flex-col items-center justify-center px-6 text-white`}>
        <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">{technique.name}</p>
        <p className="text-white/50 text-xs mb-10">Round {round} of {technique.rounds}</p>

        <div className="relative flex items-center justify-center mb-10">
          <div
            className="rounded-full bg-white/20 transition-all"
            style={{
              width: `${120 + 100 * circleScale}px`,
              height: `${120 + 100 * circleScale}px`,
              transitionDuration: '100ms',
              transitionTimingFunction: 'linear',
            }}
          />
          <div className="absolute rounded-full bg-white/30"
            style={{ width: `${80 + 60 * circleScale}px`, height: `${80 + 60 * circleScale}px`, transitionDuration: '100ms', transitionTimingFunction: 'linear' }}
          />
          <p className="absolute text-center">
            <span className="block text-lg font-black">{phase.label}</span>
            <span className="block text-4xl font-black tabular-nums">{Math.ceil(totalDur - phaseProgress)}</span>
          </p>
        </div>

        <div className="flex gap-2 mb-10">
          {phases.map((p, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === phaseIdx ? 'w-10 bg-white' : 'w-4 bg-white/30'}`} />
          ))}
        </div>

        <button
          onClick={stopExercise}
          className="text-white/50 hover:text-white text-sm transition-colors"
        >
          Stop
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition-colors shrink-0">← Back</button>
          <div>
            <h1 className="text-lg font-black text-gray-900">Breathing Exercise</h1>
            <p className="text-xs text-gray-400">Calm your nerves before studying or a test</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-2xl p-5 mb-6">
          <p className="text-sm font-bold mb-1">Test anxiety is normal</p>
          <p className="text-xs text-white/80 leading-relaxed">Even 2–3 minutes of breathing can reduce cortisol, lower heart rate, and help you think more clearly. Elite athletes use this before competition — you should too.</p>
        </div>

        <div className="space-y-3">
          {TECHNIQUES.map(t => (
            <button
              key={t.id}
              onClick={() => startExercise(t.id)}
              className="w-full text-left bg-white border-2 border-gray-100 hover:border-indigo-200 rounded-2xl p-5 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-black text-gray-900 group-hover:text-indigo-700 transition-colors">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 mb-3">{t.desc}</p>
                  <div className="flex gap-2 flex-wrap">
                    {t.phases.map((p, i) => (
                      <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {p.label} {p.seconds}s
                      </span>
                    ))}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                      ×{t.rounds} rounds
                    </span>
                  </div>
                </div>
                <span className="text-2xl shrink-0 mt-1">▶</span>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">Takes 1–4 minutes · no equipment needed</p>
      </div>
    </div>
  )
}
