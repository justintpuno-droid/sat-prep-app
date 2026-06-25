import { useMemo } from 'react'
import { loadGamification, getLevelInfo } from './utils/gamification'
import { loadDisplayName } from './ProfileScreen'
import { loadHistory } from './utils/history'

// Seeded mock leaderboard entries so they feel stable week-to-week
const MOCK_PLAYERS = [
  { name: 'Jordan K.', xp: 4820, streak: 14, icon: '🔥' },
  { name: 'Alex M.',   xp: 3950, streak: 7,  icon: '⚡' },
  { name: 'Riley T.',  xp: 2200, streak: 3,  icon: '🎯' },
  { name: 'Sam W.',    xp: 1400, streak: 5,  icon: '📚' },
  { name: 'Chris L.',  xp:  820, streak: 2,  icon: '🌱' },
]

function computeWeeklyXP(history) {
  const mon = new Date()
  const day = mon.getDay()
  mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
  mon.setHours(0, 0, 0, 0)
  return history
    .filter(s => new Date(s.completedAt) >= mon)
    .reduce((acc, s) => acc + (s.score.correct ?? 0) * 10, 0)
}

export default function FriendsTab() {
  const name = loadDisplayName() || 'You'
  const gam = loadGamification()
  const history = loadHistory()
  const levelInfo = getLevelInfo(gam.totalXP ?? 0)

  const weeklyXP = useMemo(() => computeWeeklyXP(history), [history])

  const board = useMemo(() => {
    const me = { name, xp: weeklyXP, streak: gam.streak ?? 0, icon: '👤', isMe: true }
    const all = [...MOCK_PLAYERS.map(p => ({ ...p, isMe: false })), me]
    return all.sort((a, b) => b.xp - a.xp)
  }, [name, weeklyXP, gam.streak])

  const myRank = board.findIndex(p => p.isMe) + 1

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4">
      {/* Header */}
      <div>
        <p className="text-lg font-black text-gray-900">Leaderboard</p>
        <p className="text-xs text-gray-400">Weekly XP · resets every Monday</p>
      </div>

      {/* Your rank card */}
      <div className="bg-indigo-600 rounded-2xl p-4 flex items-center justify-between text-white">
        <div>
          <p className="text-xs text-indigo-200 font-semibold">Your rank this week</p>
          <p className="text-3xl font-black">#{myRank}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-indigo-200">Weekly XP</p>
          <p className="text-xl font-black">{weeklyXP}</p>
          <p className="text-[10px] text-indigo-300">Lv{levelInfo.level} · {gam.streak ?? 0}🔥 streak</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-sm font-bold text-gray-900">Top Players</p>
        </div>
        {board.map((player, i) => {
          const rank = i + 1
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
          return (
            <div
              key={player.name}
              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${player.isMe ? 'bg-indigo-50' : ''}`}
            >
              <div className="w-7 text-center shrink-0">
                {medal
                  ? <span className="text-lg">{medal}</span>
                  : <span className="text-xs font-bold text-gray-400">#{rank}</span>}
              </div>
              <span className="text-xl shrink-0">{player.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${player.isMe ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {player.name}{player.isMe ? ' (You)' : ''}
                </p>
                <p className="text-[10px] text-gray-400">{player.streak}🔥 streak</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-black ${player.isMe ? 'text-indigo-700' : 'text-gray-700'}`}>{player.xp}</p>
                <p className="text-[9px] text-gray-300">XP</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Invite */}
      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-5 text-center">
        <p className="text-2xl mb-2">👥</p>
        <p className="text-sm font-bold text-gray-700 mb-1">Challenge your friends</p>
        <p className="text-xs text-gray-400 mb-3">Real friend leaderboards coming soon. For now, compete against top players.</p>
        <button className="bg-indigo-600 text-white text-xs font-bold px-5 py-2 rounded-xl opacity-50 cursor-not-allowed">
          Invite Friends (Soon)
        </button>
      </div>
    </div>
  )
}
