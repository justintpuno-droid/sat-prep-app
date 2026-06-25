import { useState, useEffect, useRef, useMemo } from 'react'
import { TAXONOMY, MATH_DOMAIN_IDS, ENG_DOMAIN_IDS } from './data/taxonomy'
import { domainById } from './data/taxonomy'
import questions from './data/questions'
import { loadHistory, getSRCount } from './utils/history'
import { SAT_VOCAB } from './data/vocab'
import { loadGamification, getLevelInfo, getLevelColor, getDailyProgress, DAILY_GOAL, loadDailyGoal, saveDailyGoal, getTodayChallenge, getChallengeProgress, getThisWeekChallenge, getWeeklyProgress, ACHIEVEMENTS, loadBoost, saveBoost, loadMegaBoost, saveMegaBoost, consumeMegaBoost, loadShield, saveShield, consumeShield, useStreakFreeze, getPrestigeInfo, doPrestige, saveGamification, getTodayTripleChallenges, getTripleChallengeProgress, isChallengeComplete, getWeeklyBoss } from './utils/gamification'
import { loadDisplayName } from './ProfileScreen'
import { MATH_FORMULAS } from './data/mathFormulas'

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

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Every expert was once a beginner.", author: "Helen Hayes" },
  { text: "Small daily improvements lead to staggering long-term results.", author: "Robin Sharma" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Anonymous" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Anonymous" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { text: "With the right preparation, any score is possible.", author: "SAT Prep Wisdom" },
  { text: "Consistency beats talent when talent doesn't work consistently.", author: "Anonymous" },
  { text: "Your future self will thank you for every study session today.", author: "Anonymous" },
]

const SAT_STRATEGIES = [
  { category: 'Reading', tip: 'Read the question before the passage. Knowing what you\'re looking for cuts reading time in half.' },
  { category: 'Math', tip: 'Plug in numbers for variable questions. If "n is even," try n=2 and check each answer.' },
  { category: 'Reading', tip: 'Wrong answers on inference questions are usually too extreme or too literal. The right answer is moderate.' },
  { category: 'Math', tip: 'Draw it. Almost every geometry problem becomes easier when you sketch it out, even roughly.' },
  { category: 'Writing', tip: 'Read the entire sentence before editing. The error often hides in context you haven\'t seen yet.' },
  { category: 'Math', tip: 'For "which could be true" questions, eliminate what MUST be false — what remains is your answer.' },
  { category: 'Reading', tip: 'Paired evidence questions: find the right answer to #1 first, THEN find its support in #2.' },
  { category: 'Writing', tip: 'Shorter is almost always better on grammar questions. Eliminate wordy options first.' },
  { category: 'Math', tip: 'Time check: you have ~75 seconds per question. If stuck at 90s, mark and move on.' },
  { category: 'Reading', tip: 'Vocabulary-in-context: cover the word, predict your own, then match to choices.' },
  { category: 'Math', tip: 'For percent problems, convert to decimals. "30% of 80" = 0.30 × 80 = 24. Faster than fractions.' },
  { category: 'Writing', tip: 'If the underlined portion is a transition word, read both sentences to judge the logical relationship.' },
  { category: 'Reading', tip: 'Main idea questions: skim the first and last sentence of each paragraph, not the whole passage.' },
  { category: 'Math', tip: 'When the problem says "set up an equation," translate word-by-word: "is" = =, "of" = ×, "more than" = +.' },
  { category: 'Strategy', tip: 'Never skip a question cold. Give every question at least 15 seconds — you might spot the answer immediately.' },
  { category: 'Strategy', tip: 'Use process of elimination aggressively. Crossing off 2 wrong answers doubles your guessing odds.' },
  { category: 'Math', tip: 'For grid-in questions, there\'s no penalty for guessing — always fill in your best estimate.' },
  { category: 'Reading', tip: '"The author suggests" = inference. Look for indirect evidence, not a stated fact.' },
  { category: 'Writing', tip: 'Commas rule: don\'t put a comma between a subject and its verb — "The student, answered" is wrong.' },
  { category: 'Strategy', tip: 'Start with questions you know, then return to hard ones. Momentum builds confidence and accuracy.' },
]

const CATEGORY_COLOR = { Reading: 'text-indigo-600 bg-indigo-50 border-indigo-100', Math: 'text-emerald-700 bg-emerald-50 border-emerald-100', Writing: 'text-violet-700 bg-violet-50 border-violet-100', Strategy: 'text-amber-700 bg-amber-50 border-amber-100' }

function scoreMilestone(score) {
  if (score >= 1500) return { label: 'Top 1%', color: 'text-amber-600 bg-amber-50' }
  if (score >= 1400) return { label: 'Top 5%', color: 'text-violet-600 bg-violet-50' }
  if (score >= 1340) return { label: 'Top 10%', color: 'text-indigo-600 bg-indigo-50' }
  if (score >= 1200) return { label: 'Top 25%', color: 'text-emerald-600 bg-emerald-50' }
  if (score >= 1060) return { label: 'Above avg', color: 'text-emerald-600 bg-emerald-50' }
  if (score >= 1000) return { label: 'Near avg', color: 'text-amber-600 bg-amber-50' }
  return { label: 'Building up', color: 'text-gray-500 bg-gray-100' }
}

function getTodayQuote() {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  const idx = Math.floor((d - start) / 86400000)
  return QUOTES[idx % QUOTES.length]
}

function getDomainOfDay() {
  const domains = TAXONOMY.flatMap(s => s.domains.map(d => ({ id: d.id, label: d.label, subject: s.label, icon: s.icon })))
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  const idx = Math.floor((d - start) / 86400000)
  return domains[idx % domains.length]
}

const SAT_TIPS = [
  "Skip hard questions first — come back with fresh eyes.",
  "On Reading: the answer is always supported by evidence in the passage.",
  "Eliminate obviously wrong choices to improve your guessing odds.",
  "On Math: plug in answer choices when algebra feels stuck.",
  "Never leave a question blank — there's no penalty for guessing.",
  "Read the question before the passage excerpt to know what to look for.",
  "On Grammar: shorter answers are usually correct on Writing questions.",
  "Check your work on math by substituting your answer back in.",
  "Manage your time: ~1.5 min per question on average.",
  "The SAT tests concepts, not memorization — understand the 'why'.",
  "For Word-in-Context questions, always read the full sentence.",
  "Mark confusing questions in your mind and return at the end.",
  "On Desmos (calculator section): graph equations to visualize problems.",
  "Passage-based: main idea questions are usually about the whole text.",
  "Always re-read your answer choice in context before confirming.",
]

const MOTIVATIONAL_QUOTES = [
  { text: "The SAT is a skill, and skills can be learned.", author: "Princeton Review" },
  { text: "Every practice question is a step toward your goal score.", author: "" },
  { text: "Progress is progress, no matter how small.", author: "" },
  { text: "Consistency beats intensity every time.", author: "" },
  { text: "Your future self will thank you for studying today.", author: "" },
  { text: "The secret to getting ahead is getting started.", author: "Mark Twain" },
  { text: "Don't practice until you get it right. Practice until you can't get it wrong.", author: "" },
  { text: "Every expert was once a beginner.", author: "" },
  { text: "Hard questions today → easy questions on test day.", author: "" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "" },
  { text: "Mistakes are proof that you're trying.", author: "" },
  { text: "Small daily improvements lead to stunning long-term results.", author: "" },
  { text: "The grind now, the glory later.", author: "" },
  { text: "Your effort today is your score tomorrow.", author: "" },
  { text: "SAT prep is a marathon, not a sprint. Stay consistent.", author: "" },
  { text: "You can't go back and change the beginning, but you can start where you are and change the ending.", author: "C.S. Lewis" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "" },
  { text: "The difference between who you are and who you want to be is what you do.", author: "" },
  { text: "Confidence comes from preparation. Prepare more, worry less.", author: "" },
  { text: "Every question you get wrong today is a question you won't miss on test day.", author: "" },
  { text: "Your score is already inside you — studying is how you unlock it.", author: "" },
  { text: "The SAT tests skills, not intelligence. Skills are learned.", author: "" },
  { text: "Sleep, practice, repeat. That's the formula.", author: "" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "What you do every day matters more than what you do once in a while.", author: "" },
  { text: "A 100-point score increase doesn't happen in a day — it happens in consistent daily 20-minute sessions.", author: "" },
  { text: "The answer is always in the passage. Trust the text, not your gut.", author: "" },
  { text: "You're not bad at math. You're new at it. There's a difference.", author: "" },
  { text: "Getting a question wrong in practice is far better than getting it wrong on test day.", author: "" },
  { text: "Every 1400+ scorer once struggled with the same questions you're working on now.", author: "" },
  { text: "The Reading section rewards patience. Read every word of the question before the passage.", author: "" },
  { text: "One month of consistent daily practice can move your score 80–150 points.", author: "" },
  { text: "Fear the regret of not trying more than the fear of getting a question wrong.", author: "" },
  { text: "You've already taken the hardest step: you started.", author: "" },
  { text: "Hard Mode unlocks when you score well on Module 1. That ceiling is the real prize.", author: "" },
  { text: "If it's hard, that's good — your brain is building new circuits.", author: "" },
  { text: "Vocabulary isn't memorization — it's pattern recognition. Read widely, score higher.", author: "" },
]

const SAT_FACTS = [
  "The SAT was first administered in 1926 and was based on Army IQ tests from World War I.",
  "The perfect SAT score of 1600 is achieved by fewer than 1% of test takers each year.",
  "The Digital SAT (2024) is about 1 hour shorter than the old paper SAT.",
  "SAT stands for 'Scholastic Assessment Test' (originally 'Scholastic Aptitude Test').",
  "The College Board offers fee waivers so low-income students can take the SAT for free.",
  "Over 2 million students take the SAT each year in the United States.",
  "The average SAT score in 2023 was 1028 out of 1600.",
  "Desmos, the graphing calculator built into the Digital SAT, was founded in 2011.",
  "The Digital SAT adapts difficulty based on Module 1 performance — scoring high unlocks harder (higher-ceiling) questions in Module 2.",
  "You can cancel your SAT score within 5 days of your test date if you're unhappy — it won't appear on your record.",
  "Many colleges now use 'superscoring' — they take the highest section scores from multiple test dates.",
  "The SAT Reading & Writing module has 4 question types: Information & Ideas, Craft & Structure, Expression of Ideas, and Standard English Conventions.",
  "The Digital SAT testing window is roughly 2 hours and 14 minutes including a 10-minute break.",
  "A score of 1200 on the SAT puts you in approximately the 74th percentile nationally.",
  "Guessing never hurts on the SAT — there's no penalty for wrong answers, so always fill in an answer.",
  "The Bluebook app for the Digital SAT goes into lockdown mode during the test, blocking other apps.",
  "SAT scores are 'superscorable' — most elite colleges take the highest Math and EBRW from separate test dates.",
  "The SAT offers 7 official test dates per year in the US, typically Aug, Oct, Nov, Dec, Mar, May, and Jun.",
  "About 60% of the SAT Math section involves algebra and functions — more than any other topic.",
  "You can flag questions in the Digital SAT and come back to them before submitting each module.",
  "On the Digital SAT, each Reading & Writing module has 27 questions; each Math module has 22 questions.",
  "The SAT has no dedicated vocabulary section — vocab is tested through 'Words in Context' questions embedded in passages.",
  "There is no time limit per individual question on the SAT; you manage your own time within each module.",
  "The SAT is scored on a section scale: 200–800 for Math and 200–800 for Reading & Writing, totaling 400–1600.",
  "Top-10 US universities typically admit students with SAT scores above 1500; median admits are often 1470–1570.",
  "The SAT Math section covers algebra, advanced math, geometry, and problem-solving/data — roughly in equal thirds for easy/medium/hard.",
  "The SAT Reading & Writing section tests four skills: Words in Context, Text Structure & Purpose, Cross-Text Connections, and Standard English Conventions.",
  "Students who take the SAT more than once often score higher the second time — practice and familiarity help significantly.",
  "The 'hard' questions on the Digital SAT Module 2 are worth the same number of points as easy ones — never skip a guess!",
  "Fee waivers for the SAT also cover two free college application fee waivers from the College Board's partners.",
  "The College Board partners with Khan Academy for free, personalized SAT prep — linking your PSAT results gives the best study plan.",
  "The PSAT/NMSQT is taken in 10th or 11th grade and can qualify high scorers for National Merit Scholarship recognition.",
  "Each SAT Reading & Writing passage is 25–150 words — much shorter than old SAT passages, so you spend more time on strategy.",
  "In Math Module 2 on the hard path, about 5–7 of the 22 questions are rated 'hard' — they're the gateway to 700+ Math scores.",
  "Students can take the SAT as many times as they want — there's no official limit, though testing fees add up.",
  "The College Board reports that students who practice with official materials score an average of 90 points higher on retakes.",
  "On the Digital SAT, scratch paper is allowed — use it freely for math and for annotating reading passages.",
  "A 1400 SAT score places you in approximately the 95th percentile of all test takers nationally.",
  "The 'Evidence-Based' naming is gone in the Digital SAT — it's now simply 'Math' and 'Reading and Writing.'",
  "College Board no longer sends physical score reports by default — everything is digital through your College Board account.",
  "The hardest Reading & Writing question type statistically is Cross-Text Connections — it requires comparing two separate passages.",
  "In the Digital SAT, the annotation tool lets you highlight and take notes directly on passages without pen and paper.",
]

const QOD_KEY = 'sat_prep_qod'
function loadQOD() { try { return JSON.parse(localStorage.getItem(QOD_KEY)) ?? {} } catch { return {} } }
function saveQOD(data) { try { localStorage.setItem(QOD_KEY, JSON.stringify(data)) } catch {} }

const SPIN_KEY = 'sat_prep_spin'
function loadSpin() { try { return JSON.parse(localStorage.getItem(SPIN_KEY)) ?? {} } catch { return {} } }
function saveSpin(data) { try { localStorage.setItem(SPIN_KEY, JSON.stringify(data)) } catch {} }
const SPIN_PRIZES = [
  { label: '+50 XP', icon: '⭐', color: 'text-amber-600 bg-amber-50', xp: 50, prob: 0.40 },
  { label: '+100 XP', icon: '💎', color: 'text-indigo-600 bg-indigo-50', xp: 100, prob: 0.25 },
  { label: '2× next session', icon: '🚀', color: 'text-violet-600 bg-violet-50', xp: 0, boost: true, prob: 0.20 },
  { label: '+200 XP', icon: '🔥', color: 'text-rose-600 bg-rose-50', xp: 200, prob: 0.10 },
  { label: 'Streak Freeze', icon: '🧊', color: 'text-blue-600 bg-blue-50', xp: 0, freeze: true, prob: 0.05 },
]
function spinPrize(seed) {
  let r = seed - Math.floor(seed), cumulative = 0
  for (const p of SPIN_PRIZES) { cumulative += p.prob; if (r < cumulative) return p }
  return SPIN_PRIZES[0]
}

const WEEKLY_XP_KEY = 'sat_prep_weekly_xp_goal'
function loadWeeklyXPGoal() { try { return parseInt(localStorage.getItem(WEEKLY_XP_KEY) ?? '500', 10) } catch { return 500 } }
function saveWeeklyXPGoal(v) { try { localStorage.setItem(WEEKLY_XP_KEY, String(v)) } catch {} }

const GOAL_KEY = 'sat_prep_goal'
function loadGoalData() { try { return JSON.parse(localStorage.getItem(GOAL_KEY)) ?? {} } catch { return {} } }
function loadGoal() { return loadGoalData().target ?? null }
function loadExamDate() { return loadGoalData().examDate ?? null }
function saveGoalData(data) { try { localStorage.setItem(GOAL_KEY, JSON.stringify({ ...loadGoalData(), ...data })) } catch {} }
function saveGoal(t) { saveGoalData({ target: t }) }
function saveExamDate(d) { saveGoalData({ examDate: d }) }

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr + 'T12:00:00') - new Date()
  return Math.ceil(diff / 86400000)
}

function VocabWordOfDay() {
  const w = useMemo(() => {
    const dayIdx = Math.floor(Date.now() / 86400000)
    return SAT_VOCAB[dayIdx % SAT_VOCAB.length]
  }, [])
  const [showExample, setShowExample] = useState(false)
  if (!w) return null
  return (
    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">📖</span>
        <p className="text-xs font-bold text-violet-600 uppercase tracking-widest">SAT Word of the Day</p>
      </div>
      <p className="text-xl font-black text-gray-900 mb-1">{w.word}</p>
      <p className="text-sm text-gray-600 leading-snug">{w.def}</p>
      {showExample ? (
        <p className="mt-2 text-xs text-gray-500 italic leading-snug">"{w.example}"</p>
      ) : (
        <button onClick={() => setShowExample(true)} className="mt-2 text-xs text-violet-500 hover:text-violet-700 font-medium transition-colors">
          See example sentence →
        </button>
      )}
    </div>
  )
}

const SHOP_ITEMS = [
  { id: 'boost',   icon: '🚀', name: '2× XP Boost',       desc: 'Double XP on your next session', cost: 150, color: 'border-violet-200 bg-violet-50', tag: 'text-violet-600', textColor: 'text-violet-900' },
  { id: 'freeze',  icon: '🧊', name: 'Streak Freeze',      desc: 'Protect your streak for one day', cost: 200, color: 'border-blue-200 bg-blue-50',   tag: 'text-blue-600',   textColor: 'text-blue-900' },
  { id: 'hint',    icon: '💡', name: 'Hint Pack (×5)',     desc: 'Eliminate a wrong answer 5 times', cost: 100, color: 'border-amber-200 bg-amber-50', tag: 'text-amber-600', textColor: 'text-amber-900' },
  { id: 'spin',    icon: '🎰', name: 'Extra Spin',         desc: 'Spin the wheel again today', cost: 75,  color: 'border-emerald-200 bg-emerald-50', tag: 'text-emerald-600', textColor: 'text-emerald-900' },
  { id: 'megaboost', icon: '⚡', name: '3× XP Mega Boost', desc: 'Triple XP for your next session — go all out!', cost: 350, color: 'border-rose-200 bg-rose-50', tag: 'text-rose-600', textColor: 'text-rose-900' },
  { id: 'shield',  icon: '🛡️', name: 'Score Shield',       desc: 'Skip your next session from the score average if below 60%', cost: 250, color: 'border-teal-200 bg-teal-50', tag: 'text-teal-600', textColor: 'text-teal-900' },
]

