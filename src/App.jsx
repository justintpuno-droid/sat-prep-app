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
import { saveToHistory, loadHistory } from './utils/history'
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

  function handleFiltersSet(f) { setFilters(f); setScreen('session-config') }

  function handleSessionStart(config) {
    setSessionConfig(config)
    setScreen(config.mode === 'learning' ? 'learning' : 'quiz')
  }

  function handleSessionComplete(session) {
    saveToHistory(session)
    const history = loadHistory()
    const gam = loadGamification()
    const result = processSession(session, history, gam)
    saveGamification(result.gamification)
    setGamResult(result)
    setCompletedSession(session)
    setScreen('summary')
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

  function handleQuickPractice() {
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Quick Practice',
      sessionName: null,
      questions: shuffle(allQuestions).slice(0, 15),
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

  function handleFocusPractice(domainId) {
    const pool = allQuestions.filter(q => q.domain === domainId)
    setSessionConfig({
      mode: 'learning',
      formatLabel: 'Focus Practice',
      sessionName: null,
      questions: shuffle(pool).slice(0, Math.min(pool.length, 20)),
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
    return <TopicSelector onStart={handleFiltersSet} onHistory={() => setScreen('history')} onQuestionBank={() => setScreen('question-bank')} onQuickPractice={handleQuickPractice} onFullPractice={handleFullPractice} onAchievements={() => setScreen('achievements')} onFocusPractice={handleFocusPractice} onBeastMode={handleBeastMode} />
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
}
