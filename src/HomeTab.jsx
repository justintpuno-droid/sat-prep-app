import { useMemo } from 'react'
import { loadHistory } from './utils/history'
import { loadGamification } from './utils/gamification'
import { loadDisplayName } from './ProfileScreen'

const MODES = [
  { id: 'adaptive',   icon: '🤖', label: 'Adaptive',      desc: 'Targets your weak spots' },
  { id: 'beast',      icon: '💀', label: 'Beast Mode',     desc: 'Hard questions only' },
  { id: 'timed',      icon: '⏱️', label: 'Timed',          desc: '15q in 10 min' },
  { id: 'wrong',      icon: '🔁', label: 'Wrong Answers',  desc: 'Retry recent misses' },
  { id: 'ramp',       icon: '📈', label: 'Ramp Up',        desc: 'Easy → Medium → Hard' },
  { id: 'assessment', icon: '📊', label: 'Assessment',     desc: '2 per domain (16q)' },
]

const TOOLS = [
  { id: 'vocab',    icon: '📖', label: 'Vocab'    },
  { id: 'math',     icon: '🧮', label: 'Math Flash' },
  { id: 'grammar',  icon: '✏️', label: 'Grammar'  },
  { id: 'strategy', icon: '🗺️', label: 'Strategy' },
]

export default function HomeTab({
  onQuickPractice, onFullPractice, onCustom,
  onAdaptive, onBeast, onTimed, onWrong, onRamp, onAssessment,
  onVocab, onMathFlash, onGrammar, onStrategy,
  onHistory, onDailyChallenge,
}) {
  const name = loadDisplayName()
  const gam = loadGamification()
  const streak = gam.streak ?? 0

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return loadHistory().filter(s => s.completedAt?.startsWith(today)).length
  }, [])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  function handleMode(id) {
    const map = { adaptive: onAdaptive, beast: onBeast, timed: onTimed, wrong: onWrong, ramp: onRamp, assessment: onAssessment }
    map[id]?.()
  }

  function handleTool(id) {
    const map = { vocab: onVocab, math: onMathFlash, grammar: onGrammar, strategy: onStrategy }
    map[id]?.()
  }

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-black text-gray-900">
            {greeting}{name ? `, ${name}` : ''}
          </p>
          <p className="text-xs text-gray-400">
            {todayCount === 0 ? "Ready to practice?" : `${todayCount} session${todayCount !== 1 ? 's' : ''} today`}
          </p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-2xl px-3 py-1.5">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-black text-orange-600">{streak}</span>
          </div>
        )}
      </div>

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onQuickPractice}
          className="col-span-2 flex items-center justify-between bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-2xl px-5 py-4 transition-all shadow-md shadow-indigo-200"
        >
          <div className="text-left">
            <p className="text-base font-black">Quick Practice</p>
            <p className="text-xs text-indigo-200">15 random questions</p>
          </div>
          <span className="text-3xl">⚡</span>
        </button>

        <button
          onClick={onFullPractice}
          className="flex items-center justify-between bg-white border-2 border-gray-100 hover:border-indigo-200 active:scale-[0.98] rounded-2xl px-4 py-3.5 transition-all"
        >
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900">Full Test</p>
            <p className="text-xs text-gray-400">Adaptive format</p>
          </div>
          <span className="text-2xl">📝</span>
        </button>

        <button
          onClick={onCustom}
          className="flex items-center justify-between bg-white border-2 border-gray-100 hover:border-indigo-200 active:scale-[0.98] rounded-2xl px-4 py-3.5 transition-all"
        >
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900">Custom</p>
            <p className="text-xs text-gray-400">Pick topics & difficulty</p>
          </div>
          <span className="text-2xl">🎯</span>
        </button>
      </div>

      {/* Practice modes */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Practice Modes</p>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => handleMode(m.id)}
              className="flex items-center gap-2.5 bg-white border border-gray-100 hover:border-indigo-200 active:scale-[0.97] rounded-xl px-3 py-2.5 transition-all text-left"
            >
              <span className="text-xl shrink-0">{m.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{m.label}</p>
                <p className="text-[10px] text-gray-400 truncate">{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Study tools */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Study Tools</p>
        <div className="grid grid-cols-4 gap-2">
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => handleTool(t.id)}
              className="flex flex-col items-center gap-1.5 bg-white border border-gray-100 hover:border-indigo-200 active:scale-[0.95] rounded-xl py-3 transition-all"
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="text-[9px] font-bold text-gray-500 text-center leading-tight">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={onHistory} className="text-xs text-gray-400 hover:text-indigo-500 bg-white border border-gray-100 rounded-xl px-3 py-1.5 transition-colors">
          📋 History
        </button>
        <button onClick={onDailyChallenge} className="text-xs text-gray-400 hover:text-indigo-500 bg-white border border-gray-100 rounded-xl px-3 py-1.5 transition-colors">
          🎯 Daily Challenge
        </button>
      </div>
    </div>
  )
}
