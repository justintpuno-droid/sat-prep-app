import { useState, useMemo, useEffect } from 'react'
import { loadGamification, getLevelInfo, getLevelColor, ACHIEVEMENTS } from './utils/gamification'
import { loadHistory } from './utils/history'
import { loadDisplayName, NAME_KEY } from './ProfileScreen'

const PLAN_KEY = 'sat_prep_study_plan'

function loadPlan() { return localStorage.getItem(PLAN_KEY) ?? '' }
function savePlan(v) { localStorage.setItem(PLAN_KEY, v) }

function computeStats(history) {
  let totalQ = 0, totalC = 0, studyDays = new Set()
  for (const s of history) {
    totalQ += s.score.total ?? 0
    totalC += s.score.correct ?? 0
    studyDays.add(s.completedAt?.slice(0, 10) ?? '')
  }
  const pct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0

  // Current streak
  const dates = studyDays
  const d = new Date(); let streak = 0
  while (dates.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }

  return { totalQ, totalC, pct, streak, studyDays: studyDays.size }
}

export default function ProfileTab({ onViewAchievements, onHistory, onAnalytics }) {
  const [gam, setGam] = useState(() => loadGamification())
  const [history, setHistory] = useState(() => loadHistory())
  const [name, setName] = useState(() => loadDisplayName())
  const [editingName, setEditingName] = useState(false)
  const [plan, setPlan] = useState(() => loadPlan())
  const [editingPlan, setEditingPlan] = useState(false)
  const [planDraft, setPlanDraft] = useState(plan)

  useEffect(() => {
    function sync() { setGam(loadGamification()); setHistory(loadHistory()) }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const levelInfo = getLevelInfo(gam.totalXP ?? 0)
  const lc = getLevelColor(levelInfo.level)
  const stats = useMemo(() => computeStats(history), [history])

  // Unlocked achievements
  const unlocked = useMemo(() => {
    const ids = new Set(gam.achievements ?? [])
    return ACHIEVEMENTS.filter(a => ids.has(a.id)).slice(-6).reverse()
  }, [gam])

  function saveName(v) {
    const clean = v.trim().slice(0, 24)
    setName(clean)
    localStorage.setItem(NAME_KEY, clean)
    setEditingName(false)
  }

  function handlePlanSave() {
    savePlan(planDraft)
    setPlan(planDraft)
    setEditingPlan(false)
  }

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4">
      {/* Level hero */}
      <div className={`rounded-2xl border-2 ${lc.border} ${lc.light} p-5`}>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl ${lc.ring} flex items-center justify-center shrink-0`}>
            <span className="text-2xl font-black text-white">{levelInfo.level}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {editingName ? (
                <input
                  autoFocus
                  className="text-base font-black text-gray-900 border-b-2 border-indigo-400 bg-transparent outline-none w-36"
                  defaultValue={name}
                  onBlur={e => saveName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveName(e.target.value)}
                />
              ) : (
                <button onClick={() => setEditingName(true)} className="text-left">
                  <p className="text-base font-black text-gray-900">{name || 'Tap to set name'}</p>
                </button>
              )}
            </div>
            <p className={`text-sm font-bold ${lc.text}`}>{levelInfo.title}</p>
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>{gam.totalXP ?? 0} XP</span>
                <span>{levelInfo.next ? `${levelInfo.next.xp} XP` : 'MAX'}</span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-gray-200">
                <div className={`h-full ${lc.ring} rounded-full transition-all`} style={{ width: `${levelInfo.pct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-lg font-black text-orange-500">{stats.streak}🔥</p>
            <p className="text-[9px] text-gray-400">Streak</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-gray-800">{stats.totalQ}</p>
            <p className="text-[9px] text-gray-400">Questions</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-gray-800">{stats.pct}%</p>
            <p className="text-[9px] text-gray-400">Accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-gray-800">{stats.studyDays}</p>
            <p className="text-[9px] text-gray-400">Study days</p>
          </div>
        </div>
      </div>

      {/* Study plan */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-900">📋 Study Plan</p>
          {!editingPlan && (
            <button
              onClick={() => { setPlanDraft(plan); setEditingPlan(true) }}
              className="text-xs text-indigo-500 hover:text-indigo-700"
            >
              {plan ? 'Edit' : '+ Add'}
            </button>
          )}
        </div>
        {editingPlan ? (
          <div>
            <textarea
              autoFocus
              value={planDraft}
              onChange={e => setPlanDraft(e.target.value)}
              placeholder="e.g. Mon: 15 algebra questions, Tue: vocab flash, Wed: full practice test..."
              rows={4}
              className="w-full text-sm text-gray-700 border border-indigo-200 rounded-xl p-3 outline-none resize-none leading-relaxed"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={handlePlanSave} className="flex-1 bg-indigo-600 text-white text-xs font-bold py-2 rounded-xl">Save</button>
              <button onClick={() => setEditingPlan(false)} className="px-4 text-xs text-gray-400 border border-gray-200 rounded-xl">Cancel</button>
            </div>
          </div>
        ) : plan ? (
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{plan}</p>
        ) : (
          <p className="text-sm text-gray-300 italic">No plan yet — tap + Add to create one</p>
        )}
      </div>

      {/* Recent achievements */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-900">🏆 Achievements</p>
          <button onClick={onViewAchievements} className="text-xs text-indigo-500 hover:text-indigo-700">View all →</button>
        </div>
        {unlocked.length === 0 ? (
          <p className="text-sm text-gray-300 italic">Complete sessions to unlock achievements</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {unlocked.map(a => (
              <div key={a.id} className="flex flex-col items-center text-center bg-amber-50 border border-amber-100 rounded-xl py-2.5 px-1">
                <span className="text-xl mb-0.5">{a.icon}</span>
                <p className="text-[9px] font-bold text-amber-700 leading-tight">{a.title}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-gray-300 text-center mt-2">{gam.achievements?.length ?? 0} unlocked</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onHistory} className="bg-white border border-gray-100 rounded-xl py-3 text-xs font-semibold text-gray-600 hover:border-indigo-200 transition-colors">
          📋 Session History
        </button>
        <button onClick={onAnalytics} className="bg-white border border-gray-100 rounded-xl py-3 text-xs font-semibold text-gray-600 hover:border-indigo-200 transition-colors">
          📊 Analytics
        </button>
      </div>
    </div>
  )
}