function XPShop({ gam, onPurchase }) {
  const [open, setOpen] = useState(false)
  const [bought, setBought] = useState({})
  const [flash, setFlash] = useState(null)
  const xp = gam.totalXP ?? 0
  const boosts = gam.boosts ?? 0
  const freezes = gam.streakFreezes ?? 0
  const hints = gam.hintCredits ?? 0

  function buy(item) {
    if (xp < item.cost || bought[item.id]) return
    setBought(prev => ({ ...prev, [item.id]: true }))
    onPurchase(item)
    setFlash(item.id)
    setTimeout(() => setFlash(null), 1500)
  }

  const canAfford = (cost) => xp >= cost

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl px-4 py-3 hover:border-amber-400 transition-all active:scale-[0.98] mb-4"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🛒</span>
          <div className="text-left">
            <p className="text-sm font-black text-amber-900">XP Shop</p>
            <p className="text-xs text-amber-600">Spend XP on power-ups</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-amber-700">⭐ {xp.toLocaleString()} XP</p>
          <p className="text-[10px] text-amber-500">available</p>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="bg-white w-full max-w-md rounded-t-3xl px-5 pt-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-lg font-black text-gray-900">XP Shop</p>
                <p className="text-xs text-gray-400">⭐ {xp.toLocaleString()} XP available</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            {/* Inventory */}
            <div className="flex gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-violet-600 font-semibold bg-violet-50 border border-violet-100 rounded-xl px-3 py-1.5">🚀 {boosts} boost{boosts !== 1 ? 's' : ''}</div>
              <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5">🧊 {freezes} freeze{freezes !== 1 ? 's' : ''}</div>
              <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5">💡 {hints} hints</div>
            </div>
            <div className="space-y-3">
              {SHOP_ITEMS.map(item => {
                const affordable = canAfford(item.cost)
                const justBought = flash === item.id
                return (
                  <div key={item.id} className={`flex items-center justify-between rounded-2xl border-2 p-4 ${item.color}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className={`text-sm font-black ${item.textColor}`}>{item.name}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => buy(item)}
                      disabled={!affordable || !!bought[item.id]}
                      className={`shrink-0 ml-3 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        justBought ? 'bg-emerald-500 text-white' :
                        bought[item.id] ? 'bg-gray-200 text-gray-400 cursor-default' :
                        affordable ? `bg-amber-400 text-amber-900 hover:bg-amber-500 active:scale-95` :
                        'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {justBought ? '✓ Bought!' : bought[item.id] ? 'Owned' : `⭐ ${item.cost}`}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function DailySpin() {
  const today = new Date().toISOString().slice(0, 10)
  const initData = useMemo(() => loadSpin(), [])
  const alreadySpun = initData.date === today
  const [spinning, setSpinning] = useState(false)
  const [prize, setPrize] = useState(alreadySpun ? initData.prize : null)

  if (alreadySpun && prize === null) return null

  function doSpin() {
    if (spinning || prize) return
    setSpinning(true)
    setTimeout(() => {
      const won = spinPrize(Math.random())
      setPrize(won)
      saveSpin({ date: today, prize: won })
      if (won.boost) saveBoost(true)
      if (won.freeze) { const g = loadGamification(); g.streakFreezes = (g.streakFreezes ?? 0) + 1; saveGamification(g) }
      if (won.xp > 0) { const g = loadGamification(); g.totalXP = (g.totalXP ?? 0) + won.xp; g.xpLog = [...(g.xpLog ?? []), { date: today, xp: won.xp }].slice(-90); saveGamification(g) }
      setSpinning(false)
    }, 1200)
  }

  return (
    <div className={`rounded-2xl border-2 p-4 mb-4 ${prize ? 'border-amber-200 bg-amber-50' : 'border-indigo-100 bg-white'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🎰</span>
        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Daily Spin</p>
        {prize && <span className="ml-auto text-xs text-amber-500 font-semibold">Today's reward</span>}
      </div>
      {prize ? (
        <div className="flex items-center gap-3">
          <span className={`text-3xl px-4 py-2 rounded-xl ${prize.color}`}>{prize.icon}</span>
          <div>
            <p className="font-black text-gray-900 text-lg">{prize.label}</p>
            <p className="text-xs text-gray-400">Claimed today · Come back tomorrow!</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {SPIN_PRIZES.map((p, i) => (
              <div key={i} className={`text-lg ${spinning ? 'animate-bounce' : ''}`} style={{ animationDelay: `${i * 100}ms` }}>{p.icon}</div>
            ))}
          </div>
          <button
            onClick={doSpin}
            disabled={spinning}
            className={`ml-auto text-sm font-black px-5 py-2 rounded-xl transition-all ${spinning ? 'bg-gray-200 text-gray-400' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-lg active:scale-95'}`}
          >
            {spinning ? 'Spinning...' : '🎰 Spin!'}
          </button>
        </div>
      )}
    </div>
  )
}

function QuestionOfDay({ allQuestions }) {
  const today = new Date().toISOString().slice(0, 10)
  const qodData = useMemo(() => loadQOD(), [])
  const [answer, setAnswer] = useState(qodData.date === today ? qodData.answer : null)
  const [revealed, setRevealed] = useState(qodData.date === today && qodData.answer !== undefined)

  const q = useMemo(() => {
    const dayIdx = Math.floor(new Date() / 86400000)
    const seed = dayIdx % Math.max(1, allQuestions.length)
    return allQuestions[seed]
  }, [allQuestions])

  if (!q) return null
  const isCorrect = answer === q.answer

  function handlePick(optId) {
    if (revealed) return
    setAnswer(optId)
    setRevealed(true)
    saveQOD({ date: today, answer: optId, questionId: q.id })
  }

  const DIFF_COLOR = { 1: 'text-emerald-600', 2: 'text-amber-600', 3: 'text-rose-600' }
  const DIFF_LABEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' }

  return (
    <div className="bg-white border-2 border-indigo-100 rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">⭐ Question of the Day</span>
        <span className={`text-xs font-semibold ${DIFF_COLOR[q.difficulty] ?? 'text-gray-400'}`}>
          {DIFF_LABEL[q.difficulty] ?? ''}
        </span>
        {revealed && (
          <span className={`ml-auto text-sm font-black ${isCorrect ? 'text-emerald-600' : 'text-rose-500'}`}>
            {isCorrect ? '✓ Correct!' : '✗ Missed'}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-800 leading-relaxed mb-3 whitespace-pre-line line-clamp-4">{q.question}</p>
      <div className="space-y-2">
        {(q.options ?? []).map(opt => {
          let cls = 'border-gray-200 bg-white text-gray-700 hover:border-indigo-200 cursor-pointer'
          if (revealed) {
            if (opt.id === q.answer) cls = 'border-emerald-500 bg-emerald-50 text-emerald-800'
            else if (opt.id === answer) cls = 'border-rose-400 bg-rose-50 text-rose-700'
            else cls = 'border-gray-100 bg-white text-gray-300'
          } else if (answer === opt.id) {
            cls = 'border-indigo-500 bg-indigo-50 text-indigo-900'
          }
          return (
            <button key={opt.id} onClick={() => handlePick(opt.id)} disabled={revealed}
              className={`w-full text-left rounded-xl border-2 px-3 py-2 text-xs flex items-center gap-2 transition-all ${cls}`}>
              <span className="font-bold w-4 shrink-0">{opt.id}</span>
              <span className="flex-1">{opt.text}</span>
              {revealed && opt.id === q.answer && <span className="shrink-0 text-emerald-500 font-bold">✓</span>}
              {revealed && opt.id === answer && opt.id !== q.answer && <span className="shrink-0 text-rose-400 font-bold">✗</span>}
            </button>
          )
        })}
      </div>
      {revealed && q.explanation && (
        <div className={`mt-3 rounded-xl p-3 text-xs leading-relaxed ${isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-50 text-gray-600'}`}>
          <span className="font-semibold">Explanation: </span>{q.explanation}
        </div>
      )}
      {revealed && (
        <p className={`mt-2 text-xs font-semibold text-center ${isCorrect ? 'text-emerald-500' : 'text-gray-400'}`}>
          {isCorrect ? '⚡ +15 XP — come back tomorrow for a new question!' : 'Review this — come back tomorrow for a new question!'}
        </p>
      )}
    </div>
  )
}

const QOH_KEY = 'sat_prep_qoh'
function loadQOH() { try { return JSON.parse(localStorage.getItem(QOH_KEY)) ?? {} } catch { return {} } }
function saveQOH(d) { try { localStorage.setItem(QOH_KEY, JSON.stringify(d)) } catch {} }

function QuestionOfHour({ allQuestions, onXP }) {
  const hardQs = useMemo(() => allQuestions.filter(q => q.difficulty === 3), [allQuestions])
  const hourKey = useMemo(() => {
    const n = new Date()
    return `${n.toISOString().slice(0, 10)}_${n.getHours()}`
  }, [])
  const qohData = useMemo(() => loadQOH(), [])
  const [answer, setAnswer] = useState(qohData.hourKey === hourKey ? qohData.answer : null)
  const [revealed, setRevealed] = useState(qohData.hourKey === hourKey && qohData.answer !== undefined)
  const [minsLeft, setMinsLeft] = useState(() => 59 - new Date().getMinutes())

  const q = useMemo(() => {
    const hourIdx = Math.floor(Date.now() / 3600000)
    return hardQs[hourIdx % Math.max(1, hardQs.length)]
  }, [hardQs])

  useEffect(() => {
    const t = setInterval(() => setMinsLeft(59 - new Date().getMinutes()), 30000)
    return () => clearInterval(t)
  }, [])

  if (!q || hardQs.length === 0) return null
  const isCorrect = answer === q.answer

  function handlePick(optId) {
    if (revealed) return
    setAnswer(optId)
    setRevealed(true)
    saveQOH({ hourKey, answer: optId, questionId: q.id })
    if (optId === q.answer && onXP) onXP(50)
  }

  return (
    <div className="bg-gradient-to-br from-violet-900 to-indigo-900 border border-violet-700 rounded-2xl p-4 mb-4 text-white">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-violet-300 uppercase tracking-widest">⚡ Question of the Hour</span>
        <span className="text-xs font-semibold text-rose-300">Hard</span>
        <span className="ml-auto text-xs text-violet-400">🕐 ~{minsLeft}m left</span>
        {revealed && (
          <span className={`text-sm font-black ml-1 ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isCorrect ? '✓' : '✗'}
          </span>
        )}
      </div>
      <p className="text-sm text-violet-100 leading-relaxed mb-3 line-clamp-4">{q.question}</p>
      <div className="space-y-1.5">
        {(q.options ?? []).map(opt => {
          let cls = 'border-violet-700 bg-violet-800/50 text-violet-200 hover:border-violet-500 cursor-pointer'
          if (revealed) {
            if (opt.id === q.answer) cls = 'border-emerald-400 bg-emerald-900/40 text-emerald-300'
            else if (opt.id === answer) cls = 'border-rose-400 bg-rose-900/40 text-rose-300'
            else cls = 'border-violet-800 bg-transparent text-violet-500'
          }
          return (
            <button key={opt.id} onClick={() => handlePick(opt.id)} disabled={revealed}
              className={`w-full text-left rounded-xl border px-3 py-2 text-xs flex items-center gap-2 transition-all ${cls}`}>
              <span className="font-bold w-4 shrink-0">{opt.id}</span>
              <span>{opt.text}</span>
            </button>
          )
        })}
      </div>
      {revealed && (
        <p className={`mt-2.5 text-xs font-semibold text-center ${isCorrect ? 'text-emerald-400' : 'text-violet-400'}`}>
          {isCorrect ? '⭐ +50 XP! Come back next hour for a new challenge.' : 'Next hard question drops next hour!'}
        </p>
      )}
    </div>
  )
}

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

export default function TopicSelector({ onStart, onHistory, onQuestionBank, onQuickPractice, onQuick5, onAdaptiveQuiz, onWrongAnswerSprint, onProblemAreasDrill, onSuddenDeath, onTimedChallenge, onFullPractice, onAchievements, onFocusPractice, onSkillFocus, onBeastMode, onBlitzMode, onFlaggedReview, onSpacedRepetition, onVocab, onMathFlash, onHeadToHead, onProfile, onSATTimed, onHeartsMode, onSurvivalMode, onRampMode, onWrongJournal, onQuickAssessment, onPowerHour, onStrategyGuide, onStudyNotes, onGrammarRef, onMathRef, onDigitalSAT, onBreathing, onScoreCalculator, onConfidenceBooster, onSATStory, pendingXP, onClearPendingXP }) {
  const history = useMemo(() => loadHistory(), [])
  const streak = useMemo(() => computeStreak(history), [history])
  const streakAtRisk = useMemo(() => {
    if (streak < 2) return false
    const hour = new Date().getHours()
    if (hour < 18) return false
    const today = new Date().toISOString().slice(0, 10)
    return !history.some(s => s.completedAt.slice(0, 10) === today)
  }, [streak, history])
  const [boostActive, setBoostActive] = useState(() => loadBoost())
  const [megaBoostActive, setMegaBoostActive] = useState(() => loadMegaBoost())
  const [shieldActive, setShieldActive] = useState(() => loadShield())
  const [freezeCount, setFreezeCount] = useState(() => loadGamification().streakFreezes ?? 0)
  const [freezeUsed, setFreezeUsed] = useState(false)
  const [gam, setGam] = useState(() => loadGamification())
  const levelInfo = useMemo(() => getLevelInfo(gam.totalXP), [gam])
  const levelColor = useMemo(() => getLevelColor(levelInfo.level), [levelInfo])
  const [examDate, setExamDate] = useState(() => loadExamDate())
  const [editingExam, setEditingExam] = useState(false)
  const daysLeft = useMemo(() => daysUntil(examDate), [examDate])
  const [customDailyGoal, setCustomDailyGoal] = useState(() => loadDailyGoal())
  const [editingDailyGoal, setEditingDailyGoal] = useState(false)
  const [dailyGoalInput, setDailyGoalInput] = useState('')
  const effectiveDailyGoal = customDailyGoal
  const dailyProgress = useMemo(() => getDailyProgress(history), [history])
  const dailyDone = dailyProgress >= effectiveDailyGoal
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

  const tripleToday = useMemo(() => getTodayTripleChallenges(), [])
  const tripleProgress = useMemo(() => tripleToday.map(c => getTripleChallengeProgress(todaySessions, c)), [todaySessions, tripleToday])
  const tripleComplete = useMemo(() => tripleToday.map((c, i) => tripleProgress[i] >= c.goal), [tripleProgress, tripleToday])
  const allTripleComplete = tripleComplete.every(Boolean)
  const totalTripleBonus = tripleToday.reduce((n, c) => n + c.bonus, 0)

  const [prestigeInfo, setPrestigeInfo] = useState(() => getPrestigeInfo(loadGamification()))
  const [showPrestigeConfirm, setShowPrestigeConfirm] = useState(false)

  function handleShopPurchase(item) {
    const current = loadGamification()
    let updated = { ...current, totalXP: (current.totalXP ?? 0) - item.cost }
    if (item.id === 'boost') { saveBoost(true) }
    else if (item.id === 'megaboost') { saveMegaBoost(true) }
    else if (item.id === 'shield') { saveShield(true) }
    else if (item.id === 'freeze') { updated.streakFreezes = (updated.streakFreezes ?? 0) + 1 }
    else if (item.id === 'hint') { updated.hintCredits = (updated.hintCredits ?? 0) + 5 }
    else if (item.id === 'spin') { localStorage.removeItem('sat_prep_spin') }
    saveGamification(updated)
    setGam(updated)
  }

  function handlePrestige() {
    const currentGam = loadGamification()
    const updated = doPrestige(currentGam)
    saveGamification(updated)
    setPrestigeInfo(getPrestigeInfo(updated))
    setShowPrestigeConfirm(false)
    window.location.reload()
  }

  const todayQuote = useMemo(() => getTodayQuote(), [])
  const domainOfDay = useMemo(() => getDomainOfDay(), [])
  const weekQs = useMemo(() => {
    const mon = new Date()
    const day = mon.getDay()
    mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
    const monStr = mon.toISOString().slice(0, 10)
    return history.filter(s => s.completedAt.slice(0, 10) >= monStr).reduce((sum, s) => sum + s.score.total, 0)
  }, [history])
  const daysIntoWeek = useMemo(() => {
    const d = new Date().getDay()
    return d === 0 ? 7 : d
  }, [])

  const totalStudyTime = useMemo(() => history.reduce((sum, s) => sum + (s.elapsedSeconds ?? 0), 0), [history])
  const bestScore = useMemo(() => {
    if (history.length === 0) return null
    const best = Math.max(...history.map(s => s.score.percent))
    return { pct: best, est: Math.round((400 + (best / 100) * 1200) / 10) * 10 }
  }, [history])

  const uniqueQCount = useMemo(() => {
    const seen = new Set()
    for (const s of history) for (const q of s.questions) seen.add(q.id)
    return seen.size
  }, [history])

  // Daily Login Reward
  const LOGIN_REWARD_KEY = 'sat_prep_login_reward'
  const [loginReward, setLoginReward] = useState(() => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const data = JSON.parse(localStorage.getItem(LOGIN_REWARD_KEY) ?? '{}')
      if (data.lastClaimed === today) return null
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().slice(0, 10)
      const consec = data.lastClaimed === yStr ? (data.consecutive ?? 0) + 1 : 1
      const rewards = [25, 50, 75, 100, 150, 100, 250]
      const xp = rewards[Math.min(consec - 1, rewards.length - 1)]
      return { consec, xp, isMilestone: consec === 7 || consec % 7 === 0 }
    } catch { return null }
  })
  const [loginRewardClaimed, setLoginRewardClaimed] = useState(false)

  const MOOD_KEY = 'sat_prep_mood'
  const [mood, setMood] = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem(MOOD_KEY) ?? '{}')
      return d.date === new Date().toISOString().slice(0, 10) ? d.mood : null
    } catch { return null }
  })
  function saveMood(m) {
    try { localStorage.setItem(MOOD_KEY, JSON.stringify({ date: new Date().toISOString().slice(0, 10), mood: m })) } catch {}
    setMood(m)
  }

  const MOODS = [
    { id: 'energized', icon: '💪', label: 'Energized', color: 'bg-emerald-500', lightBg: 'bg-emerald-50', text: 'text-emerald-700', suggestion: 'Beast Mode', suggestDesc: 'Push your limits today!', action: onBeastMode },
    { id: 'focused',   icon: '🎯', label: 'Focused',   color: 'bg-indigo-500', lightBg: 'bg-indigo-50', text: 'text-indigo-700',  suggestion: 'SAT Timed',  suggestDesc: 'Simulate real exam conditions.', action: onSATTimed },
    { id: 'okay',      icon: '😊', label: 'Okay',      color: 'bg-amber-400',  lightBg: 'bg-amber-50',  text: 'text-amber-700',  suggestion: 'Quick Practice', suggestDesc: 'A solid 15-question session.', action: onQuickPractice },
    { id: 'tired',     icon: '😴', label: 'Tired',     color: 'bg-blue-400',   lightBg: 'bg-blue-50',   text: 'text-blue-700',   suggestion: 'Blitz Mode',  suggestDesc: 'Short and punchy — just 15 min.', action: onBlitzMode },
    { id: 'confused',  icon: '😕', label: 'Stuck',     color: 'bg-violet-500', lightBg: 'bg-violet-50', text: 'text-violet-700', suggestion: 'Wrong Answer Sprint', suggestDesc: 'Review mistakes to unlock patterns.', action: onWrongAnswerSprint },
  ]
  const currentMood = MOODS.find(m => m.id === mood)

  function claimLoginReward() {
    if (!loginReward || loginRewardClaimed) return
    try {
      const today = new Date().toISOString().slice(0, 10)
      const prev = JSON.parse(localStorage.getItem(LOGIN_REWARD_KEY) ?? '{}')
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().slice(0, 10)
      const consec = prev.lastClaimed === yStr ? (prev.consecutive ?? 0) + 1 : 1
      localStorage.setItem(LOGIN_REWARD_KEY, JSON.stringify({ lastClaimed: today, consecutive: consec }))
    } catch {}
    const updated = { ...loadGamification(), totalXP: (loadGamification().totalXP ?? 0) + loginReward.xp }
    saveGamification(updated)
    setGam(updated)
    setLoginRewardClaimed(true)
    setTimeout(() => setLoginReward(null), 1500)
  }

  const streakRecovery = useMemo(() => {
    if (streak > 0 || history.length < 3) return null
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    const dayBefore = new Date(today); dayBefore.setDate(today.getDate() - 2)
    const yStr = yesterday.toISOString().slice(0, 10)
    const dbStr = dayBefore.toISOString().slice(0, 10)
    // Check if student had a streak that ended yesterday or day before
    const studiedDates = new Set(history.map(s => s.completedAt.slice(0, 10)))
    if (!studiedDates.has(yStr) && !studiedDates.has(dbStr)) return null
    // Compute what the streak was
    let prevStreak = 0
    let d = new Date(yesterday)
    while (studiedDates.has(d.toISOString().slice(0, 10))) {
      prevStreak++
      d.setDate(d.getDate() - 1)
    }
    if (prevStreak < 2) return null
    const todaySessCount = history.filter(s => s.completedAt.startsWith(today.toISOString().slice(0, 10))).length
    return { prevStreak, todaySessCount }
  }, [streak, history])

  const dailyTip = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const seed = today.split('-').reduce((a, b) => a + parseInt(b, 10), 0)
    return SAT_TIPS[(seed + 7) % SAT_TIPS.length]
  }, [])

  const dailyQuote = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const seed = today.split('-').reduce((a, b) => a + parseInt(b, 10), 0)
    return MOTIVATIONAL_QUOTES[seed % MOTIVATIONAL_QUOTES.length]
  }, [])

  const weeklyFocusPlan = useMemo(() => {
    if (history.length < 5) return null
    const byDomain = {}
    for (const s of history) {
      for (const q of s.questions) {
        if (!byDomain[q.domain]) byDomain[q.domain] = { c: 0, t: 0 }
        byDomain[q.domain].t++
        if ((s.answers[q.id] ?? null) === q.answer) byDomain[q.domain].c++
      }
    }
    const allDomainIds = new Set(questions.map(q => q.domain))
    const unpracticed = [...allDomainIds]
      .filter(id => !byDomain[id] || byDomain[id].t < 3)
      .slice(0, 2)
      .map(id => ({ id, label: domainById[id]?.label ?? id, status: 'new' }))
    const struggling = Object.entries(byDomain)
      .filter(([, v]) => v.t >= 5 && (v.c / v.t) < 0.7)
      .sort(([, a], [, b]) => (a.c / a.t) - (b.c / b.t))
      .slice(0, 3)
      .map(([id, v]) => ({ id, label: domainById[id]?.label ?? id, pct: Math.round((v.c / v.t) * 100), status: 'weak' }))
    const focus = [...struggling, ...unpracticed].slice(0, 3)
    if (focus.length === 0) return null
    return focus
  }, [history])

  const tomorrowFocus = useMemo(() => {
    if (history.length < 5) return null
    const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const cutoff = threeDaysAgo.toISOString().slice(0, 10)
    const recentDomains = new Set(
      history.filter(s => s.completedAt.slice(0, 10) >= cutoff).flatMap(s => s.questions.map(q => q.domain))
    )
    const byDomain = {}
    for (const s of history) {
      const day = s.completedAt.slice(0, 10)
      for (const q of s.questions) {
        if (!byDomain[q.domain]) byDomain[q.domain] = { correct: 0, total: 0, lastSeen: day }
        byDomain[q.domain].total++
        byDomain[q.domain].lastSeen = day > byDomain[q.domain].lastSeen ? day : byDomain[q.domain].lastSeen
        if ((s.answers[q.id] ?? null) === q.answer) byDomain[q.domain].correct++
      }
    }
    const candidate = Object.entries(byDomain)
      .filter(([id, s]) => s.total >= 5 && !recentDomains.has(id) && (s.correct / s.total) < 0.75)
      .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))[0]
    if (!candidate) return null
    const [id, st] = candidate
    const daysSince = Math.round((Date.now() - new Date(st.lastSeen + 'T12:00:00').getTime()) / 86400000)
    return { id, label: domainById[id]?.label ?? id, pct: Math.round((st.correct / st.total) * 100), daysSince }
  }, [history])

  const persistentMistakes = useMemo(() => {
    const wrongCount = {}
    const correctCount = {}
    for (const s of history) {
      for (const q of s.questions) {
        const answered = s.answers[q.id] ?? null
        if (answered !== null) {
          if (answered === q.answer) correctCount[q.id] = (correctCount[q.id] ?? 0) + 1
          else wrongCount[q.id] = (wrongCount[q.id] ?? 0) + 1
        }
      }
    }
    return Object.entries(wrongCount)
      .filter(([id, w]) => w >= 2 && !(correctCount[id] >= w))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, w]) => ({ id, wrongCount: w }))
  }, [history])

  const masteredTopics = useMemo(() => {
    const byDomain = {}
    for (const s of history) {
      for (const q of s.questions) {
        if (!byDomain[q.domain]) byDomain[q.domain] = { c: 0, t: 0 }
        byDomain[q.domain].t++
        if ((s.answers[q.id] ?? null) === q.answer) byDomain[q.domain].c++
      }
    }
    return Object.entries(byDomain).filter(([, v]) => v.t >= 20 && v.c / v.t >= 0.8).length
  }, [history])

  const recentWrongCount = useMemo(() => {
    const ids = new Set()
    for (const s of history.slice(-10)) {
      for (const q of s.questions) {
        if ((s.answers[q.id] ?? null) !== q.answer) ids.add(q.id)
      }
    }
    return ids.size
  }, [history])

  const scoreEstimate = useMemo(() => {
    const eligible = history.filter(s => s.score.total >= 10).slice(-20)
    if (eligible.length < 3) return null
    const avgAcc = eligible.reduce((sum, x) => sum + x.score.percent, 0) / eligible.length / 100
    const map = [
      [0.95, 1450, 1550], [0.90, 1350, 1450], [0.85, 1250, 1350],
      [0.80, 1150, 1250], [0.75, 1050, 1150], [0.70, 950, 1050],
      [0.65, 850, 950],   [0.60, 750, 850],   [0.55, 650, 750], [0, 400, 649],
    ]
    const band = map.find(([thresh]) => avgAcc >= thresh)
    if (!band) return null

    // Per-section estimates
    const mathSections = history.filter(s => {
      const ids = s.questions?.map(q => q.domain) ?? []
      return ids.some(d => ['algebra','advanced-math','problem-solving-data','geometry-trig'].includes(d))
    }).slice(-15)
    const engSections = history.filter(s => {
      const ids = s.questions?.map(q => q.domain) ?? []
      return ids.some(d => ['information-ideas','craft-structure','expression-ideas','standard-english'].includes(d))
    }).slice(-15)
    const mathAcc = mathSections.length >= 2
      ? mathSections.reduce((s, x) => s + x.score.percent, 0) / mathSections.length / 100
      : avgAcc
    const engAcc = engSections.length >= 2
      ? engSections.reduce((s, x) => s + x.score.percent, 0) / engSections.length / 100
      : avgAcc
    const toSection = (acc) => Math.round((200 + acc * 600) / 10) * 10
    const mathScore = toSection(mathAcc)
    const engScore = toSection(engAcc)

    // Trend vs 5 sessions ago
    const old5 = history.filter(s => s.score.total >= 10).slice(-10, -5)
    const oldAcc = old5.length >= 2 ? old5.reduce((s, x) => s + x.score.percent, 0) / old5.length / 100 : null
    const trend = oldAcc !== null ? (avgAcc > oldAcc + 0.03 ? 'up' : avgAcc < oldAcc - 0.03 ? 'down' : 'flat') : null

    const SAT_PERCENTILES = [
      [1580, 99], [1530, 99], [1490, 98], [1450, 96], [1410, 93],
      [1370, 90], [1330, 86], [1290, 82], [1240, 76], [1200, 72],
      [1150, 63], [1110, 57], [1060, 49], [1010, 41], [960, 33],
      [910, 26], [860, 19], [810, 13], [760, 8], [710, 4], [650, 1],
    ]
    const midScore = Math.round((band[1] + band[2]) / 2)
    const row = SAT_PERCENTILES.find(([s]) => midScore >= s)
    const percentile = row ? row[1] : 1

    // All-time improvement: first 3 eligible vs. current
    const firstSessions = history.filter(s => s.score.total >= 10).slice(0, 5)
    let improvementPoints = null
    if (firstSessions.length >= 3) {
      const earlyAcc = firstSessions.reduce((s, x) => s + x.score.percent, 0) / firstSessions.length / 100
      const earlyMid = Math.round((400 + earlyAcc * 1200) / 10) * 10
      improvementPoints = midScore - earlyMid
    }

    return { lo: band[1], hi: band[2], mathScore, engScore, trend, percentile, midScore, improvementPoints }
  }, [history])

  const momentum = useMemo(() => {
    const recent = history.filter(s => s.score.total >= 5).slice(-7)
    if (recent.length < 4) return null
    const pts = recent.map(s => s.score.percent)
    const last3avg = pts.slice(-3).reduce((a, b) => a + b, 0) / 3
    const prev3avg = pts.slice(-6, -3).reduce((a, b) => a + b, 0) / Math.max(1, pts.slice(-6, -3).length)
    const trend = last3avg - prev3avg
    return { pts, trend, label: trend > 5 ? '🔥 Hot zone!' : trend < -5 ? '📉 Bounce back!' : '💪 Steady' }
  }, [history])

  const miniCalendar = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (13 - i))
      const key = d.toISOString().slice(0, 10)
      const daySessions = history.filter(s => s.completedAt.startsWith(key))
      if (daySessions.length === 0) return { key, status: 'none' }
      const best = Math.max(...daySessions.map(s => s.score.percent))
      return { key, status: best >= 80 ? 'great' : best >= 60 ? 'ok' : 'low' }
    })
    const studied = days.filter(d => d.status !== 'none').length
    return { days, studied }
  }, [history])

  const scoreTrend = useMemo(() => {
    const eligible = history.filter(s => s.score.total >= 5).slice(-15)
    if (eligible.length < 4) return null
    return eligible.map(s => s.score.percent)
  }, [history])

  const lastSessionSummary = useMemo(() => {
    if (history.length === 0) return null
    const s = history[history.length - 1]
    const ago = (() => {
      const diff = (Date.now() - new Date(s.completedAt)) / 60000
      if (diff < 60) return `${Math.round(diff)}m ago`
      if (diff < 1440) return `${Math.round(diff / 60)}h ago`
      return `${Math.round(diff / 1440)}d ago`
    })()
    const domains = [...new Set(s.questions.map(q => q.domain))]
      .slice(0, 2).map(id => domainById[id]?.label ?? id).join(', ')
    return { pct: s.score.percent, correct: s.score.correct, total: s.score.total, ago, formatLabel: s.formatLabel, domains }
  }, [history])

  const timeToNextLevel = useMemo(() => {
    if (history.length < 3) return null
    const recent5 = history.slice(-5)
    const xpPerSession = recent5.reduce((sum, s) => sum + s.score.correct * 10 + (s.score.total - s.score.correct) * 5, 0) / recent5.length
    if (xpPerSession < 10) return null
    const gap = levelInfo.xpForNext ? (levelInfo.xpForNext - levelInfo.xpIntoLevel) : null
    if (!gap) return null
    const sessions = Math.ceil(gap / xpPerSession)
    return sessions <= 50 ? sessions : null
  }, [history, levelInfo])

  const bestStudyTime = useMemo(() => {
    if (history.length < 8) return null
    const tod = { morning: { c: 0, t: 0 }, afternoon: { c: 0, t: 0 }, evening: { c: 0, t: 0 } }
    for (const s of history) {
      const h = new Date(s.completedAt).getHours()
      const b = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
      tod[b].t += s.score.total; tod[b].c += s.score.correct
    }
    const best = Object.entries(tod)
      .filter(([, v]) => v.t >= 10)
      .sort(([, a], [, b]) => (b.c / b.t) - (a.c / a.t))[0]
    if (!best) return null
    const [name, stats] = best
    const pct = Math.round((stats.c / stats.t) * 100)
    const emoji = { morning: '🌅', afternoon: '☀️', evening: '🌙' }[name]
    const label = { morning: 'morning', afternoon: 'afternoon', evening: 'evening' }[name]
    return { label, emoji, pct }
  }, [history])

  const dailyTarget = useMemo(() => {
    if (history.length < 3) return null
    const todayStr = new Date().toISOString().slice(0, 10)
    const studiedToday = history.some(s => s.completedAt.startsWith(todayStr))
    if (studiedToday) return null
    if (weakDomain && weakDomain.pct < 60) {
      const label = domainById[weakDomain.id]?.label ?? weakDomain.id
      return { text: `Drill 10 ${label} questions`, icon: '🎯', color: 'text-rose-600 bg-rose-50 border-rose-200' }
    }
    const recent5 = history.filter(s => s.score.total >= 5).slice(-5)
    if (recent5.length >= 3) {
      const avg = recent5.reduce((s, x) => s + x.score.percent, 0) / recent5.length
      if (avg < 65) return { text: 'Focus on accuracy today — aim for 70%+', icon: '📈', color: 'text-amber-600 bg-amber-50 border-amber-200' }
      if (avg >= 80) return { text: 'Ready for Hard mode? Push your limits today', icon: '💪', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' }
    }
    return { text: 'Complete a 15-question session to keep your streak', icon: '🔥', color: 'text-orange-600 bg-orange-50 border-orange-200' }
  }, [history, weakDomain])

  const hotDomainThisWeek = useMemo(() => {
    const mon = new Date()
    const day = mon.getDay()
    mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
    const monStr = mon.toISOString().slice(0, 10)
    const weekSessions = history.filter(s => s.completedAt.slice(0, 10) >= monStr)
    if (weekSessions.length < 2) return null
    const byDomain = {}
    for (const s of weekSessions) {
      for (const q of s.questions) {
        if (!byDomain[q.domain]) byDomain[q.domain] = { correct: 0, total: 0 }
        byDomain[q.domain].total++
        if ((s.answers[q.id] ?? null) === q.answer) byDomain[q.domain].correct++
      }
    }
    const best = Object.entries(byDomain)
      .filter(([, v]) => v.total >= 5 && (v.correct / v.total) >= 0.8)
      .sort(([, a], [, b]) => (b.correct / b.total) - (a.correct / a.total))[0]
    if (!best) return null
    const [id, st] = best
    return { id, label: domainById[id]?.label ?? id, pct: Math.round((st.correct / st.total) * 100), total: st.total }
  }, [history])

  const bestOfWeek = useMemo(() => {
    const mon = new Date()
    const day = mon.getDay()
    mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
    const monStr = mon.toISOString().slice(0, 10)
    const weekSessions = history.filter(s => s.completedAt.slice(0, 10) >= monStr && s.score.total >= 5)
    if (weekSessions.length < 2) return null
    const best = weekSessions.reduce((a, b) => b.score.percent > a.score.percent ? b : a)
    const dateStr = new Date(best.completedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    return { pct: best.score.percent, date: dateStr, label: best.formatLabel }
  }, [history])

  const totalFlagged = useMemo(() => {
    let count = 0
    for (const s of history) count += (s.flaggedIds ?? []).length
    return count
  }, [history])

  const srDueCount = useMemo(() => getSRCount(), [history])

  const examReadiness = useMemo(() => {
    if (history.length < 5) return null
    const recent10 = history.filter(s => s.score.total >= 5).slice(-10)
    if (recent10.length < 5) return null
    const pcts = recent10.map(s => s.score.percent)
    const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length
    const stdDev = Math.sqrt(pcts.reduce((s, v) => s + (v - mean) ** 2, 0) / pcts.length)
    const older = pcts.slice(0, Math.floor(pcts.length / 2))
    const newer = pcts.slice(Math.floor(pcts.length / 2))
    const trend = (newer.reduce((a, b) => a + b, 0) / newer.length) - (older.reduce((a, b) => a + b, 0) / older.length)
    const accuracyScore = mean
    const trendScore = Math.max(0, Math.min(100, 50 + trend * 2))
    const consistencyScore = Math.max(0, 100 - stdDev * 3)
    const score = Math.round(0.5 * accuracyScore + 0.3 * trendScore + 0.2 * consistencyScore)
    const label = score >= 85 ? 'Test Ready!' : score >= 70 ? 'Almost there' : score >= 55 ? 'Making progress' : 'Keep studying'
    const color = score >= 85 ? 'text-emerald-600' : score >= 70 ? 'text-indigo-600' : score >= 55 ? 'text-amber-600' : 'text-rose-500'
    return { score, label, color }
  }, [history])

  const qMilestone = useMemo(() => {
    const totalQ = history.reduce((sum, s) => sum + s.score.total, 0)
    const milestones = [100, 500, 1000, 2000, 5000]
    const next = milestones.find(m => m > totalQ)
    if (!next) return null
    return { next, gap: next - totalQ, totalQ }
  }, [history])

  const [weeklyXPGoal, setWeeklyXPGoal] = useState(() => loadWeeklyXPGoal())
  const [editingWeeklyXP, setEditingWeeklyXP] = useState(false)
  const [weeklyXPInput, setWeeklyXPInput] = useState('')
  const weekXP = useMemo(() => {
    const mon = new Date()
    const day = mon.getDay()
    mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
    const monStr = mon.toISOString().slice(0, 10)
    // Approximate XP from sessions this week using stored totalXP delta - not tracked per session, so use question count as proxy
    // Each correct answer ≈ 10 XP, each wrong ≈ 5 XP
    let xp = 0
    for (const s of history) {
      if (s.completedAt.slice(0, 10) < monStr) continue
      xp += s.score.correct * 10 + (s.score.total - s.score.correct) * 5
    }
    return xp
  }, [history])

  const weeklyChallenge = useMemo(() => {
    const challenge = getThisWeekChallenge()
    const now = new Date(); const day = now.getDay()
    const monday = new Date(now); monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1)); monday.setHours(0,0,0,0)
    const weekSessions = history.filter(s => new Date(s.completedAt) >= monday)
    const progress = getWeeklyProgress(weekSessions, challenge)
    const gam = loadGamification()
    const weekKey = (() => {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + 4 - (d.getDay() || 7))
      const y = d.getFullYear(); const w = Math.ceil(((d - new Date(y,0,1))/86400000+1)/7)
      return `${y}-W${String(w).padStart(2,'0')}`
    })()
    const done = gam.weeklyChallengeWeek === weekKey
    return { challenge, progress, done, weekSessions: weekSessions.length }
  }, [history])

  const weeklySessionCount = useMemo(() => {
    const mon = new Date()
    const day = mon.getDay()
    mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1))
    const monStr = mon.toISOString().slice(0, 10)
    return history.filter(s => s.completedAt.slice(0, 10) >= monStr).length
  }, [history])

  const dailyXPSparkline = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      let xp = 0
      for (const s of history) {
        if (s.completedAt.slice(0, 10) === key) {
          xp += s.score.correct * 10 + (s.score.total - s.score.correct) * 5
        }
      }
      days.push({ key, xp, label: ['S','M','T','W','T','F','S'][d.getDay()] })
    }
    return days
  }, [history])

  const xpWeekRace = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const thisMonday = new Date(now); thisMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); thisMonday.setHours(0,0,0,0)
    const lastMonday = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7)
    const calcXP = (from, to) => history
      .filter(s => { const d = new Date(s.completedAt); return d >= from && d < to })
      .reduce((n, s) => n + s.score.correct * 10 + (s.score.total - s.score.correct) * 5, 0)
    const thisWeek = calcXP(thisMonday, new Date(thisMonday.getTime() + 7 * 86400000))
    const lastWeek = calcXP(lastMonday, thisMonday)
    const lastWeekSessions = history.filter(s => { const d = new Date(s.completedAt); return d >= lastMonday && d < thisMonday })
    const lastWeekDays = new Set(lastWeekSessions.map(s => s.completedAt.slice(0, 10))).size
    const lastWeekQ = lastWeekSessions.reduce((n, s) => n + s.score.total, 0)
    const lastWeekC = lastWeekSessions.reduce((n, s) => n + s.score.correct, 0)
    const lastWeekPct = lastWeekQ > 0 ? Math.round((lastWeekC / lastWeekQ) * 100) : 0
    return { thisWeek, lastWeek, diff: thisWeek - lastWeek, dayOfWeek, lastWeekSessions: lastWeekSessions.length, lastWeekDays, lastWeekQ, lastWeekPct }
  }, [history])

  const recentAchievements = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    return Object.entries(gam.achievements)
      .filter(([, v]) => new Date(v.unlockedAt).getTime() > cutoff)
      .map(([id]) => ACHIEVEMENTS.find(a => a.id === id))
      .filter(Boolean)
  }, [gam])

  const nearUnlocks = useMemo(() => {
    const byDomain = {}
    for (const s of history) for (const q of s.questions) {
      if (!byDomain[q.domain]) byDomain[q.domain] = { c: 0, t: 0 }
      byDomain[q.domain].t++
      if ((s.answers?.[q.id] ?? null) === q.answer) byDomain[q.domain].c++
    }
    const hardCorrect = history.reduce((n, s) => {
      for (const q of s.questions) if (q.difficulty === 3 && (s.answers[q.id] ?? null) === q.answer) n++
      return n
    }, 0)
    const dates = new Set(history.map(s => s.completedAt.slice(0, 10)))
    const d = new Date(); let streak = 0
    while (dates.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
    const totalQ = history.reduce((n, s) => n + s.score.total, 0)
    const masteredDomains = Object.values(byDomain).filter(v => v.t >= 20 && v.c / v.t >= 0.8).length
    const progressFor = {
      'century':      Math.min(100, Math.round((totalQ / 100) * 100)),
      'five-hundred': Math.min(100, Math.round((totalQ / 500) * 100)),
      'thousand':     Math.min(100, Math.round((totalQ / 1000) * 100)),
      'xp-1000':      Math.min(100, Math.round((gam.totalXP / 1000) * 100)),
      'xp-5000':      Math.min(100, Math.round((gam.totalXP / 5000) * 100)),
      'xp-10000':     Math.min(100, Math.round((gam.totalXP / 10000) * 100)),
      'streak-3':     Math.min(100, Math.round((streak / 3) * 100)),
      'streak-7':     Math.min(100, Math.round((streak / 7) * 100)),
      'streak-14':    Math.min(100, Math.round((streak / 14) * 100)),
      'hard-worker':  Math.min(100, Math.round((hardCorrect / 25) * 100)),
      'hard-elite':   Math.min(100, Math.round((hardCorrect / 50) * 100)),
      'domain-master-5': Math.min(100, Math.round((masteredDomains / 5) * 100)),
    }
    return ACHIEVEMENTS
      .filter(a => !gam.achievements[a.id] && progressFor[a.id] !== undefined && progressFor[a.id] >= 30)
      .map(a => ({ ...a, pct: progressFor[a.id] }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3)
  }, [history, gam])

  const domainCoverage = useMemo(() => {
    const totalByDomain = {}
    for (const q of questions) totalByDomain[q.domain] = (totalByDomain[q.domain] ?? 0) + 1
    const seenByDomain = {}
    for (const s of history) for (const q of s.questions) {
      if (!seenByDomain[q.domain]) seenByDomain[q.domain] = new Set()
      seenByDomain[q.domain].add(q.id)
    }
    return Object.entries(totalByDomain).map(([id, total]) => ({
      id, total, seen: seenByDomain[id]?.size ?? 0,
      pct: Math.round(((seenByDomain[id]?.size ?? 0) / total) * 100)
    })).sort((a, b) => b.pct - a.pct)
  }, [history])

  const domainMastery = useMemo(() => {
    const stats = {}
    for (const sess of history) {
      for (const q of sess.questions) {
        if (!stats[q.domain]) stats[q.domain] = { correct: 0, total: 0 }
        stats[q.domain].total++
        if ((sess.answers[q.id] ?? null) === q.answer) stats[q.domain].correct++
      }
    }
    const result = {}
    for (const [id, s] of Object.entries(stats)) {
      const p = s.total > 0 ? s.correct / s.total : 0
      if (s.total >= 100 && p >= 0.85) result[id] = { icon: '🏆', label: 'Master', color: 'text-amber-500' }
      else if (s.total >= 60 && p >= 0.75) result[id] = { icon: '🏅', label: 'Skilled', color: 'text-indigo-500' }
      else if (s.total >= 30 && p >= 0.60) result[id] = { icon: '⭐', label: 'Capable', color: 'text-violet-500' }
      else if (s.total >= 10) result[id] = { icon: '📚', label: 'Learner', color: 'text-emerald-500' }
    }
    return result
  }, [history])

  const domainStats = useMemo(() => {
    const stats = {}
    for (const sess of history) {
      for (const q of sess.questions) {
        if (!stats[q.domain]) stats[q.domain] = { correct: 0, total: 0, sessions: [] }
        stats[q.domain].total++
        if ((sess.answers[q.id] ?? null) === q.answer) stats[q.domain].correct++
      }
    }
    const result = {}
    for (const [id, s] of Object.entries(stats)) {
      if (s.total < 3) continue
      const overall = Math.round((s.correct / s.total) * 100)
      result[id] = { pct: overall }
    }
    // Compute trend: recent 3 sessions accuracy vs older 3
    const recentSessions = history.slice(-6)
    const olderSessions = history.slice(-12, -6)
    for (const id of Object.keys(result)) {
      const calc = (sesses) => {
        let c = 0, t = 0
        for (const sess of sesses) {
          for (const q of sess.questions) {
            if (q.domain !== id) continue
            t++
            if ((sess.answers[q.id] ?? null) === q.answer) c++
          }
        }
        return t >= 3 ? Math.round((c / t) * 100) : null
      }
      const r = calc(recentSessions), o = calc(olderSessions)
      if (r !== null && o !== null) {
        const delta = r - o
        result[id].trend = delta >= 5 ? '↑' : delta <= -5 ? '↓' : null
        result[id].trendColor = delta >= 5 ? 'text-emerald-500' : delta <= -5 ? 'text-rose-500' : 'text-gray-400'
      }
    }
    return result
  }, [history])

  const nextAchievement = useMemo(() => {
    const totalQ = history.reduce((t, s) => t + s.score.total, 0)
    const hardCorrect = history.reduce((t, s) => t + s.questions.filter(q => q.difficulty === 3 && (s.answers[q.id] ?? null) === q.answer).length, 0)
    const maxStreakSoFar = gam.maxStreak
    const trackable = [
      { id: 'century',     label: 'Century',         icon: '💪', cur: totalQ,         goal: 100  },
      { id: 'five-hundred',label: 'Question Crusher', icon: '🚀', cur: totalQ,         goal: 500  },
      { id: 'thousand',    label: 'Thousand Club',    icon: '🌟', cur: totalQ,         goal: 1000 },
      { id: 'hard-worker', label: 'Hard Worker',      icon: '🔥', cur: hardCorrect,    goal: 25   },
      { id: 'xp-1000',     label: 'Star Scholar',     icon: '⭐', cur: gam.totalXP,    goal: 1000 },
      { id: 'streak-3',    label: 'On a Roll',        icon: '🔥', cur: maxStreakSoFar, goal: 3    },
      { id: 'streak-7',    label: 'Week Warrior',     icon: '⚡', cur: maxStreakSoFar, goal: 7    },
      { id: 'streak-14',   label: 'Dedicated',        icon: '🏆', cur: maxStreakSoFar, goal: 14   },
    ]
    return trackable
      .filter(a => !gam.achievements[a.id] && a.cur < a.goal)
      .map(a => ({ ...a, pct: Math.round((a.cur / a.goal) * 100) }))
      .sort((a, b) => b.pct - a.pct)[0] ?? null
  }, [history, gam])

  const scoreTrajectory = useMemo(() => {
    if (!goalTarget || !daysLeft || daysLeft <= 0) return null
    const tenPlus = history.filter(s => s.score.total >= 10)
    if (tenPlus.length < 6) return null
    const toScore = (pct) => Math.round((400 + (pct / 100) * 1200) / 10) * 10
    const avg = (arr) => arr.reduce((sum, s) => sum + s.score.percent, 0) / arr.length
    const recent = tenPlus.slice(-3)
    const older = tenPlus.slice(-6, -3)
    const recentScore = toScore(avg(recent))
    const olderScore = toScore(avg(older))
    const gainPer3Sess = recentScore - olderScore
    const sessionsPerWeek = (history.length / Math.max(1, (Date.now() - new Date(history[0].completedAt)) / 604800000))
    const weeksLeft = daysLeft / 7
    const projected = Math.min(1600, Math.round(recentScore + gainPer3Sess * (sessionsPerWeek * weeksLeft / 3)))
    return { recentScore, projected, onTrack: projected >= goalTarget, gainPer3Sess }
  }, [history, goalTarget, daysLeft])

  const weakDomain = useMemo(() => {
    const byDomain = {}
    for (const sess of history) {
      for (const q of sess.questions) {
        if (!byDomain[q.domain]) byDomain[q.domain] = { correct: 0, total: 0 }
        byDomain[q.domain].total++
        if ((sess.answers[q.id] ?? null) === q.answer) byDomain[q.domain].correct++
      }
    }
    return Object.entries(byDomain)
      .filter(([, s]) => s.total >= 5)
      .map(([id, s]) => ({ id, pct: Math.round((s.correct / s.total) * 100) }))
      .sort((a, b) => a.pct - b.pct)[0] ?? null
  }, [history])

  const recentWeakDomains = useMemo(() => {
    if (history.length < 3) return []
    const recent = history.slice(-3)
    const byDomain = {}
    for (const sess of recent) {
      for (const q of sess.questions) {
        if (!byDomain[q.domain]) byDomain[q.domain] = { correct: 0, total: 0, id: q.domain }
        byDomain[q.domain].total++
        if ((sess.answers[q.id] ?? null) === q.answer) byDomain[q.domain].correct++
      }
    }
    return Object.values(byDomain)
      .filter(d => d.total >= 3)
      .map(d => ({ ...d, pct: Math.round((d.correct / d.total) * 100), label: domainById[d.id]?.label ?? d.id }))
      .filter(d => d.pct < 60)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3)
  }, [history])

  const weakSkills = useMemo(() => {
    if (history.length < 3) return []
    const bySkill = {}
    for (const sess of history) {
      for (const q of sess.questions) {
        if (!q.skill) continue
        if (!bySkill[q.skill]) bySkill[q.skill] = { correct: 0, total: 0, domain: q.domain }
        bySkill[q.skill].total++
        if ((sess.answers[q.id] ?? null) === q.answer) bySkill[q.skill].correct++
      }
    }
    const { skillById: skMap } = require('./data/taxonomy')
    return Object.entries(bySkill)
      .filter(([, s]) => s.total >= 5)
      .map(([id, s]) => ({ id, pct: Math.round((s.correct / s.total) * 100), total: s.total, domain: s.domain, label: skMap?.[id]?.label ?? id }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3)
  }, [history])

  const powerDay = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const todaySess = history.filter(s => s.completedAt.startsWith(todayStr))
    if (todaySess.length < 3) return false
    return todaySess.reduce((sum, s) => sum + s.score.percent, 0) / todaySess.length >= 80
  }, [history])

  const diffReady = useMemo(() => {
    if (history.length < 5) return null
    const recent = history.slice(-5)
    let medC = 0, medT = 0, hardT = 0
    for (const s of recent) for (const q of s.questions) {
      if (q.difficulty === 2) { medT++; if ((s.answers[q.id] ?? null) === q.answer) medC++ }
      if (q.difficulty === 3) hardT++
    }
    const medPct = medT >= 10 ? Math.round((medC / medT) * 100) : null
    return medPct !== null && medPct >= 80 && hardT < 20 ? medPct : null
  }, [history])

  const practiceTestReady = useMemo(() => {
    const eligible = history.filter(s => s.score.total >= 5).slice(-5)
    if (eligible.length < 5) return false
    return eligible.every(s => s.score.percent >= 75)
  }, [history])

  const recommendation = useMemo(() => {
    if (history.length === 0) return null
    const today = new Date().toISOString().slice(0, 10)
    const studiedToday = history.some(s => s.completedAt.startsWith(today))
    const day = new Date().getDay()
    const isWeekend = day === 0 || day === 6
    if (!studiedToday && streak >= 3) return { label: 'Beast Mode 🔥', desc: `Keep your ${streak}-day streak with 2× XP`, type: 'beast' }
    if (weakDomain && history.length >= 5) return { label: `Focus: ${weakDomain.label}`, desc: `${weakDomain.pct}% accuracy — biggest score opportunity`, type: 'focus', domainId: weakDomain.id }
    if (isWeekend && history.length >= 3) return { label: 'Full Practice Test', desc: 'Weekend is perfect for a timed practice run', type: 'full' }
    if (dailyDone) return { label: 'Blitz Mode ⚡', desc: 'Goal done! Bonus questions for extra XP', type: 'blitz' }
    return { label: 'Quick Practice', desc: '10 questions — fast and focused', type: 'quick' }
  }, [history, streak, weakDomain, dailyDone])

  const nudge = useMemo(() => {
    if (daysLeft !== null && daysLeft <= 7 && daysLeft > 0) {
      return { icon: '📅', title: `SAT in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`, body: 'Crunch time — focus on your weak spots and do at least one full session today.', color: 'border-rose-100 bg-rose-50' }
    }
    if (daysLeft !== null && daysLeft <= 14 && daysLeft > 7) {
      return { icon: '⏰', title: `SAT in ${daysLeft} days`, body: 'Two weeks out — keep studying daily and take at least one full practice test.', color: 'border-amber-100 bg-amber-50' }
    }
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
    if (diffReady) {
      return { icon: '🔥', title: 'Ready for Hard mode?', body: `You're hitting ${diffReady}% on Medium questions. Try Beast Mode or filter by Hard to level up!`, color: 'border-orange-100 bg-orange-50' }
    }
    if (qMilestone && qMilestone.gap <= 50) {
      return { icon: '💎', title: `${qMilestone.gap} questions to ${qMilestone.next} milestone!`, body: `You're at ${qMilestone.totalQ.toLocaleString()} total questions. So close!`, color: 'border-violet-100 bg-violet-50' }
    }
    return null
  }, [levelInfo, streak, dailyProgress, dailyDone, daysLeft, diffReady])

  const personalInsight = useMemo(() => {
    if (history.length < 5) return null
    const insights = []
    // Time-of-day insight
    const tod = { morning: { c: 0, t: 0 }, afternoon: { c: 0, t: 0 }, evening: { c: 0, t: 0 } }
    for (const s of history) {
      const h = new Date(s.completedAt).getHours()
      const b = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
      tod[b].c += s.score.correct; tod[b].t += s.score.total
    }
    const todList = Object.entries(tod).filter(([, b]) => b.t >= 15).map(([name, b]) => ({ name, pct: Math.round((b.c / b.t) * 100) })).sort((a, b) => b.pct - a.pct)
    if (todList.length >= 2 && todList[0].pct - todList[todList.length - 1].pct >= 8) {
      insights.push({ icon: todList[0].name === 'morning' ? '🌅' : todList[0].name === 'afternoon' ? '☀️' : '🌙', text: `You score ${todList[0].pct - todList[todList.length - 1].pct}% better in the ${todList[0].name}s — that's your power time!` })
    }
    // Most improved domain this week
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const recent = history.filter(s => new Date(s.completedAt) >= weekAgo)
    const older = history.filter(s => new Date(s.completedAt) < weekAgo).slice(-20)
    const domainDelta = {}
    for (const [sess, tag] of [[recent, 'r'], [older, 'o']]) {
      for (const s of sess) for (const q of s.questions) {
        if (!domainDelta[q.domain]) domainDelta[q.domain] = { r: { c: 0, t: 0 }, o: { c: 0, t: 0 } }
        domainDelta[q.domain][tag].t++
        if ((s.answers[q.id] ?? null) === q.answer) domainDelta[q.domain][tag].c++
      }
    }
    let bestImprove = null
    for (const [id, d] of Object.entries(domainDelta)) {
      if (d.r.t < 5 || d.o.t < 5) continue
      const delta = Math.round((d.r.c / d.r.t) * 100) - Math.round((d.o.c / d.o.t) * 100)
      if (delta >= 10 && (!bestImprove || delta > bestImprove.delta)) bestImprove = { id, delta, newPct: Math.round((d.r.c / d.r.t) * 100) }
    }
    if (bestImprove) insights.push({ icon: '📈', text: `Your ${domainById[bestImprove.id]?.label ?? bestImprove.id} has improved ${bestImprove.delta}% this week — up to ${bestImprove.newPct}%!` })
    // Speed insight: are they getting faster?
    const withTime = history.filter(s => s.elapsedSeconds && s.score.total >= 5)
    if (withTime.length >= 8) {
      const avgSpeed = (arr) => arr.reduce((n, s) => n + s.elapsedSeconds / s.score.total, 0) / arr.length
      const oldSpeed = avgSpeed(withTime.slice(0, -4))
      const newSpeed = avgSpeed(withTime.slice(-4))
      if (oldSpeed - newSpeed >= 8) insights.push({ icon: '⚡', text: `You're answering ${Math.round(oldSpeed - newSpeed)}s faster per question than before — speed is up!` })
      else if (newSpeed - oldSpeed >= 10) insights.push({ icon: '🐢', text: `You've been taking ${Math.round(newSpeed - oldSpeed)}s longer per question lately — try Blitz Mode to sharpen speed.` })
    }
    // Accuracy trend
    if (history.length >= 10) {
      const o5 = history.slice(-10, -5).reduce((n, s) => n + s.score.percent, 0) / 5
      const r5 = history.slice(-5).reduce((n, s) => n + s.score.percent, 0) / 5
      const d = Math.round(r5 - o5)
      if (d >= 8) insights.push({ icon: '🚀', text: `You've improved ${d}% across your last 5 sessions compared to the 5 before. Keep it going!` })
      else if (d <= -8) insights.push({ icon: '📉', text: `Your accuracy dipped ${Math.abs(d)}% over your last 5 sessions. Try focusing on one domain.` })
    }
    // Combo record
    const bestCombo = Math.max(...history.map(s => s.maxCombo ?? 0))
    if (bestCombo >= 10) insights.push({ icon: '🔥', text: `Your best answer streak is ${bestCombo} in a row — try to break that record today!` })
    if (insights.length === 0) return null
    const dayIdx = Math.floor(Date.now() / 86400000)
    return insights[dayIdx % insights.length]
  }, [history])

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

  const [showXPToast, setShowXPToast] = useState(false)
  useEffect(() => {
    if (!pendingXP) return
    setShowXPToast(true)
    const t = setTimeout(() => { setShowXPToast(false); onClearPendingXP?.() }, 3000)
    return () => clearTimeout(t)
  }, [pendingXP])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 flex items-start justify-center px-4 py-12">
      {/* Prestige confirm modal */}
      {showPrestigeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowPrestigeConfirm(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-3">⭐</div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Prestige {prestigeInfo.prestige + 1}?</h3>
            <p className="text-sm text-gray-600 mb-1">Your XP resets to 0, but you earn a permanent <span className="font-bold text-amber-600">Prestige {prestigeInfo.prestige + 1}</span> badge.</p>
            <p className="text-xs text-gray-400 mb-6">All your history, streak, and achievements are kept. This just shows everyone you've mastered the game.</p>
            <div className="space-y-3">
              <button onClick={handlePrestige} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl transition-colors">
                ✨ Yes, Prestige!
              </button>
              <button onClick={() => setShowPrestigeConfirm(false)} className="w-full text-gray-500 font-semibold py-2 text-sm hover:text-gray-700 transition-colors">
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Login Reward modal */}
      {loginReward && !loginRewardClaimed && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4" onClick={claimLoginReward}>
          <div className="bg-white rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-3">{loginReward.isMilestone ? '🏆' : '🎁'}</div>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">Daily Reward</p>
            <p className="text-2xl font-black text-gray-900 mb-1">Day {loginReward.consec}</p>
            {loginReward.isMilestone && <p className="text-xs text-amber-600 font-bold mb-2">7-Day Milestone!</p>}
            <div className="bg-indigo-600 text-white rounded-2xl px-6 py-4 mb-5">
              <p className="text-4xl font-black">+{loginReward.xp}</p>
              <p className="text-sm opacity-80">XP earned</p>
            </div>
            <div className="flex gap-1.5 justify-center mb-5">
              {[25,50,75,100,150,100,250].map((r, i) => (
                <div key={i} className={`flex-1 rounded-lg py-1 text-[10px] font-bold ${i < loginReward.consec ? 'bg-indigo-600 text-white' : i === loginReward.consec ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-400' : 'bg-gray-100 text-gray-400'}`}>
                  {r}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mb-4">Come back tomorrow for Day {loginReward.consec + 1}!</p>
            <button
              onClick={claimLoginReward}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-base shadow-lg hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] transition-all"
            >
              {loginRewardClaimed ? '✓ Claimed!' : `Claim +${loginReward.xp} XP →`}
            </button>
          </div>
        </div>
      )}

      {/* XP toast */}
      {showXPToast && pendingXP > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none">
          <div className="bg-indigo-600 text-white text-sm font-black px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2">
            <span>⚡</span>
            <span>+{pendingXP} XP</span>
          </div>
        </div>
      )}
      <div className="w-full max-w-2xl">

        {/* Exam countdown banner */}
        {daysLeft !== null && daysLeft >= 0 && (
          <div className={`rounded-2xl px-4 py-3 mb-4 flex items-center gap-3 ${daysLeft <= 7 ? 'bg-rose-600 text-white' : daysLeft <= 14 ? 'bg-amber-500 text-white' : daysLeft <= 30 ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white'}`}>
            <span className="text-2xl shrink-0">{daysLeft === 0 ? '🎓' : daysLeft <= 7 ? '🚨' : daysLeft <= 14 ? '⚠️' : '📅'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black leading-tight">
                {daysLeft === 0 ? 'SAT Day is today — good luck!' : daysLeft <= 7 ? `${daysLeft} day${daysLeft > 1 ? 's' : ''} until your SAT!` : `${daysLeft} days until your SAT`}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {daysLeft === 0 ? 'You\'ve prepared hard for this. Go get it!' : daysLeft <= 7 ? 'Crunch time — focus on your weakest domains!' : daysLeft <= 14 ? 'Two weeks left — push hard on weak areas!' : daysLeft <= 30 ? 'One month to go — stay consistent!' : 'Keep building your skills — steady wins the race!'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-black leading-none">{daysLeft}</p>
              <p className="text-xs opacity-70">days</p>
            </div>
          </div>
        )}

        {/* Study Season Pass */}
        {gam.totalXP > 0 && (() => {
          const now = new Date()
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          const monthName = now.toLocaleString('en-US', { month: 'long' })
          const monthXP = (gam.xpLog ?? []).filter(e => new Date(e.date) >= monthStart).reduce((s, e) => s + e.xp, 0)
          const TIERS = [
            { xp: 100,  icon: '⭐', reward: 'Bronze Badge' },
            { xp: 250,  icon: '🎯', reward: 'Sharp Shooter' },
            { xp: 500,  icon: '🔥', reward: 'Hot Streak' },
            { xp: 800,  icon: '💎', reward: 'Diamond Focus' },
            { xp: 1200, icon: '🚀', reward: 'Rocket Scholar' },
            { xp: 1800, icon: '🏆', reward: 'Gold Trophy' },
            { xp: 2500, icon: '🌟', reward: 'All-Star' },
            { xp: 3500, icon: '👑', reward: 'King/Queen' },
            { xp: 5000, icon: '🐉', reward: 'SAT Dragon' },
            { xp: 7000, icon: '🎓', reward: 'Scholar Elite' },
          ]
          const currentTierIdx = TIERS.findLastIndex(t => monthXP >= t.xp)
          const nextTier = TIERS[currentTierIdx + 1]
          const currentXPFloor = currentTierIdx >= 0 ? TIERS[currentTierIdx].xp : 0
          const xpToNext = nextTier ? nextTier.xp - monthXP : 0
          const pct = nextTier ? Math.min(100, ((monthXP - currentXPFloor) / (nextTier.xp - currentXPFloor)) * 100) : 100
          return (
            <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-2xl p-4 mb-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest opacity-80">Season Pass</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">{monthName}</span>
                </div>
                {currentTierIdx >= 0 && (
                  <span className="text-sm font-black">{TIERS[currentTierIdx].icon} Tier {currentTierIdx + 1}</span>
                )}
              </div>
              <div className="flex gap-1.5 mb-2">
                {TIERS.map((t, i) => (
                  <div key={i} className={`flex-1 h-6 rounded-lg flex items-center justify-center text-xs transition-all ${i <= currentTierIdx ? 'bg-white/90 text-indigo-700 font-black' : i === currentTierIdx + 1 ? 'bg-white/30 text-white/80 border border-white/50' : 'bg-white/10 text-white/30'}`}
                    title={`${t.reward}: ${t.xp} XP`}>
                    {i <= currentTierIdx ? t.icon : i <= currentTierIdx + 1 ? t.icon : '·'}
                  </div>
                ))}
              </div>
              {nextTier ? (
                <>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] font-semibold opacity-70">{xpToNext} XP to {nextTier.icon} {nextTier.reward} · {monthXP.toLocaleString()} earned this month</p>
                </>
              ) : (
                <p className="text-xs font-bold text-yellow-300">🎉 All tiers complete this month!</p>
              )}
            </div>
          )
        })()}

        {/* Weekly Boss */}
        {(() => {
          const boss = getWeeklyBoss()
          const pct = Math.round((boss.currentHP / boss.hp) * 100)
          return (
            <div className={`rounded-2xl border-2 p-4 mb-4 ${boss.defeated ? 'border-amber-300 bg-amber-50' : 'border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-rose-500">Weekly Boss</p>
                {boss.defeated
                  ? <span className="text-xs font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">🏆 Defeated!</span>
                  : <span className="text-xs font-semibold text-rose-400">{boss.currentHP}/{boss.hp} HP</span>}
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">{boss.icon}</span>
                <div>
                  <p className="font-black text-base text-gray-900">{boss.name}</p>
                  <p className="text-xs text-gray-500 italic">{boss.flavor}</p>
                </div>
              </div>
              {!boss.defeated ? (
                <>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-gradient-to-r from-rose-500 to-orange-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-400">Practice <span className="font-bold text-rose-600">{boss.domain.replace(/-/g, ' ')}</span> questions to deal damage · Defeat for <span className="font-bold text-amber-600">{boss.xp} XP</span></p>
                </>
              ) : (
                <p className="text-xs font-semibold text-amber-700 text-center">You slayed the boss this week! New boss arrives Monday 🗡️</p>
              )}
            </div>
          )
        })()}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <span className="text-sm font-semibold tracking-widest text-indigo-500 uppercase">
                {(() => {
                  const h = new Date().getHours()
                  const name = loadDisplayName()
                  const suffix = name ? `, ${name}` : ''
                  if (h >= 5 && h < 12) return `Good morning${suffix}`
                  if (h >= 12 && h < 17) return `Keep it up${suffix}`
                  if (h >= 17 && h < 21) return `Evening grind${suffix}`
                  return `Night study${suffix}`
                })()}
              </span>
              {streak > 0 && (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full" title={gam.maxStreak > streak ? `Best streak: ${gam.maxStreak} days` : 'Personal best streak!'}>
                  🔥 {streak}d {gam.maxStreak > streak ? <span className="opacity-60 font-normal">(best {gam.maxStreak}d)</span> : '🏆'}
                </span>
              )}
              {freezeCount > 0 && (
                <span className="text-xs font-semibold text-blue-400 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full" title={`${freezeCount} streak freeze${freezeCount !== 1 ? 's' : ''} available`}>
                  🧊×{freezeCount}
                </span>
              )}
              {weeklyChallenge.done && (
                <span className="text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                  📋 Week ✓
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {onProblemAreasDrill && persistentMistakes.length >= 2 && (
                <button onClick={onProblemAreasDrill} className="text-xs font-semibold text-red-600 hover:text-red-800 border border-red-200 bg-red-50 rounded-lg px-3 py-1.5 transition-colors" title={`Drill your ${persistentMistakes.length} most persistent problem questions`}>
                  ⚠️ Problem Areas
                </button>
              )}
              {onWrongAnswerSprint && recentWrongCount > 0 && (
                <button onClick={onWrongAnswerSprint} className="text-xs font-semibold text-rose-600 hover:text-rose-800 border border-rose-200 bg-rose-50 rounded-lg px-3 py-1.5 transition-colors" title={`Drill ${Math.min(recentWrongCount, 15)} recent wrong answers`}>
                  🔁 Wrong ({recentWrongCount})
                </button>
              )}
              {onWrongJournal && (
                <button onClick={onWrongJournal} className="text-xs font-semibold text-rose-600 hover:text-rose-800 border border-rose-200 bg-rose-50 rounded-lg px-3 py-1.5 transition-colors" title="Review your mistake journal">
                  📓 Journal
                </button>
              )}
              {onAdaptiveQuiz && history.length >= 3 && (
                <button onClick={onAdaptiveQuiz} className="text-xs font-semibold text-violet-600 hover:text-violet-800 border border-violet-200 bg-violet-50 rounded-lg px-3 py-1.5 transition-colors" title="Smart quiz weighted to your weak spots">
                  🧠 Adaptive
                </button>
              )}
              {onQuick5 && (
                <button onClick={onQuick5} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-1.5 transition-colors" title="Quick 5-question warmup">
                  ⚡ Quick 5
                </button>
              )}
              {onFlaggedReview && totalFlagged > 0 && (
                <button onClick={onFlaggedReview} className="relative text-xs font-semibold text-amber-700 hover:text-amber-900 border border-amber-200 bg-amber-50 rounded-lg px-3 py-1.5 transition-colors" title={`Review ${totalFlagged} flagged question${totalFlagged !== 1 ? 's' : ''}`}>
                  🚩 Flagged ({totalFlagged})
                </button>
              )}
              {onConfidenceBooster && history.length >= 5 && (
                <button onClick={onConfidenceBooster} className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-1.5 transition-colors" title="10 questions you've already mastered — great before the exam!">
                  💪 Confidence Boost
                </button>
              )}
              {onSpacedRepetition && srDueCount > 0 && (
                <button onClick={onSpacedRepetition} className="relative text-xs font-semibold text-teal-700 hover:text-teal-900 border border-teal-200 bg-teal-50 rounded-lg px-3 py-1.5 transition-colors animate-pulse" title={`${srDueCount} question${srDueCount !== 1 ? 's' : ''} scheduled for review today`}>
                  🔁 Due ({srDueCount})
                </button>
              )}
              {onProfile && (
                <button onClick={onProfile} className="text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded-lg px-3 py-1.5 transition-colors" title="Your Profile">
                  👤 Profile
                </button>
              )}
              {onMathFlash && (
                <button onClick={onMathFlash} className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 rounded-lg px-3 py-1.5 transition-colors" title="Math Formula Flashcards">
                  🃏 Math Flash
                </button>
              )}
              {onVocab && (
                <button onClick={onVocab} className="text-xs font-semibold text-violet-600 hover:text-violet-800 border border-violet-200 bg-violet-50 rounded-lg px-3 py-1.5 transition-colors" title="SAT Vocabulary Flashcards">
                  📖 Vocab
                </button>
              )}
              {onStrategyGuide && (
                <button onClick={onStrategyGuide} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-1.5 transition-colors" title="SAT Strategy Guide">
                  💡 Strategies
                </button>
              )}
              {onStudyNotes && (
                <button onClick={onStudyNotes} className="text-xs font-semibold text-amber-600 hover:text-amber-800 border border-amber-200 bg-amber-50 rounded-lg px-3 py-1.5 transition-colors" title="Study Notes">
                  📝 Notes
                </button>
              )}
              {onGrammarRef && (
                <button onClick={onGrammarRef} className="text-xs font-semibold text-violet-600 hover:text-violet-800 border border-violet-200 bg-violet-50 rounded-lg px-3 py-1.5 transition-colors" title="Grammar Rules Reference">
                  ✏️ Grammar
                </button>
              )}
              {onMathRef && (
                <button onClick={onMathRef} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-1.5 transition-colors" title="Math Formula Sheet">
                  📐 Formulas
                </button>
              )}
              {onDigitalSAT && (
                <button onClick={onDigitalSAT} className="text-xs font-semibold text-teal-600 hover:text-teal-800 border border-teal-200 bg-teal-50 rounded-lg px-3 py-1.5 transition-colors" title="Digital SAT Tips">
                  💻 Digital SAT
                </button>
              )}
              {onBreathing && (
                <button onClick={onBreathing} className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 rounded-lg px-3 py-1.5 transition-colors" title="Breathing Exercise">
                  🫁 Breathe
                </button>
              )}
              {onScoreCalculator && (
                <button onClick={onScoreCalculator} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-1.5 transition-colors" title="SAT Score Calculator">
                  🧮 Score Calc
                </button>
              )}
              {onSATStory && history.length >= 3 && (
                <button onClick={onSATStory} className="text-xs font-semibold text-purple-600 hover:text-purple-800 border border-purple-200 bg-purple-50 rounded-lg px-3 py-1.5 transition-colors" title="My SAT Story">
                  ✨ My Story
                </button>
              )}
              {onQuestionBank && (
                <button onClick={onQuestionBank} className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 bg-white rounded-lg px-3 py-1.5 transition-colors">
                  Question Bank
                </button>
              )}
              {onHistory && (
                <button onClick={onHistory} className="relative text-xs text-gray-400 hover:text-gray-700 border border-gray-200 bg-white rounded-lg px-3 py-1.5 transition-colors">
                  History
                  {totalFlagged > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none" title={`${totalFlagged} flagged question${totalFlagged !== 1 ? 's' : ''} pending review`}>
                      {totalFlagged > 9 ? '9+' : totalFlagged}
                    </span>
                  )}
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
            <div className={`w-10 h-10 rounded-full ${levelColor.ring} flex items-center justify-center text-white font-black text-sm shrink-0`}>
              {levelInfo.level}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-gray-700 truncate">{levelInfo.title}</p>
                {prestigeInfo.prestige > 0 && (
                  <span className="text-xs font-bold text-amber-600 shrink-0">{prestigeInfo.title}</span>
                )}
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div className={`h-full ${levelColor.ring} rounded-full transition-all`} style={{ width: `${levelInfo.pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {levelInfo.xpForNext
                  ? `${gam.totalXP.toLocaleString()} XP · ${levelInfo.xpIntoLevel}/${levelInfo.xpForNext} to Lv ${levelInfo.level + 1}`
                  : `${gam.totalXP.toLocaleString()} XP · Max Level`}
                {timeToNextLevel && <span className="text-indigo-400"> · ~{timeToNextLevel} session{timeToNextLevel !== 1 ? 's' : ''}</span>}
                {prestigeInfo.canPrestige && (
                  <button onClick={() => setShowPrestigeConfirm(true)} className="ml-2 text-amber-600 font-bold hover:text-amber-800 transition-colors">
                    ✨ Prestige
                  </button>
                )}
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
                  strokeDasharray={`${Math.min(1, dailyProgress / effectiveDailyGoal) * 113.1} 113.1`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-black ${dailyDone ? 'text-emerald-600' : 'text-indigo-600'}`}>
                  {dailyDone ? '✓' : dailyProgress}
                </span>
              </div>
            </div>
            {editingDailyGoal ? (
              <div className="flex items-center gap-1 mt-1">
                <input type="number" value={dailyGoalInput} onChange={e => setDailyGoalInput(e.target.value)}
                  className="w-12 text-xs border border-gray-300 rounded px-1 py-0.5 text-center" min="5" max="200" />
                <button onClick={() => { const v = parseInt(dailyGoalInput, 10); if (v >= 5) { setCustomDailyGoal(v); saveDailyGoal(v) } setEditingDailyGoal(false) }}
                  className="text-xs text-indigo-600 font-semibold">✓</button>
              </div>
            ) : (
              <button onClick={() => { setDailyGoalInput(String(effectiveDailyGoal)); setEditingDailyGoal(true) }}
                className="text-xs text-gray-400 mt-1 hover:text-indigo-500 transition-colors">
                {dailyDone ? 'Done!' : `/ ${effectiveDailyGoal} Qs`}
              </button>
            )}
          </div>

          {(() => {
            const today = new Date().toISOString().slice(0, 10)
            const todaySec = history.filter(s => s.completedAt?.startsWith(today)).reduce((n, s) => n + (s.elapsedSeconds ?? 0), 0)
            if (todaySec < 60) return null
            const todayMin = Math.round(todaySec / 60)
            return (
              <>
                <div className="h-12 w-px bg-gray-100 shrink-0" />
                <div className="shrink-0 text-center">
                  <p className={`text-base font-black ${todayMin >= 30 ? 'text-emerald-600' : 'text-gray-700'}`}>{todayMin}m</p>
                  <p className="text-xs text-gray-400 mt-0.5">today</p>
                </div>
              </>
            )
          })()}

          {bestScore && (
            <>
              <div className="h-12 w-px bg-gray-100 shrink-0" />
              <div className="shrink-0 text-center" title={`Best session: ${bestScore.pct}%`}>
                <p className="text-base font-black text-amber-500">~{bestScore.est}</p>
                <p className="text-xs text-gray-400 mt-0.5">best est.</p>
              </div>
            </>
          )}
          {uniqueQCount > 0 && (
            <>
              <div className="h-12 w-px bg-gray-100 shrink-0" />
              <div className="shrink-0 text-center" title="Unique questions practiced">
                <p className="text-base font-black text-violet-500">{uniqueQCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">unique Qs</p>
              </div>
            </>
          )}

          {qMilestone && qMilestone.gap <= 30 && (
            <>
              <div className="h-12 w-px bg-gray-100 shrink-0" />
              <div className="shrink-0 text-center">
                <p className="text-base font-black text-indigo-500">{qMilestone.gap}</p>
                <p className="text-xs text-gray-400 mt-0.5">to {qMilestone.next}</p>
              </div>
            </>
          )}

          {masteredTopics > 0 && (
            <>
              <div className="h-12 w-px bg-gray-100 shrink-0" />
              <div className="shrink-0 text-center">
                <p className="text-xl">⭐</p>
                <p className="text-xs text-gray-400 mt-1">{masteredTopics} mastered</p>
              </div>
            </>
          )}

          {onAchievements && (
            <>
              <div className="h-12 w-px bg-gray-100 shrink-0" />
              <button onClick={onAchievements} className="shrink-0 text-center group">
                <p className="text-xl group-hover:scale-110 transition-transform">🏆</p>
                <p className="text-xs text-gray-400 mt-1">{achievementsCount}/{ACHIEVEMENTS.length}</p>
              </button>
            </>
          )}
        </div>

        {/* Weekly Leaderboard */}
        {gam.totalXP > 0 && (() => {
          const PEERS = [
            { name: 'Aiden K.', seed: 17 }, { name: 'Sofia M.', seed: 31 }, { name: 'Jayden L.', seed: 7 },
            { name: 'Emma R.', seed: 53 }, { name: 'Noah P.', seed: 43 }, { name: 'Olivia T.', seed: 23 },
            { name: 'Liam W.', seed: 61 }, { name: 'Ava S.', seed: 11 }, { name: 'Ethan C.', seed: 37 },
          ]
          const weekMs = 7 * 24 * 3600 * 1000
          const weekStart = new Date(); weekStart.setHours(0,0,0,0); weekStart.setDate(weekStart.getDate() - weekStart.getDay())
          const weekXP = history
            .filter(s => new Date(s.completedAt) >= weekStart)
            .reduce((sum, s) => sum + (s.score.total * 10), 0)
          const seed = weekStart.getTime()
          const rng = (n, s) => { let x = (n * 9301 + s * 49297 + seed / 1000000) % 233280; return x / 233280 }
          const peers = PEERS.map((p, i) => ({
            name: p.name,
            xp: Math.round(rng(p.seed, i) * 900 + 50),
            isMe: false,
          }))
          const myName = loadDisplayName() || 'You'
          const me = { name: myName, xp: weekXP, isMe: true }
          const board = [...peers, me].sort((a, b) => b.xp - a.xp)
          const myRank = board.findIndex(r => r.isMe) + 1
          const medals = ['🥇','🥈','🥉']
          return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">This Week's Leaderboard</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${myRank <= 3 ? 'bg-amber-100 text-amber-700' : myRank <= 5 ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                  #{myRank} of {board.length}
                </span>
              </div>
              <div className="space-y-2">
                {board.slice(0, 5).map((entry, i) => (
                  <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-xl ${entry.isMe ? 'bg-indigo-50 border border-indigo-200' : ''}`}>
                    <span className="w-5 text-center text-sm">{medals[i] ?? `${i+1}`}</span>
                    <span className={`flex-1 text-sm font-semibold ${entry.isMe ? 'text-indigo-700' : 'text-gray-700'}`}>{entry.name}</span>
                    <span className={`text-xs font-bold ${entry.isMe ? 'text-indigo-600' : 'text-gray-400'}`}>{entry.xp.toLocaleString()} XP</span>
                  </div>
                ))}
                {myRank > 5 && (
                  <>
                    <div className="text-center text-gray-300 text-xs py-0.5">· · ·</div>
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200">
                      <span className="w-5 text-center text-xs font-bold text-gray-500">#{myRank}</span>
                      <span className="flex-1 text-sm font-semibold text-indigo-700">{myName}</span>
                      <span className="text-xs font-bold text-indigo-600">{weekXP.toLocaleString()} XP</span>
                    </div>
                  </>
                )}
              </div>
              {myRank > 1 && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {board[myRank - 2].xp - weekXP} XP behind #{myRank - 1} · Study more to climb! 🚀
                </p>
              )}
              {myRank === 1 && (
                <p className="text-xs text-emerald-600 font-semibold mt-2 text-center">🏆 You're #1 this week — keep it up!</p>
              )}
            </div>
          )
        })()}

        {/* Monthly XP Ranking */}
        {gam.totalXP > 0 && (() => {
          const now = new Date()
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          const monthXP = (gam.xpLog ?? [])
            .filter(e => new Date(e.date) >= monthStart)
            .reduce((s, e) => s + e.xp, 0)
          const MONTH_PEERS = [
            { name: 'Marcus B.', seed: 19 }, { name: 'Priya N.', seed: 41 }, { name: 'Tyler G.', seed: 13 },
            { name: 'Zoe H.', seed: 57 }, { name: 'Diego M.', seed: 29 }, { name: 'Chloe A.', seed: 47 },
            { name: 'Jake T.', seed: 3 },  { name: 'Mia K.', seed: 67 },  { name: 'Ryan O.', seed: 23 },
          ]
          const mSeed = now.getFullYear() * 100 + now.getMonth()
          const rng = (n, i) => { let x = (n * 8191 + i * 29443 + mSeed * 137) % 310000; return x / 310000 }
          const peers = MONTH_PEERS.map((p, i) => ({ name: p.name, xp: Math.round(rng(p.seed, i) * 3800 + 200), isMe: false }))
          const me = { name: 'You', xp: monthXP, isMe: true }
          const board = [...peers, me].sort((a, b) => b.xp - a.xp)
          const myRank = board.findIndex(r => r.isMe) + 1
          const monthName = now.toLocaleString('en-US', { month: 'long' })
          return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{monthName} Rankings</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${myRank <= 3 ? 'bg-amber-100 text-amber-700' : myRank <= 5 ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                  #{myRank} · {monthXP.toLocaleString()} XP
                </span>
              </div>
              <div className="space-y-1.5">
                {board.slice(0, 3).map((entry, i) => (
                  <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-xl ${entry.isMe ? 'bg-indigo-50 border border-indigo-200' : ''}`}>
                    <span className="w-5 text-center text-sm">{['🥇','🥈','🥉'][i]}</span>
                    <span className={`flex-1 text-xs font-semibold ${entry.isMe ? 'text-indigo-700' : 'text-gray-600'}`}>{entry.name}</span>
                    <span className={`text-xs font-bold ${entry.isMe ? 'text-indigo-600' : 'text-gray-400'}`}>{entry.xp.toLocaleString()}</span>
                  </div>
                ))}
                {myRank > 3 && (
                  <>
                    <div className="text-center text-gray-300 text-xs">· · ·</div>
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200">
                      <span className="w-5 text-center text-xs font-bold text-gray-500">#{myRank}</span>
                      <span className="flex-1 text-xs font-semibold text-indigo-700">You</span>
                      <span className="text-xs font-bold text-indigo-600">{monthXP.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                {myRank === 1 ? '🏆 Top of the month — amazing!' : `${board[myRank - 2].xp - monthXP} XP to reach #${myRank - 1} this month`}
              </p>
            </div>
          )
        })()}

        {/* Most Wanted — persistent mistake questions */}
        {persistentMistakes.length >= 3 && (() => {
          const byId = Object.fromEntries(questions.map(q => [q.id, q]))
          const top3 = persistentMistakes.slice(0, 3).map(m => ({ ...m, q: byId[m.id] })).filter(m => m.q)
          if (top3.length === 0) return null
          return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">🎯 Most Wanted</p>
                  <p className="text-xs text-gray-400 mt-0.5">Questions you keep missing</p>
                </div>
                {onProblemAreasDrill && (
                  <button onClick={onProblemAreasDrill} className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl hover:bg-rose-100 transition-colors">
                    Drill all →
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {top3.map((m, i) => (
                  <div key={m.id} className="flex items-start gap-3 bg-rose-50 rounded-xl px-3 py-2.5">
                    <span className="text-sm font-black text-rose-400 shrink-0 mt-0.5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 line-clamp-1 font-medium">{m.q.question.replace(/\n/g, ' ').slice(0, 70)}…</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{domainById[m.q.domain]?.label ?? m.q.domain}</span>
                        <span className="text-rose-400 text-xs font-semibold">✗ {m.wrongCount}×</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Domain mastery map */}
        {history.length >= 3 && (() => {
          const byDomain = {}
          for (const s of history) for (const q of s.questions) {
            if (!byDomain[q.domain]) byDomain[q.domain] = { c: 0, t: 0 }
            byDomain[q.domain].t++
            if ((s.answers?.[q.id] ?? null) === q.answer) byDomain[q.domain].c++
          }
          const math = TAXONOMY.find(s => s.id === 'math')?.domains ?? []
          const eng  = TAXONOMY.find(s => s.id === 'english')?.domains ?? []
          const Cell = ({ domain }) => {
            const d = byDomain[domain.id]
            const pct = d ? Math.round((d.c / d.t) * 100) : null
            const isExpert = pct !== null && pct >= 85 && d.t >= 20
            const bg = pct === null ? 'bg-gray-100 text-gray-300' :
                       pct >= 80 ? 'bg-emerald-500 text-white' :
                       pct >= 65 ? 'bg-amber-400 text-white' : 'bg-rose-400 text-white'
            return (
              <button
                onClick={() => onFocusPractice?.(domain.id)}
                className={`flex-1 rounded-xl py-2 px-1 text-center transition-all hover:scale-105 relative ${bg}`}
                title={`${domain.label}${pct !== null ? `: ${pct}% (${d.t} Qs)` : ': not yet practiced'}${isExpert ? ' — Expert!' : ''}`}
              >
                {isExpert && <span className="absolute -top-1.5 -right-1 text-xs">👑</span>}
                <p className="text-xs font-bold leading-tight">{pct !== null ? `${pct}%` : '—'}</p>
                <p className="text-[9px] leading-tight mt-0.5 opacity-80 truncate">{domain.label.split(' ')[0]}</p>
              </button>
            )
          }
          return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Domain Map — tap to drill</p>
              <div className="mb-2">
                <p className="text-[10px] text-gray-300 mb-1 uppercase tracking-widest">Math</p>
                <div className="flex gap-1.5">{math.map(d => <Cell key={d.id} domain={d} />)}</div>
              </div>
              <div>
                <p className="text-[10px] text-gray-300 mb-1 uppercase tracking-widest">English</p>
                <div className="flex gap-1.5">{eng.map(d => <Cell key={d.id} domain={d} />)}</div>
              </div>
              <div className="flex items-center gap-2 mt-2.5">
                {[['bg-emerald-500','≥80%'],['bg-amber-400','65-79%'],['bg-rose-400','<65%'],['bg-gray-100 border border-gray-200','New']].map(([cls,lbl]) => (
                  <div key={lbl} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-sm ${cls}`} />
                    <span className="text-[9px] text-gray-400">{lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Domain Rankings */}
        {(() => {
          const ranked = Object.entries(domainStats)
            .filter(([, s]) => s.total >= 5)
            .map(([id, s]) => ({ id, pct: s.pct, label: TAXONOMY.flatMap(x => x.domains).find(d => d.id === id)?.label ?? id }))
            .sort((a, b) => b.pct - a.pct)
          if (ranked.length < 3) return null
          const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
          const tier = (p) => p >= 85 ? { label: 'Master', cls: 'text-amber-500 bg-amber-50' } : p >= 70 ? { label: 'Strong', cls: 'text-emerald-600 bg-emerald-50' } : p >= 55 ? { label: 'Building', cls: 'text-indigo-500 bg-indigo-50' } : { label: 'Needs work', cls: 'text-rose-500 bg-rose-50' }
          return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Domain Rankings</p>
              <div className="space-y-2">
                {ranked.map((d, i) => {
                  const t = tier(d.pct)
                  return (
                    <button key={d.id} onClick={() => onFocusPractice?.(d.id)} className="w-full flex items-center gap-3 group">
                      <span className="w-5 text-base shrink-0">{medal(i) ?? <span className="text-xs text-gray-400 font-bold">#{i + 1}</span>}</span>
                      <span className="text-sm text-gray-700 flex-1 text-left truncate group-hover:text-indigo-600 transition-colors">{d.label}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-20">
                        <div className={`h-full rounded-full ${d.pct >= 80 ? 'bg-emerald-500' : d.pct >= 65 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${d.pct}%` }} />
                      </div>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-lg shrink-0 ${t.cls}`}>{d.pct}%</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Question coverage tracker */}
        {domainCoverage.some(d => d.seen > 0) && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Question Coverage</p>
              <span className="text-xs text-gray-400">
                {domainCoverage.reduce((n, d) => n + d.seen, 0)} / {domainCoverage.reduce((n, d) => n + d.total, 0)} unique Qs seen
              </span>
            </div>
            <div className="space-y-2">
              {domainCoverage.map(d => {
                const dom = TAXONOMY.flatMap(s => s.domains).find(x => x.id === d.id)
                return (
                  <div key={d.id}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-600 truncate">{dom?.label ?? d.id}</span>
                      <span className="text-xs font-semibold text-gray-500 ml-2 shrink-0">{d.seen}/{d.total}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${d.pct >= 80 ? 'bg-emerald-500' : d.pct >= 40 ? 'bg-indigo-400' : 'bg-gray-300'}`}
                        style={{ width: `${d.pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Study Momentum sparkline */}
        {momentum && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-medium mb-1">Recent momentum</p>
              <svg viewBox={`0 0 ${(momentum.pts.length - 1) * 20} 28`} className="w-full h-7" preserveAspectRatio="none">
                <polyline
                  points={momentum.pts.map((v, i) => `${i * 20},${28 - (v / 100) * 28}`).join(' ')}
                  fill="none"
                  stroke={momentum.trend > 5 ? '#10b981' : momentum.trend < -5 ? '#f87171' : '#818cf8'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {momentum.pts.map((v, i) => (
                  <circle key={i} cx={i * 20} cy={28 - (v / 100) * 28} r="2.5"
                    fill={i === momentum.pts.length - 1 ? (momentum.trend > 5 ? '#10b981' : momentum.trend < -5 ? '#f87171' : '#6366f1') : 'white'}
                    stroke={momentum.trend > 5 ? '#10b981' : momentum.trend < -5 ? '#f87171' : '#818cf8'}
                    strokeWidth="1.5"
                  />
                ))}
              </svg>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-xs font-bold ${momentum.trend > 5 ? 'text-emerald-500' : momentum.trend < -5 ? 'text-rose-500' : 'text-indigo-500'}`}>
                {momentum.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">last {momentum.pts.length} sessions</p>
            </div>
          </div>
        )}

        {/* SAT Score Estimate */}
        {scoreEstimate && (
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest">Est. SAT Score</p>
              {scoreEstimate.trend && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreEstimate.trend === 'up' ? 'bg-emerald-100 text-emerald-600' : scoreEstimate.trend === 'down' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-500'}`}>
                  {scoreEstimate.trend === 'up' ? '↑ Improving' : scoreEstimate.trend === 'down' ? '↓ Slipping' : '→ Steady'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-black text-indigo-700">{scoreEstimate.lo}–{scoreEstimate.hi}</p>
                <p className="text-xs text-indigo-300">out of 1600</p>
                {scoreEstimate.percentile && (
                  <p className="text-xs font-bold text-violet-600 mt-0.5">Top {100 - scoreEstimate.percentile + 1}% nationally</p>
                )}
                {scoreEstimate.improvementPoints !== null && scoreEstimate.improvementPoints !== 0 && (
                  <p className={`text-xs font-bold mt-0.5 ${scoreEstimate.improvementPoints > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {scoreEstimate.improvementPoints > 0 ? `↑ +${scoreEstimate.improvementPoints} pts since you started!` : `↓ ${scoreEstimate.improvementPoints} pts vs. early sessions`}
                  </p>
                )}
              </div>
              <div className="h-10 w-px bg-indigo-100" />
              <div className="flex gap-4 text-center">
                <div>
                  <p className="text-xs text-indigo-400 font-medium">Math</p>
                  <p className="text-base font-black text-indigo-600">{scoreEstimate.mathScore}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-400 font-medium">R&W</p>
                  <p className="text-base font-black text-violet-600">{scoreEstimate.engScore}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* College Score Targets */}
        {scoreEstimate && (() => {
          const est = Math.round((scoreEstimate.lo + scoreEstimate.hi) / 2)
          const colleges = [
            { name: 'Community College',    median: 950,  emoji: '🏫', color: 'text-gray-500' },
            { name: 'Average State U',       median: 1080, emoji: '🏛️',  color: 'text-gray-600' },
            { name: 'UC Santa Barbara',      median: 1270, emoji: '🌊', color: 'text-blue-600' },
            { name: 'USC',                   median: 1400, emoji: '⚔️',  color: 'text-red-600' },
            { name: 'UCLA',                  median: 1450, emoji: '🐻', color: 'text-blue-700' },
            { name: 'UC Berkeley',           median: 1490, emoji: '🦅', color: 'text-amber-700' },
            { name: 'MIT',                   median: 1555, emoji: '🔬', color: 'text-gray-800' },
            { name: 'Harvard',               median: 1580, emoji: '🎓', color: 'text-red-800' },
          ]
          const closestBelow = [...colleges].filter(c => c.median <= est + 50).slice(-3)
          const closestAbove = [...colleges].filter(c => c.median > est + 50).slice(0, 3)
          const shown = [...closestBelow.slice(-2), ...closestAbove.slice(0, 3)]
          if (shown.length === 0) return null
          return (
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-4 mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Your Score vs. College Medians</p>
              <div className="space-y-2">
                {shown.map(c => {
                  const gap = c.median - est
                  const reached = gap <= 0
                  return (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="text-base w-7 shrink-0 text-center">{c.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-semibold ${reached ? 'text-gray-800' : 'text-gray-400'}`}>{c.name}</p>
                          <span className={`text-xs font-bold ${reached ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {reached ? `✓ In range` : `+${gap} needed`}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div className={`h-full rounded-full transition-all duration-700 ${reached ? 'bg-emerald-400' : 'bg-amber-300'}`}
                            style={{ width: `${Math.min(100, (est / c.median) * 100)}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 w-10 text-right">{c.median}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Exam readiness composite score */}
        {examReadiness && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Exam Readiness</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${examReadiness.color}`}>{examReadiness.score}</span>
                <span className="text-xs text-gray-400">/ 100</span>
                <span className={`text-xs font-semibold ${examReadiness.color}`}>{examReadiness.label}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                <div className={`h-full rounded-full transition-all duration-700 ${
                  examReadiness.score >= 85 ? 'bg-emerald-500' : examReadiness.score >= 70 ? 'bg-indigo-500' : examReadiness.score >= 55 ? 'bg-amber-500' : 'bg-rose-500'
                }`} style={{ width: `${examReadiness.score}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Onboarding checklist (shown for first ~5 sessions) */}
        {history.length < 5 && (() => {
          const hasBeastMode = history.some(s => s.formatLabel === 'Beast Mode')
          const hasGoal = goalTarget !== null
          const hasAchievement = achievementsCount > 0
          const steps = [
            { done: history.length >= 1, label: 'Complete your first session' },
            { done: hasGoal, label: 'Set a target SAT score' },
            { done: hasBeastMode, label: 'Try Beast Mode 🔥' },
            { done: hasAchievement, label: 'Unlock your first achievement 🏆' },
            { done: streak >= 2, label: 'Study 2 days in a row 🔥' },
          ]
          const done = steps.filter(s => s.done).length
          if (done === steps.length) return null
          return (
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-100 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Getting Started</p>
                <span className="text-xs text-indigo-600 font-semibold">{done}/{steps.length}</span>
              </div>
              <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(done / steps.length) * 100}%` }} />
              </div>
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${step.done ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                      {step.done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-xs ${step.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* 7-day streak calendar */}
        {history.length > 0 && (() => {
          const studiedDates = new Set(history.map(s => s.completedAt.slice(0, 10)))
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - (6 - i))
            return { key: d.toISOString().slice(0, 10), label: ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()], isToday: i === 6 }
          })
          const hasStreak = days.slice(0, 6).some(d => studiedDates.has(d.key))
          if (!hasStreak && !studiedDates.has(days[6].key)) return null
          return (
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
              <span className="text-sm text-gray-400 shrink-0">Last 7 days</span>
              <div className="flex gap-1.5 flex-1 justify-end">
                {days.map(({ key, label, isToday }) => {
                  const studied = studiedDates.has(key)
                  return (
                    <div key={key} className="flex flex-col items-center gap-0.5">
                      <div className={`w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold transition-colors ${
                        studied ? 'bg-emerald-500 text-white' : isToday ? 'border-2 border-dashed border-gray-300 text-gray-300' : 'bg-gray-100 text-gray-300'
                      }`}>
                        {studied ? '✓' : ''}
                      </div>
                      <span className="text-[9px] text-gray-300">{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Streak recovery card */}
        {streakRecovery && (
          <div className="bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-200 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💔</span>
              <div className="flex-1">
                <p className="text-sm font-black text-gray-800">Your {streakRecovery.prevStreak}-day streak broke!</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {streakRecovery.todaySessCount >= 2
                    ? '✅ Comeback complete! Study tomorrow to start a new streak.'
                    : `Complete ${2 - streakRecovery.todaySessCount} more session${2 - streakRecovery.todaySessCount > 1 ? 's' : ''} today for a +100 XP comeback bonus!`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-rose-600">{streakRecovery.todaySessCount}/2</p>
                <p className="text-xs text-gray-400">sessions</p>
              </div>
            </div>
            <div className="mt-2 h-1.5 bg-rose-100 rounded-full overflow-hidden">
              <div className="h-full bg-rose-400 rounded-full transition-all" style={{ width: `${(streakRecovery.todaySessCount / 2) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Recent activity feed */}
        {history.length >= 2 && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Recent Activity</p>
            <div className="space-y-1.5">
              {history.slice(0, 4).map(s => {
                const age = Math.round((Date.now() - new Date(s.completedAt)) / 60000)
                const ageStr = age < 60 ? `${age}m ago` : age < 1440 ? `${Math.round(age / 60)}h ago` : `${Math.round(age / 1440)}d ago`
                const icon = s.formatLabel === 'Beast Mode' ? '🔥' : s.formatLabel === 'Blitz Mode' ? '⚡' : s.formatLabel?.includes('Focus') ? '🎯' : '📝'
                const pctColor = s.score.percent >= 80 ? 'text-emerald-600' : s.score.percent >= 60 ? 'text-amber-600' : 'text-rose-500'
                return (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <span className="shrink-0">{icon}</span>
                    <span className="text-gray-600 flex-1 truncate">{s.sessionName || s.formatLabel}</span>
                    <span className={`font-bold shrink-0 ${pctColor}`}>{s.score.percent}%</span>
                    <span className="text-gray-300 shrink-0">{ageStr}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Last session recap */}
        {history.length > 0 && (() => {
          const last = history[history.length - 1]
          const g = last.score.percent >= 90 ? { text: 'text-amber-500', label: 'Excellent' } : last.score.percent >= 80 ? { text: 'text-emerald-600', label: 'Great' } : last.score.percent >= 60 ? { text: 'text-amber-600', label: 'Good' } : { text: 'text-rose-500', label: 'Keep going' }
          const age = Math.round((Date.now() - new Date(last.completedAt)) / 60000)
          const ageStr = age < 60 ? `${age}m ago` : age < 1440 ? `${Math.round(age / 60)}h ago` : `${Math.round(age / 1440)}d ago`
          return (
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 truncate">{last.formatLabel}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{ageStr}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{last.score.total} questions · {g.label}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-xl font-black ${g.text}`}>{last.score.percent}%</p>
              </div>
            </div>
          )
        })()}

        {/* Power Day banner */}
        {powerDay && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 mb-4 text-white flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-black text-sm">Power Day!</p>
              <p className="text-xs text-emerald-100">3+ sessions at 80%+ average. You're absolutely crushing it today!</p>
            </div>
          </div>
        )}

        {/* Final Week Study Plan */}
        {daysLeft !== null && daysLeft >= 1 && daysLeft <= 7 && (() => {
          const todayIdx = 7 - daysLeft
          const DAYS = [
            { icon: '📊', label: 'Full Diagnostic', tip: 'Take a timed full practice test to see where you stand.', action: onFullPractice },
            { icon: '📖', label: 'Reading & Grammar', tip: 'Focus on Standard English conventions — grammar rules.', action: onGrammarRef },
            { icon: '📐', label: 'Math Review', tip: 'Review formulas and drill your weakest math domain.', action: onMathRef },
            { icon: '🔁', label: 'Wrong Answer Sprint', tip: 'Review every question you got wrong this week.', action: onWrongAnswerSprint },
            { icon: '⚡', label: 'Blitz Mode', tip: 'Practice speed — 40 questions, 60 sec each.', action: onBlitzMode },
            { icon: '🎯', label: 'Weak Spot Drill', tip: 'One last focus session on your weakest domain.', action: onFocusPractice ? () => onFocusPractice(weakDomain?.id ?? 'algebra') : null },
            { icon: '😴', label: 'Rest Day', tip: "Don't study tonight. Sleep 8+ hours. You're ready.", action: null },
          ]
          const todayPlan = DAYS[Math.min(todayIdx, 6)]
          return (
            <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl p-4 mb-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-200 mb-1">
                🚨 Final Week — {daysLeft} day{daysLeft !== 1 ? 's' : ''} to go
              </p>
              <p className="text-base font-black mb-2">Today: {todayPlan.label}</p>
              <p className="text-xs text-rose-100 leading-relaxed mb-3">{todayPlan.tip}</p>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {DAYS.slice(0, 7 - (daysLeft - 1)).map((d, i) => (
                  <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-lg font-bold ${i === todayIdx ? 'bg-white text-rose-600' : 'bg-rose-400/50 text-rose-100 line-through'}`}>{d.icon}</span>
                ))}
              </div>
              {todayPlan.action && daysLeft > 1 && (
                <button
                  onClick={todayPlan.action}
                  className="bg-white text-rose-600 font-black text-xs px-4 py-2 rounded-xl hover:bg-rose-50 transition-colors"
                >
                  Start now →
                </button>
              )}
            </div>
          )
        })()}

        {/* Streak at risk warning */}
        {streakAtRisk && !freezeUsed && (
          <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl px-4 py-3 mb-4 text-white flex items-center gap-3 animate-pulse">
            <span className="text-2xl shrink-0">🔥</span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm leading-tight">{streak}-day streak at risk!</p>
              <p className="text-xs text-rose-100 mt-0.5">Study before midnight to keep it alive</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {freezeCount > 0 && (
                <button
                  onClick={() => { if (useStreakFreeze()) { setFreezeCount(c => c - 1); setFreezeUsed(true) } }}
                  className="bg-white/20 hover:bg-white/30 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors"
                  title={`Use a Streak Freeze (${freezeCount} left)`}
                >
                  🧊 Freeze
                </button>
              )}
              <button onClick={onQuick5} className="bg-white/20 hover:bg-white/30 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors">
                Quick 5 →
              </button>
            </div>
          </div>
        )}
        {freezeUsed && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-xl">🧊</span>
            <div>
              <p className="text-sm font-bold text-blue-700">Streak Freeze used!</p>
              <p className="text-xs text-blue-400">Your {streak}-day streak is protected for today</p>
            </div>
          </div>
        )}

        {/* Daily quote */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-700 to-slate-800 p-4 mb-4 text-white">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Quote of the Day</p>
          <p className="text-sm font-medium leading-snug">"{todayQuote.text}"</p>
          <p className="text-xs text-slate-400 mt-1.5">— {todayQuote.author}</p>
        </div>

        {/* Recently unlocked achievements */}
        {recentAchievements.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-xl shrink-0">🏆</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-700">Achievement{recentAchievements.length > 1 ? 's' : ''} Unlocked!</p>
              <p className="text-xs text-amber-600 truncate">{recentAchievements.map(a => `${a.icon} ${a.title}`).join(' · ')}</p>
            </div>
          </div>
        )}

        {/* Near-unlock achievements */}
        {nearUnlocks.length > 0 && (
          <div className="bg-white border border-indigo-100 rounded-2xl px-4 py-3 mb-4">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2.5">Almost there...</p>
            <div className="space-y-2">
              {nearUnlocks.map(a => (
                <div key={a.id} className="flex items-center gap-2.5">
                  <span className="text-lg shrink-0">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-gray-700 truncate">{a.title}</span>
                      <span className="text-xs text-indigo-500 font-bold ml-1">{a.pct}%</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${a.pct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test day checklist — shown when exam is within 7 days */}
        {daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && (() => {
          const CHECKLIST_KEY = 'sat_prep_testday_checklist'
          const ITEMS = [
            { label: 'Admission ticket printed or saved', key: 'ticket' },
            { label: 'Photo ID ready', key: 'id' },
            { label: '#2 pencils & eraser packed', key: 'pencils' },
            { label: 'Approved calculator + spare batteries', key: 'calc' },
            { label: 'Snacks & water bottle', key: 'snacks' },
            { label: 'Alarm set — arrive 30 min early', key: 'alarm' },
            { label: 'Sleep 8+ hours tonight', key: 'sleep' },
            { label: 'Eat a real breakfast tomorrow', key: 'breakfast' },
          ]
          const [checked, setChecked] = [
            (() => { try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? '{}') } catch { return {} } })(),
            (fn) => {
              const prev = (() => { try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? '{}') } catch { return {} } })()
              const next = fn(prev)
              try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next)) } catch {}
              return next
            }
          ]
          const doneCount = ITEMS.filter(i => checked[i.key]).length
          const allDone = doneCount === ITEMS.length
          return (
            <div className="rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 p-4 mb-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  <p className="font-black text-sm">{daysLeft === 0 ? 'SAT Day Is Here!' : `${daysLeft} Day${daysLeft !== 1 ? 's' : ''} Until Your SAT!`}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${allDone ? 'bg-white text-rose-700' : 'bg-white/20 text-rose-200'}`}>{doneCount}/{ITEMS.length}</span>
              </div>
              <div className="space-y-2">
                {ITEMS.map(({ label, key }) => {
                  const isChecked = !!checked[key]
                  return (
                    <button
                      key={key}
                      onClick={() => setChecked(prev => ({ ...prev, [key]: !prev[key] }))}
                      className="w-full flex items-center gap-2.5 text-left"
                    >
                      <div className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${isChecked ? 'bg-white border-white' : 'border-rose-300'}`}>
                        {isChecked && <span className="text-rose-700 text-xs font-black">✓</span>}
                      </div>
                      <span className={`text-xs leading-tight ${isChecked ? 'line-through text-rose-400' : 'text-rose-100'}`}>{label}</span>
                    </button>
                  )
                })}
              </div>
              {allDone
                ? <p className="text-xs text-white font-bold mt-3 text-center">✅ All set! Go get that score!</p>
                : <p className="text-xs text-rose-300 mt-3">💡 Light review only — trust your preparation!</p>
              }
            </div>
          )
        })()}

        {/* Next Up recommendation */}
        {recommendation && (
          <div className="bg-indigo-600 rounded-2xl p-4 mb-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-0.5">Next Up</p>
              <p className="text-sm font-black text-white">{recommendation.label}</p>
              <p className="text-xs text-indigo-300 mt-0.5">{recommendation.desc}</p>
            </div>
            <button
              onClick={() => {
                if (recommendation.type === 'beast') onBeastMode?.()
                else if (recommendation.type === 'blitz') onBlitzMode?.()
                else if (recommendation.type === 'focus') onFocusPractice?.(recommendation.domainId)
                else if (recommendation.type === 'full') onFullPractice?.()
                else onQuickPractice?.()
              }}
              className="shrink-0 bg-white text-indigo-600 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Start →
            </button>
          </div>
        )}

        {/* Practice test ready prompt */}
        {practiceTestReady && onFullPractice && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-xl shrink-0">🎯</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-700 font-semibold">You're on a 75%+ streak!</p>
              <p className="text-xs text-emerald-600 mt-0.5">5 strong sessions in a row — try a Full Practice Test</p>
            </div>
            <button onClick={onFullPractice} className="shrink-0 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl transition-colors">
              Full Test →
            </button>
          </div>
        )}

        {/* Tomorrow's focus suggestion */}
        {tomorrowFocus && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-lg shrink-0">📅</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-violet-400 font-semibold mb-0.5">Suggested next focus</p>
              <p className="text-sm font-bold text-violet-800">{tomorrowFocus.label}</p>
              <p className="text-xs text-violet-400">{tomorrowFocus.pct}% accuracy · not practiced in {tomorrowFocus.daysSince}d</p>
            </div>
            <button
              onClick={() => setSelectedDomains(new Set([tomorrowFocus.id]))}
              className="shrink-0 text-xs font-semibold text-violet-600 bg-white border border-violet-200 px-3 py-1.5 rounded-xl hover:bg-violet-50 transition-colors"
            >
              Drill it
            </button>
          </div>
        )}

        {/* Weak domain quick-drill shortcuts */}
        {weakDomain && history.length >= 5 && recommendation?.type !== 'focus' && (() => {
          const weakLabel = domainById[weakDomain.id]?.label ?? weakDomain.id
          return (
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              <span className="text-xs text-gray-400 shrink-0">Quick drill:</span>
              <button
                onClick={() => {
                  setSelectedDomains(new Set([weakDomain.id]))
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
                }}
                className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-full hover:bg-rose-100 transition-colors"
              >
                🎯 {weakLabel} ({weakDomain.pct}%)
              </button>
            </div>
          )
        })()}

        {/* Skill Spotlight — 3 weakest SAT skills */}
        {weakSkills.length >= 2 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Skill Spotlight · Focus Here</p>
            <div className="space-y-2.5">
              {weakSkills.map((sk, i) => (
                <div key={sk.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${i === 0 ? 'bg-rose-500 text-white' : i === 1 ? 'bg-amber-400 text-white' : 'bg-yellow-300 text-yellow-900'}`}>{i + 1}</span>
                      <span className="text-xs font-medium text-gray-700 truncate">{sk.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-xs font-bold ${sk.pct < 50 ? 'text-rose-600' : sk.pct < 65 ? 'text-amber-600' : 'text-yellow-600'}`}>{sk.pct}%</span>
                      {onSkillFocus && (
                        <button
                          onClick={() => onSkillFocus(sk.id, sk.label, sk.domain)}
                          className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-0.5 hover:bg-indigo-100 transition-colors"
                        >
                          Drill →
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sk.pct < 50 ? 'bg-rose-400' : sk.pct < 65 ? 'bg-amber-400' : 'bg-yellow-400'}`} style={{ width: `${sk.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-3">Based on your last {history.length} sessions · each has ≥5 questions answered</p>
          </div>
        )}

        {/* Coach's Eye — data-driven insights */}
        {history.length >= 5 && (() => {
          const insights = []

          // Pacing: avg seconds per question
          const totalSecs = history.reduce((s, h) => s + (h.elapsedSeconds ?? 0), 0)
          const totalQs = history.reduce((s, h) => s + h.score.total, 0)
          if (totalSecs > 0 && totalQs > 0) {
            const avgSec = Math.round(totalSecs / totalQs)
            if (avgSec > 100) insights.push({ icon: '⏱', text: `You average ${avgSec}s/question — the SAT budgets ~75s. Try to pick up pace on easier questions.`, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' })
            else if (avgSec < 30) insights.push({ icon: '⚡', text: `You answer in ${avgSec}s/question on average — fast! Make sure you're reading carefully.`, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' })
            else insights.push({ icon: '✅', text: `Your pace is solid at ${avgSec}s/question — right in the sweet spot for the SAT.`, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' })
          }

          // Best time of day
          const byHour = { morning: { c: 0, t: 0 }, afternoon: { c: 0, t: 0 }, evening: { c: 0, t: 0 } }
          for (const s of history) {
            const h = new Date(s.completedAt).getHours()
            const tod = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
            byHour[tod].c += s.score.correct; byHour[tod].t += s.score.total
          }
          const todPct = Object.entries(byHour).filter(([, v]) => v.t >= 5).map(([k, v]) => [k, Math.round((v.c / v.t) * 100)])
          if (todPct.length >= 2) {
            const best = todPct.sort((a, b) => b[1] - a[1])[0]
            insights.push({ icon: '🕐', text: `You perform best in the ${best[0]} (${best[1]}% accuracy). Schedule your hardest sessions then.`, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' })
          }

          // Hard question performance
          let hardC = 0, hardT = 0
          for (const s of history) for (const q of s.questions) {
            if (q.difficulty === 3) { hardT++; if ((s.answers?.[q.id] ?? null) === q.answer) hardC++ }
          }
          if (hardT >= 10) {
            const hardPct = Math.round((hardC / hardT) * 100)
            if (hardPct >= 70) insights.push({ icon: '🔥', text: `You nail ${hardPct}% of hard questions — top-tier performance. Keep targeting difficulty 3.`, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' })
            else if (hardPct < 40) insights.push({ icon: '📐', text: `Hard questions: ${hardPct}% accuracy (${hardC}/${hardT}). Drilling these could unlock your biggest score gains.`, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' })
          }

          if (insights.length === 0) return null
          const shown = insights.slice(0, 2)
          return (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">📊 Coach's Eye</p>
              <div className="space-y-2.5">
                {shown.map((ins, i) => (
                  <div key={i} className={`flex items-start gap-2.5 rounded-xl border p-3 ${ins.bg}`}>
                    <span className="text-base shrink-0 mt-0.5">{ins.icon}</span>
                    <p className={`text-xs leading-snug font-medium ${ins.color}`}>{ins.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

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

        {/* Next achievement progress */}
        {nextAchievement && (
          <div className="bg-white border-2 border-amber-100 rounded-2xl p-4 mb-4 flex items-center gap-4">
            <span className="text-2xl shrink-0">{nextAchievement.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-700">Next: {nextAchievement.label}</p>
                <span className="text-xs text-amber-600 font-bold">{nextAchievement.pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${nextAchievement.pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{nextAchievement.cur.toLocaleString()} / {nextAchievement.goal.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Triple Daily Challenges */}
        <div className={`rounded-2xl border-2 p-4 mb-4 ${allTripleComplete ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🏆</span>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Daily Challenges</p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${allTripleComplete ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {allTripleComplete ? '🎉 All done!' : `+${totalTripleBonus} XP total`}
            </span>
          </div>
          <div className="space-y-2.5">
            {tripleToday.map((c, i) => {
              const done = tripleComplete[i]
              const prog = tripleProgress[i]
              const pct = Math.min(100, (prog / c.goal) * 100)
              return (
                <div key={c.id} className={`p-2.5 rounded-xl ${done ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50 border border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{c.icon}</span>
                      <p className={`text-xs font-semibold ${done ? 'text-emerald-700' : 'text-gray-700'}`}>{c.desc}</p>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ml-2 ${done ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {done ? `+${c.bonus} XP ✓` : `+${c.bonus} XP`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-emerald-500' : 'bg-indigo-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${done ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {Math.min(prog, c.goal)}/{c.goal}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          {allTripleComplete && (
            <p className="text-center text-xs text-amber-700 font-semibold mt-3">Bonus XP applied — come back tomorrow for new challenges!</p>
          )}
        </div>

        {/* Weekly Challenge */}
        <div className={`rounded-2xl border-2 p-4 mb-4 ${weeklyChallenge.done ? 'border-violet-200 bg-violet-50' : 'border-violet-100 bg-white'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Weekly Challenge</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${weeklyChallenge.done ? 'bg-violet-500 text-white' : 'bg-violet-100 text-violet-600'}`}>
              {weeklyChallenge.done ? '✓ Complete!' : `+${weeklyChallenge.challenge.bonus} XP`}
            </span>
          </div>
          <p className="text-sm font-semibold mb-3 text-gray-900">{weeklyChallenge.challenge.desc}</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-violet-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${weeklyChallenge.done ? 'bg-violet-500' : 'bg-violet-400'}`}
                style={{ width: `${Math.min(100, Math.round((weeklyChallenge.progress / weeklyChallenge.challenge.goal) * 100))}%` }}
              />
            </div>
            <span className="text-xs font-bold text-violet-600 shrink-0">
              {Math.min(weeklyChallenge.progress, weeklyChallenge.challenge.goal)}/{weeklyChallenge.challenge.goal}
            </span>
          </div>
        </div>

        {/* Weekly XP goal tracker */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Weekly XP Goal</p>
            {editingWeeklyXP ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number" value={weeklyXPInput} onChange={e => setWeeklyXPInput(e.target.value)}
                  className="w-20 text-xs border border-gray-300 rounded-lg px-2 py-1 text-center"
                  min="50" max="5000" step="50"
                />
                <button onClick={() => { const v = parseInt(weeklyXPInput, 10); if (v >= 50) { setWeeklyXPGoal(v); saveWeeklyXPGoal(v) } setEditingWeeklyXP(false) }}
                  className="text-xs text-indigo-600 font-semibold">Save</button>
                <button onClick={() => setEditingWeeklyXP(false)} className="text-xs text-gray-400">✕</button>
              </div>
            ) : (
              <button onClick={() => { setWeeklyXPInput(String(weeklyXPGoal)); setEditingWeeklyXP(true) }}
                className="text-xs text-indigo-500 hover:text-indigo-700 border border-indigo-200 rounded-lg px-2 py-0.5 transition-colors">
                Edit
              </button>
            )}
          </div>
          <div className="flex items-end justify-between mb-2">
            <span className={`text-2xl font-black ${weekXP >= weeklyXPGoal ? 'text-emerald-600' : 'text-indigo-600'}`}>{weekXP.toLocaleString()}</span>
            <span className="text-sm text-gray-400">/ {weeklyXPGoal.toLocaleString()} XP</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${weekXP >= weeklyXPGoal ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${Math.min(100, Math.round((weekXP / weeklyXPGoal) * 100))}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {weekXP >= weeklyXPGoal ? '✅ Weekly goal reached!' : `${(weeklyXPGoal - weekXP).toLocaleString()} XP to go this week`}
          </p>
          {/* Daily XP sparkline */}
          {dailyXPSparkline.some(d => d.xp > 0) && (() => {
            const maxXP = Math.max(...dailyXPSparkline.map(d => d.xp), 1)
            return (
              <div className="flex items-end gap-1 mt-3 h-8">
                {dailyXPSparkline.map((d, i) => {
                  const today = i === 6
                  const h = Math.max(4, Math.round((d.xp / maxXP) * 32))
                  return (
                    <div key={d.key} className="flex flex-col items-center gap-0.5 flex-1">
                      <div
                        className={`w-full rounded-t-sm transition-all ${today ? (d.xp ? 'bg-indigo-500' : 'bg-indigo-200') : d.xp ? 'bg-indigo-300' : 'bg-gray-100'}`}
                        style={{ height: `${h}px` }}
                        title={`${d.key}: ${d.xp} XP`}
                      />
                      <span className={`text-xs leading-none ${today ? 'text-indigo-500 font-bold' : 'text-gray-300'}`}>{d.label}</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* XP Week-over-Week Race */}
        {xpWeekRace.lastWeek > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">⚔️ This Week vs. Last Week</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-center">
                <p className="text-2xl font-black text-indigo-600">{xpWeekRace.thisWeek.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">This week</p>
              </div>
              <div className="text-center">
                <span className={`text-lg font-black ${xpWeekRace.diff >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                  {xpWeekRace.diff >= 0 ? '↑' : '↓'}{Math.abs(xpWeekRace.diff)}
                </span>
              </div>
              <div className="flex-1 text-center">
                <p className="text-2xl font-black text-gray-300">{xpWeekRace.lastWeek.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">Last week</p>
              </div>
            </div>
            <p className="text-xs text-center mt-2 text-gray-400">
              {xpWeekRace.diff > 0 ? `🔥 Ahead by ${xpWeekRace.diff} XP — keep it up!` :
               xpWeekRace.diff < 0 ? `💪 ${Math.abs(xpWeekRace.diff)} XP behind — you got this!` :
               '👀 Exactly tied with last week!'}
            </p>
          </div>
        )}

        {/* This week's focus plan */}
        {weeklyFocusPlan && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">📋 This Week's Focus</p>
            <div className="space-y-1.5">
              {weeklyFocusPlan.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedDomains(new Set([f.id]))}
                  className="w-full flex items-center gap-2 group text-left"
                >
                  <span className={`shrink-0 w-4 h-4 rounded-full text-white text-center text-xs leading-4 font-bold ${f.status === 'weak' ? 'bg-rose-400' : 'bg-indigo-400'}`}>
                    {f.status === 'weak' ? '!' : '+'}
                  </span>
                  <span className="text-sm text-gray-700 group-hover:text-indigo-600 transition-colors flex-1">{f.label}</span>
                  {f.pct !== undefined
                    ? <span className="text-xs text-rose-400 font-semibold">{f.pct}%</span>
                    : <span className="text-xs text-indigo-400 font-medium">not started</span>
                  }
                  <span className="text-xs text-gray-300 group-hover:text-indigo-400">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Best study time tip */}
        {bestStudyTime && (() => {
          const h = new Date().getHours()
          const isBestTime = (bestStudyTime.label === 'morning' && h < 12) || (bestStudyTime.label === 'afternoon' && h >= 12 && h < 17) || (bestStudyTime.label === 'evening' && h >= 17)
          if (!isBestTime) return null
          return (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
              <span className="text-sm">{bestStudyTime.emoji}</span>
              <p className="text-xs text-amber-700">Peak performance time! You score {bestStudyTime.pct}% in the {bestStudyTime.label}.</p>
            </div>
          )
        })()}

        {/* Personalized daily target */}
        {dailyTarget && (
          <div className={`rounded-2xl border px-4 py-3 mb-4 flex items-center gap-3 ${dailyTarget.color}`}>
            <span className="text-lg shrink-0">{dailyTarget.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold opacity-70 mb-0.5">Today's target</p>
              <p className="text-sm font-bold">{dailyTarget.text}</p>
            </div>
          </div>
        )}

        {/* Hot domain this week */}
        {hotDomainThisWeek && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-lg shrink-0">🔥</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 font-medium">Hot domain this week</p>
              <p className="text-sm font-bold text-gray-800">{hotDomainThisWeek.label}</p>
              <p className="text-xs text-gray-400">{hotDomainThisWeek.pct}% · {hotDomainThisWeek.total} questions</p>
            </div>
            <span className="shrink-0 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
              {hotDomainThisWeek.pct}% ✓
            </span>
          </div>
        )}

        {/* Weekly session count */}
        {weeklySessionCount > 0 && (
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-xs text-gray-500">📅 Sessions this week</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <div key={n} className={`w-4 h-4 rounded-sm ${n <= weeklySessionCount ? 'bg-indigo-500' : 'bg-gray-100'}`} />
                ))}
              </div>
              <span className="text-xs font-bold text-indigo-600">{weeklySessionCount}/5</span>
            </div>
          </div>
        )}

        {/* Best of the week highlight */}
        {bestOfWeek && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-lg">🌟</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 font-medium">Best this week</p>
              <p className="text-sm font-bold text-gray-800">{bestOfWeek.pct}% · {bestOfWeek.label}</p>
              <p className="text-xs text-gray-400">{bestOfWeek.date}</p>
            </div>
          </div>
        )}

        {/* SAT score goal tracker */}
        {/* Score milestone roadmap */}
        {estimatedScore && (() => {
          const MILESTONES = [
            { score: 1000, label: '1000', icon: '🌱' },
            { score: 1100, label: '1100', icon: '📗' },
            { score: 1200, label: '1200', icon: '📘' },
            { score: 1300, label: '1300', icon: '🏅' },
            { score: 1400, label: '1400', icon: '🥇' },
            { score: 1500, label: '1500', icon: '🚀' },
            { score: 1600, label: '1600', icon: '🏆' },
          ]
          const achieved = MILESTONES.filter(m => estimatedScore >= m.score)
          const nextMilestone = MILESTONES.find(m => estimatedScore < m.score)
          if (!nextMilestone && achieved.length === MILESTONES.length) return null
          return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Score Roadmap</p>
              <div className="relative">
                <div className="absolute top-4 left-0 right-0 h-1 bg-gray-100 rounded-full">
                  <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${((estimatedScore - 800) / 800) * 100}%` }} />
                </div>
                <div className="flex justify-between relative">
                  {MILESTONES.map(m => {
                    const done = estimatedScore >= m.score
                    const isNext = m === nextMilestone
                    return (
                      <div key={m.score} className="flex flex-col items-center gap-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${done ? 'border-indigo-500 bg-indigo-500' : isNext ? 'border-indigo-300 bg-white animate-pulse' : 'border-gray-200 bg-white'}`}>
                          {done ? <span className="text-white text-xs">✓</span> : <span className={isNext ? 'text-indigo-400' : 'text-gray-300'}>{m.icon}</span>}
                        </div>
                        <span className={`text-[9px] font-bold ${done ? 'text-indigo-600' : isNext ? 'text-indigo-400' : 'text-gray-300'}`}>{m.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              {nextMilestone && (
                <p className="text-xs text-gray-400 mt-3 text-center">
                  {nextMilestone.score - estimatedScore} pts to <span className="font-semibold text-indigo-600">{nextMilestone.label}</span> {nextMilestone.icon}
                </p>
              )}
            </div>
          )
        })()}

        {(goalTarget !== null || estimatedScore !== null) && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">SAT Score Goal</p>
              {!editingGoal && !editingExam && (
                <div className="flex gap-2">
                  {daysLeft !== null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${daysLeft <= 7 ? 'bg-rose-100 text-rose-600' : daysLeft <= 14 ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      📅 {daysLeft}d
                    </span>
                  )}
                  <button
                    onClick={() => { setGoalInput(goalTarget ? String(goalTarget) : ''); setEditingGoal(true) }}
                    className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    {goalTarget ? 'Edit' : 'Set goal'}
                  </button>
                </div>
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
              <>
                <div className="flex items-end gap-4">
                  <div>
                    {estimatedScore && (
                      <div className="mb-2">
                        <span className="text-xs text-gray-400">Estimated current</span>
                        <div className="flex items-baseline gap-2">
                          <div className="text-2xl font-black text-gray-900">~{estimatedScore}</div>
                          {(() => {
                            const m = scoreMilestone(estimatedScore)
                            return <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${m.color}`}>{m.label}</span>
                          })()}
                        </div>
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
                      {/* Estimated time to goal */}
                      {goalTarget && estimatedScore && estimatedScore < goalTarget && history.length >= 5 && (() => {
                        const recent = history.filter(s => s.score.total >= 5)
                        if (recent.length < 4) return null
                        const older = recent.slice(-6, -3)
                        const newer = recent.slice(-3)
                        const oldAvg = older.reduce((s, x) => s + x.score.percent, 0) / older.length
                        const newAvg = newer.reduce((s, x) => s + x.score.percent, 0) / newer.length
                        const gainPer3 = newAvg - oldAvg
                        if (gainPer3 <= 0) return null
                        const ptPerSession = gainPer3 * 12 / 3
                        const sessionsNeeded = Math.ceil((goalTarget - estimatedScore) / ptPerSession)
                        const weeksNeeded = Math.ceil(sessionsNeeded / 5)
                        return <p className="text-xs text-indigo-400 mt-0.5 text-center">~{weeksNeeded}w at current pace</p>
                      })()}
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Exam date:</span>
                    {editingExam ? (
                      <div className="flex flex-col gap-1.5">
                        <input
                          autoFocus
                          type="date"
                          defaultValue={examDate ?? ''}
                          min={new Date().toISOString().slice(0, 10)}
                          onBlur={e => { if (e.target.value) { setExamDate(e.target.value); saveExamDate(e.target.value) } setEditingExam(false) }}
                          onKeyDown={e => { if (e.key === 'Escape') setEditingExam(false) }}
                          className="text-xs border border-indigo-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        />
                        <div className="flex flex-wrap gap-1">
                          {[
                            { label: 'Aug 29, 2026', val: '2026-08-29' },
                            { label: 'Oct 3, 2026',  val: '2026-10-03' },
                            { label: 'Nov 7, 2026',  val: '2026-11-07' },
                            { label: 'Dec 5, 2026',  val: '2026-12-05' },
                            { label: 'Mar 13, 2027', val: '2027-03-13' },
                            { label: 'May 1, 2027',  val: '2027-05-01' },
                            { label: 'Jun 5, 2027',  val: '2027-06-05' },
                          ].filter(d => d.val > new Date().toISOString().slice(0, 10))
                            .slice(0, 4)
                            .map(d => (
                              <button
                                key={d.val}
                                onMouseDown={e => { e.preventDefault(); setExamDate(d.val); saveExamDate(d.val); setEditingExam(false) }}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                              >
                                {d.label}
                              </button>
                            ))
                          }
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setEditingExam(true)} className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
                        {examDate ? new Date(examDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '+ Add date'}
                      </button>
                    )}
                  </div>
                  {daysLeft !== null && (
                    <span className={`text-xs font-semibold ${daysLeft <= 7 ? 'text-rose-600' : daysLeft <= 14 ? 'text-amber-600' : 'text-indigo-600'}`}>
                      {daysLeft > 0 ? `${daysLeft} days away` : daysLeft === 0 ? 'Today!' : 'Exam passed'}
                    </span>
                  )}
                </div>
                {daysLeft > 0 && weekQs > 0 && (() => {
                  const dailyAvg = Math.round(weekQs / daysIntoWeek)
                  const projected = dailyAvg * daysLeft
                  return (
                    <p className="text-xs text-gray-400 mt-2">
                      At ~{dailyAvg} Qs/day, you'll answer ~{projected.toLocaleString()} questions before your exam.
                      {goalTarget && estimatedScore && estimatedScore < goalTarget && dailyAvg < 30 && (
                        <span className="text-indigo-600 font-medium"> Try for 30/day to close the gap faster.</span>
                      )}
                    </p>
                  )
                })()}
                {scoreTrajectory && (
                  <div className={`mt-2 flex items-center gap-2 text-xs font-semibold px-2 py-1.5 rounded-lg ${scoreTrajectory.onTrack ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                    <span>{scoreTrajectory.onTrack ? '✅' : '⚠️'}</span>
                    <span>{scoreTrajectory.onTrack ? `On track! Projected: ~${scoreTrajectory.projected}` : `Need to accelerate — projected: ~${scoreTrajectory.projected} (goal: ${goalTarget})`}</span>
                  </div>
                )}
              </>
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

        {/* Domain of the Day */}
        {onFocusPractice && (
          <div className="rounded-2xl border-2 border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-0.5">Domain of the Day ✨</p>
              <p className="text-sm font-bold text-gray-900 truncate">{domainOfDay.label}</p>
              <p className="text-xs text-violet-500 mt-0.5">{domainOfDay.subject} · +25% bonus XP today</p>
            </div>
            <button
              onClick={() => onFocusPractice(domainOfDay.id, 1.25)}
              className="shrink-0 text-xs font-semibold text-white bg-violet-500 hover:bg-violet-600 px-3 py-2 rounded-xl transition-colors"
            >
              Practice →
            </button>
          </div>
        )}

        {/* Weak spot focus card */}
        {weakDomain && onFocusPractice && (
          <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-400 mb-0.5">Weak Spot Detected</p>
              <p className="text-sm font-bold text-gray-900 truncate">{domainById[weakDomain.id]?.label ?? weakDomain.id}</p>
              <p className="text-xs text-rose-500 mt-0.5">Only {weakDomain.pct}% accuracy · focus here to improve your score</p>
            </div>
            <button
              onClick={() => onFocusPractice(weakDomain.id)}
              className="shrink-0 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 px-3 py-2 rounded-xl transition-colors"
            >
              Practice →
            </button>
          </div>
        )}

        {/* Difficulty Calibration Card */}
        {history.length >= 20 && (() => {
          const recent = history.filter(s => s.score.total >= 5).slice(-10)
          if (recent.length < 5) return null
          const allQ = recent.flatMap(s => s.questions.map(q => ({ ...q, correct: (s.answers[q.id] ?? null) === q.answer })))
          const byDiff = { 1: { c: 0, t: 0 }, 2: { c: 0, t: 0 }, 3: { c: 0, t: 0 } }
          for (const q of allQ) { byDiff[q.difficulty ?? 2].t++; if (q.correct) byDiff[q.difficulty ?? 2].c++ }
          const easyPct = byDiff[1].t > 3 ? Math.round((byDiff[1].c / byDiff[1].t) * 100) : null
          const hardPct = byDiff[3].t > 3 ? Math.round((byDiff[3].c / byDiff[3].t) * 100) : null
          const overallPct = allQ.length > 0 ? Math.round((allQ.filter(q => q.correct).length / allQ.length) * 100) : 0
          if (overallPct >= 90 && easyPct !== null && easyPct >= 90) {
            return (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
                <span className="text-2xl shrink-0">🔥</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-0.5">Calibration: Level Up!</p>
                  <p className="text-sm font-bold text-gray-800">You're dominating easy questions</p>
                  <p className="text-xs text-gray-500 mt-0.5">Try Beast Mode or Hard-only questions to push your ceiling higher.</p>
                </div>
              </div>
            )
          }
          if (overallPct < 65 && hardPct !== null && hardPct < 40) {
            return (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
                <span className="text-2xl shrink-0">🎯</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-0.5">Calibration: Foundation First</p>
                  <p className="text-sm font-bold text-gray-800">Hard questions need a solid base</p>
                  <p className="text-xs text-gray-500 mt-0.5">Focus on Easy and Medium to build fluency before tackling Hard questions.</p>
                </div>
              </div>
            )
          }
          return null
        })()}

        {/* Weekend XP bonus banner */}
        {(() => { const d = new Date().getDay(); return (d === 0 || d === 6) })() && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl px-4 py-3 mb-4 text-white">
            <span className="text-lg shrink-0">🌟</span>
            <div>
              <p className="text-sm font-black">Weekend Bonus: 1.5× XP</p>
              <p className="text-xs text-indigo-200">Every session earns 50% more XP today — make it count!</p>
            </div>
          </div>
        )}

        {/* SAT Strategy Tip */}
        {(() => {
          const d = new Date()
          const start = new Date(d.getFullYear(), 0, 0)
          const tip = SAT_STRATEGIES[Math.floor((d - start) / 86400000) % SAT_STRATEGIES.length]
          const colors = CATEGORY_COLOR[tip.category] ?? 'text-gray-600 bg-gray-50 border-gray-100'
          return (
            <div className={`border rounded-2xl p-4 mb-4 ${colors}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">💡</span>
                <p className={`text-xs font-bold uppercase tracking-widest`}>SAT Tip · {tip.category}</p>
              </div>
              <p className="text-sm font-medium text-gray-800 leading-snug">{tip.tip}</p>
            </div>
          )
        })()}

        {/* SAT Vocab Word of the Day */}
        <VocabWordOfDay />

        {/* Personal Insight */}
        {personalInsight && (
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl px-4 py-3.5 mb-4 flex items-start gap-3">
            <span className="text-xl shrink-0 mt-0.5">{personalInsight.icon}</span>
            <div>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Today's Insight</p>
              <p className="text-sm text-indigo-900 font-medium leading-snug">{personalInsight.text}</p>
            </div>
          </div>
        )}

        {/* Mood Check-in */}
        {!mood ? (
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">How are you feeling today?</p>
            <div className="flex gap-2 flex-wrap">
              {MOODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => saveMood(m.id)}
                  className="flex-1 min-w-[72px] flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                >
                  <span className="text-xl">{m.icon}</span>
                  <span className="text-[10px] font-bold text-gray-500">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : currentMood && (
          <div className={`${currentMood.lightBg} border-2 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3`} style={{ borderColor: '' }}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">{currentMood.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mood · {currentMood.label}</p>
                <p className={`text-sm font-bold ${currentMood.text} truncate`}>Try: {currentMood.suggestion}</p>
                <p className="text-xs text-gray-400">{currentMood.suggestDesc}</p>
              </div>
            </div>
            {currentMood.action && (
              <button
                onClick={currentMood.action}
                className={`shrink-0 text-xs font-bold text-white px-3 py-2 rounded-xl transition-colors ${currentMood.color} hover:opacity-90`}
              >
                Go →
              </button>
            )}
          </div>
        )}

        {/* Today's Study Plan */}
        {history.length >= 3 && (() => {
          const today = new Date().toISOString().slice(0, 10)
          const studiedToday = history.some(s => s.completedAt.startsWith(today))
          if (studiedToday) return null
          const PLAN_KEY = 'sat_prep_study_plan_' + today
          let dismissed = false
          try { dismissed = localStorage.getItem(PLAN_KEY) === 'dismissed' } catch {}
          if (dismissed) return null
          const plan = []
          if (weakDomain) plan.push({ icon: '🎯', label: `Focus: ${weakDomain.label}`, desc: '10 questions', time: 10, action: onFocusPractice ? () => onFocusPractice(weakDomain.id) : null })
          else plan.push({ icon: '⚡', label: 'Quick Practice', desc: '15 random questions', time: 12, action: onQuickPractice ?? null })
          const wrongIds = new Set()
          for (const s of history.slice(-5)) for (const q of s.questions) if ((s.answers?.[q.id] ?? null) !== q.answer) wrongIds.add(q.id)
          if (wrongIds.size >= 5) plan.push({ icon: '📓', label: 'Wrong Answer Sprint', desc: `Review ${Math.min(wrongIds.size, 15)} missed`, time: 8, action: onWrongAnswerSprint ?? null })
          plan.push({ icon: '💎', label: '5 Hard Questions', desc: 'Beast Mode warmup', time: 5, action: onQuick5 ?? null })
          const total = plan.reduce((s, p) => s + p.time, 0)
          return (
            <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Today's Study Plan</p>
                  <p className="text-xs text-gray-400 mt-0.5">~{total} minutes · tap a step to start</p>
                </div>
                <button onClick={() => { try { localStorage.setItem(PLAN_KEY, 'dismissed') } catch {} window.location.reload() }} className="text-gray-300 text-xs hover:text-gray-400">✕</button>
              </div>
              <div className="space-y-2">
                {plan.map((p, i) => (
                  <div
                    key={i}
                    onClick={p.action ?? undefined}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${p.action ? 'bg-gray-50 border-gray-100 hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer active:scale-[0.98]' : 'bg-gray-50 border-gray-100'}`}
                  >
                    <span className="text-base shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800">{p.label}</p>
                      <p className="text-[10px] text-gray-400">{p.desc}</p>
                    </div>
                    {p.action ? (
                      <span className="text-[10px] font-bold text-emerald-600 shrink-0">Start →</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 shrink-0">{p.time}m</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Daily motivational quote */}
        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3.5 mb-4 flex items-start gap-3">
          <span className="text-xl shrink-0 mt-0.5">💬</span>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Quote of the Day</p>
            <p className="text-sm text-gray-700 font-medium leading-snug italic">"{dailyQuote.text}"</p>
            {dailyQuote.author && <p className="text-[10px] text-gray-400 mt-1">— {dailyQuote.author}</p>}
          </div>
        </div>

        {/* Daily SAT Fact */}
        {(() => {
          const dayIdx = Math.floor(Date.now() / 86400000)
          const fact = SAT_FACTS[dayIdx % SAT_FACTS.length]
          return (
            <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 rounded-2xl px-4 py-3.5 mb-4 flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">🧠</span>
              <div>
                <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mb-0.5">SAT Fact of the Day</p>
                <p className="text-sm text-gray-700 leading-snug">{fact}</p>
              </div>
            </div>
          )
        })()}

        {/* XP Shop */}
        <XPShop gam={gam} onPurchase={handleShopPurchase} />

        {/* Daily Spin */}
        <DailySpin />

        {/* Question of the Hour */}
        <QuestionOfHour allQuestions={questions} onXP={xp => { const g = loadGamification(); saveGamification({ ...g, totalXP: (g.totalXP ?? 0) + xp }) }} />

        {/* Question of the Day */}
        <QuestionOfDay allQuestions={questions} />

        {/* Vocabulary Word of the Day */}
        {(() => {
          const dayIdx = Math.floor(Date.now() / 86400000)
          const word = SAT_VOCAB[dayIdx % SAT_VOCAB.length]
          if (!word) return null
          const vocabKey = 'sat_prep_vocab'
          let mastered = false
          try { const v = JSON.parse(localStorage.getItem(vocabKey) ?? '{}'); mastered = v[word.word]?.mastered === true } catch {}
          return (
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-500">📖 Word of the Day</p>
                {mastered && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ Mastered</span>}
              </div>
              <p className="text-xl font-black text-violet-900 mb-1">{word.word}</p>
              <p className="text-sm text-violet-700 mb-2">{word.def}</p>
              {word.example && (
                <p className="text-xs text-violet-500 italic border-t border-violet-100 pt-2">"{word.example}"</p>
              )}
            </div>
          )
        })()}

        {/* Math Formula of the Day */}
        {(() => {
          const dayIdx = Math.floor(Date.now() / 86400000)
          const formula = MATH_FORMULAS[dayIdx % MATH_FORMULAS.length]
          if (!formula) return null
          const mathKey = 'sat_prep_math_flash'
          let mastered = false
          try { const v = JSON.parse(localStorage.getItem(mathKey) ?? '{}'); mastered = v[formula.name]?.mastered === true } catch {}
          const catColors = { Geometry: 'text-blue-600 bg-blue-50 border-blue-100', Algebra: 'text-indigo-600 bg-indigo-50 border-indigo-100', Arithmetic: 'text-emerald-600 bg-emerald-50 border-emerald-100', Statistics: 'text-violet-600 bg-violet-50 border-violet-100' }
          const colors = catColors[formula.category] ?? 'text-blue-600 bg-blue-50 border-blue-100'
          return (
            <div className={`border rounded-2xl p-4 mb-4 ${colors}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">🔢 Formula of the Day</p>
                {mastered && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ Mastered</span>}
              </div>
              <p className="text-base font-bold mb-1">{formula.name}</p>
              <p className="text-2xl font-black font-mono mb-2 tracking-wide">{formula.formula}</p>
              <p className="text-xs opacity-70 italic border-t border-current/10 pt-2">💡 {formula.tip}</p>
            </div>
          )
        })()}

        {/* Quick-start shortcuts */}
        {(onQuickPractice || onFullPractice || onBeastMode || onBlitzMode) && (
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
            {onQuickAssessment && (
              <button
                onClick={onQuickAssessment}
                className="text-left rounded-2xl border-2 border-teal-100 bg-teal-50 hover:bg-teal-100 hover:border-teal-300 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">📊</div>
                <div className="font-bold text-sm text-teal-900">Quick Assessment</div>
                <div className="text-xs text-teal-500 mt-0.5">2 Qs per domain · balanced</div>
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
            {onBeastMode && (
              <button
                onClick={onBeastMode}
                className="text-left rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 hover:from-rose-100 hover:to-orange-100 hover:border-rose-400 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">🔥</div>
                <div className="font-bold text-sm text-rose-900">Beast Mode</div>
                <div className="text-xs text-rose-500 mt-0.5">Hard only · 2× XP</div>
              </button>
            )}
            {onBlitzMode && (
              <button
                onClick={onBlitzMode}
                className="text-left rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 hover:border-amber-400 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">⚡</div>
                <div className="font-bold text-sm text-amber-900">Blitz Mode</div>
                <div className="text-xs text-amber-600 mt-0.5">60 sec · rapid fire</div>
              </button>
            )}
            {onTimedChallenge && (
              <button
                onClick={onTimedChallenge}
                className="text-left rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 hover:from-cyan-100 hover:to-sky-100 hover:border-cyan-400 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">⏱</div>
                <div className="font-bold text-sm text-cyan-900">Timed Challenge</div>
                <div className="text-xs text-cyan-600 mt-0.5">15 Qs · 10 min · 1.5× XP</div>
              </button>
            )}
            {onSATTimed && (
              <button
                onClick={onSATTimed}
                className="text-left rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 hover:border-teal-400 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">🎯</div>
                <div className="font-bold text-sm text-teal-900">SAT Timed</div>
                <div className="text-xs text-teal-600 mt-0.5">Real SAT timing · 1.75× XP</div>
              </button>
            )}
            {onHeartsMode && (
              <button
                onClick={onHeartsMode}
                className="text-left rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 hover:border-rose-400 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">❤️</div>
                <div className="font-bold text-sm text-rose-900">Hearts Mode</div>
                <div className="text-xs text-rose-500 mt-0.5">5 lives · 2× XP</div>
              </button>
            )}
            {onSurvivalMode && (
              <button
                onClick={onSurvivalMode}
                className="text-left rounded-2xl border-2 border-violet-900 bg-gradient-to-br from-violet-950 to-indigo-900 hover:from-violet-900 hover:to-indigo-800 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">💀</div>
                <div className="font-bold text-sm text-violet-100">Survival</div>
                <div className="text-xs text-violet-400 mt-0.5">3 wrong = out · 3× XP</div>
              </button>
            )}
            {onRampMode && (
              <button
                onClick={onRampMode}
                className="text-left rounded-2xl border-2 border-sky-700 bg-gradient-to-br from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">📈</div>
                <div className="font-bold text-sm text-white">Ramp Mode</div>
                <div className="text-xs text-sky-200 mt-0.5">Easy → Med → Hard · 1.5× XP</div>
              </button>
            )}
            {onPowerHour && (
              <button
                onClick={onPowerHour}
                className="text-left rounded-2xl border-2 border-amber-600 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">⏱</div>
                <div className="font-bold text-sm text-white">Power Hour</div>
                <div className="text-xs text-amber-200 mt-0.5">60 min marathon · 2× XP</div>
              </button>
            )}
            {onSuddenDeath && history.length >= 5 && (
              <button
                onClick={onSuddenDeath}
                className="text-left rounded-2xl border-2 border-red-900 bg-gradient-to-br from-red-950 to-red-800 hover:from-red-900 hover:to-red-700 p-4 transition-all duration-150 active:scale-[0.98]"
              >
                <div className="text-xl mb-1.5">💀</div>
                <div className="font-bold text-sm text-red-100">Sudden Death</div>
                <div className="text-xs text-red-300 mt-0.5">One wrong = game over · 3× XP</div>
              </button>
            )}
          </div>
        )}

        {/* Head-to-Head */}
        {onHeadToHead && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">⚔️</span>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Head-to-Head</p>
              <span className="text-xs bg-violet-100 text-violet-600 font-bold px-2 py-0.5 rounded-full">1.5× XP</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[
                { key: 'rookie',   icon: '🌱', name: 'Riley',  sub: 'Rookie\n~65%',   from: 'from-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-900', sub2: 'text-emerald-600' },
                { key: 'average',  icon: '⚡', name: 'Jordan', sub: 'Average\n~75%',  from: 'from-blue-50',     border: 'border-blue-200',    text: 'text-blue-900',    sub2: 'text-blue-600' },
                { key: 'elite',    icon: '🔥', name: 'Alex',   sub: 'Elite\n~88%',    from: 'from-rose-50',     border: 'border-rose-200',    text: 'text-rose-900',    sub2: 'text-rose-500' },
                { key: 'legend',   icon: '🏆', name: 'Sam',    sub: 'Legend\n~95%',   from: 'from-amber-50',    border: 'border-amber-300',   text: 'text-amber-900',   sub2: 'text-amber-600' },
                { key: 'adaptive', icon: '🤖', name: 'Echo',   sub: 'AI Rival\n+10%', from: 'from-violet-50',   border: 'border-violet-200',  text: 'text-violet-900',  sub2: 'text-violet-600' },
              ].map(r => (
                <button key={r.key} onClick={() => onHeadToHead(r.key)}
                  className={`rounded-2xl border-2 ${r.border} bg-gradient-to-b ${r.from} to-white p-2.5 text-center hover:scale-[0.98] transition-all active:scale-95`}>
                  <div className="text-xl mb-0.5">{r.icon}</div>
                  <p className={`text-[10px] font-black ${r.text} leading-tight`}>{r.name}</p>
                  <p className={`text-[9px] ${r.sub2} mt-0.5 leading-tight whitespace-pre-line`}>{r.sub}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subjects & Topics */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
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
          {/* Quick section selectors */}
          <div className="flex gap-2 mb-3">
            <button onClick={() => setSelectedDomains(new Set(MATH_DOMAIN_IDS))}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                MATH_DOMAIN_IDS.every(id => selectedDomains.has(id)) && !ENG_DOMAIN_IDS.some(id => selectedDomains.has(id))
                  ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
              }`}>
              📐 Math only
            </button>
            <button onClick={() => setSelectedDomains(new Set(ENG_DOMAIN_IDS))}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                ENG_DOMAIN_IDS.every(id => selectedDomains.has(id)) && !MATH_DOMAIN_IDS.some(id => selectedDomains.has(id))
                  ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300'
              }`}>
              📖 English only
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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-gray-800">{domain.label}</span>
                            {domainMastery[domain.id] && (
                              <span className={`text-xs ${domainMastery[domain.id].color}`} title={domainMastery[domain.id].label}>
                                {domainMastery[domain.id].icon}
                              </span>
                            )}
                            {domainStats[domain.id] && (
                              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                {domainStats[domain.id].pct}%
                                {domainStats[domain.id].trend && (
                                  <span className={`font-bold ${domainStats[domain.id].trendColor}`}>
                                    {domainStats[domain.id].trend}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{domain.description}</div>
                          {domainStats[domain.id] && domainStats[domain.id].total >= 3 && (
                            <div className="mt-1 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${domainStats[domain.id].pct >= 80 ? 'bg-emerald-400' : domainStats[domain.id].pct >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                style={{ width: `${domainStats[domain.id].pct}%` }}
                              />
                            </div>
                          )}
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

        {/* Recent weak domains alert */}
        {recentWeakDomains.length >= 2 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4">
            <p className="text-xs font-bold text-rose-700 uppercase tracking-widest mb-2.5">🚨 Needs Work (Last 3 Sessions)</p>
            <div className="space-y-2">
              {recentWeakDomains.map(d => (
                <div key={d.id} className="flex items-center gap-3">
                  <span className="text-xs text-rose-700 font-semibold flex-1 truncate">{d.label}</span>
                  <div className="w-16 h-1.5 bg-rose-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="text-xs font-black text-rose-600 w-8 text-right">{d.pct}%</span>
                  <button onClick={() => onFocusPractice(d.id, null)} className="text-xs bg-rose-600 text-white font-bold px-2.5 py-1 rounded-lg hover:bg-rose-700 transition-colors shrink-0">
                    Drill
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monday weekly report card */}
        {xpWeekRace.dayOfWeek === 1 && xpWeekRace.lastWeekSessions > 0 && (
          <div className="bg-white border-2 border-indigo-100 rounded-2xl p-4 mb-4">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">📊 Last Week's Report</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="text-xl font-black text-indigo-700">{xpWeekRace.lastWeekQ}</p>
                <p className="text-[10px] text-gray-400">questions</p>
              </div>
              <div className="text-center">
                <p className={`text-xl font-black ${xpWeekRace.lastWeekPct >= 80 ? 'text-emerald-600' : xpWeekRace.lastWeekPct >= 60 ? 'text-amber-600' : 'text-rose-500'}`}>{xpWeekRace.lastWeekPct}%</p>
                <p className="text-[10px] text-gray-400">accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-violet-600">{xpWeekRace.lastWeekDays}/7</p>
                <p className="text-[10px] text-gray-400">days studied</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              {xpWeekRace.lastWeekDays >= 5 ? '🔥 Incredible consistency last week!' : xpWeekRace.lastWeekDays >= 3 ? '💪 Solid week — aim for one more day this week!' : '📈 Let\'s make this week stronger — aim for 5 days!'}
            </p>
          </div>
        )}

        {/* Daily study time nudge */}
        {(() => {
          try {
            const h = parseInt(localStorage.getItem('sat_prep_study_hour') ?? '-1', 10)
            if (h < 0) return null
            const now = new Date()
            const curH = now.getHours()
            if (curH !== h) return null
            const today = now.toISOString().slice(0, 10)
            if (history.some(s => s.completedAt?.startsWith(today))) return null
            const label = h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`
            return (
              <div className="bg-indigo-600 rounded-2xl px-4 py-3 mb-4 text-white flex items-center gap-3">
                <span className="text-xl shrink-0">⏰</span>
                <div>
                  <p className="text-sm font-black">It's {label} — your study time!</p>
                  <p className="text-xs text-indigo-200 mt-0.5">Start a session to keep your streak alive 🔥</p>
                </div>
              </div>
            )
          } catch { return null }
        })()}

        {/* Late-night study reminder */}
        {history.length >= 3 && new Date().getHours() >= 22 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
            <span className="text-sm">🌙</span>
            <p className="text-xs text-amber-700">Late night study? Sleep helps memory consolidation — don't skip rest before exam day!</p>
          </div>
        )}

        {/* Question bank stats */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
          <span>📚 {questions.length.toLocaleString()} questions in bank</span>
          <span>·</span>
          <span>{matchingCount.toLocaleString()} matching your filters</span>
        </div>

        {/* Adaptive difficulty hint */}
        {history.length >= 10 && (() => {
          const diffAcc = { 1: { c: 0, t: 0 }, 2: { c: 0, t: 0 }, 3: { c: 0, t: 0 } }
          for (const s of history.slice(-15)) {
            for (const q of s.questions) {
              if (!diffAcc[q.difficulty]) continue
              diffAcc[q.difficulty].t++
              if ((s.answers[q.id] ?? null) === q.answer) diffAcc[q.difficulty].c++
            }
          }
          const pcts = { 1: diffAcc[1].t >= 5 ? Math.round(diffAcc[1].c / diffAcc[1].t * 100) : null, 2: diffAcc[2].t >= 5 ? Math.round(diffAcc[2].c / diffAcc[2].t * 100) : null, 3: diffAcc[3].t >= 5 ? Math.round(diffAcc[3].c / diffAcc[3].t * 100) : null }
          let msg = null
          if (pcts[1] !== null && pcts[1] >= 85 && !selectedDifficulties.has(2)) msg = `You're ${pcts[1]}% on Easy — try adding Medium`
          else if (pcts[2] !== null && pcts[2] >= 80 && !selectedDifficulties.has(3)) msg = `You're ${pcts[2]}% on Medium — try adding Hard`
          else if (pcts[3] !== null && pcts[3] >= 75) msg = `Great job on Hard (${pcts[3]}%) — keep pushing!`
          if (!msg) return null
          return <p className="text-xs text-indigo-500 mt-2">💡 {msg}</p>
        })()}

        {/* Last session recap */}
        {lastSessionSummary && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${lastSessionSummary.pct >= 80 ? 'bg-emerald-100 text-emerald-700' : lastSessionSummary.pct >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
              {lastSessionSummary.pct}%
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">{lastSessionSummary.ago} · {lastSessionSummary.formatLabel}</p>
              <p className="text-sm font-semibold text-gray-700">{lastSessionSummary.correct}/{lastSessionSummary.total} correct</p>
              {lastSessionSummary.domains && <p className="text-xs text-gray-400 truncate">{lastSessionSummary.domains}</p>}
            </div>
          </div>
        )}

        {/* 14-day mini study calendar */}
        {miniCalendar.studied > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Last 14 Days</p>
              <p className="text-xs text-gray-400">{miniCalendar.studied}/14 days studied</p>
            </div>
            <div className="flex gap-1">
              {miniCalendar.days.map(({ key, status }) => (
                <div key={key} className={`flex-1 h-5 rounded-sm ${
                  status === 'great' ? 'bg-emerald-400' : status === 'ok' ? 'bg-amber-300' : status === 'low' ? 'bg-rose-300' : 'bg-gray-100'
                }`} title={key} />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              {[['bg-emerald-400','≥80%'],['bg-amber-300','60–80%'],['bg-rose-300','<60%'],['bg-gray-100','No study']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1"><div className={`w-2 h-2 rounded-sm ${c}`}/><span className="text-xs text-gray-300">{l}</span></div>
              ))}
            </div>
          </div>
        )}

        {/* Score trend mini-chart */}
        {scoreTrend && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Score Trend</p>
            <svg viewBox={`0 0 ${(scoreTrend.length - 1) * 20 + 8} 40`} className="w-full h-10">
              <polyline
                points={scoreTrend.map((p, i) => `${i * 20 + 4},${38 - (p / 100) * 34}`).join(' ')}
                fill="none" stroke="#e0e7ff" strokeWidth="2" strokeLinejoin="round"
              />
              {scoreTrend.map((p, i) => (
                <circle key={i} cx={i * 20 + 4} cy={38 - (p / 100) * 34} r={i === scoreTrend.length - 1 ? 3 : 2}
                  fill={i === scoreTrend.length - 1 ? (p >= 80 ? '#10b981' : p >= 60 ? '#6366f1' : '#f43f5e') : '#c7d2fe'} />
              ))}
            </svg>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-300">Oldest</p>
              <p className={`text-xs font-bold ${scoreTrend[scoreTrend.length - 1] >= 80 ? 'text-emerald-600' : scoreTrend[scoreTrend.length - 1] >= 60 ? 'text-indigo-600' : 'text-rose-500'}`}>
                Latest: {scoreTrend[scoreTrend.length - 1]}%
              </p>
            </div>
          </div>
        )}

        {/* XP Boost power-up */}
        {(gam.boosts ?? 0) > 0 && (
          <div className={`rounded-2xl border-2 px-4 py-3 mb-4 flex items-center gap-3 transition-all ${boostActive ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'}`}>
            <span className="text-lg shrink-0">🚀</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800">
                XP Boost {boostActive ? '— ACTIVE!' : `available (×${gam.boosts})`}
              </p>
              <p className="text-xs text-gray-400">{boostActive ? '2× XP applies to your next session' : 'Earned from 5-day streak milestone'}</p>
            </div>
            {!boostActive && (
              <button
                onClick={() => { saveBoost(true); setBoostActive(true) }}
                className="shrink-0 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg px-3 py-1.5 transition-colors"
              >
                Activate
              </button>
            )}
            {boostActive && (
              <button
                onClick={() => { saveBoost(false); setBoostActive(false) }}
                className="shrink-0 text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {/* Mega Boost power-up (purchased from shop) */}
        {megaBoostActive && (
          <div className="rounded-2xl border-2 border-rose-400 bg-rose-50 px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-lg shrink-0">⚡</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-rose-800">3× XP Mega Boost — ACTIVE!</p>
              <p className="text-xs text-rose-500">Triple XP applies to your next session</p>
            </div>
            <button
              onClick={() => { consumeMegaBoost(); setMegaBoostActive(false) }}
              className="shrink-0 text-xs font-medium text-rose-500 hover:text-rose-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Score Shield power-up (purchased from shop) */}
        {shieldActive && (
          <div className="rounded-2xl border-2 border-teal-400 bg-teal-50 px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-lg shrink-0">🛡️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-teal-800">Score Shield — ACTIVE!</p>
              <p className="text-xs text-teal-500">If you score below 60%, earn +50 bonus XP as consolation</p>
            </div>
            <button
              onClick={() => { consumeShield(); setShieldActive(false) }}
              className="shrink-0 text-xs font-medium text-teal-500 hover:text-teal-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Pomodoro Focus Timer */}
        {(() => {
          const POMO_KEY = 'sat_prep_pomo'
          function loadPomo() { try { return JSON.parse(localStorage.getItem(POMO_KEY) ?? '{}') } catch { return {} } }
          const [pomoState, setPomoState] = useState(() => loadPomo())
          const [pomoSecs, setPomoSecs] = useState(() => {
            const p = loadPomo()
            if (!p.running || !p.startedAt) return 25 * 60
            const elapsed = Math.floor((Date.now() - p.startedAt) / 1000)
            return Math.max(0, 25 * 60 - elapsed)
          })
          const pomoRef = useRef(null)

          useEffect(() => {
            if (!pomoState.running) return
            pomoRef.current = setInterval(() => {
              setPomoSecs(s => {
                if (s <= 1) {
                  clearInterval(pomoRef.current)
                  const p = loadPomo()
                  const todayCount = p.todayCount ?? 0
                  const today = new Date().toISOString().slice(0, 10)
                  const newCount = (p.lastDate === today ? todayCount : 0) + 1
                  const bonus = newCount >= 4 ? 200 : newCount >= 2 ? 100 : 75
                  const updated = { running: false, lastDate: today, todayCount: newCount }
                  localStorage.setItem(POMO_KEY, JSON.stringify(updated))
                  setPomoState(updated)
                  const g = loadGamification()
                  saveGamification({ ...g, totalXP: (g.totalXP ?? 0) + bonus })
                  setGam(prev => ({ ...prev, totalXP: (prev.totalXP ?? 0) + bonus }))
                  return 25 * 60
                }
                return s - 1
              })
            }, 1000)
            return () => clearInterval(pomoRef.current)
          }, [pomoState.running])

          const today = new Date().toISOString().slice(0, 10)
          const todayCount = pomoState.lastDate === today ? (pomoState.todayCount ?? 0) : 0
          const mins = Math.floor(pomoSecs / 60)
          const secs = pomoSecs % 60
          const pct = ((25 * 60 - pomoSecs) / (25 * 60)) * 100

          function startPomo() {
            const p = { running: true, startedAt: Date.now() }
            localStorage.setItem(POMO_KEY, JSON.stringify({ ...loadPomo(), ...p }))
            setPomoState(p)
            setPomoSecs(25 * 60)
          }

          function cancelPomo() {
            clearInterval(pomoRef.current)
            const p = { ...loadPomo(), running: false }
            localStorage.setItem(POMO_KEY, JSON.stringify(p))
            setPomoState(p)
            setPomoSecs(25 * 60)
          }

          return (
            <div className="border border-gray-100 rounded-2xl p-4 mb-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">Focus Timer 🍅</p>
                  <p className="text-xs text-gray-400 mt-0.5">25 min focus → +75 XP bonus</p>
                </div>
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black border-2 ${i <= todayCount ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-200 text-gray-300'}`}>
                      {i <= todayCount ? '🍅' : i}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                    <circle cx="22" cy="22" r="18" fill="none" stroke={pomoState.running ? '#ef4444' : '#e5e7eb'} strokeWidth="4"
                      strokeDasharray={`${(pct / 100) * 2 * Math.PI * 18} ${2 * Math.PI * 18}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-black text-gray-700">{String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}</span>
                  </div>
                </div>
                <div className="flex-1">
                  {pomoState.running ? (
                    <div>
                      <p className="text-sm font-bold text-gray-800 mb-1">Focus session in progress…</p>
                      <button onClick={cancelPomo} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1 transition-colors">Cancel</button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Start a 25-min focus block and earn bonus XP when the timer ends.</p>
                      <button onClick={startPomo} className="text-xs font-bold text-rose-600 border border-rose-200 bg-rose-50 rounded-lg px-4 py-1.5 hover:bg-rose-100 transition-colors">
                        Start Timer 🍅
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {todayCount >= 4 && <p className="text-xs text-emerald-600 font-bold mt-2 text-center">🏆 4 pomodoros today — excellent focus!</p>}
            </div>
          )
        })()}

        {/* Daily SAT tip + motivational quote */}
        <div className="border-t border-gray-100 pt-4 mb-4 space-y-3">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <span className="text-sm shrink-0 mt-0.5">💡</span>
            <div>
              <p className="text-xs font-bold text-indigo-600 mb-0.5">SAT Tip of the Day</p>
              <p className="text-xs text-indigo-700 leading-snug">{dailyTip}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 italic leading-snug">"{dailyQuote.text}"</p>
            {dailyQuote.author && <p className="text-xs text-gray-300 mt-1">— {dailyQuote.author}</p>}
          </div>
        </div>

        {/* Start button */}
        {matchingCount > 0 && (
          <p className="text-xs text-gray-400 text-center mb-2">
            ~{Math.max(1, Math.round(matchingCount * 75 / 60))} min estimated
          </p>
        )}
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
