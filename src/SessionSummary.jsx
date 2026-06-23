import { useState, useMemo } from 'react'
import QuestionCard from './components/QuestionCard'
import { formatTime, pct } from './utils/index'
import { domainById, skillById } from './data/taxonomy'

const DIFF_LABEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' }
const DIFF_COLOR = { 1: 'text-emerald-600', 2: 'text-amber-600', 3: 'text-rose-600' }
const DIFF_BAR   = { 1: 'bg-emerald-500',   2: 'bg-amber-500',   3: 'bg-rose-500'   }

const SCORE_PREDICTOR_FORMATS = new Set(['full-practice', 'full-english', 'full-math'])

// Easy path → 200–650, hard path → 400–800, both rounded to nearest 10
function predictSectionScore(correct, total, gotHardMod2) {
  const ratio = correct / total
  if (!gotHardMod2) return Math.min(650, Math.round((200 + ratio * 450) / 10) * 10)
  return Math.min(800, Math.round((400 + ratio * 400) / 10) * 10)
}

function ScorePredictor({ phaseData, answers }) {
  const scores = phaseData.map(p => {
    const correct = p.questions.filter(q => (answers[q.id] ?? null) === q.answer).length
    return {
      label: p.label,
      subject: p.subject,
      score: predictSectionScore(correct, p.questions.length, p.gotHardMod2),
      gotHardMod2: p.gotHardMod2,
    }
  })
  const total = scores.length > 1 ? scores.reduce((sum, s) => sum + s.score, 0) : null
  const isCapped = scores.some(s => !s.gotHardMod2)

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-100 p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Predicted Score</p>
        <span className="text-xs text-gray-400">· rough estimate</span>
      </div>
      <div className="space-y-3">
        {scores.map(s => (
          <div key={s.subject} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{s.label}</span>
            <div className="flex items-center gap-2">
              {!s.gotHardMod2 && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Easy Mod 2 · capped 650</span>
              )}
              <span className="text-xl font-black text-gray-900">~{s.score}</span>
            </div>
          </div>
        ))}
        {total !== null && (
          <>
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-2xl font-black text-indigo-600">~{total}</span>
            </div>
            {isCapped && (
              <p className="text-xs text-gray-400">Score cap lifted by scoring ≥ threshold on Module 1 to unlock the harder Module 2.</p>
            )}
          </>
        )}
      </div>
      <p className="text-xs text-gray-300 mt-3">Based on a simplified scoring model. Actual scores depend on the official CollegeBoard curve.</p>
    </div>
  )
}

function barColor(p) {
  return p >= 80 ? 'bg-emerald-500' : p >= 60 ? 'bg-amber-500' : 'bg-rose-500'
}

function ScoreRing({ percent }) {
  const color = percent >= 80 ? 'text-emerald-500' : percent >= 60 ? 'text-amber-500' : 'text-rose-500'
  return <div className={`text-5xl font-black ${color}`}>{percent}%</div>
}

