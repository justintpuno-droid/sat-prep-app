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

export const PRESTIGE_XP_THRESHOLD = 9500 // Level 15 xp requirement

export function getPrestigeInfo(gam) {
  const prestige = gam.prestige ?? 0
  const canPrestige = (gam.totalXP ?? 0) >= PRESTIGE_XP_THRESHOLD && prestige < 3
  const titles = ['', '⭐ Prestige I', '⭐⭐ Prestige II', '⭐⭐⭐ Prestige III']
  return { prestige, canPrestige, title: titles[prestige] ?? '' }
}

export function doPrestige(gam) {
  const info = getPrestigeInfo(gam)
  if (!info.canPrestige) return gam
  return { ...gam, totalXP: 0, prestige: (gam.prestige ?? 0) + 1 }
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
  return { ...current, next, xpIntoLevel, xpForNext, pct, minXP: current.xp }
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
  { id: 'two-fifty',    icon: '📈', title: 'Quarter Thousand', desc: 'Answer 250 questions total' },
  { id: 'five-hundred', icon: '🚀', title: 'Question Crusher', desc: 'Answer 500 questions total' },
  { id: 'thousand',     icon: '🌟', title: 'Thousand Club',    desc: 'Answer 1,000 questions total' },
  // Study time
  { id: 'hour-1',       icon: '⏱️', title: 'First Hour',        desc: 'Study for 1 hour total' },
  { id: 'hour-5',       icon: '⌛', title: 'Time Investor',     desc: 'Study for 5 hours total' },
  { id: 'hour-10',      icon: '🕐', title: 'Study Veteran',     desc: 'Study for 10 hours total' },
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
  // New achievements
  { id: 'perfect-week', icon: '🗓️',  title: 'Perfect Week',     desc: 'Score 80%+ every day for 7 consecutive days' },
  { id: 'marathon',     icon: '🏃',  title: 'Marathon Runner',  desc: 'Study for 60+ minutes in a single day' },
  { id: 'improver',     icon: '📊',  title: 'Rapid Improver',   desc: 'Beat your previous session score by 20+ points' },
  { id: 'speed-run',    icon: '💨',  title: 'Speed Runner',     desc: 'Avg under 30s/question in a session of 10+ Qs' },
  { id: 'diversity',    icon: '🌈',  title: 'Well Rounded',     desc: 'Practice 8+ different domains in a week' },
  // Extended achievements
  { id: 'domain-master-5', icon: '🗺️', title: 'Domain Commander', desc: 'Master 5 domains (≥80% accuracy, ≥20 Qs each)' },
  { id: 'xp-5000',         icon: '💎', title: 'Diamond Scholar',   desc: 'Accumulate 5,000 total XP' },
  { id: 'wrong-sprint',    icon: '🔁', title: 'Second Chance',     desc: 'Score 80%+ on a Wrong Answer Sprint' },
  { id: 'adaptive-ace',    icon: '🧠', title: 'Adaptive Ace',      desc: 'Score 90%+ on an Adaptive Quiz' },
  { id: 'streak-30',       icon: '🌙', title: 'Lunar Legend',      desc: '30-day study streak' },
  { id: 'sudden-death-5',  icon: '💀', title: 'Daredevil',         desc: 'Survive 10+ questions in a Sudden Death session' },
  { id: 'sudden-death-ace',icon: '☠️',  title: 'Untouchable',       desc: 'Complete all 30 questions in a Sudden Death session' },
  { id: 'night-grinder',   icon: '🦉', title: 'Night Grinder',     desc: 'Study after 11pm for 5 sessions' },
  { id: 'early-riser',     icon: '🌅', title: 'Early Riser',       desc: 'Study before 7am for 5 sessions' },
  { id: 'hard-elite',      icon: '💎', title: 'Hard Elite',        desc: 'Get 50 Hard questions correct' },
  { id: 'all-formats',     icon: '🎨', title: 'Format Explorer',   desc: 'Try every practice mode (Quick, Beast, Blitz, Adaptive, Sudden Death)' },
  { id: 'timed-ace',       icon: '⏱', title: 'Under Pressure',    desc: 'Score 90%+ on a Timed Challenge' },
  { id: 'xp-10000',        icon: '🌌', title: 'Galaxy Brain',      desc: 'Accumulate 10,000 total XP' },
  { id: 'vocab-10',         icon: '📖', title: 'Word Collector',    desc: 'Master 10 SAT vocabulary words' },
  { id: 'vocab-30',         icon: '📚', title: 'Vocabulary Pro',    desc: 'Master 30 SAT vocabulary words' },
  { id: 'vocab-50',         icon: '📗', title: 'Vocab Veteran',     desc: 'Master 50 SAT vocabulary words' },
  { id: 'vocab-all',        icon: '🎓', title: 'Word Master',       desc: 'Master all 200 SAT vocabulary words' },
  { id: 'formula-10',       icon: '🔢', title: 'Formula Learner',   desc: 'Master 10 math formulas in MathFlash' },
  { id: 'formula-all',      icon: '🧮', title: 'Formula God',       desc: 'Master all 56 math formulas in MathFlash' },
  { id: 'ramp-master',      icon: '📈', title: 'Ramp Master',      desc: 'Complete Ramp Mode with a perfect score (15/15)' },
  { id: 'hearts-iron',     icon: '💘', title: 'Iron Heart',        desc: 'Complete Hearts Mode without losing a single life' },
  { id: 'sat-ace',         icon: '🎯', title: 'SAT Ace',           desc: 'Score 90%+ on SAT Timed Mode' },
  { id: 'scholar',         icon: '🏫', title: 'Scholar',           desc: 'Study on 30 different days' },
  { id: 'comeback-king',   icon: '👑', title: 'Comeback King',     desc: 'Bounce back from a bad session 3 times (below 60% → 80%+)' },
  // Secret achievements (hidden until unlocked)
  { id: 'midnight-scholar', icon: '🌑', title: 'Midnight Scholar',  desc: '???', hidden: true },
  { id: 'perfect-beast',    icon: '🦁', title: 'Perfect Beast',     desc: '???', hidden: true },
  { id: 'centurion',        icon: '⚔️',  title: 'Centurion',         desc: '???', hidden: true },
  { id: 'five-in-a-day',   icon: '🔥', title: 'On Fire',           desc: '???', hidden: true },
  { id: 'speed-god',        icon: '🚀', title: 'Speed God',         desc: '???', hidden: true },
  // Session milestone achievements
  { id: 'session-5',       icon: '🎯', title: 'Getting Started',    desc: 'Complete 5 practice sessions' },
  { id: 'session-10',      icon: '🏅', title: 'Consistent Studier', desc: 'Complete 10 practice sessions' },
  { id: 'session-25',      icon: '🥈', title: 'Quarter Century',    desc: 'Complete 25 practice sessions' },
  { id: 'session-50',      icon: '🥇', title: 'Dedicated Scholar',  desc: 'Complete 50 practice sessions' },
  { id: 'session-100',     icon: '🏆', title: 'The Legend',         desc: 'Complete 100 practice sessions — legendary!' },
  // Domain expertise achievements
  { id: 'algebra-ace',     icon: '📐', title: 'Algebra Ace',        desc: '80%+ accuracy on 30+ Algebra questions' },
  { id: 'grammar-guru',    icon: '✍️',  title: 'Grammar Guru',       desc: '80%+ accuracy on 25+ Conventions questions' },
  { id: 'math-master',     icon: '🔢', title: 'Math Master',        desc: '80%+ accuracy on 60+ Math questions combined' },
  { id: 'reading-pro',     icon: '📖', title: 'Reading Pro',        desc: '80%+ accuracy on 25+ Reading & Writing questions' },
  { id: 'stats-star',      icon: '📊', title: 'Stats Star',         desc: '80%+ accuracy on 20+ Problem Solving & Data questions' },
  { id: 'geometry-genius', icon: '📏', title: 'Geometry Genius',    desc: '80%+ accuracy on 20+ Geometry questions' },
  // Milestone achievements for expanded content
  { id: 'formula-20',      icon: '📐', title: 'Formula Warrior',    desc: 'Master 20 math formulas in MathFlash' },
  { id: 'formula-40',      icon: '📏', title: 'Formula Expert',     desc: 'Master 40 math formulas in MathFlash' },
  { id: 'vocab-75',        icon: '📕', title: 'Vocab Champion',     desc: 'Master 75 SAT vocabulary words' },
  { id: 'vocab-100',       icon: '📗', title: 'Century Scholar',    desc: 'Master 100 SAT vocabulary words' },
  { id: 'vocab-150',       icon: '📘', title: 'Lexicon Master',     desc: 'Master 150 SAT vocabulary words' },
  { id: 'all-domains',     icon: '🗺️', title: 'Explorer',          desc: 'Answer 3+ questions in every one of the 8 domains' },
  { id: 'flash-perfect',   icon: '⚡', title: 'Flash Perfect',     desc: 'Know every card in a VocabFlash or MathFlash session (all correct)' },
  { id: 'dual-80',         icon: '🎓', title: 'Balanced Scholar',  desc: 'Score 80%+ on both Math and English in the same full-format session' },
  { id: 'improvement-arc', icon: '📈', title: 'Improvement Arc',   desc: 'Average of last 5 sessions beats average of first 5 by 15+ points' },
  { id: 'daily-7',         icon: '📅', title: 'Daily Devotion',    desc: 'Complete 7 Daily Challenges (streak of 7 days)' },
  { id: 'daily-30',        icon: '🗓️', title: 'Month Warrior',     desc: 'Complete 30 Daily Challenges (streak of 30 days)' },
  { id: 'daily-correct',   icon: '🎯', title: 'Daily Ace',         desc: 'Get today\'s Daily Challenge correct' },
  { id: 'adv-math-ace',   icon: '🧮', title: 'Adv. Math Ace',     desc: '80%+ accuracy on 25+ Advanced Math questions' },
  { id: 'info-master',    icon: '📰', title: 'Info Master',       desc: '80%+ accuracy on 25+ Information & Ideas questions' },
  { id: 'score-1200',     icon: '🏅', title: '1200 Club',         desc: 'Reach an estimated SAT score of 1200+' },
  { id: 'score-1400',     icon: '🥇', title: '1400 Club',         desc: 'Reach an estimated SAT score of 1400+' },
  { id: 'score-1500',     icon: '🌟', title: '1500 Elite',        desc: 'Reach an estimated SAT score of 1500+' },
  { id: 'craft-ace',      icon: '🖊️', title: 'Craft Ace',          desc: '80%+ accuracy on 25+ Craft & Structure questions' },
  { id: 'expression-ace', icon: '✏️', title: 'Expression Expert',  desc: '80%+ accuracy on 25+ Expression of Ideas questions' },
  { id: 'mission-1',     icon: '🎯', title: 'Mission Accepted',   desc: 'Claim your first Daily Mission reward' },
  { id: 'mission-10',    icon: '🏆', title: 'Mission Pro',        desc: 'Claim 10 Daily Mission rewards total' },
  { id: 'mission-sweep', icon: '⭐', title: 'Triple Sweep',       desc: 'Claim all 3 missions in a single day' },
]

