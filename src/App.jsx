import { useState } from 'react'
import TopicSelector from './TopicSelector'
import SessionConfig from './SessionConfig'
import LearningSession from './LearningSession'
import QuizSession from './QuizSession'
import SessionSummary from './SessionSummary'
import SessionHistory from './SessionHistory'
import QuestionBank from './QuestionBank'
import AnalyticsScreen from './AnalyticsScreen'
import AchievementsScreen from './AchievementsScreen'
import VocabFlash from './VocabFlash'
import MathFlash from './MathFlash'
import ProfileScreen from './ProfileScreen'
import WrongAnswerJournal from './WrongAnswerJournal'
import { saveToHistory, loadHistory, recordSRAnswer, getDueReviews, getSRCount } from './utils/history'
import { loadGamification, saveGamification, processSession } from './utils/gamification'
import { shuffle } from './utils/index'
import allQuestions from './data/questions'
import { MATH_DOMAIN_IDS, ENG_DOMAIN_IDS } from './data/taxonomy'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [filters, setFilters] = useState(null)
  const [sessionConfig, setSessionConfig] = useState(null)
  const [completedSession, setCompletedSession] = useState(null)
  const [gamResult, setGamResult] = useState(null)
  const [pendingXP, setPendingXP] = useState(null)

  function handleFiltersSet(f) { setFilters(f); setScreen('session-config') }

  function handleSessionStart(config) {
    setSessionConfig(config)
    setScreen(config.mode === 'learning' ? 'learning' : 'quiz')
  }

  function handleSessionComplete(session) {
    saveToHistory(session)
    for (const q of session.questions) {
      const correct = (session.answers[q.id] ?? null) === q.answer
      recordSRAnswer(q.id, correct)
    }
    const history = loadHistory()
    const gam = loadGamification()
    const result = processSession(session, history, gam)
    saveGamification(result.gamification)
    setGamResult(result)
    setCompletedSession(session)
    setPendingXP(result.earnedXP ?? null)
    setScreen('summary')
  }

  function handleProblemAreasDrill() {
    const history = loadHistory()
    const byId = Object.fromEntries(allQuestions.map(q => [q.id, q]))
    const wrongCount = {}, correctCount = {}
    for (const s of history) {
      for (const q of s.questions) {
        const ans = s.answers[q.id] ?? null
        if (ans === null) continue
        if (ans === q.answer) correctCount[q.id] = (correctCount[q.id] ?? 0) + 1
        else wrongCount[q.id] = (wrongCount[q.id] ?? 0) + 1
      }
    }
    const persistentIds = Object.entries(wrongCount)
      .filter(([id, w]) => w >= 2 && !(correctCount[id] >= w))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([id]) => id)
    const persistentQs = persistentIds.map(id => byId[id]).filter(Boolean)
    if (persistentQs.length === 0) return
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Problem Areas Drill',
      sessionName: null,
      questions: shuffle(persistentQs),
    })
    setScreen('learning')
  }

  function handleWrongAnswerSprint() {
    const history = loadHistory()
    const byId = Object.fromEntries(allQuestions.map(q => [q.id, q]))
    const wrongIds = new Set()
    for (const s of history.slice(-10)) {
      for (const q of s.questions) {
        if ((s.answers[q.id] ?? null) !== q.answer) wrongIds.add(q.id)
      }
    }
    const wrongQs = [...wrongIds].map(id => byId[id]).filter(Boolean)
    if (wrongQs.length === 0) return
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Wrong Answer Sprint',
      sessionName: null,
      questions: shuffle(wrongQs).slice(0, 15),
    })
    setScreen('learning')
  }

  function handleRetry(wrongQuestions) {
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Wrong Answers Drill',
      sessionName: null,
      questions: wrongQuestions,
    })
    setScreen('learning')
  }

  function handleTimedChallenge() {
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Timed Challenge',
      sessionName: null,
      questions: shuffle(allQuestions).slice(0, 15),
      xpMultiplier: 1.5,
      timedChallengeSeconds: 600,
    })
    setScreen('learning')
  }

  function handleSuddenDeath() {
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Sudden Death',
      sessionName: null,
      questions: shuffle(allQuestions).slice(0, 30),
      xpMultiplier: 3.0,
    })
    setScreen('learning')
  }

  function handleBeastMode() {
    const hardQs = allQuestions.filter(q => q.difficulty === 3)
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Beast Mode',
      sessionName: null,
      questions: shuffle(hardQs).slice(0, 20),
      xpMultiplier: 2.0,
    })
    setScreen('learning')
  }

  function handleBlitzMode() {
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Blitz Mode',
      sessionName: null,
      questions: shuffle(allQuestions).slice(0, 40),
    })
    setScreen('learning')
  }

  function handleQuickPractice() {
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Quick Practice',
      sessionName: null,
      questions: shuffle(allQuestions).slice(0, 15),
    })
    setScreen('learning')
  }

  function handleAdaptiveQuiz() {
    const history = loadHistory()
    const byDomain = {}
    for (const s of history) {
      for (const q of s.questions) {
        if (!byDomain[q.domain]) byDomain[q.domain] = { correct: 0, total: 0 }
        byDomain[q.domain].total++
        if ((s.answers[q.id] ?? null) === q.answer) byDomain[q.domain].correct++
      }
    }
    const weakDomains = Object.entries(byDomain)
      .filter(([, v]) => v.total >= 3)
      .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))
      .slice(0, 3)
      .map(([id]) => id)
    let pool
    if (weakDomains.length >= 2) {
      const weakQs = allQuestions.filter(q => weakDomains.includes(q.domain))
      const otherQs = allQuestions.filter(q => !weakDomains.includes(q.domain))
      pool = [...shuffle(weakQs).slice(0, 10), ...shuffle(otherQs).slice(0, 5)]
    } else {
      pool = shuffle(allQuestions).slice(0, 15)
    }
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Adaptive Quiz',
      sessionName: null,
      questions: shuffle(pool).slice(0, 15),
    })
    setScreen('learning')
  }

  function handleFlaggedReview() {
    const history = loadHistory()
    const byId = Object.fromEntries(allQuestions.map(q => [q.id, q]))
    const seen = new Set()
    const flaggedQs = []
    for (const s of [...history].reverse()) {
      for (const id of s.flaggedIds ?? []) {
        if (!seen.has(id) && byId[id]) { seen.add(id); flaggedQs.push(byId[id]) }
      }
    }
    if (flaggedQs.length === 0) return
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Flagged Review',
      sessionName: null,
      questions: shuffle(flaggedQs).slice(0, 20),
    })
    setScreen('learning')
  }

  function handleSpacedRepetition() {
    const due = getDueReviews(allQuestions)
    if (due.length === 0) return
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Spaced Review',
      sessionName: null,
      questions: shuffle(due).slice(0, 20),
    })
    setScreen('learning')
  }

  function handleQuick5() {
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Quick 5',
      sessionName: null,
      questions: shuffle(allQuestions).slice(0, 5),
    })
    setScreen('learning')
  }

  function handleFullPractice() {
    const engPool = allQuestions.filter(q => ENG_DOMAIN_IDS.includes(q.domain))
    const mathPool = allQuestions.filter(q => MATH_DOMAIN_IDS.includes(q.domain))
    setSessionConfig({
      mode: 'quiz',
      format: 'full-practice',
      formatLabel: 'Full Practice Test',
      sessionName: null,
      phases: [
        {
          subject: 'english', label: 'Reading & Writing',
          mod1Questions: shuffle([...engPool]).slice(0, 27),
          mod1TimeSec: 1920,
          adaptive: { pool: engPool, count: 27, timeSec: 1920, thresholdRatio: 18 / 27 },
        },
        {
          subject: 'math', label: 'Math',
          mod1Questions: shuffle([...mathPool]).slice(0, 22),
          mod1TimeSec: 2100,
          adaptive: { pool: mathPool, count: 22, timeSec: 2100, thresholdRatio: 15 / 22 },
        },
      ],
    })
    setScreen('quiz')
  }

  function handleFocusPractice(domainId, xpMultiplier) {
    const pool = allQuestions.filter(q => q.domain === domainId)
    const isDomainOfDay = xpMultiplier != null
    setSessionConfig({
      mode: 'learning',
      formatLabel: isDomainOfDay ? 'Domain of the Day' : 'Focus Practice',
      sessionName: null,
      questions: shuffle(pool).slice(0, Math.min(pool.length, 20)),
      ...(isDomainOfDay ? { xpMultiplier } : {}),
    })
    setScreen('learning')
  }

  function handleRampMode() {
    const easy = shuffle(allQuestions.filter(q => q.difficulty === 1)).slice(0, 5)
    const medium = shuffle(allQuestions.filter(q => q.difficulty === 2)).slice(0, 5)
    const hard = shuffle(allQuestions.filter(q => q.difficulty === 3)).slice(0, 5)
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Ramp Mode',
      sessionName: null,
      questions: [...easy, ...medium, ...hard],
      xpMultiplier: 1.5,
    })
    setScreen('learning')
  }

  function handleSurvivalMode() {
    const pool = [...shuffle(allQuestions), ...shuffle(allQuestions), ...shuffle(allQuestions)].slice(0, 60)
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Survival Mode',
      sessionName: null,
      questions: pool,
      xpMultiplier: 3.0,
    })
    setScreen('learning')
  }

  function handleHeartsMode() {
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Hearts Mode',
      sessionName: null,
      questions: shuffle(allQuestions).slice(0, 20),
      xpMultiplier: 2.0,
    })
    setScreen('learning')
  }

  function handleSATTimed() {
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'SAT Timed Mode',
      sessionName: null,
      questions: shuffle(allQuestions).slice(0, 15),
      xpMultiplier: 1.75,
    })
    setScreen('learning')
  }

  function handleHeadToHead(rival) {
    const RIVALS = {
      rookie:  { name: 'Riley',  icon: '🌱', label: 'Rookie (~65%)',   accuracy: 0.65 },
      average: { name: 'Jordan', icon: '⚡', label: 'Average (~75%)',  accuracy: 0.75 },
      elite:   { name: 'Alex',   icon: '🔥', label: 'Elite (~88%)',    accuracy: 0.88 },
    }
    const r = RIVALS[rival] ?? RIVALS.average
    setSessionConfig({
      mode: 'learning',
      formatLabel: `Head-to-Head vs ${r.name}`,
      sessionName: null,
      questions: shuffle(allQuestions).slice(0, 15),
      xpMultiplier: 1.5,
      rival: r,
    })
    setScreen('learning')
  }

  function handlePracticeFromBank(questions) {
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Question Bank Practice',
      sessionName: null,
      questions: shuffle(questions),
    })
    setScreen('learning')
  }

  if (screen === 'home')
    return <TopicSelector onStart={handleFiltersSet} onHistory={() => setScreen('history')} onQuestionBank={() => setScreen('question-bank')} onQuickPractice={handleQuickPractice} onQuick5={handleQuick5} onAdaptiveQuiz={handleAdaptiveQuiz} onWrongAnswerSprint={handleWrongAnswerSprint} onProblemAreasDrill={handleProblemAreasDrill} onSuddenDeath={handleSuddenDeath} onTimedChallenge={handleTimedChallenge} onFullPractice={handleFullPractice} onAchievements={() => setScreen('achievements')} onFocusPractice={handleFocusPractice} onBeastMode={handleBeastMode} onBlitzMode={handleBlitzMode} onFlaggedReview={handleFlaggedReview} onSpacedRepetition={handleSpacedRepetition} onVocab={() => setScreen('vocab')} onMathFlash={() => setScreen('math-flash')} onHeadToHead={handleHeadToHead} onProfile={() => setScreen('profile')} onSATTimed={handleSATTimed} onHeartsMode={handleHeartsMode} onSurvivalMode={handleSurvivalMode} onRampMode={handleRampMode} onWrongJournal={() => setScreen('wrong-journal')} pendingXP={pendingXP} onClearPendingXP={() => setPendingXP(null)} />
  if (screen === 'session-config')
    return <SessionConfig filters={filters} onStart={handleSessionStart} onBack={() => setScreen('home')} />
  if (screen === 'learning')
    return <LearningSession config={sessionConfig} onComplete={handleSessionComplete} onQuit={() => setScreen('home')} />
  if (screen === 'quiz')
    return <QuizSession config={sessionConfig} onComplete={handleSessionComplete} onQuit={() => setScreen('home')} />
  if (screen === 'summary')
    return <SessionSummary session={completedSession} gamResult={gamResult} onNewSession={() => setScreen('home')} onHistory={() => setScreen('history')} onRetry={handleRetry} />
  if (screen === 'history')
    return <SessionHistory onBack={() => setScreen('home')} onNewSession={() => setScreen('home')} onAnalytics={() => setScreen('analytics')} onAchievements={() => setScreen('achievements')} onReview={s => { setCompletedSession(s); setGamResult(null); setScreen('summary') }} />
  if (screen === 'question-bank')
    return <QuestionBank onBack={() => setScreen('home')} onPractice={handlePracticeFromBank} />
  if (screen === 'analytics')
    return <AnalyticsScreen onBack={() => setScreen('history')} onAchievements={() => setScreen('achievements')} onDrillWeak={qs => { setSessionConfig({ mode: 'learning', formatLabel: 'Weak Spot Drill', sessionName: null, questions: qs }); setScreen('learning') }} />
  if (screen === 'achievements')
    return <AchievementsScreen onBack={() => setScreen('home')} />
  if (screen === 'vocab')
    return <VocabFlash onBack={() => setScreen('home')} onXP={xp => { const gam = loadGamification(); saveGamification({ ...gam, totalXP: gam.totalXP + xp }) }} />
  if (screen === 'math-flash')
    return <MathFlash onBack={() => setScreen('home')} />
  if (screen === 'profile')
    return <ProfileScreen onBack={() => setScreen('home')} />
  if (screen === 'wrong-journal')
    return <WrongAnswerJournal onBack={() => setScreen('home')} onPractice={qs => { setSessionConfig({ mode: 'learning', formatLabel: 'Wrong Answer Drill', sessionName: null, questions: qs }); setScreen('learning') }} />
}
