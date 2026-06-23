const KEY = 'sat_prep_gamification'

// ─── Levels ────────────────────────────────────────────────────────────────

export const LEVELS = [
  { level: 1,  xp: 0,    title: 'Freshman' },
  { level: 2,  xp: 100,  title: 'Sophomore' },
  { level: 3,  xp: 250,  title: 'Junior' },
  { level: 4,  xp: 500,  title: 'Senior' },
  { level: 5,  xp: 800,  title: 'Graduate' },
  { level: 6,  xp: 1200, title: 'Pre-Scholar' },
  { level: 7,  xp: 1700, title: 'Scholar' },
  { level: 8,  xp: 2300, title: 'Honor Roll' },
  { level: 9,  xp: 3000, title: 'Score Seeker' },
  { level: 10, xp: 3800, title: 'Test Taker' },
  { level: 11, xp: 4700, title: 'Rising Star' },
  { level: 12, xp: 5700, title: 'SAT Ready' },
  { level: 13, xp: 6800, title: 'Test Master' },
  { level: 14, xp: 8000, title: 'Score Hunter' },
  { level: 15, xp: 9500, title: '800 Legend' },
]

export function getLevelColor(level) {
  if (level >= 13) return { ring: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-300', light: 'bg-amber-50' }
  if (level >= 9)  return { ring: 'bg-violet-600', text: 'text-violet-600', border: 'border-violet-300', light: 'bg-violet-50' }
  if (level >= 5)  return { ring: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-300', light: 'bg-indigo-50' }
  return           { ring: 'bg-slate-500',  text: 'text-slate-600',  border: 'border-slate-300',  light: 'bg-slate-50' }
}

export function getLevelInfo(totalXP) {
  let current = LEVELS[0]
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].xp) { current = LEVELS[i]; break }
  }
  const nextIdx = LEVELS.findIndex(l => l.level === current.level) + 1
  const next = LEVELS[nextIdx] ?? null
  const xpIntoLevel = totalXP - current.xp
  const xpForNext = next ? next.xp - current.xp : null
  const pct = xpForNext ? Math.min(100, Math.round((xpIntoLevel / xpForNext) * 100)) : 100
  return { ...current, next, xpIntoLevel, xpForNext, pct }
}

// ─── Achievements ──────────────────────────────────────────────────────────

export const ACHIEVEMENTS = [
  // First steps
  { id: 'first-step',   icon: '🎯', title: 'First Step',       desc: 'Complete your first session' },
  // Accuracy
  { id: 'perfect',      icon: '💯', title: 'Perfectionist',    desc: 'Score 100% on a session with 10+ questions' },
  { id: 'sharp',        icon: '🏹', title: 'Sharp Shooter',    desc: 'Score 90%+ on a session with 15+ questions' },
  { id: 'consistent',   icon: '📈', title: 'On the Rise',      desc: 'Score 70%+ in 5 consecutive sessions' },
  { id: 'hat-trick',    icon: '🎩', title: 'Hat Trick',        desc: 'Score 90%+ in 3 consecutive sessions' },
  // Combos
  { id: 'combo-5',      icon: '🎯', title: 'Hot Streak',       desc: '5 correct answers in a row in one session' },
  { id: 'combo-10',     icon: '🔥', title: 'On Fire',          desc: '10 correct answers in a row in one session' },
  // Volume
  { id: 'century',      icon: '💪', title: 'Century',          desc: 'Answer 100 questions total' },
  { id: 'five-hundred', icon: '🚀', title: 'Question Crusher', desc: 'Answer 500 questions total' },
  { id: 'thousand',     icon: '🌟', title: 'Thousand Club',    desc: 'Answer 1,000 questions total' },
  // Hard questions
  { id: 'hard-worker',  icon: '🔥', title: 'Hard Worker',      desc: 'Get 25 Hard questions correct' },
  // Day streaks
  { id: 'streak-3',     icon: '🔥', title: 'On a Roll',        desc: '3-day study streak' },
  { id: 'streak-7',     icon: '⚡', title: 'Week Warrior',     desc: '7-day study streak' },
  { id: 'streak-14',    icon: '🏆', title: 'Dedicated',        desc: '14-day study streak' },
  // Time-of-day
  { id: 'early-bird',   icon: '🌅', title: 'Early Bird',       desc: 'Complete a session before 8am' },
  { id: 'night-owl',    icon: '🦉', title: 'Night Owl',        desc: 'Complete a session after 10pm' },
  // Session variety
  { id: 'grinder',      icon: '⚙️',  title: 'Grinder',          desc: 'Complete 3 sessions in a single day' },
  { id: 'comeback',     icon: '🔄', title: 'Come Back Kid',    desc: 'Score 80%+ on a Wrong Answers Drill' },
  { id: 'speed',        icon: '💨', title: 'Speed Demon',      desc: 'Avg under 45s/question in a quiz (10+ Qs)' },
  // XP milestone
  { id: 'xp-1000',      icon: '⭐', title: 'Star Scholar',     desc: 'Accumulate 1,000 total XP' },
  // Special modes
  { id: 'beast-mode',   icon: '🔥', title: 'Beast Tamer',      desc: 'Complete a Beast Mode session' },
  { id: 'blitz-10',     icon: '⚡', title: 'Blitz Champion',   desc: 'Get 10+ correct in a Blitz session' },
  { id: 'beast-ace',    icon: '🦁', title: 'Beast King',       desc: 'Score 80%+ in a Beast Mode session' },
  { id: 'domain-day',   icon: '✨', title: 'Domain Master',    desc: 'Complete a Domain of the Day session' },
  { id: 'comeback-kid', icon: '🔄', title: 'Comeback Kid',     desc: 'Earn the comeback bonus (study after missing a day)' },
]