const CHECKS = {
  'first-step':   (h) => h.length >= 1,
  'session-5':    (h) => h.length >= 5,
  'session-10':   (h) => h.length >= 10,
  'session-25':   (h) => h.length >= 25,
  'session-50':   (h) => h.length >= 50,
  'session-100':  (h) => h.length >= 100,
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
  'two-fifty':    (h) => h.reduce((t, s) => t + s.score.total, 0) >= 250,
  'five-hundred': (h) => h.reduce((t, s) => t + s.score.total, 0) >= 500,
  'thousand':     (h) => h.reduce((t, s) => t + s.score.total, 0) >= 1000,
  'hour-1':       (h) => h.reduce((t, s) => t + (s.elapsedSeconds ?? 0), 0) >= 3600,
  'hour-5':       (h) => h.reduce((t, s) => t + (s.elapsedSeconds ?? 0), 0) >= 18000,
  'hour-10':      (h) => h.reduce((t, s) => t + (s.elapsedSeconds ?? 0), 0) >= 36000,
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
  'perfect-week': (h) => {
    const byDay = {}
    for (const s of h) {
      const d = s.completedAt.slice(0, 10)
      if (!byDay[d] || s.score.percent > byDay[d]) byDay[d] = s.score.percent
    }
    const days = Object.entries(byDay).sort(([a], [b]) => a < b ? 1 : -1)
    let streak = 0
    for (const [, pct] of days) {
      if (pct >= 80) streak++; else break
    }
    return streak >= 7
  },
  'marathon': (h) => {
    const byDay = {}
    for (const s of h) {
      const d = s.completedAt.slice(0, 10)
      byDay[d] = (byDay[d] ?? 0) + (s.elapsedSeconds ?? 0)
    }
    return Object.values(byDay).some(t => t >= 3600)
  },
  'improver': (h) => {
    for (let i = 1; i < h.length; i++) {
      if (h[i].score.total >= 5 && h[i-1].score.total >= 5 && h[i].score.percent >= h[i-1].score.percent + 20)
        return true
    }
    return false
  },
  'speed-run': (h) => h.some(s => s.score.total >= 10 && s.elapsedSeconds > 0 && (s.elapsedSeconds / s.score.total) < 30),
  'domain-master-5': (h) => {
    const byDomain = {}
    for (const s of h) for (const q of s.questions) {
      if (!byDomain[q.domain]) byDomain[q.domain] = { c: 0, t: 0 }
      byDomain[q.domain].t++
      if ((s.answers?.[q.id] ?? null) === q.answer) byDomain[q.domain].c++
    }
    return Object.values(byDomain).filter(v => v.t >= 20 && v.c / v.t >= 0.8).length >= 5
  },
  'xp-5000':         (_h, g) => g.totalXP >= 5000,
  'wrong-sprint':    (h) => h.some(s => s.formatLabel === 'Wrong Answer Sprint' && s.score.percent >= 80),
  'adaptive-ace':    (h) => h.some(s => s.formatLabel === 'Adaptive Quiz' && s.score.percent >= 90),
  'streak-30':       (_h, g) => g.maxStreak >= 30,
  'sudden-death-5':  (h) => h.some(s => s.formatLabel === 'Sudden Death' && s.score.correct >= 10),
  'sudden-death-ace':(h) => h.some(s => s.formatLabel === 'Sudden Death' && s.score.total >= 30 && s.score.correct === s.score.total),
  'night-grinder':   (h) => h.filter(s => new Date(s.completedAt).getHours() >= 23).length >= 5,
  'early-riser':     (h) => h.filter(s => new Date(s.completedAt).getHours() < 7).length >= 5,
  'hard-elite':      (h) => {
    let n = 0
    for (const s of h) for (const q of s.questions)
      if (q.difficulty === 3 && (s.answers?.[q.id] ?? null) === q.answer) n++
    return n >= 50
  },
  'timed-ace':       (h) => h.some(s => s.formatLabel === 'Timed Challenge' && s.score.percent >= 90),
  'xp-10000':        (_h, g) => g.totalXP >= 10000,
  'all-formats':     (h) => {
    const formats = new Set(h.map(s => s.formatLabel))
    return ['Quick 5','Beast Mode','Blitz Mode','Adaptive Quiz','Sudden Death'].every(f => formats.has(f))
  },
  'diversity': (h) => {
    const mon = new Date()
    mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1))
    const monStr = mon.toISOString().slice(0, 10)
    const weekDomains = new Set(
      h.filter(s => s.completedAt.slice(0, 10) >= monStr).flatMap(s => s.questions.map(q => q.domain))
    )
    return weekDomains.size >= 8
  },
  // Secret achievements
  'midnight-scholar': (h) => h.some(s => { const hr = new Date(s.completedAt).getHours(); return hr === 0 }),
  'perfect-beast':    (h) => h.some(s => s.formatLabel === 'Beast Mode' && s.score.percent === 100),
  'centurion':        (h) => h.some(s => s.score.total >= 50),
  'five-in-a-day':   (h) => {
    const byday = {}
    for (const s of h) { const d = s.completedAt.slice(0, 10); byday[d] = (byday[d] ?? 0) + 1 }
    return Object.values(byday).some(n => n >= 5)
  },
  'speed-god':        (h) => h.some(s => s.score.total >= 10 && s.elapsedSeconds && (s.elapsedSeconds / s.score.total) < 15),
  'vocab-10':     () => { try { const v = JSON.parse(localStorage.getItem('sat_prep_vocab') ?? '{}'); return Object.values(v).filter(p => p.mastered).length >= 10 } catch { return false } },
  'vocab-30':     () => { try { const v = JSON.parse(localStorage.getItem('sat_prep_vocab') ?? '{}'); return Object.values(v).filter(p => p.mastered).length >= 30 } catch { return false } },
  'vocab-50':     () => { try { const v = JSON.parse(localStorage.getItem('sat_prep_vocab') ?? '{}'); return Object.values(v).filter(p => p.mastered).length >= 50 } catch { return false } },
  'vocab-all':    () => { try { const v = JSON.parse(localStorage.getItem('sat_prep_vocab') ?? '{}'); return Object.values(v).filter(p => p.mastered).length >= 200 } catch { return false } },
  'formula-10':   () => { try { const v = JSON.parse(localStorage.getItem('sat_prep_math_flash') ?? '{}'); return Object.values(v).filter(p => p.mastered).length >= 10 } catch { return false } },
  'formula-all':  () => { try { const v = JSON.parse(localStorage.getItem('sat_prep_math_flash') ?? '{}'); return Object.values(v).filter(p => p.mastered).length >= 56 } catch { return false } },
  'ramp-master':  (h) => h.some(s => s.formatLabel === 'Ramp Mode' && s.score.total === 15 && s.score.correct === 15),
  'hearts-iron':  (h) => h.some(s => s.formatLabel === 'Hearts Mode' && s.score.percent === 100),
  'sat-ace':      (h) => h.some(s => s.formatLabel === 'SAT Timed Mode' && s.score.percent >= 90),
  'scholar':      (h) => { const days = new Set(h.map(s => s.completedAt.slice(0, 10))); return days.size >= 30 },
  'comeback-king':(h) => { let comebacks = 0; for (let i = 1; i < h.length; i++) { if (h[i-1].score.percent < 60 && h[i].score.percent >= 80) comebacks++ } return comebacks >= 3 },
  'algebra-ace':  (h) => {
    let c = 0, t = 0
    for (const s of h) for (const q of s.questions) if (q.domain === 'algebra') { t++; if ((s.answers?.[q.id] ?? null) === q.answer) c++ }
    return t >= 30 && c / t >= 0.8
  },
  'grammar-guru': (h) => {
    let c = 0, t = 0
    for (const s of h) for (const q of s.questions) if (q.domain === 'conventions') { t++; if ((s.answers?.[q.id] ?? null) === q.answer) c++ }
    return t >= 25 && c / t >= 0.8
  },
  'math-master':  (h) => {
    let c = 0, t = 0
    const MATH = new Set(['algebra','advanced-math','geometry-trig','problem-solving-data'])
    for (const s of h) for (const q of s.questions) if (MATH.has(q.domain)) { t++; if ((s.answers?.[q.id] ?? null) === q.answer) c++ }
    return t >= 60 && c / t >= 0.8
  },
  'reading-pro':  (h) => {
    let c = 0, t = 0
    const RW = new Set(['information-ideas','craft-structure','expression-ideas','conventions'])
    for (const s of h) for (const q of s.questions) if (RW.has(q.domain)) { t++; if ((s.answers?.[q.id] ?? null) === q.answer) c++ }
    return t >= 25 && c / t >= 0.8
  },
  'stats-star':   (h) => {
    let c = 0, t = 0
    for (const s of h) for (const q of s.questions) if (q.domain === 'problem-solving-data') { t++; if ((s.answers?.[q.id] ?? null) === q.answer) c++ }
    return t >= 20 && c / t >= 0.8
  },
  'geometry-genius': (h) => {
    let c = 0, t = 0
    for (const s of h) for (const q of s.questions) if (q.domain === 'geometry-trig') { t++; if ((s.answers?.[q.id] ?? null) === q.answer) c++ }
    return t >= 20 && c / t >= 0.8
  },
  'formula-20':   () => { try { const v = JSON.parse(localStorage.getItem('sat_prep_math_flash') ?? '{}'); return Object.values(v).filter(p => p.mastered).length >= 20 } catch { return false } },
  'formula-40':   () => { try { const v = JSON.parse(localStorage.getItem('sat_prep_math_flash') ?? '{}'); return Object.values(v).filter(p => p.mastered).length >= 40 } catch { return false } },
  'vocab-75':     () => { try { const v = JSON.parse(localStorage.getItem('sat_prep_vocab') ?? '{}'); return Object.values(v).filter(p => p.mastered).length >= 75 } catch { return false } },
  'vocab-100':    () => { try { const v = JSON.parse(localStorage.getItem('sat_prep_vocab') ?? '{}'); return Object.values(v).filter(p => p.mastered).length >= 100 } catch { return false } },
  'vocab-150':    () => { try { const v = JSON.parse(localStorage.getItem('sat_prep_vocab') ?? '{}'); return Object.values(v).filter(p => p.mastered).length >= 150 } catch { return false } },
  'all-domains':  (h) => {
    const ALL = ['algebra','advanced-math','geometry-trig','problem-solving-data','information-ideas','craft-structure','expression-ideas','conventions']
    const byDomain = {}
    for (const s of h) for (const q of s.questions) { byDomain[q.domain] = (byDomain[q.domain] ?? 0) + 1 }
    return ALL.every(d => (byDomain[d] ?? 0) >= 3)
  },
  'flash-perfect': () => {
    try {
      const vocab = JSON.parse(localStorage.getItem('sat_prep_vocab_last_session') ?? 'null')
      const math = JSON.parse(localStorage.getItem('sat_prep_math_last_session') ?? 'null')
      return (vocab?.allKnew === true) || (math?.allKnew === true)
    } catch { return false }
  },
  'dual-80': (h) => h.some(s => {
    if (!s.phaseData || s.phaseData.length < 2) return false
    return s.phaseData.every(p => {
      const correct = p.questions.filter(q => (s.answers?.[q.id] ?? null) === q.answer).length
      return p.questions.length > 0 && (correct / p.questions.length) >= 0.8
    })
  }),
  'improvement-arc': (h) => {
    if (h.length < 10) return false
    const first5 = h.slice(0, 5).reduce((s, x) => s + x.score.percent, 0) / 5
    const last5 = h.slice(-5).reduce((s, x) => s + x.score.percent, 0) / 5
    return last5 - first5 >= 15
  },
  'daily-7': () => {
    try { const s = JSON.parse(localStorage.getItem('sat_prep_daily_streak') ?? '{}'); return (s.count ?? 0) >= 7 } catch { return false }
  },
  'daily-30': () => {
    try { const s = JSON.parse(localStorage.getItem('sat_prep_daily_streak') ?? '{}'); return (s.count ?? 0) >= 30 } catch { return false }
  },
  'daily-correct': () => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const s = JSON.parse(localStorage.getItem('sat_prep_daily_challenge') ?? 'null')
      return s?.date === today && s?.submitted === true && s?.correct === true
    } catch { return false }
  },
  'adv-math-ace': (h) => {
    let c = 0, t = 0
    for (const s of h) for (const q of s.questions) if (q.domain === 'advanced-math') { t++; if ((s.answers?.[q.id] ?? null) === q.answer) c++ }
    return t >= 25 && c / t >= 0.8
  },
  'info-master': (h) => {
    let c = 0, t = 0
    for (const s of h) for (const q of s.questions) if (q.domain === 'information-ideas') { t++; if ((s.answers?.[q.id] ?? null) === q.answer) c++ }
    return t >= 25 && c / t >= 0.8
  },
  'score-1200': (h) => {
    if (h.length === 0) return false
    const recent = h.slice(-5)
    const totalQ = recent.reduce((n, s) => n + s.score.total, 0)
    if (totalQ === 0) return false
    const totalC = recent.reduce((n, s) => n + s.score.correct, 0)
    const pct = totalC / totalQ
    return Math.round((400 + pct * 1200) / 10) * 10 >= 1200
  },
  'score-1400': (h) => {
    if (h.length === 0) return false
    const recent = h.slice(-5)
    const totalQ = recent.reduce((n, s) => n + s.score.total, 0)
    if (totalQ === 0) return false
    const totalC = recent.reduce((n, s) => n + s.score.correct, 0)
    const pct = totalC / totalQ
    return Math.round((400 + pct * 1200) / 10) * 10 >= 1400
  },
  'score-1500': (h) => {
    if (h.length === 0) return false
    const recent = h.slice(-5)
    const totalQ = recent.reduce((n, s) => n + s.score.total, 0)
    if (totalQ === 0) return false
    const totalC = recent.reduce((n, s) => n + s.score.correct, 0)
    const pct = totalC / totalQ
    return Math.round((400 + pct * 1200) / 10) * 10 >= 1500
  },
  'craft-ace': (h) => {
    let c = 0, t = 0
    for (const s of h) for (const q of s.questions) if (q.domain === 'craft-structure') { t++; if ((s.answers?.[q.id] ?? null) === q.answer) c++ }
    return t >= 25 && c / t >= 0.8
  },
  'expression-ace': (h) => {
    let c = 0, t = 0
    for (const s of h) for (const q of s.questions) if (q.domain === 'expression-ideas') { t++; if ((s.answers?.[q.id] ?? null) === q.answer) c++ }
    return t >= 25 && c / t >= 0.8
  },
  'mission-1': () => {
    try {
      const m = JSON.parse(localStorage.getItem('sat_prep_daily_missions') ?? 'null')
      return m && Object.keys(m.claimed ?? {}).length >= 1
    } catch { return false }
  },
  'mission-10': () => {
    try {
      const total = parseInt(localStorage.getItem('sat_prep_missions_total') ?? '0', 10)
      return total >= 10
    } catch { return false }
  },
  'mission-sweep': () => {
    try {
      const m = JSON.parse(localStorage.getItem('sat_prep_daily_missions') ?? 'null')
      const today = new Date().toISOString().slice(0, 10)
      return m?.date === today && Object.keys(m.claimed ?? {}).length >= 3
    } catch { return false }
  },
}

