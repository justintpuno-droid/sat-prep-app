import { useMemo, useState, useCallback } from 'react'
import { loadGamification, getLevelInfo, getLevelColor, ACHIEVEMENTS, getPrestigeInfo, saveGamification } from './utils/gamification'
import { loadHistory } from './utils/history'

const STUDY_TIME_KEY = 'sat_prep_study_hour'
function loadStudyHour() { try { return parseInt(localStorage.getItem(STUDY_TIME_KEY) ?? '-1', 10) } catch { return -1 } }
function saveStudyHour(h) { try { localStorage.setItem(STUDY_TIME_KEY, String(h)) } catch {} }

const AVATAR_OPTIONS = [
  '🎓','⭐','🔥','⚡','🦁','🧠','🚀','💎','🏆','🌟',
  '🦊','🐉','🦅','🐺','🦋','🎯','🌈','🏄','🧊','👾',
]
const AVATAR_KEY = 'sat_prep_avatar'
function loadAvatar() { return localStorage.getItem(AVATAR_KEY) ?? '🎓' }
function saveAvatar(v) { localStorage.setItem(AVATAR_KEY, v) }

function computeStreak(sessions) {
  const dates = new Set(sessions.map(s => s.completedAt.slice(0, 10)))
  const d = new Date(); let streak = 0
  while (dates.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}

export default function ProfileScreen({ onBack }) {
  const [gam, setGam] = useState(() => loadGamification())
  const history = useMemo(() => loadHistory(), [])
  const [avatar, setAvatar] = useState(loadAvatar)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [shopMsg, setShopMsg] = useState(null)
  const [studyHour, setStudyHour] = useState(loadStudyHour)

  const buyItem = useCallback((cost, update, label) => {
    if ((gam.totalXP ?? 0) < cost) { setShopMsg(`Need ${cost} XP!`); setTimeout(() => setShopMsg(null), 1500); return }
    const next = { ...gam, totalXP: gam.totalXP - cost, ...update }
    saveGamification(next)
    setGam(next)
    setShopMsg(`Bought ${label}!`)
    setTimeout(() => setShopMsg(null), 1500)
  }, [gam])
  const levelInfo = useMemo(() => getLevelInfo(gam.totalXP), [gam])
  const levelColor = useMemo(() => getLevelColor(levelInfo.level), [levelInfo])
  const prestigeInfo = useMemo(() => getPrestigeInfo(gam), [gam])

  const stats = useMemo(() => {
    if (history.length === 0) return null
    const totalQ = history.reduce((n, s) => n + s.score.total, 0)
    const totalC = history.reduce((n, s) => n + s.score.correct, 0)
    const overallPct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0
    const streak = computeStreak(history)
    const bestPct = Math.max(...history.map(s => s.score.percent))
    const bestCombo = Math.max(...history.map(s => s.maxCombo ?? 0))
    const totalTime = history.reduce((n, s) => n + (s.elapsedSeconds ?? 0), 0)
    const studyDays = new Set(history.map(s => s.completedAt.slice(0, 10))).size
    const hardCorrect = history.reduce((n, s) =>
      n + s.questions.filter(q => q.difficulty === 3 && (s.answers[q.id] ?? null) === q.answer).length, 0)
    const estScore = Math.round((400 + (overallPct / 100) * 1200) / 10) * 10
    return { totalQ, totalC, overallPct, streak, bestPct, bestCombo, totalTime, studyDays, hardCorrect, estScore }
  }, [history])

  const recentAchs = useMemo(() => {
    return Object.entries(gam.achievements ?? {})
      .sort(([, a], [, b]) => new Date(b) - new Date(a))
      .slice(0, 6)
      .map(([id, date]) => ({ ...ACHIEVEMENTS.find(a => a.id === id), date }))
      .filter(Boolean)
  }, [gam])

  const weekStudy = useMemo(() => {
    const out = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const sessions = history.filter(s => s.completedAt?.slice(0, 10) === key)
      const avgPct = sessions.length ? Math.round(sessions.reduce((n, s) => n + s.score.percent, 0) / sessions.length) : 0
      out.push({ key, sessions: sessions.length, avgPct, day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] })
    }
    return out
  }, [history])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 px-4 py-10">
      <div className="max-w-md mx-auto">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">← Back</button>

        {/* Avatar picker modal */}
        {showAvatarPicker && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6" onClick={e => { if (e.target === e.currentTarget) setShowAvatarPicker(false) }}>
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
              <p className="text-base font-black text-gray-900 mb-4 text-center">Choose Your Avatar</p>
              <div className="grid grid-cols-5 gap-3 mb-5">
                {AVATAR_OPTIONS.map(icon => (
                  <button key={icon} onClick={() => { setAvatar(icon); saveAvatar(icon); setShowAvatarPicker(false) }}
                    className={`w-full aspect-square rounded-2xl text-2xl flex items-center justify-center transition-all ${icon === avatar ? `${levelColor.ring} scale-110 shadow-lg` : 'bg-gray-50 hover:bg-gray-100'}`}>
                    {icon}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAvatarPicker(false)} className="w-full py-2.5 rounded-2xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Profile header */}
        <div className={`rounded-3xl border-2 ${levelColor.border} bg-white p-6 mb-5 text-center`}>
          <button onClick={() => setShowAvatarPicker(true)} className="relative group mx-auto mb-3 block w-20">
            <div className={`w-20 h-20 rounded-full ${levelColor.ring} flex items-center justify-center text-4xl`}>
              {avatar}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-bold">Edit</span>
            </div>
          </button>
          <div className="flex items-center justify-center gap-2 mb-1">
            <p className={`text-xl font-black ${levelColor.text}`}>Level {levelInfo.level}</p>
            {prestigeInfo.title && <span className="text-xs font-bold text-amber-600">{prestigeInfo.title}</span>}
          </div>
          <p className="text-sm text-gray-500 mb-4">{levelInfo.title}</p>

          {levelInfo.xpForNext ? (
            <div className="mb-1">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                <span>{levelInfo.xpIntoLevel} XP</span>
                <span>{levelInfo.xpForNext} XP to next level</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${levelColor.ring} rounded-full transition-all`} style={{ width: `${levelInfo.pct}%` }} />
              </div>
            </div>
          ) : (
            <p className="text-sm font-bold text-amber-600">Max Level Reached!</p>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
            <div><p className="text-xs text-gray-400">Total XP</p><p className={`text-lg font-black ${levelColor.text}`}>{(gam.totalXP ?? 0).toLocaleString()}</p></div>
            <div><p className="text-xs text-gray-400">Streak</p><p className="text-lg font-black text-orange-500">{stats?.streak ?? 0}🔥</p></div>
            <div><p className="text-xs text-gray-400">Achievements</p><p className="text-lg font-black text-indigo-600">{Object.keys(gam.achievements ?? {}).length}</p></div>
          </div>
        </div>

        {/* This week */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">This Week</p>
          <div className="flex gap-1.5">
            {weekStudy.map(d => {
              const color = d.sessions === 0 ? 'bg-gray-100' : d.avgPct >= 80 ? 'bg-emerald-400' : d.avgPct >= 65 ? 'bg-amber-400' : 'bg-rose-300'
              return (
                <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className={`w-full rounded-lg ${color} transition-all`} style={{ height: `${d.sessions === 0 ? 24 : 24 + d.avgPct * 0.3}px` }}
                    title={d.sessions > 0 ? `${d.avgPct}% avg (${d.sessions} session${d.sessions !== 1 ? 's' : ''})` : 'No study'} />
                  <span className="text-[10px] text-gray-400">{d.day}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Key stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Est. SAT Score', value: stats.estScore, sub: 'out of 1600', color: 'text-indigo-700' },
              { label: 'Overall Accuracy', value: `${stats.overallPct}%`, sub: `${stats.totalC}/${stats.totalQ} correct`, color: 'text-emerald-600' },
              { label: 'Study Days', value: stats.studyDays, sub: `across all time`, color: 'text-violet-600' },
              { label: 'Hard Qs Correct', value: stats.hardCorrect, sub: 'difficulty level 3', color: 'text-rose-600' },
              { label: 'Best Session', value: `${stats.bestPct}%`, sub: 'all-time high', color: 'text-amber-600' },
              { label: 'Best Combo', value: `${stats.bestCombo}x`, sub: 'consecutive correct', color: 'text-orange-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs font-semibold text-gray-500 mt-0.5">{s.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recent achievements */}
        {recentAchs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Recent Badges</p>
            <div className="grid grid-cols-3 gap-3">
              {recentAchs.map(a => (
                <div key={a.id} className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl mx-auto mb-1.5">
                    {a.icon}
                  </div>
                  <p className="text-xs font-bold text-gray-700 leading-tight">{a.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Study schedule */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Daily Study Time</p>
          <p className="text-xs text-gray-500 mb-3">Pick a time and we'll remind you on the home screen.</p>
          <div className="grid grid-cols-4 gap-2">
            {[7,8,9,10,14,15,16,17,18,19,20,21].map(h => {
              const label = h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
              const active = studyHour === h
              return (
                <button key={h} onClick={() => { const next = active ? -1 : h; setStudyHour(next); saveStudyHour(next) }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${active ? 'bg-indigo-600 text-white' : 'bg-gray-50 border border-gray-200 text-gray-500 hover:border-indigo-300'}`}>
                  {label}
                </button>
              )
            })}
          </div>
          {studyHour >= 0 && <p className="text-xs text-indigo-500 font-semibold mt-2 text-center">✓ Reminding you at {studyHour < 12 ? `${studyHour}am` : studyHour === 12 ? '12pm' : `${studyHour - 12}pm`}</p>}
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Inventory</p>
          <div className="flex gap-3">
            <div className="flex-1 bg-violet-50 border border-violet-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-violet-700">{gam.boosts ?? 0}</p>
              <p className="text-xs text-violet-500">🚀 XP Boosts</p>
            </div>
            <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-blue-700">{gam.streakFreezes ?? 0}</p>
              <p className="text-xs text-blue-500">🧊 Freezes</p>
            </div>
            <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-amber-700">{gam.hintCredits ?? 0}</p>
              <p className="text-xs text-amber-500">💡 Hints</p>
            </div>
          </div>
        </div>

        {/* XP Shop */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">XP Shop</p>
            <span className="text-xs font-bold text-amber-600">⭐ {(gam.totalXP ?? 0).toLocaleString()} XP available</span>
          </div>
          {shopMsg && <div className="mb-3 text-center text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl py-2">{shopMsg}</div>}
          <div className="space-y-2">
            {[
              { label: '🚀 XP Boost',     cost: 200, desc: '2× XP on next session', action: () => buyItem(200, { boosts: (gam.boosts ?? 0) + 1 }, '🚀 Boost') },
              { label: '🧊 Streak Freeze', cost: 150, desc: 'Protect your streak for 1 day', action: () => buyItem(150, { streakFreezes: (gam.streakFreezes ?? 0) + 1 }, '🧊 Freeze') },
              { label: '💡 Hint ×3',       cost: 100, desc: 'Get 3 hints to use anytime', action: () => buyItem(100, { hintCredits: (gam.hintCredits ?? 0) + 3 }, '💡 Hints') },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-bold text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
                <button
                  onClick={item.action}
                  className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-3 py-1.5 rounded-xl transition-colors"
                >
                  {item.cost} XP
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
