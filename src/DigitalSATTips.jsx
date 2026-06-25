import { useState } from 'react'

const SECTIONS = [
  {
    id: 'interface',
    title: 'Using the Test Interface',
    icon: '💻',
    color: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200',
    tips: [
      { title: 'Flag questions to revisit', body: 'Tap the bookmark icon to mark any question you want to come back to. At the end of the module, you\'ll see a review screen showing flagged and unanswered questions.' },
      { title: 'Use the built-in annotation tools', body: 'You can highlight text in Reading passages and cross out answer choices you\'ve eliminated. Use this — it dramatically reduces errors.' },
      { title: 'Use the answer elimination feature', body: 'Click the strikethrough button (abc̶) to cross out choices you\'ve ruled out. This forces you to actively eliminate, not just guess.' },
      { title: 'The review screen shows everything unanswered', body: 'Before you submit a module, the review screen shows every question: answered, unanswered, and flagged. Always check it.' },
      { title: 'Timer at the top — hide or show', body: 'You can hide the timer if it\'s making you anxious. With 5 minutes left, it turns red automatically. Practice with and without it.' },
    ],
  },
  {
    id: 'calculator',
    title: 'Desmos Calculator (Math)',
    icon: '🔢',
    color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
    tips: [
      { title: 'Desmos is available for ALL math questions', body: 'Unlike the old SAT, the digital SAT allows Desmos on both Math modules — not just the calculator section. Use it for any computation.' },
      { title: 'Graph to find intersection points', body: 'For "how many solutions does this system have?" — just graph both equations in Desmos and count intersections. Much faster than algebra.' },
      { title: 'Use Desmos to verify answers', body: 'After solving algebraically, plug your answer back into Desmos to confirm. This catches careless errors instantly.' },
      { title: 'Desmos can handle fractions and roots', body: 'Type fractions as (numerator)/(denominator). Type √ with the sqrt() function or the √ button. You can also type exact π values.' },
      { title: 'Don\'t rely on Desmos for speed', body: 'Know your formulas and algebra cold — Desmos adds setup time. Use it for complex problems or verification, not every question.' },
    ],
  },
  {
    id: 'structure',
    title: 'Test Structure & Timing',
    icon: '⏱',
    color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
    tips: [
      { title: '4 modules, 2 per subject', body: 'Reading & Writing: Module 1 (27 Qs, 32 min) → Module 2 (27 Qs, 32 min). Math: Module 1 (22 Qs, 35 min) → Module 2 (22 Qs, 35 min). Total: 98 questions, ~2 hrs 14 min.' },
      { title: 'Module 2 adapts to your Module 1 performance', body: 'If you score high on Module 1, you get harder questions in Module 2 (and can score higher). Low Module 1 → easier Module 2 (score is capped). This is why Module 1 is critical.' },
      { title: 'Pace yourself: about 1.2 min per R&W question', body: 'Each Reading & Writing question gets ~1 min 11 sec. If you\'re taking 2+ minutes on one, skip and come back. For Math: ~1 min 35 sec per question.' },
      { title: 'You can\'t go between modules', body: 'Once you submit a module, it\'s done. You can\'t go back to Math after finishing R&W, for example. Treat each module as its own timed test.' },
      { title: 'The 10-minute break matters', body: 'There\'s a 10-minute break between R&W and Math. Eat a snack, hydrate, step outside if possible. This isn\'t wasted time — it affects your Math performance.' },
    ],
  },
  {
    id: 'reading',
    title: 'Reading & Writing Strategy',
    icon: '📖',
    color: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200',
    tips: [
      { title: 'Each R&W question has its own short passage', body: 'Unlike the old SAT with long passages, each question has a dedicated 1-8 sentence passage. Read it completely before looking at the question.' },
      { title: 'Answer types are predictable', body: 'R&W question types: Information & Ideas (main idea, supporting detail, inference), Craft & Structure (rhetoric, transitions, vocabulary in context), Expression of Ideas (best connects ideas), Standard English Conventions (grammar/punctuation).' },
      { title: 'Grammar questions: "Which choice completes the text?"', body: 'These test specific rules: subject-verb agreement, pronoun reference, punctuation, parallel structure. Apply one rule at a time and eliminate.' },
      { title: '"Most logically completes" = look for evidence', body: 'For "notes" questions with bullet points, your answer must be directly supported by the notes. Don\'t add outside knowledge.' },
      { title: 'Transition questions: identify the relationship', body: 'First decide: is the relationship contrast, addition, cause/effect, or example? Then pick the matching transition. Don\'t just read the choices.' },
    ],
  },
  {
    id: 'math-tips',
    title: 'Math Strategy',
    icon: '🔢',
    color: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200',
    tips: [
      { title: 'Student-response questions: no penalty for guessing', body: 'Fill-in questions don\'t have choices, but there\'s no wrong-answer penalty. Always enter SOMETHING. Try 0, 1, or your best estimate.' },
      { title: 'The hard Module 2 has trickier traps', body: 'If you think you got easy Module 1, expect Module 2 to feel different — more abstract, more multi-step. Don\'t panic; stay systematic.' },
      { title: 'Most wrong answers come from setting up the problem', body: 'Students who know the math still miss questions by misreading or setting up the equation incorrectly. Read the question TWICE before solving.' },
      { title: 'Estimate first, then calculate', body: 'For many questions, a rough estimate immediately rules out 2-3 choices. Then calculate only among the remaining options.' },
      { title: 'Know the reference formulas — but know them fast', body: 'The digital SAT provides a formula sheet (circles, triangles, etc.). But reading it every time costs precious seconds. Know them cold so you only glance when needed.' },
    ],
  },
  {
    id: 'testday',
    title: 'Test Day Logistics',
    icon: '🎒',
    color: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200',
    tips: [
      { title: 'What to bring', body: 'Valid photo ID, your admission ticket (printed or on phone), a snack and water for the break, pencils (even though it\'s digital — scratch paper is provided), a watch (optional, since there\'s a timer on screen).' },
      { title: 'What NOT to bring', body: 'No smartphone use during the test. No outside calculator (Desmos is built in). No notes or reference materials. No earbuds.' },
      { title: 'You\'ll use Bluebook on a school computer or your own device', body: 'Testing is done in the College Board\'s Bluebook app. If you\'re bringing your own laptop, download and test the app BEFORE test day. The app goes into lockdown mode during the test.' },
      { title: 'Arrive 30 minutes early', body: 'Sign-in takes longer than people expect. You\'ll need to log into the app, confirm your identity, and get your test code. Late arrivals may not be admitted.' },
      { title: 'The night before: don\'t cram', body: 'You\'ll do better rested than you will studying until midnight. Review your key formulas once, prepare your bag, get 8+ hours of sleep. Mental state matters more than last-minute cramming.' },
    ],
  },
]

