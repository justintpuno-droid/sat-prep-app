import { useState, useEffect, useRef, useMemo } from 'react'
import { TAXONOMY } from './data/taxonomy'
import questions from './data/questions'
import { loadHistory } from './utils/history'
import { loadGamification, getLevelInfo, getDailyProgress, DAILY_GOAL, getTodayChallenge, getChallengeProgress } from './utils/gamification'

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

function computeStreak(sessions) {
  const dates = new Set(sessions.map(s => s.completedAt.slice(0, 10)))
  const d = new Date()
  let streak = 0
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function estimateScore(sessions) {
  const relevant = sessions.filter(s => s.score.total >= 10).slice(0, 8)
  if (relevant.length === 0) return null
  const avg = relevant.reduce((sum, s) => sum + s.score.percent, 0) / relevant.length
  return Math.round((400 + (avg / 100) * 1200) / 10) * 10
}

const GOAL_KEY = 'sat_prep_goal'
function loadGoal() { try { return JSON.parse(localStorage.getItem(GOAL_KEY))?.target ?? null } catch { return null } }
function saveGoal(t) { try { localStorage.setItem(GOAL_KEY, JSON.stringify({ target: t })) } catch {} }

function StudyCalendar({ sessions }) {
  const weeks = useMemo(() => {
    const qByDate = {}
    for (const s of sessions) {
      const d = s.completedAt.slice(0, 10)
      qByDate[d] = (qByDate[d] || 0) + s.score.total
    }
    const days = []
    const today = new Date()
    for (let i = 90; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({ key, count: qByDate[key] || 0 })
    }
    const wks = []
    for (let i = 0; i < days.length; i += 7) wks.push(days.slice(i, i + 7))
    return wks
  }, [sessions])

  function cellColor(count) {
    if (count === 0) return 'bg-gray-100'
    if (count < 10) return 'bg-indigo-200'
    if (count < 25) return 'bg-indigo-400'
    return 'bg-indigo-600'
  }

  const activeDays = weeks.flat().filter(d => d.count > 0).length

  const weekQs = useMemo(() => {
    const mon = new Date()
    const day = mon.getDay()
    mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
    const monStr = mon.toISOString().slice(0, 10)
    return sessions.filter(s => s.completedAt.slice(0, 10) >= monStr).reduce((sum, s) => sum + s.score.total, 0)
  }, [sessions])

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Study Activity</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-indigo-600 font-semibold">{weekQs} Qs this week</span>
          <span className="text-xs text-gray-400">{activeDays} days active</span>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        <div className="flex flex-col gap-1 mr-0.5 shrink-0">
          {['S','M','T','W','T','F','S'].map((l, i) => (
            <span key={i} className="text-[9px] text-gray-300 h-2.5 flex items-center w-2">{i % 2 === 1 ? l : ''}</span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 shrink-0">
            {week.map((day, di) => (
              <div key={di} className={`w-2.5 h-2.5 rounded-sm ${cellColor(day.count)}`} title={`${day.key}: ${day.count} Qs`} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[10px] text-gray-300">Less</span>
        {['bg-gray-100','bg-indigo-200','bg-indigo-400','bg-indigo-600'].map((c, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
        ))}
        <span className="text-[10px] text-gray-300">More</span>
      </div>
    </div>
  )
}

export default function TopicSelector({ onStart, onHistory, onQuestionBank, onQuickPractice, onFullPractice, onAchievements }) {
  const history = useMemo(() => loadHistory(), [])
  const streak = useMemo(() => computeStreak(history), [history])
  const gam = useMemo(() => loadGamification(), [])
  const levelInfo = useMemo(() => getLevelInfo(gam.totalXP), [gam])
  const dailyProgress = useMemo(() => getDailyProgress(history), [history])
  const dailyDone = dailyProgress >= DAILY_GOAL
  const achievementsCount = Object.keys(gam.achievements).length
  const estimatedScore = useMemo(() => estimateScore(history), [history])

  const [goalTarget, setGoalTarget] = useState(() => loadGoal())
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  const todayChallenge = useMemo(() => getTodayChallenge(), [])
  const todaySessions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return history.filter(s => s.completedAt.startsWith(today))
  }, [history])
  const challengeProgress = useMemo(() => getChallengeProgress(todaySessions, todayChallenge), [todaySessions, todayChallenge])
  const challengeDone = challengeProgress >= todayChallenge.goal
  const challengeAlreadyCredited = gam.dailyChallengeDate === new Date().toISOString().slice(0, 10)

  const nudge = useMemo(() => {
    if (levelInfo.xpForNext && (levelInfo.xpForNext - levelInfo.xpIntoLevel) <= 60) {
      const gap = levelInfo.xpForNext - levelInfo.xpIntoLevel
      return { icon: '⭐', title: `Almost Level ${levelInfo.level + 1}!`, body: `Just ${gap} XP to go. Complete one more session!`, color: 'border-amber-100 bg-amber-50' }
    }
    if (streak > 2 && dailyProgress === 0) {
      return { icon: '⚠️', title: `Don't break your ${streak}-day streak!`, body: 'You haven\'t studied today yet. Complete a session before midnight.', color: 'border-rose-100 bg-rose-50' }
    }
    if (dailyDone) {
      return { icon: '✅', title: 'Daily goal complete!', body: `${dailyProgress} questions answered today. Great work — keep the streak going!`, color: 'border-emerald-100 bg-emerald-50' }
    }
    return null
  }, [levelInfo, streak, dailyProgress, dailyDone])

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

        {/* Level / XP / Daily goal widget */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-6 flex items-center gap-4">
          {/* Level + XP bar */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0">
              {levelInfo.level}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-700 truncate">{levelInfo.title}</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${levelInfo.pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {levelInfo.xpForNext
                  ? `${gam.totalXP.toLocaleString()} XP · ${levelInfo.xpIntoLevel}/${levelInfo.xpForNext} to Lv ${levelInfo.level + 1}`
                  : `${gam.totalXP.toLocaleString()} XP · Max Level`}
              </p>
            </div>
          </div>

          <div className="h-12 w-px bg-gray-100 shrink-0" />

          {/* Daily goal ring */}
          <div className="shrink-0 text-center">
            <div className="relative w-11 h-11 mx-auto">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                <circle
                  cx="22" cy="22" r="18" fill="none"
                  stroke={dailyDone ? '#10b981' : '#6366f1'} strokeWidth="4"
                  strokeDasharray={`${Math.min(1, dailyProgress / DAILY_GOAL) * 113.1} 113.1`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-black ${dailyDone ? 'text-emerald-600' : 'text-indigo-600'}`}>
                  {dailyDone ? '✓' : dailyProgress}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">{dailyDone ? 'Done!' : `/ ${DAILY_GOAL} Qs`}</p>
          </div>

          {onAchievements && (
            <>
              <div className="h-12 w-px bg-gray-100 shrink-0" />
              <button onClick={onAchievements} className="shrink-0 text-center group">
                <p className="text-xl group-hover:scale-110 transition-transform">🏆</p>
                <p className="text-xs text-gray-400 mt-1">{achievementsCount}/{15}</p>
              </button>
            </>
          )}
        </div>

        {/* Motivational nudge */}
        {nudge && (
          <div className={`rounded-2xl border-2 p-4 mb-4 flex items-start gap-3 ${nudge.color}`}>
            <span className="text-lg mt-0.5 shrink-0">{nudge.icon}</span>
            <div>
              <p className="text-sm font-bold text-gray-900">{nudge.title}</p>
              <p className="text-xs text-gray-600 mt-0.5">{nudge.body}</p>
            </div>
          </div>
        )}

        {/* Daily challenge */}
        <div className={`rounded-2xl border-2 p-4 mb-4 ${challengeDone ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🎯</span>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Daily Challenge</p>
            </div>
            {(challengeDone || challengeAlreadyCredited) && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                {challengeAlreadyCredited ? `+${todayChallenge.bonus} XP earned!` : `+${todayChallenge.bonus} XP on complete`}
              </span>
            )}
            {!challengeDone && !challengeAlreadyCredited && (
              <span className="text-xs text-gray-400">+{todayChallenge.bonus} XP reward</span>
            )}
          </div>
          <p className={`text-sm font-semibold mb-3 ${challengeDone ? 'text-emerald-800' : 'text-gray-900'}`}>
            {todayChallenge.desc}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${challengeDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(100, (challengeProgress / todayChallenge.goal) * 100)}%` }}
              />
            </div>
            <span className={`text-xs font-bold shrink-0 ${challengeDone ? 'text-emerald-600' : 'text-gray-600'}`}>
              {Math.min(challengeProgress, todayChallenge.goal)}/{todayChallenge.goal}
            </span>
          </div>
        </div>

        {/* SAT score goal tracker */}
        {(goalTarget !== null || estimatedScore !== null) && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">SAT Score Goal</p>
              {!editingGoal && (
                <button
                  onClick={() => { setGoalInput(goalTarget ? String(goalTarget) : ''); setEditingGoal(true) }}
                  className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  {goalTarget ? 'Edit goal' : 'Set goal'}
                </button>
              )}
            </div>
            {editingGoal ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="number"
                  min="400" max="1600" step="10"
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const t = Math.round(Math.min(1600, Math.max(400, Number(goalInput))) / 10) * 10
                      setGoalTarget(t); saveGoal(t); setEditingGoal(false)
                    }
                    if (e.key === 'Escape') setEditingGoal(false)
                  }}
                  placeholder="e.g. 1400"
                  className="flex-1 border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  onClick={() => {
                    const t = Math.round(Math.min(1600, Math.max(400, Number(goalInput))) / 10) * 10
                    setGoalTarget(t); saveGoal(t); setEditingGoal(false)
                  }}
                  className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Save
                </button>
                <button onClick={() => setEditingGoal(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            ) : (
              <div className="flex items-end gap-4">
                <div>
                  {estimatedScore && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-400">Estimated current</span>
                      <div className="text-2xl font-black text-gray-900">~{estimatedScore}</div>
                    </div>
                  )}
                  {goalTarget && (
                    <div>
                      <span className="text-xs text-gray-400">Goal</span>
                      <div className="text-lg font-black text-indigo-600">{goalTarget}</div>
                    </div>
                  )}
                  {!goalTarget && !estimatedScore && (
                    <p className="text-sm text-gray-400">Complete a few sessions to see your estimated score.</p>
                  )}
                </div>
                {goalTarget && estimatedScore && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">400</span>
                      <span className="text-xs text-gray-400">1600</span>
                    </div>
                    <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-indigo-500 rounded-full"
                        style={{ width: `${((estimatedScore - 400) / 1200) * 100}%` }}
                      />
                      <div
                        className="absolute top-0 h-full w-0.5 bg-indigo-900"
                        style={{ left: `${((goalTarget - 400) / 1200) * 100}%` }}
                        title={`Goal: ${goalTarget}`}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-center">
                      {estimatedScore >= goalTarget
                        ? '🎉 Goal reached! Set a higher target.'
                        : `${goalTarget - estimatedScore} points to go`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* If no goal set and no estimate, show a prompt to set goal */}
        {goalTarget === null && estimatedScore === null && (
          <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-900">Set your SAT goal</p>
              <p className="text-xs text-indigo-500 mt-0.5">Track your progress toward a target score</p>
            </div>
            <button
              onClick={() => { setGoalInput(''); setEditingGoal(true) }}
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-xl transition-colors shrink-0"
            >
              Set Goal →
            </button>
          </div>
        )}

        {/* Activity heatmap (shown when there are sessions) */}
        {history.length > 0 && <StudyCalendar sessions={history} />}

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
