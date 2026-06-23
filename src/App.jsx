import { useState } from 'react'
import TopicSelector from './TopicSelector'
import SessionConfig from './SessionConfig'
import LearningSession from './LearningSession'
import QuizSession from './QuizSession'
import SessionSummary from './SessionSummary'
import SessionHistory from './SessionHistory'
import QuestionBank from './QuestionBank'
import AnalyticsScreen from './AnalyticsScreen'
import { saveToHistory } from './utils/history'
import { shuffle } from './utils/index'

export default function App() {
  const [screen, setScreen] = useState('home')
  const [filters, setFilters] = useState(null)
  const [sessionConfig, setSessionConfig] = useState(null)
  const [completedSession, setCompletedSession] = useState(null)

  function handleFiltersSet(f) { setFilters(f); setScreen('session-config') }

  function handleSessionStart(config) {
    setSessionConfig(config)
    setScreen(config.mode === 'learning' ? 'learning' : 'quiz')
  }

  function handleSessionComplete(session) {
    saveToHistory(session)
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
    return <TopicSelector onStart={handleFiltersSet} onHistory={() => setScreen('history')} onQuestionBank={() => setScreen('question-bank')} />
  if (screen === 'session-config')
    return <SessionConfig filters={filters} onStart={handleSessionStart} onBack={() => setScreen('home')} />
  if (screen === 'learning')
    return <LearningSession config={sessionConfig} onComplete={handleSessionComplete} onQuit={() => setScreen('home')} />
  if (screen === 'quiz')
    return <QuizSession config={sessionConfig} onComplete={handleSessionComplete} onQuit={() => setScreen('home')} />
  if (screen === 'summary')
    return <SessionSummary session={completedSession} onNewSession={() => setScreen('home')} onHistory={() => setScreen('history')} onRetry={handleRetry} />
  if (screen === 'history')
    return <SessionHistory onBack={() => setScreen('home')} onNewSession={() => setScreen('home')} onAnalytics={() => setScreen('analytics')} />
  if (screen === 'question-bank')
    return <QuestionBank onBack={() => setScreen('home')} onPractice={handlePracticeFromBank} />
  if (screen === 'analytics')
    return <AnalyticsScreen onBack={() => setScreen('history')} onDrillWeak={qs => { setSessionConfig({ mode: 'learning', formatLabel: 'Weak Spot Drill', sessionName: null, questions: qs }); setScreen('learning') }} />
}