// ─── Storage ───────────────────────────────────────────────────────────────

const BOOST_KEY = 'sat_prep_boost_active'
export function loadBoost() { try { return JSON.parse(localStorage.getItem(BOOST_KEY)) ?? false } catch { return false } }
export function saveBoost(v) { try { localStorage.setItem(BOOST_KEY, JSON.stringify(v)) } catch {} }
export function consumeBoost() { try { localStorage.removeItem(BOOST_KEY) } catch {} }

const MEGA_BOOST_KEY = 'sat_prep_mega_boost'
export function loadMegaBoost() { try { return JSON.parse(localStorage.getItem(MEGA_BOOST_KEY)) ?? false } catch { return false } }
export function saveMegaBoost(v) { try { localStorage.setItem(MEGA_BOOST_KEY, JSON.stringify(v)) } catch {} }
export function consumeMegaBoost() { try { localStorage.removeItem(MEGA_BOOST_KEY) } catch {} }

const SHIELD_KEY = 'sat_prep_score_shield'
export function loadShield() { try { return JSON.parse(localStorage.getItem(SHIELD_KEY)) ?? false } catch { return false } }
export function saveShield(v) { try { localStorage.setItem(SHIELD_KEY, JSON.stringify(v)) } catch {} }
export function consumeShield() { try { localStorage.removeItem(SHIELD_KEY) } catch {} }