export default function DigitalSATTips({ onBack }) {
  const [active, setActive] = useState(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 px-4 pt-safe-8 pb-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition-colors shrink-0">← Back</button>
          <div>
            <h1 className="text-lg font-black text-gray-900">Digital SAT Guide</h1>
            <p className="text-xs text-gray-400">Format-specific tips for the computer-based exam</p>
          </div>
        </div>

        <div className="bg-indigo-600 text-white rounded-2xl p-4 mb-5">
          <p className="text-sm font-bold mb-1">The Digital SAT is different from the old paper SAT</p>
          <p className="text-xs text-indigo-200 leading-relaxed">Shorter, adaptive, 4 modules. All math allows Desmos. Short passages, not long essays. Knowing the format = free points.</p>
        </div>

        <div className="space-y-2">
          {SECTIONS.map(sec => {
            const isOpen = active === sec.id
            return (
              <button
                key={sec.id}
                onClick={() => setActive(isOpen ? null : sec.id)}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${isOpen ? `${sec.bg} ${sec.border}` : 'bg-white border-gray-100 hover:border-gray-200'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xl shrink-0">{sec.icon}</span>
                    <div>
                      <p className={`text-sm font-bold leading-snug ${isOpen ? sec.text : 'text-gray-800'}`}>{sec.title}</p>
                      <p className="text-[10px] text-gray-400">{sec.tips.length} tips</p>
                    </div>
                  </div>
                  <span className="text-gray-400 text-xs shrink-0">{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && (
                  <div className="mt-4 space-y-3">
                    {sec.tips.map((tip, i) => (
                      <div key={i} className={`rounded-xl p-3 bg-white border ${sec.border}`}>
                        <p className={`text-xs font-bold ${sec.text} mb-1`}>{tip.title}</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{tip.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">{SECTIONS.reduce((n, s) => n + s.tips.length, 0)} digital SAT tips · format knowledge = free points</p>
      </div>
    </div>
  )
}
