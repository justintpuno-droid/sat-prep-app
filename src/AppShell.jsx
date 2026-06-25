import { useState, useEffect, useMemo } from 'react'
import { loadGamification, getLevelInfo, getLevelColor } from './utils/gamification'

const TEST_DATE_KEY = 'sat_prep_test_date'

const TABS = [
  { id: 'home',      icon: '⚡', label: 'Practice'  },
  { id: 'questions', icon: '📚', label: 'Questions'  },
  { id: 'profile',   icon: '👤', label: 'Profile'    },
  { id: 'friends',   icon: '🏆', label: 'Leaderboard'},
]

export default function AppShell({ tab, onTabChange, children }) {
  const [testDate, setTestDate] = useState(() => localStorage.getItem(TEST_DATE_KEY) ?? '')
  const [editingDate, setEditingDate] = useState(false)
  const [gam, setGam] = useState(() => loadGamification())

  useEffect(() => {
    function sync() { setGam(loadGamification()) }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  // Re-read gam when tab changes (after returning from a session)
  useEffect(() => { setGam(loadGamification()) }, [tab])

  const daysUntil = useMemo(() => {
    if (!testDate) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const test = new Date(testDate + 'T00:00:00')
    return Math.round((test - today) / 86400000)
  }, [testDate])

  const levelInfo = getLevelInfo(gam.totalXP ?? 0)
  const lc = getLevelColor(levelInfo.level)

  function handleDateChange(e) {
    const d = e.target.value
    setTestDate(d)
    localStorage.setItem(TEST_DATE_KEY, d)
    setEditingDate(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">SAT Prep</p>
            {editingDate ? (
              <input
                type="date"
                autoFocus
                defaultValue={testDate}
                onChange={handleDateChange}
                onBlur={() => setEditingDate(false)}
                className="text-xs border border-indigo-300 rounded-lg px-2 py-0.5 outline-none"
              />
            ) : (
              <button onClick={() => setEditingDate(true)} className="text-left">
                {daysUntil === null
                  ? <span className="text-xs text-gray-400 hover:text-indigo-500 transition-colors">+ Set test date</span>
                  : daysUntil <= 0
                  ? <span className="text-xs font-bold text-rose-600">🎓 Test day!</span>
                  : daysUntil <= 7
                  ? <span className="text-xs font-bold text-rose-500">⚠️ {daysUntil}d to test</span>
                  : daysUntil <= 30
                  ? <span className="text-xs font-semibold text-amber-500">📅 {daysUntil} days to test</span>
                  : <span className="text-xs text-gray-500">📅 {daysUntil} days to test</span>}
              </button>
            )}
          </div>

          <button
            onClick={() => onTabChange('profile')}
            className={`flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-2xl border ${lc.border} ${lc.light} shrink-0`}
          >
            <span className={`text-[10px] font-black ${lc.text} bg-white rounded-full px-1.5 py-0.5 border ${lc.border}`}>
              Lv{levelInfo.level}
            </span>
            <div>
              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${lc.ring} rounded-full transition-all`} style={{ width: `${levelInfo.pct}%` }} />
              </div>
              <p className={`text-[9px] font-semibold ${lc.text} text-right leading-none mt-0.5`}>{gam.totalXP ?? 0} XP</p>
            </div>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {children}
      </div>

      {/* Footer tab bar */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-50">
        <div className="max-w-md mx-auto flex">
          {TABS.map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative transition-colors ${active ? 'text-indigo-600' : 'text-gray-400'}`}
              >
                {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-600 rounded-b-full" />}
                <span className={`text-xl leading-none transition-transform ${active ? 'scale-110' : ''}`}>{t.icon}</span>
                <span className={`text-[9px] font-bold tracking-wide ${active ? 'text-indigo-600' : 'text-gray-400'}`}>{t.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
