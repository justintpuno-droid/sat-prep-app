import { useState, useMemo } from 'react'
import allQuestions from './data/questions'
import { MATH_DOMAIN_IDS, ENG_DOMAIN_IDS } from './data/taxonomy'
import { shuffle } from './utils/index'

// English: ≥18/27 → hard mod2.  Math: ≥15/22 → hard mod2.
const ENG_THRESHOLD = 18 / 27
const MATH_THRESHOLD = 15 / 22

// Each phase descriptor: { subject, label, mod1Count, mod1TimeSec, adaptive: {count, timeSec, thresholdRatio} | null }
const MOCK_PRESETS = [
  {
    id: 'full-practice',
    label: 'Full Practice Test',
    detail: '4 modules · 98 questions · ~2 hr 14 min',
    phases: [
      { subject: 'english', label: 'Reading & Writing', mod1Count: 27, mod1TimeSec: 1920, adaptive: { count: 27, timeSec: 1920, thresholdRatio: ENG_THRESHOLD } },
      { subject: 'math',    label: 'Math',              mod1Count: 22, mod1TimeSec: 2100, adaptive: { count: 22, timeSec: 2100, thresholdRatio: MATH_THRESHOLD } },
    ],
  },
  {
    id: 'full-english',
    label: 'Full English',
    detail: '2 modules · 54 questions · ~1 hr 4 min',
    phases: [
      { subject: 'english', label: 'Reading & Writing', mod1Count: 27, mod1TimeSec: 1920, adaptive: { count: 27, timeSec: 1920, thresholdRatio: ENG_THRESHOLD } },
    ],
  },
  {
    id: 'full-math',
    label: 'Full Math',
    detail: '2 modules · 44 questions · ~1 hr 10 min',
    phases: [
      { subject: 'math', label: 'Math', mod1Count: 22, mod1TimeSec: 2100, adaptive: { count: 22, timeSec: 2100, thresholdRatio: MATH_THRESHOLD } },
    ],
  },
  {
    id: 'mod1-english',
    label: 'Module 1 Only — English',
    detail: '27 questions · 32 min',
    phases: [
      { subject: 'english', label: 'R&W Module 1', mod1Count: 27, mod1TimeSec: 1920, adaptive: null },
    ],
  },
  {
    id: 'mod1-math',
    label: 'Module 1 Only — Math',
    detail: '22 questions · 35 min',
    phases: [
      { subject: 'math', label: 'Math Module 1', mod1Count: 22, mod1TimeSec: 2100, adaptive: null },
    ],
  },
  {
    id: 'both-mod1',
    label: 'Both Module 1s',
    detail: '2 modules · 49 questions · ~1 hr 7 min',
    phases: [
      { subject: 'english', label: 'R&W Module 1',   mod1Count: 27, mod1TimeSec: 1920, adaptive: null },
      { subject: 'math',    label: 'Math Module 1',  mod1Count: 22, mod1TimeSec: 2100, adaptive: null },
    ],
  },
]