export function useStreakFreeze() {
  const gam = loadGamification()
  if ((gam.streakFreezes ?? 0) < 1) return false
  gam.streakFreezes = (gam.streakFreezes ?? 1) - 1
  gam.freezeUsedDate = new Date().toISOString().slice(0, 10)
  saveGamification(gam)
  return true
}

function defaultGam() { return { totalXP: 0, achievements: {}, maxStreak: 0, xpLog: [], boosts: 0, streakFreezes: 0 } }

export function loadGamification() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? defaultGam() }
  catch { return defaultGam() }
}

export function saveGamification(gam) {
  try { localStorage.setItem(KEY, JSON.stringify(gam)) } catch {}
}

// ─── Weekly Boss ───────────────────────────────────────────────────────────

const BOSS_KEY = 'sat_prep_boss'
const BOSSES = [
  { domain: 'algebra',            name: 'The Algebra Overlord',   icon: '🧮', hp: 100, xp: 500, flavor: 'Master of equations and unknowns' },
  { domain: 'advanced-math',      name: 'Calculus Crusher',        icon: '📐', hp: 100, xp: 500, flavor: 'Ruler of functions and exponents' },
  { domain: 'information-ideas',  name: 'The Inference Inquisitor',icon: '📖', hp: 100, xp: 500, flavor: 'Twists every passage into a trap' },
  { domain: 'craft-structure',    name: 'Lord of Language',        icon: '🖊️', hp: 100, xp: 500, flavor: 'Guardian of rhetoric and style' },
  { domain: 'problem-solving-data',name:'Data Dragon',             icon: '📊', hp: 100, xp: 500, flavor: 'Hoards statistics and graphs' },
  { domain: 'geometry-trig',      name: 'The Geometry Golem',     icon: '📏', hp: 100, xp: 500, flavor: 'Built entirely of triangles' },
  { domain: 'standard-english',   name: 'Grammar Gorgon',         icon: '🐍', hp: 100, xp: 500, flavor: 'Turns careless writers to stone' },
  { domain: 'expression-ideas',   name: 'The Revision Reaper',    icon: '✍️', hp: 100, xp: 500, flavor: 'Punishes weak transitions' },
]

