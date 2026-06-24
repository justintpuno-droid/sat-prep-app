import { useState } from 'react'

const ONBOARDING_KEY = 'sat_prep_onboarded'
const GOAL_KEY = 'sat_prep_goal'

function loadGoalData() { try { return JSON.parse(localStorage.getItem(GOAL_KEY)) ?? {} } catch { return {} } }
function saveGoalData(data) { try { localStorage.setItem(GOAL_KEY, JSON.stringify({ ...loadGoalData(), ...data })) } catch {} }

export function hasOnboarded() {
  return !!localStorage.getItem(ONBOARDING_KEY)
}

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const [examDate, setExamDate] = useState('')
  const [goalScore, setGoalScore] = useState(1300)
  const [daysPerWeek, setDaysPerWeek] = useState(3)

  const SCORES = [1000, 1100, 1200, 1300, 1400, 1450, 1500, 1550, 1600]
  const DAYS = [1, 2, 3, 4, 5, 6, 7]

  function finish() {
    if (examDate) saveGoalData({ examDate, target: goalScore })
    else saveGoalData({ target: goalScore })
    localStorage.setItem(ONBOARDING_KEY, '1')
    onDone()
  }

  const steps = [
    {
      icon: '🎓',
      title: 'Welcome to SAT Prep!',
      subtitle: "Let's set up your personalized study plan in 60 seconds.",
      content: (
        <div className="text-center">
          <div className="text-6xl mb-6">🚀</div>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            This app adapts to your strengths and weaknesses, tracks your progress,
            and rewards you with XP as you improve. Ready?
          </p>
          <div className="grid grid-cols-3 gap-3 mb-2">
            {['Adaptive Practice','Gamified XP','Real SAT Questions'].map(f => (
              <div key={f} className="bg-indigo-50 rounded-xl p-3">
                <p className="text-xs font-bold text-indigo-700 leading-tight">{f}</p>
              </div>
            ))}
          </div>
        </div>
      ),
      cta: "Let's go!",
    },
    {
      icon: '📅',
      title: "When is your SAT?",
      subtitle: "We'll count down and intensify your prep as the date approaches.",
      content: (
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Test date (optional)</label>
          <input
            type="date"
            value={examDate}
            onChange={e => setExamDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-indigo-400 focus:outline-none text-base"
          />
          <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
            <p className="text-xs text-gray-400 w-full mb-0.5">Or pick an official SAT date:</p>
            {[
              { label: 'Aug 23, 2025', val: '2025-08-23' },
              { label: 'Oct 4, 2025',  val: '2025-10-04' },
              { label: 'Nov 1, 2025',  val: '2025-11-01' },
              { label: 'Dec 6, 2025',  val: '2025-12-06' },
              { label: 'Mar 14, 2026', val: '2026-03-14' },
              { label: 'May 2, 2026',  val: '2026-05-02' },
              { label: 'Jun 6, 2026',  val: '2026-06-06' },
            ].filter(d => d.val > new Date().toISOString().slice(0, 10)).slice(0, 4).map(d => (
              <button
                key={d.val}
                onClick={() => setExamDate(d.val)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border-2 transition-all ${examDate === d.val ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'}`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {examDate && (() => {
            const days = Math.ceil((new Date(examDate + 'T12:00:00') - new Date()) / 86400000)
            return days > 0 ? (
              <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-indigo-600">{days}</p>
                <p className="text-xs text-indigo-400">days until test day</p>
              </div>
            ) : null
          })()}
        </div>
      ),
      cta: examDate ? 'Set date & continue' : 'Skip for now',
    },
    {
      icon: '🎯',
      title: "What's your score goal?",
      subtitle: 'Pick a target — we\'ll track your projected score every session.',
      content: (
        <div>
          <p className="text-center text-3xl font-black text-indigo-600 mb-4">{goalScore}</p>
          <div className="grid grid-cols-3 gap-2">
            {SCORES.map(s => (
              <button
                key={s}
                onClick={() => setGoalScore(s)}
                className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${goalScore === s ? 'bg-indigo-600 border-indigo-600 text-white scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Average SAT score is ~1010. Top 10% score 1200+. Top 1% score 1500+.
          </p>
        </div>
      ),
      cta: 'Set goal & continue',
    },
    {
      icon: '📆',
      title: 'How often can you study?',
      subtitle: 'Consistency beats cramming. Even 3 days a week makes a big difference.',
      content: (
        <div>
          <div className="flex gap-2 flex-wrap justify-center mb-4">
            {DAYS.map(d => (
              <button
                key={d}
                onClick={() => setDaysPerWeek(d)}
                className={`w-12 h-12 rounded-xl text-sm font-black border-2 transition-all ${daysPerWeek === d ? 'bg-emerald-500 border-emerald-500 text-white scale-110' : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'}`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-gray-500 mb-4">days per week</p>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            <p className="text-sm font-bold text-emerald-700 text-center">
              {daysPerWeek >= 6 ? '🔥 Serious grinder! Aim for 20-30 questions each day.'
               : daysPerWeek >= 4 ? '💪 Strong commitment! Perfect for a 2-month prep timeline.'
               : daysPerWeek >= 2 ? '✅ A solid start. Focus sessions will make each one count.'
               : '⚡ Quality over quantity — make every session your best!'}
            </p>
          </div>
        </div>
      ),
      cta: "I'm ready!",
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${i === step ? 'w-6 h-2 bg-indigo-600' : i < step ? 'w-2 h-2 bg-indigo-300' : 'w-2 h-2 bg-gray-200'}`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="text-center mb-5">
            <p className="text-3xl mb-3">{current.icon}</p>
            <h1 className="text-xl font-black text-gray-900 mb-1">{current.title}</h1>
            <p className="text-sm text-gray-500 leading-snug">{current.subtitle}</p>
          </div>
          {current.content}
        </div>

        {/* CTA */}
        <button
          onClick={isLast ? finish : () => setStep(s => s + 1)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-base shadow-lg hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] transition-all"
        >
          {current.cta} →
        </button>

        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="w-full mt-2 py-3 text-gray-400 text-sm font-medium"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  )
}