function StatRow({ label, correct, total }) {
  const p = pct(correct, total)
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-sm">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-500 text-xs">{correct}/{total} ({p}%)</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor(p)} rounded-full transition-all duration-500`} style={{ width: `${p}%` }} />
      </div>
    </div>
  )
}

function QuestionRow({ question, userAnswer, index, isFlagged, timeSpent }) {
  const [expanded, setExpanded] = useState(false)
  const isCorrect = userAnswer === question.answer
  const skipped = userAnswer === null || userAnswer === undefined

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all ${isCorrect ? 'border-emerald-200' : 'border-rose-200'}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className={`w-full text-left px-4 py-3 flex items-start gap-3 ${isCorrect ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-rose-50 hover:bg-rose-100'} transition-colors`}
      >
        <span className={`shrink-0 font-bold text-sm mt-0.5 ${isCorrect ? 'text-emerald-600' : 'text-rose-500'}`}>
          {isCorrect ? '✓' : '✗'}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-gray-400 mr-2">Q{index + 1}</span>
          {isFlagged && <span className="text-amber-400 text-xs mr-1" title="Flagged for review">🚩</span>}
          <span className="text-sm text-gray-700 line-clamp-1">
            {question.question.replace(/\n/g, ' ').slice(0, 80)}{question.question.length > 80 ? '…' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {skipped && <span className="text-xs text-gray-400">skipped</span>}
          {timeSpent != null && (
            <span className={`text-xs font-mono ${timeSpent > 120 ? 'text-rose-400' : timeSpent > 60 ? 'text-amber-500' : 'text-gray-400'}`} title="Time spent">
              {timeSpent >= 60 ? `${Math.floor(timeSpent / 60)}:${String(timeSpent % 60).padStart(2, '0')}` : `${timeSpent}s`}
            </span>
          )}
          <span className={`text-xs ${DIFF_COLOR[question.difficulty]}`}>{DIFF_LABEL[question.difficulty]}</span>
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-3 bg-white">
          <QuestionCard question={question} selectedAnswer={userAnswer} onSelect={() => {}} showFeedback />
          {question.explanation && (
            <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-600 mb-1 uppercase tracking-wide">Explanation</p>
              <p className="text-sm text-gray-700 leading-relaxed">{question.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SessionSummary({ session, onNewSession, onHistory, onRetry }) {
  const { mode, format, formatLabel, elapsedSeconds, timeLimit, questions, answers, score, sessionName, phaseData, flaggedIds, questionTimes } = session
  const flaggedSet = useMemo(() => new Set(flaggedIds ?? []), [flaggedIds])
  const [breakdownTab, setBreakdownTab] = useState('subject')
  const [reviewFilter, setReviewFilter] = useState('all')

  const modeColor = mode === 'learning' ? 'bg-indigo-100 text-indigo-700' : 'bg-violet-100 text-violet-700'

  const bySubject = useMemo(() => {
    const acc = {}
    for (const q of questions) {
      if (!acc[q.subject]) acc[q.subject] = { correct: 0, total: 0 }
      acc[q.subject].total++
      if ((answers[q.id] ?? null) === q.answer) acc[q.subject].correct++
    }
    return acc
  }, [questions, answers])

  const bySkill = useMemo(() => {
    const acc = {}
    for (const q of questions) {
      if (!acc[q.skill]) acc[q.skill] = { correct: 0, total: 0 }
      acc[q.skill].total++
      if ((answers[q.id] ?? null) === q.answer) acc[q.skill].correct++
    }
    return acc
  }, [questions, answers])

  const byDifficulty = useMemo(() => {
    const acc = { 1: { correct: 0, total: 0 }, 2: { correct: 0, total: 0 }, 3: { correct: 0, total: 0 } }
    for (const q of questions) {
      acc[q.difficulty].total++
      if ((answers[q.id] ?? null) === q.answer) acc[q.difficulty].correct++
    }
    return acc
  }, [questions, answers])

  const correctCount = questions.filter(q => (answers[q.id] ?? null) === q.answer).length
  const incorrectCount = questions.length - correctCount
  const wrongQuestions = useMemo(
    () => questions.filter(q => (answers[q.id] ?? null) !== q.answer),
    [questions, answers]
  )

  const filteredQuestions = useMemo(() => {
    if (reviewFilter === 'correct') return questions.filter(q => (answers[q.id] ?? null) === q.answer)
    if (reviewFilter === 'incorrect') return wrongQuestions
    if (reviewFilter === 'flagged') return questions.filter(q => flaggedSet.has(q.id))
    return questions
  }, [questions, answers, reviewFilter, wrongQuestions, flaggedSet])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 px-4 py-10">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Session Complete</h1>
            {sessionName && <p className="text-sm text-gray-500 mt-0.5">{sessionName}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={onHistory} className="text-sm text-gray-400 hover:text-gray-700 border border-gray-200 bg-white rounded-lg px-3 py-1.5 transition-colors">
              History
            </button>
            <button onClick={onNewSession} className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5 transition-colors">
              New Session
            </button>
          </div>
        </div>

        {/* Score predictor (full adaptive tests only) */}
        {SCORE_PREDICTOR_FORMATS.has(format) && phaseData?.length > 0 && phaseData.every(p => p.gotHardMod2 !== null) && (
          <ScorePredictor phaseData={phaseData} answers={answers} />
        )}

        {/* Score card */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 mb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <ScoreRing percent={score.percent} />
              <p className="text-gray-500 text-sm mt-1">{score.correct} of {score.total} correct</p>
            </div>
            <div className="text-right space-y-1.5">
              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${modeColor}`}>{formatLabel}</span>
              <div className="text-sm text-gray-500">⏱ {formatTime(elapsedSeconds)}</div>
              {questions.length > 0 && (
                <div className="text-xs text-gray-400">
                  ~{Math.round(elapsedSeconds / questions.length)}s / question
                </div>
              )}
              {timeLimit && <div className="text-xs text-gray-400">Limit: {formatTime(timeLimit)}</div>}
            </div>
          </div>

          {/* Breakdown tabs */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
              {[
                { id: 'subject',    label: 'Subject' },
                { id: 'domain',     label: 'Domain' },
                { id: 'skill',      label: 'Skill' },
                { id: 'difficulty', label: 'Difficulty' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setBreakdownTab(tab.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    breakdownTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {breakdownTab === 'subject' && (
              <div className="space-y-3">
                {[
                  { id: 'math',    label: 'Math' },
                  { id: 'english', label: 'Reading & Writing' },
                ].map(({ id, label }) => {
                  const stats = bySubject[id]
                  if (!stats || stats.total === 0) return null
                  return <StatRow key={id} label={label} correct={stats.correct} total={stats.total} />
                })}
              </div>
            )}

            {breakdownTab === 'domain' && (
              <div className="space-y-3">
                {Object.entries(score.byDomain).map(([id, stats]) => (
                  <StatRow key={id} label={domainById[id]?.label ?? id} correct={stats.correct} total={stats.total} />
                ))}
              </div>
            )}

            {breakdownTab === 'skill' && (
              <div className="space-y-3">
                {Object.entries(bySkill).map(([id, stats]) => (
                  <StatRow key={id} label={skillById[id]?.label ?? id} correct={stats.correct} total={stats.total} />
                ))}
              </div>
            )}

            {breakdownTab === 'difficulty' && (
              <div className="space-y-3">
                {[1, 2, 3].map(d => {
                  const stats = byDifficulty[d]
                  if (!stats || stats.total === 0) return null
                  const p = pct(stats.correct, stats.total)
                  return (
                    <div key={d}>
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span className={`font-medium ${DIFF_COLOR[d]}`}>{DIFF_LABEL[d]}</span>
                        <span className="text-gray-500 text-xs">{stats.correct}/{stats.total} ({p}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${DIFF_BAR[d]} rounded-full transition-all duration-500`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Question review */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Question Review</h2>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All', count: questions.length },
                { id: 'correct', label: 'Correct', count: correctCount },
                { id: 'incorrect', label: 'Incorrect', count: incorrectCount },
                ...(flaggedSet.size > 0 ? [{ id: 'flagged', label: '🚩 Flagged', count: flaggedSet.size }] : []),
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setReviewFilter(f.id)}
                  className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                    reviewFilter === f.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {f.label}
                  <span className={`text-xs px-1 py-px rounded-full ${reviewFilter === f.id ? 'bg-indigo-500' : 'bg-gray-100 text-gray-400'}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredQuestions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No questions to show</p>
            ) : (
              filteredQuestions.map((q, i) => (
                <QuestionRow key={q.id} question={q} userAnswer={answers[q.id] ?? null} index={i} isFlagged={flaggedSet.has(q.id)} timeSpent={questionTimes?.[q.id]} />
              ))
            )}
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {wrongQuestions.length > 0 && onRetry && (
            <button
              onClick={() => onRetry(wrongQuestions)}
              className="w-full py-3 rounded-xl border-2 border-rose-200 bg-rose-50 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
            >
              Retry {wrongQuestions.length} wrong answer{wrongQuestions.length !== 1 ? 's' : ''} →
            </button>
          )}
          <div className="flex gap-3">
            <button onClick={onHistory} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-colors">
              View History
            </button>
            <button onClick={onNewSession} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">
              New Session →
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