function weekKey() {
  const d = new Date()
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${week}`
}

export function getWeeklyBoss() {
  const wk = weekKey()
  try {
    const stored = JSON.parse(localStorage.getItem(BOSS_KEY) ?? 'null')
    if (stored?.weekKey === wk) return stored
  } catch {}
  const seed = wk.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)
  const boss = BOSSES[Math.abs(seed) % BOSSES.length]
  const fresh = { weekKey: wk, domain: boss.domain, name: boss.name, icon: boss.icon, hp: boss.hp, xp: boss.xp, flavor: boss.flavor, currentHP: boss.hp, defeated: false }
  try { localStorage.setItem(BOSS_KEY, JSON.stringify(fresh)) } catch {}
  return fresh
}

export function saveBoss(boss) { try { localStorage.setItem(BOSS_KEY, JSON.stringify(boss)) } catch {} }

export function applyBossResult(sessionQuestions, sessionAnswers) {
  const boss = getWeeklyBoss()
  if (boss.defeated) return { ...boss, wasAlreadyDefeated: true }
  let dmg = 0
  for (const q of sessionQuestions) {
    if (q.domain === boss.domain && (sessionAnswers[q.id] ?? null) === q.answer) dmg += 10
  }
  if (dmg === 0) return boss
  const newHP = Math.max(0, boss.currentHP - dmg)
  const justDefeated = newHP === 0
  const updated = { ...boss, currentHP: newHP, defeated: justDefeated, wasAlreadyDefeated: false }
  saveBoss(updated)
  return updated
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
  const day = new Date().getDay()
  const weekendMult = (day === 0 || day === 6) ? 1.5 : 1.0
  const mult = streakMult * modeMult * weekendMult
  return { base, bonus, streakMult, modeMult, weekendMult, mult, total: Math.round((base + bonus) * mult) }
}

export function processSession(session, history, prevGam) {
  const streak = currentStreak(history)
  const xp = calcXP(session, streak)
  const oldXP = prevGam.totalXP
  // Update weekly boss progress
  const bossResult = applyBossResult(session.questions ?? [], session.answers ?? {})

  // Check daily challenge completion
  const today = new Date().toISOString().slice(0, 10)
  const thisWeek = isoWeekKey()
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

  // Weekly challenge completion
  let weeklyBonus = 0
  let weeklyCompleted = null
  if (prevGam.weeklyChallengeWeek !== thisWeek) {
    const weekStart = (() => {
      const d = new Date(); const day = d.getDay()
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); d.setHours(0,0,0,0)
      return d.toISOString().slice(0, 10)
    })()
    const weekSessions = history.filter(s => s.completedAt.slice(0, 10) >= weekStart)
    const wChallenge = getThisWeekChallenge()
    const wProgress = getWeeklyProgress(weekSessions, wChallenge)
    if (wProgress >= wChallenge.goal) {
      weeklyBonus = wChallenge.bonus
      weeklyCompleted = wChallenge
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

  // Improvement bonus: beat your last session score by ≥10%
  let improvementBonus = 0
  const lastEligible = history.filter(s => s.score.total >= 5).slice(-1)[0]
  if (lastEligible && session.score.total >= 5 && session.score.percent >= lastEligible.score.percent + 10) {
    improvementBonus = 20
  }

  // Time-of-day bonus: night owl (11pm–4am) or early bird (5am–7am)
  const nowHour = new Date().getHours()
  const isNightOwl = nowHour >= 23 || nowHour < 4
  const isEarlyBird = nowHour >= 5 && nowHour < 7
  const timeBonus = isNightOwl ? 25 : isEarlyBird ? 20 : 0
  const timeBonusLabel = isNightOwl ? '🦉 Night Owl' : isEarlyBird ? '🐦 Early Bird' : null

  // XP Boost / Mega Boost power-ups
  const boostActive = loadBoost()
  const megaBoostActive = loadMegaBoost()
  const boostMult = megaBoostActive ? 3 : boostActive ? 2 : 1
  const boostedXP = Math.round(xp.total * boostMult)
  if (megaBoostActive) consumeMegaBoost()
  else if (boostActive) consumeBoost()

  // Score Shield — if score < 60%, grant consolation XP and mark shielded
  const shieldActive = loadShield()
  const scorePct = session.score.total > 0 ? (session.score.correct / session.score.total) * 100 : 0
  const shieldConsolation = shieldActive && scorePct < 60 ? 50 : 0
  if (shieldActive) consumeShield()

  const newXP = oldXP + boostedXP + shieldConsolation + challengeBonus + weeklyBonus + comebackBonus + milestoneBonus + improvementBonus + timeBonus
  const oldLevel = getLevelInfo(oldXP)
  const newLevel = getLevelInfo(newXP)

  const totalXPEarned = boostedXP + shieldConsolation + challengeBonus + weeklyBonus + comebackBonus + milestoneBonus + improvementBonus + timeBonus
  const xpLog = [...(prevGam.xpLog ?? []), { date: today, xp: totalXPEarned }].slice(-90)

  // Award a boost at every 5-day streak milestone (5, 10, 15…)
  const prevBoosts = prevGam.boosts ?? 0
  const streakMilestone5 = streak > 0 && streak % 5 === 0
  const alreadyAwardedThisStreak = (prevGam.lastBoostStreak ?? 0) >= streak
  const newBoosts = streakMilestone5 && !alreadyAwardedThisStreak ? prevBoosts + 1 : prevBoosts
  const earnedBoost = newBoosts > prevBoosts

  // Award a streak freeze at 7-day and every 14 days thereafter
  const prevFreezes = prevGam.streakFreezes ?? 0
  const freezeMilestone = streak > 0 && (streak === 7 || (streak > 7 && streak % 14 === 0))
  const alreadyAwardedFreeze = (prevGam.lastFreezeStreak ?? 0) >= streak
  const newFreezes = freezeMilestone && !alreadyAwardedFreeze ? prevFreezes + 1 : prevFreezes
  const earnedFreeze = newFreezes > prevFreezes

  const gam = {
    ...prevGam,
    totalXP: newXP,
    maxStreak: Math.max(prevGam.maxStreak, streak),
    xpLog,
    boosts: newBoosts,
    streakFreezes: newFreezes,
    ...(earnedBoost ? { lastBoostStreak: streak } : {}),
    ...(earnedFreeze ? { lastFreezeStreak: streak } : {}),
    ...(challengeBonus > 0 ? { dailyChallengeDate: today } : {}),
    ...(weeklyBonus > 0 ? { weeklyChallengeWeek: thisWeek } : {}),
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

  // Score milestone detection (1200, 1300, 1400, 1500)
  const SCORE_MILESTONES = [1200, 1300, 1400, 1500]
  const SCORE_MILESTONE_KEY = 'sat_prep_score_milestones'
  let scoreMilestone = null
  try {
    const reachedBefore = JSON.parse(localStorage.getItem(SCORE_MILESTONE_KEY) ?? '[]')
    const allScorePcts = history.map(s => s.score.percent)
    if (allScorePcts.length >= 5) {
      const recentAvgPct = allScorePcts.slice(-10).reduce((a, b) => a + b, 0) / Math.min(allScorePcts.length, 10)
      const estScore = Math.round((400 + (recentAvgPct / 100) * 1200) / 10) * 10
      for (const m of SCORE_MILESTONES) {
        if (estScore >= m && !reachedBefore.includes(m)) {
          scoreMilestone = m
          localStorage.setItem(SCORE_MILESTONE_KEY, JSON.stringify([...reachedBefore, m]))
          break
        }
      }
    }
  } catch {}

  return { xp, boostedXP, boostActive, megaBoostActive, shieldConsolation, earnedBoost, earnedFreeze, challengeBonus, challengeCompleted, weeklyBonus, weeklyCompleted, comebackBonus, improvementBonus, milestoneBonus, sessionMilestone, personalBests, sessionRank, oldXP, newXP, oldLevel, newLevel, leveledUp: newLevel.level > oldLevel.level, newAchievements, gamification: gam, streak, earnedXP: totalXPEarned, bossResult, timeBonus, timeBonusLabel, scoreMilestone }
}

// ─── Daily goal ────────────────────────────────────────────────────────────

const DAILY_GOAL_KEY = 'sat_prep_daily_goal'
export const DEFAULT_DAILY_GOAL = 25
export const DAILY_GOAL = DEFAULT_DAILY_GOAL // keep backward compat export
export function loadDailyGoal() { try { return parseInt(localStorage.getItem(DAILY_GOAL_KEY) ?? String(DEFAULT_DAILY_GOAL), 10) } catch { return DEFAULT_DAILY_GOAL } }
export function saveDailyGoal(n) { try { localStorage.setItem(DAILY_GOAL_KEY, String(n)) } catch {} }

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

// ─── Triple Daily Challenges ────────────────────────────────────────────────

const TRIPLE_POOL = [
  // Volume
  { id: 'q15',   type: 'volume', desc: 'Answer 15 questions',        goal: 15,  unit: 'questions',    icon: '📝', bonus: 30 },
  { id: 'q30',   type: 'volume', desc: 'Answer 30 questions',        goal: 30,  unit: 'questions',    icon: '📝', bonus: 50 },
  { id: 'q50',   type: 'volume', desc: 'Answer 50 questions',        goal: 50,  unit: 'questions',    icon: '📝', bonus: 80 },
  // Accuracy
  { id: 'acc70', type: 'accuracy', desc: 'Score 70%+ in a session', goal: 70, unit: '% score',       icon: '🎯', bonus: 40 },
  { id: 'acc80', type: 'accuracy', desc: 'Score 80%+ in a session', goal: 80, unit: '% score',       icon: '🎯', bonus: 60 },
  { id: 'acc90', type: 'accuracy', desc: 'Score 90%+ in a session', goal: 90, unit: '% score',       icon: '🎯', bonus: 90 },
  // Hard questions
  { id: 'h5',    type: 'hard', desc: 'Get 5 Hard Qs correct',        goal: 5,   unit: 'Hard correct', icon: '💪', bonus: 60 },
  { id: 'h10',   type: 'hard', desc: 'Get 10 Hard Qs correct',       goal: 10,  unit: 'Hard correct', icon: '💪', bonus: 100 },
  // Sessions
  { id: 's2',    type: 'sessions', desc: 'Complete 2 sessions',      goal: 2,   unit: 'sessions',     icon: '⚡', bonus: 40 },
  { id: 's3',    type: 'sessions', desc: 'Complete 3 sessions',      goal: 3,   unit: 'sessions',     icon: '⚡', bonus: 70 },
  // Combo
  { id: 'c5',    type: 'combo', desc: 'Get a 5-answer streak',        goal: 5,   unit: 'streak',      icon: '🔥', bonus: 50 },
  { id: 'c8',    type: 'combo', desc: 'Get an 8-answer streak',       goal: 8,   unit: 'streak',      icon: '🔥', bonus: 80 },
  // Beast
  { id: 'beast', type: 'mode', desc: 'Complete a Beast Mode session', goal: 1,  unit: 'Beast session', icon: '🦁', bonus: 100 },
  // Speed
  { id: 'fast',  type: 'speed', desc: 'Avg under 60s/question (10+ Qs)', goal: 60, unit: 'sec avg', icon: '💨', bonus: 60 },
  // Variety
  { id: 'dom2',  type: 'domains', desc: 'Practice 2 different domains',  goal: 2, unit: 'domains',   icon: '🌈', bonus: 40 },
  { id: 'dom4',  type: 'domains', desc: 'Practice 4 different domains',  goal: 4, unit: 'domains',   icon: '🌈', bonus: 80 },
  // English-specific
  { id: 'eng20', type: 'english', desc: 'Answer 20 English questions',   goal: 20, unit: 'English Qs', icon: '📖', bonus: 50 },
  // Math-specific
  { id: 'math20', type: 'math', desc: 'Answer 20 Math questions',        goal: 20, unit: 'Math Qs',    icon: '🔢', bonus: 50 },
  // Daily Challenge
  { id: 'daily', type: 'daily', desc: 'Complete today\'s Daily Challenge', goal: 1, unit: 'challenge', icon: '⚡', bonus: 50 },
  // High volume
  { id: 'q100', type: 'volume', desc: 'Answer 100 questions',            goal: 100, unit: 'questions', icon: '🏆', bonus: 150 },
]

function seededPick(seed, arr, n) {
  const out = []
  const used = new Set()
  let s = seed
  while (out.length < n && out.length < arr.length) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const idx = Math.abs(s) % arr.length
    if (!used.has(idx)) { used.add(idx); out.push(arr[idx]) }
  }
  return out
}

export function getTodayTripleChallenges() {
  const d = new Date()
  const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000)
  return seededPick(day, TRIPLE_POOL, 3)
}

export function getTripleChallengeProgress(todaySessions, challenge) {
  if (challenge.type === 'volume') return todaySessions.reduce((n, s) => n + s.score.total, 0)
  if (challenge.type === 'accuracy') return todaySessions.some(s => s.score.percent >= challenge.goal) ? challenge.goal : 0
  if (challenge.type === 'hard') {
    return todaySessions.reduce((n, s) =>
      n + s.questions.filter(q => q.difficulty === 3 && (s.answers[q.id] ?? null) === q.answer).length, 0)
  }
  if (challenge.type === 'sessions') return todaySessions.length
  if (challenge.type === 'combo') return todaySessions.some(s => (s.maxCombo ?? 0) >= challenge.goal) ? challenge.goal : 0
  if (challenge.type === 'mode') return todaySessions.some(s => s.formatLabel === 'Beast Mode') ? 1 : 0
  if (challenge.type === 'speed') {
    const eligible = todaySessions.filter(s => s.score.total >= 10 && s.elapsedSeconds)
    if (eligible.length === 0) return 0
    const best = Math.min(...eligible.map(s => s.elapsedSeconds / s.score.total))
    return best <= challenge.goal ? challenge.goal : 0
  }
  if (challenge.type === 'domains') {
    const domains = new Set(todaySessions.flatMap(s => s.questions.map(q => q.domain)))
    return domains.size
  }
  if (challenge.type === 'english') {
    return todaySessions.reduce((n, s) => n + s.questions.filter(q => q.subject === 'english').length, 0)
  }
  if (challenge.type === 'math') {
    return todaySessions.reduce((n, s) => n + s.questions.filter(q => q.subject === 'math').length, 0)
  }
  if (challenge.type === 'daily') {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const dc = JSON.parse(localStorage.getItem('sat_prep_daily_challenge') ?? 'null')
      return (dc?.date === today && dc?.submitted) ? 1 : 0
    } catch { return 0 }
  }
  return 0
}

export function isChallengeComplete(todaySessions, challenge) {
  return getTripleChallengeProgress(todaySessions, challenge) >= challenge.goal
}

// ─── Weekly challenge ───────────────────────────────────────────────────────

export const WEEKLY_CHALLENGES = [
  { id: 'w-sessions-7',  goal: 7,   unit: 'sessions',      desc: 'Complete 7 sessions this week',                bonus: 300 },
  { id: 'w-questions-200', goal: 200, unit: 'questions',   desc: 'Answer 200 questions this week',               bonus: 250 },
  { id: 'w-hard-30',    goal: 30,  unit: 'Hard correct',   desc: 'Get 30 Hard questions correct this week',      bonus: 350 },
  { id: 'w-ace-5',      goal: 5,   unit: '80%+ sessions',  desc: 'Score 80%+ on 5 sessions this week',           bonus: 400 },
  { id: 'w-streak',     goal: 5,   unit: 'day streak',     desc: 'Study 5 days this week',                       bonus: 300 },
]

function isoWeekKey(date = new Date()) {
  const d = new Date(date)
  d.setHours(0,0,0,0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const year = d.getFullYear()
  const week = Math.ceil(((d - new Date(year, 0, 1)) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function getThisWeekChallenge() {
  const key = isoWeekKey()
  const num = key.split('-W')[1]
  return WEEKLY_CHALLENGES[parseInt(num, 10) % WEEKLY_CHALLENGES.length]
}

export function getWeeklyProgress(weekSessions, challenge) {
  if (challenge.id === 'w-sessions-7') return weekSessions.length
  if (challenge.id === 'w-questions-200') return weekSessions.reduce((n, s) => n + s.score.total, 0)
  if (challenge.id === 'w-hard-30') return weekSessions.reduce((n, s) =>
    n + s.questions.filter(q => q.difficulty === 3 && (s.answers[q.id] ?? null) === q.answer).length, 0)
  if (challenge.id === 'w-ace-5') return weekSessions.filter(s => s.score.percent >= 80 && s.score.total >= 10).length
  if (challenge.id === 'w-streak') {
    const days = new Set(weekSessions.map(s => s.completedAt.slice(0, 10))); return days.size
  }
  return 0
}
