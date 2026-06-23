import { useState, useEffect, useRef, useMemo } from 'react'
import { TAXONOMY } from './data/taxonomy'
import questions from './data/questions'
import { loadHistory } from './utils/history'

const DIFFICULTIES = [
  { id: 1, label: 'Easy',   classes: { chip: 'border-emerald-200 bg-emerald-50 text-emerald-800', active: 'border-emerald-500 bg-emerald-500 text-white' } },
  { id: 2, label: 'Medium', classes: { chip: 'border-amber-200 bg-amber-50 text-amber-800',   active: 'border-amber-500 bg-amber-500 text-white'   } },
  { id: 3, label: 'Hard',   classes: { chip: 'border-rose-200 bg-rose-50 text-rose-800',     active: 'border-rose-500 bg-rose-500 text-white'     } },
]

// Custom checkbox that supports indeterminate state
function Checkbox({ checked, indeterminate = false, onChange, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked
  }, [indeterminate, checked])

  return (
    <div className={`relative flex-shrink-0 w-4 h-4 ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      {/* Box */}
      <div
        onClick={onChange}
        className={`
          w-4 h-4 rounded border-2 cursor-pointer flex items-center justify-center transition-all duration-100
          ${checked
            ? 'bg-indigo-600 border-indigo-600'
            : indeterminate
            ? 'bg-indigo-100 border-indigo-400'
            : 'bg-white border-gray-300 hover:border-indigo-400'}
        `}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {!checked && indeterminate && (
          <div className="w-2 h-0.5 bg-indigo-500 rounded-full" />
        )}
      </div>
    </div>
  )
}

function computeStreak() {
  const sessions = loadHistory()
  const dates = new Set(sessions.map(s => s.completedAt.slice(0, 10)))
  const today = new Date().toISOString().slice(0, 10)
  let streak = 0
  const d = new Date(today)
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export default function TopicSelector({ onStart, onHistory, onQuestionBank, onQuickPractice, onFullPractice }) {
  const streak = useMemo(() => computeStreak(), [])

  // Start with everything selected
  const allDomainIds = useMemo(
    () => TAXONOMY.flatMap(s => s.domains.map(d => d.id)),
    []
  )

  const [selectedDomains, setSelectedDomains] = useState(() => new Set(allDomainIds))
  const [selectedDifficulties, setSelectedDifficulties] = useState(() => new Set([1, 2, 3]))

  const matchingCount = useMemo(
    () => questions.filter(q =>
      selectedDomains.has(q.domain) && selectedDifficulties.has(q.difficulty)
    ).length,
    [selectedDomains, selectedDifficulties]
  )

  // Domain helpers
  function toggleDomain(id) {
    setSelectedDomains(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSubject(subjectId) {
    const domainIds = TAXONOMY.find(s => s.id === subjectId).domains.map(d => d.id)
    const allSelected = domainIds.every(id => selectedDomains.has(id))
    setSelectedDomains(prev => {
      const next = new Set(prev)
      if (allSelected) {
        domainIds.forEach(id => next.delete(id))
      } else {
        domainIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  function subjectCheckState(subjectId) {
    const domainIds = TAXONOMY.find(s => s.id === subjectId).domains.map(d => d.id)
    const selected = domainIds.filter(id => selectedDomains.has(id))
    if (selected.length === 0) return 'none'
    if (selected.length === domainIds.length) return 'all'
    return 'some'
  }

  // Difficulty helpers
  function toggleDifficulty(id) {
    setSelectedDifficulties(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleStart() {
    if (matchingCount === 0 || !onStart) return
    onStart({
      domains: [...selectedDomains],
      difficulties: [...selectedDifficulties],
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <span className="text-sm font-semibold tracking-widest text-indigo-500 uppercase">SAT Prep</span>
              {streak > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  🔥 {streak}-day streak
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {onQuestionBank && (
                <button onClick={onQuestionBank} className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 bg-white rounded-lg px-3 py-1.5 transition-colors">
                  Question Bank
                </button>
              )}
              {onHistory && (
                <button onClick={onHistory} className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 bg-white rounded-lg px-3 py-1.5 transition-colors">
                  History
                </button>
              )}
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">Customize your quiz</h1>
          <p className="mt-1 text-gray-500 text-base">Select the subjects, topics, and difficulties you want to practice.</p>
        </div>

        {/* Quick-start shortcuts */}
        {(onQuickPractice || onFullPractice) && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {onQuickPractice && (
              <button
                onClick={onQuickPractice}
                className="text-left rounded-2xl border-2 border-indigo-100 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">⚡</div>
                <div className="font-bold text-sm text-indigo-900">Quick Practice</div>
                <div className="text-xs text-indigo-500 mt-0.5">15 random questions</div>
              </button>
            )}
            {onFullPractice && (
              <button
                onClick={onFullPractice}
                className="text-left rounded-2xl border-2 border-violet-100 bg-violet-50 hover:bg-violet-100 hover:border-violet-300 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">📝</div>
                <div className="font-bold text-sm text-violet-900">Full Practice Test</div>
                <div className="text-xs text-violet-500 mt-0.5">4 modules · ~2 hr 14 min</div>
              </button>
            )}
          </div>
        )}

        {/* Subjects & Topics */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Subjects & Topics</h2>
            <button
              onClick={() => {
                const allSelected = allDomainIds.every(id => selectedDomains.has(id))
                setSelectedDomains(allSelected ? new Set() : new Set(allDomainIds))
              }}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              {allDomainIds.every(id => selectedDomains.has(id)) ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TAXONOMY.map(subject => {
              const state = subjectCheckState(subject.id)
              return (
                <div key={subject.id} className="rounded-2xl border-2 border-gray-200 bg-white overflow-hidden">
                  {/* Subject header row */}
                  <button
                    onClick={() => toggleSubject(subject.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Checkbox
                      checked={state === 'all'}
                      indeterminate={state === 'some'}
                      onChange={() => toggleSubject(subject.id)}
                    />
                    <span className="text-xl font-black font-mono text-indigo-400 leading-none w-7 shrink-0">
                      {subject.icon}
                    </span>
                    <span className="font-bold text-gray-900">{subject.label}</span>
                  </button>

                  {/* Domain list */}
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {subject.domains.map(domain => (
                      <label
                        key={domain.id}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedDomains.has(domain.id)}
                          onChange={() => toggleDomain(domain.id)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-800">{domain.label}</div>
                          <div className="text-xs text-gray-400">{domain.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Difficulty</h2>
            <button
              onClick={() => {
                const allSelected = [1, 2, 3].every(id => selectedDifficulties.has(id))
                setSelectedDifficulties(allSelected ? new Set() : new Set([1, 2, 3]))
              }}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              {[1, 2, 3].every(id => selectedDifficulties.has(id)) ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="flex gap-3">
            {DIFFICULTIES.map(d => {
              const active = selectedDifficulties.has(d.id)
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDifficulty(d.id)}
                  className={`flex-1 rounded-xl border-2 py-3.5 px-3 text-center transition-all duration-150 font-semibold ${
                    active ? d.classes.active + ' shadow-md' : d.classes.chip + ' hover:opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      active ? 'border-white bg-white/20' : 'border-current'
                    }`}>
                      {active && (
                        <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm">{d.label}</span>
                  </div>

                </button>
              )
            })}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={matchingCount === 0}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-150 ${
            matchingCount > 0
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {matchingCount === 0 ? 'No questions match — adjust your filters' : 'Start Quiz →'}
        </button>

      </div>
    </div>
  )
}