const CHECKS = {
  'first-step':   (h) => h.length >= 1,
  'perfect':      (h) => h.some(s => s.score.percent === 100 && s.score.total >= 10),
  'sharp':        (h) => h.some(s => s.score.percent >= 90 && s.score.total >= 15),
  'consistent':   (h) => {
    let run = 0
    for (const s of [...h].reverse()) {
      if (s.score.percent >= 70) { run++; if (run >= 5) return true }
      else run = 0
    }
    return false
  },
  'hat-trick':    (h) => {
    let run = 0
    for (const s of [...h].reverse()) {
      if (s.score.percent >= 90) { run++; if (run >= 3) return true }
      else run = 0
    }
    return false
  },
  'combo-5':      (h) => h.some(s => (s.maxCombo ?? 0) >= 5),
  'combo-10':     (h) => h.some(s => (s.maxCombo ?? 0) >= 10),
  'century':      (h) => h.reduce((t, s) => t + s.score.total, 0) >= 100,
  'five-hundred': (h) => h.reduce((t, s) => t + s.score.total, 0) >= 500,
  'thousand':     (h) => h.reduce((t, s) => t + s.score.total, 0) >= 1000,
  'hard-worker':  (h) => {
    let n = 0
    for (const s of h) for (const q of s.questions)
      if (q.difficulty === 3 && (s.answers[q.id] ?? null) === q.answer) n++
    return n >= 25
  },
  'streak-3':     (_h, g) => g.maxStreak >= 3,
  'streak-7':     (_h, g) => g.maxStreak >= 7,
  'streak-14':    (_h, g) => g.maxStreak >= 14,
  'early-bird':   (h) => h.some(s => new Date(s.completedAt).getHours() < 8),
  'night-owl':    (h) => h.some(s => new Date(s.completedAt).getHours() >= 22),
  'grinder':      (h) => {
    const counts = {}
    for (const s of h) {
      const d = s.completedAt.slice(0, 10)
      counts[d] = (counts[d] || 0) + 1
    }
    return Object.values(counts).some(c => c >= 3)
  },
  'comeback':     (h) => h.some(s => s.formatLabel === 'Wrong Answers Drill' && s.score.percent >= 80),
  'speed':        (h) => h.some(s => s.mode === 'quiz' && s.score.total >= 10 && (s.elapsedSeconds / s.score.total) < 45),
  'xp-1000':      (_h, g) => g.totalXP >= 1000,
  'beast-mode':   (h) => h.some(s => s.formatLabel === 'Beast Mode'),
  'blitz-10':     (h) => h.some(s => s.formatLabel === 'Blitz Mode' && s.score.correct >= 10),
  'beast-ace':    (h) => h.some(s => s.formatLabel === 'Beast Mode' && s.score.percent >= 80),
  'domain-day':   (h) => h.some(s => s.formatLabel === 'Domain of the Day'),
  'comeback-kid': (_h, _g, ctx) => ctx?.comebackBonus > 0,
}