export default function SessionConfig({ filters, onStart, onBack }) {
  const [mode, setMode] = useState(null)
  const [sessionName, setSessionName] = useState('')
  const [learningCount, setLearningCount] = useState(10)
  const [format, setFormat] = useState('custom')
  const [customCount, setCustomCount] = useState(10)
  const [timerType, setTimerType] = useState('untimed')
  const [timerMinutes, setTimerMinutes] = useState(30)

  // Combined pool (for learning mode and custom quiz) — respects domain + difficulty filter
  const pool = useMemo(
    () => allQuestions.filter(q => filters.domains.includes(q.domain) && filters.difficulties.includes(q.difficulty)),
    [filters]
  )
  const available = pool.length

  // Full subject pools for preset modes — no filters, always use the complete bank
  const engPoolFull = useMemo(() => allQuestions.filter(q => ENG_DOMAIN_IDS.includes(q.domain)), [])
  const mathPoolFull = useMemo(() => allQuestions.filter(q => MATH_DOMAIN_IDS.includes(q.domain)), [])

  function poolForSubject(subject) {
    return subject === 'english' ? engPoolFull : mathPoolFull
  }

  function presetAvailable(preset) {
    return preset.phases.every(ph => poolForSubject(ph.subject).length > 0)
  }

  const selectedPreset = MOCK_PRESETS.find(p => p.id === format)
  const canStart = (mode === 'learning' && available > 0 && learningCount > 0)
    || (mode === 'quiz' && (
      (format === 'custom' && available > 0 && customCount > 0 && (timerType === 'untimed' || timerMinutes > 0))
      || (format !== 'custom' && selectedPreset && presetAvailable(selectedPreset))
    ))

  function handleStart() {
    if (!canStart) return
    const name = sessionName.trim() || null

    if (mode === 'learning') {
      const count = Math.min(learningCount, available)
      onStart({ mode: 'learning', formatLabel: 'Learning Mode', sessionName: name, questions: shuffle(pool).slice(0, count), timeLimit: null, isAdaptive: false, filters })
      return
    }

    if (format === 'custom') {
      const count = Math.min(customCount, available)
      const timeSec = timerType === 'timed' ? timerMinutes * 60 : 0
      onStart({
        mode: 'quiz', format: 'custom', formatLabel: 'Custom Quiz', sessionName: name,
        phases: [{
          subject: null, label: 'Custom Quiz',
          mod1Questions: shuffle(pool).slice(0, count),
          mod1TimeSec: timeSec,
          adaptive: null,
        }],
      })
      return
    }

    // Preset mode — build phase configs
    const preset = MOCK_PRESETS.find(p => p.id === format)
    const builtPhases = preset.phases.map(ph => {
      const subjectPool = poolForSubject(ph.subject)
      const shuffled = shuffle([...subjectPool])
      return {
        subject: ph.subject,
        label: ph.label,
        mod1Questions: shuffled.slice(0, ph.mod1Count),
        mod1TimeSec: ph.mod1TimeSec,
        adaptive: ph.adaptive
          ? { pool: subjectPool, count: ph.adaptive.count, timeSec: ph.adaptive.timeSec, thresholdRatio: ph.adaptive.thresholdRatio }
          : null,
      }
    })

    onStart({
      mode: 'quiz', format, formatLabel: preset.label, sessionName: name,
      phases: builtPhases,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 flex items-start justify-center px-4 pt-safe-12 pb-12">
      <div className="w-full max-w-2xl">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-8 transition-colors">
          ← Back to Topics
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Start a Study Session</h1>
          <p className="mt-1 text-gray-500">Choose how you want to practice today.</p>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { id: 'learning', label: 'Learning Mode', icon: '🧠', bullets: ['Instant feedback after each answer', 'Explanation shown immediately', 'Study at your own pace'] },
            { id: 'quiz',     label: 'Quiz Mode',     icon: '⏱',  bullets: ['Timer (optional)', 'No hints during the quiz', 'Full review at the end'] },
          ].map(m => {
            const active = mode === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`relative text-left rounded-2xl border-2 p-5 transition-all duration-150 ${
                  active ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'border-gray-200 bg-white text-gray-800 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                <div className="text-2xl mb-2">{m.icon}</div>
                <div className="font-bold text-base mb-2">{m.label}</div>
                <ul className="space-y-1">
                  {m.bullets.map(b => (
                    <li key={b} className={`text-xs flex items-start gap-1.5 ${active ? 'text-indigo-200' : 'text-gray-400'}`}>
                      <span className="mt-0.5 shrink-0">•</span>{b}
                    </li>
                  ))}
                </ul>
                {active && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Learning Mode options */}
        {mode === 'learning' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Number of Questions</h2>
            <div className="bg-white rounded-2xl border-2 border-gray-200 px-4 py-3 flex items-center gap-3">
              <input
                type="number" min={1} value={learningCount}
                onChange={e => setLearningCount(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 text-center text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <span className="text-sm text-gray-500">questions per session</span>
            </div>
          </div>
        )}

        {/* Quiz options */}
        {mode === 'quiz' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-4 mb-6">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Format</h2>
              <div className="bg-white rounded-2xl border-2 border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {/* Custom */}
                <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input type="radio" name="format" value="custom" checked={format === 'custom'} onChange={() => setFormat('custom')} className="accent-indigo-600 shrink-0" />
                  <span className="text-sm font-medium text-gray-800 flex-1">Custom</span>
                  {format === 'custom' && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min={1} value={customCount}
                        onChange={e => setCustomCount(Math.max(1, Number(e.target.value) || 1))}
                        onClick={e => e.stopPropagation()}
                        className="w-16 text-center text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <span className="text-xs text-gray-400">questions</span>
                    </div>
                  )}
                </label>

                {/* Presets */}
                {MOCK_PRESETS.map(p => {
                  const available = presetAvailable(p)
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${available ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                    >
                      <input
                        type="radio" name="format" value={p.id}
                        checked={format === p.id}
                        onChange={() => available && setFormat(p.id)}
                        disabled={!available}
                        className="accent-indigo-600 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800">{p.label}</div>
                        <div className="text-xs text-gray-400">{p.detail}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Timer (custom only) */}
            {format === 'custom' && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Timer</h2>
                <div className="bg-white rounded-2xl border-2 border-gray-200 divide-y divide-gray-100 overflow-hidden">
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="radio" name="timer" value="untimed" checked={timerType === 'untimed'} onChange={() => setTimerType('untimed')} className="accent-indigo-600" />
                    <span className="text-sm font-medium text-gray-800">Untimed</span>
                  </label>
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="radio" name="timer" value="timed" checked={timerType === 'timed'} onChange={() => setTimerType('timed')} className="accent-indigo-600" />
                    <span className="text-sm font-medium text-gray-800 flex-1">Timed</span>
                    {timerType === 'timed' && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" min={1} max={300} value={timerMinutes}
                          onChange={e => setTimerMinutes(Math.max(1, Number(e.target.value) || 1))}
                          onClick={e => e.stopPropagation()}
                          className="w-16 text-center text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <span className="text-xs text-gray-400">min</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Optional session name */}
        {mode && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Name this session (optional)"
              value={sessionName}
              onChange={e => setSessionName(e.target.value.slice(0, 60))}
              className="w-full text-sm border border-gray-200 bg-white rounded-xl px-4 py-3 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        )}

        {mode === 'quiz' && format === 'custom' && available === 0 && (
          <p className="text-xs text-rose-400 text-center mb-4">
            No questions match your filters — go back and adjust your topics or difficulty.
          </p>
        )}
        {mode === 'learning' && available === 0 && (
          <p className="text-xs text-rose-400 text-center mb-4">
            No questions match your filters — go back and adjust your topics or difficulty.
          </p>
        )}

        <button
          onClick={handleStart}
          disabled={!canStart}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-150 ${
            canStart
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Start Session →
        </button>
      </div>
    </div>
  )
}