// ─── Storage ───────────────────────────────────────────────────────────────

function defaultGam() { return { totalXP: 0, achievements: {}, maxStreak: 0, xpLog: [] } }

export function loadGamification() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? defaultGam() }
  catch { return defaultGam() }
}

export function saveGamification(gam) {
  try { localStorage.setItem(KEY, JSON.stringify(gam)) } catch {}
}

// ─── XP + achievements ────────────────────────────────────────────────────

function currentStreak(history) {
  const dates = new Set(history.map(s => s.completedAt.slice(0, 10)))
  const d = new Date()
  let streak = 0
  while (dates.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export function calcXP(session, streak) {
  let base = 0
  for (const q of session.questions) {
    const ok = (session.answers[q.id] ?? null) === q.answer
    base += ok ? 10 : 5
    if (ok && q.difficulty === 3) base += 10
  }
  let bonus = 50
  if (session.score.percent === 100 && session.score.total >= 10) bonus += 50
  else if (session.score.percent >= 80) bonus += 25
  const streakMult = Math.min(2.0, 1 + 0.1 * Math.max(0, streak - 1))
  const modeMult = session.xpMultiplier ?? 1.0
  const mult = streakMult * modeMult
  return { base, bonus, streakMult, modeMult, mult, total: Math.round((base + bonus) * mult) }
}

export function processSession(session, history, prevGam) {
  const streak = currentStreak(history)
  const xp = calcXP(session, streak)
  const oldXP = prevGam.totalXP

  // Check daily challenge completion
  const today = new Date().toISOString().slice(0, 10)
  let challengeBonus = 0
  let challengeCompleted = null
  if (prevGam.dailyChallengeDate !== today) {
    const challenge = getTodayChallenge()
    const todaySessions = history.filter(s => s.completedAt.startsWith(today))
    const progress = getChallengeProgress(todaySessions, challenge)
    if (progress >= challenge.goal) {
      challengeBonus = challenge.bonus
      challengeCompleted = challenge
    }
  }

  // Comeback bonus: first session of the day after missing yesterday
  let comebackBonus = 0
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)
  const todaySessions = history.filter(s => s.completedAt.startsWith(today))
  const studiedYesterday = history.some(s => s.completedAt.startsWith(yesterdayStr))
  if (todaySessions.length === 1 && !studiedYesterday && history.length > 1) {
    comebackBonus = 100
  }

  const newXP = oldXP + xp.total + challengeBonus + comebackBonus + milestoneBonus
  const oldLevel = getLevelInfo(oldXP)
  const newLevel = getLevelInfo(newXP)

  const totalXPEarned = xp.total + challengeBonus + comebackBonus + milestoneBonus
  const xpLog = [...(prevGam.xpLog ?? []), { date: today, xp: totalXPEarned }].slice(-90)

  const gam = {
    ...prevGam,
    totalXP: newXP,
    maxStreak: Math.max(prevGam.maxStreak, streak),
    xpLog,
    ...(challengeBonus > 0 ? { dailyChallengeDate: today } : {}),
  }

  const newAchievements = []
  const achCtx = { comebackBonus, challengeBonus, milestoneBonus }
  for (const ach of ACHIEVEMENTS) {
    if (gam.achievements[ach.id]) continue
    if (CHECKS[ach.id]?.(history, gam, achCtx)) {
      gam.achievements[ach.id] = { unlockedAt: new Date().toISOString() }
      newAchievements.push(ach)
    }
  }

  // Session milestone bonus
  const sessionCount = history.length
  const milestoneNumbers = [5, 10, 25, 50, 100, 200, 500]
  const sessionMilestone = milestoneNumbers.includes(sessionCount) ? sessionCount : null
  const milestoneBonus = sessionMilestone ? 150 : 0

  // Session rank vs. historical average
  const prevHistory = history.slice(0, -1)
  const sessionRank = (() => {
    const allScores = prevHistory.map(s => s.score.percent).filter(n => n != null)
    if (allScores.length < 3) return null
    const avg = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    const cur = session.score.percent
    const better = allScores.filter(s => s < cur).length
    const pctBetter = Math.round((better / allScores.length) * 100)
    const isSessionPB = cur > Math.max(...allScores)
    return { avg, cur, pctBetter, isSessionPB }
  })()

  // Personal best detection (compare session domain scores vs. previous history)
  const personalBests = []
  for (const [domainId, ds] of Object.entries(session.score.byDomain)) {
    if (ds.total < 5) continue
    const curPct = Math.round((ds.correct / ds.total) * 100)
    let prevBest = null
    for (const s of prevHistory) {
      const sd = s.score?.byDomain?.[domainId]
      if (!sd || sd.total < 5) continue
      const p = Math.round((sd.correct / sd.total) * 100)
      if (prevBest === null || p > prevBest) prevBest = p
    }
    if (prevBest !== null && curPct > prevBest) personalBests.push({ domainId, curPct, prevBest })
    else if (prevBest === null && curPct >= 85 && prevHistory.some(s => s.score?.byDomain?.[domainId]?.total >= 5)) {
      // do nothing — no prior sessions with enough questions
    } else if (prevBest === null && curPct >= 85 && prevHistory.length > 0) {
      personalBests.push({ domainId, curPct, prevBest: null })
    }
  }

  return { xp, challengeBonus, challengeCompleted, comebackBonus, milestoneBonus, sessionMilestone, personalBests, sessionRank, oldXP, newXP, oldLevel, newLevel, leveledUp: newLevel.level > oldLevel.level, newAchievements, gamification: gam, streak }
}

// ─── Daily goal ────────────────────────────────────────────────────────────

export const DAILY_GOAL = 25

export function getDailyProgress(history) {
  const today = new Date().toISOString().slice(0, 10)
  return history.filter(s => s.completedAt.startsWith(today)).reduce((sum, s) => sum + s.score.total, 0)
}

// ─── Daily challenge ───────────────────────────────────────────────────────

export const DAILY_CHALLENGES = [
  { id: 'hard-5',   goal: 5,  unit: 'Hard correct', desc: 'Get 5 Hard questions correct',           bonus: 75  },
  { id: 'total-30', goal: 30, unit: 'questions',     desc: 'Answer 30 questions',                    bonus: 50  },
  { id: 'sess-2',   goal: 2,  unit: 'sessions',      desc: 'Complete 2 practice sessions',           bonus: 40  },
  { id: 'ace-1',    goal: 1,  unit: 'ace session',   desc: 'Score 80%+ on a session (15+ questions)', bonus: 60 },
  { id: 'hard-10',  goal: 10, unit: 'Hard correct',  desc: 'Get 10 Hard questions correct',          bonus: 100 },
  { id: 'total-50', goal: 50, unit: 'questions',     desc: 'Answer 50 questions',                    bonus: 75  },
  { id: 'sess-3',   goal: 3,  unit: 'sessions',      desc: 'Complete 3 practice sessions',           bonus: 60  },
]

export function getTodayChallenge() {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  const idx = Math.floor((d - start) / 86400000)
  return DAILY_CHALLENGES[idx % DAILY_CHALLENGES.length]
}

export function getChallengeProgress(todaySessions, challenge) {
  if (challenge.id.startsWith('hard-')) {
    return todaySessions.reduce((sum, s) =>
      sum + s.questions.filter(q => q.difficulty === 3 && (s.answers[q.id] ?? null) === q.answer).length, 0)
  }
  if (challenge.id.startsWith('total-')) {
    return todaySessions.reduce((sum, s) => sum + s.score.total, 0)
  }
  if (challenge.id.startsWith('sess-')) {
    return todaySessions.length
  }
  if (challenge.id.startsWith('ace-')) {
    return todaySessions.some(s => s.score.percent >= 80 && s.score.total >= 15) ? 1 : 0
  }
  return 0
}
