import { useState } from 'react'

const SECTIONS = [
  {
    id: 'math',
    icon: '∑',
    label: 'Math',
    color: 'bg-indigo-600',
    light: 'bg-indigo-50 border-indigo-100',
    text: 'text-indigo-700',
    strategies: [
      { title: 'Plug in Numbers', body: 'When a question uses variables, substitute simple numbers (0, 1, 2) into each answer choice. The one that works is correct.' },
      { title: 'Plug in Answer Choices', body: 'For "what is the value of x?" questions, try each answer in the equation. Start with B or C — if it\'s too big, go down; too small, go up.' },
      { title: 'Draw it Out', body: 'Sketch geometry problems, even rough ones. Label what you know. Most geometry answers become obvious when you can see them.' },
      { title: 'Use Desmos', body: 'In the calculator section, graph equations to find intersections, vertex, or zeros instead of solving algebraically.' },
      { title: '75 Seconds Per Question', body: 'Budget ~75 seconds per question. If you\'re still stuck at 90s, circle it and move on — return at the end.' },
      { title: 'Cross-Multiply Fractions', body: 'For proportion questions: a/b = c/d → ad = bc. Much faster than finding a common denominator.' },
      { title: 'Check Units', body: 'Word problems often trick you with units (feet vs. meters, hours vs. minutes). Convert before you calculate.' },
      { title: 'Hard ≠ Long', body: 'The hardest questions often have short, elegant solutions. If your method is getting messy, reconsider your approach.' },
    ],
  },
  {
    id: 'reading',
    icon: '📖',
    label: 'Reading',
    color: 'bg-emerald-600',
    light: 'bg-emerald-50 border-emerald-100',
    text: 'text-emerald-700',
    strategies: [
      { title: 'Read the Question First', body: 'Before reading a passage excerpt, read what the question asks. Knowing your target cuts reading time in half.' },
      { title: 'Answer is in the Text', body: 'Every correct answer is directly supported by the passage — never by outside knowledge or assumption.' },
      { title: 'Avoid Extremes', body: 'Wrong answers on inference questions are usually too extreme ("always," "never," "all") or too specific. The right answer is moderate.' },
      { title: 'Paired Evidence Questions', body: 'For "which quote best supports…" questions: solve the first part, then find quote support second. Don\'t just pick the most interesting quote.' },
      { title: 'Main Idea ≠ First Sentence', body: 'Main idea questions are about the whole passage, not just the intro. Look for what every paragraph has in common.' },
      { title: 'Words in Context', body: 'Eliminate the word, read the sentence, then fill in your own blank. Only then look at the choices for a match.' },
      { title: 'Tone Questions', body: 'When asked about the author\'s tone, find adjectives or verbs that carry emotional weight. Neutral facts don\'t show tone.' },
    ],
  },
  {
    id: 'writing',
    icon: '✏️',
    label: 'Writing',
    color: 'bg-violet-600',
    light: 'bg-violet-50 border-violet-100',
    text: 'text-violet-700',
    strategies: [
      { title: 'Shorter = Better', body: 'When two choices say the same thing, pick the shorter one. The SAT penalizes wordiness.' },
      { title: 'Read the Whole Sentence', body: 'Never edit just the underlined portion in isolation. The error often depends on context you haven\'t read yet.' },
      { title: 'Subject-Verb Agreement', body: 'Cross out prepositional phrases between subject and verb: "The box of cookies [is/are] empty." Subject is "box" (singular) → is.' },
      { title: 'Pronoun Agreement', body: 'A pronoun must match the noun it replaces in number and gender. "Each student must bring their ID" — "each" is singular, "their" is informal but now accepted on SAT.' },
      { title: 'Transitions', body: 'The correct transition word depends on the logic between ideas. Contrast (however, but, although) vs. addition (furthermore, also, in addition).' },
      { title: '"No Change" is Often Right', body: 'Don\'t assume something must be changed. "No change" is the right answer about 25% of the time — don\'t reflexively skip it.' },
      { title: 'Parallel Structure', body: 'Items in a list must be grammatically parallel: "She likes hiking, swimming, and to bike" is wrong → "hiking, swimming, and biking."' },
      { title: 'Comma Usage', body: 'Use a comma + FANBOYS (For, And, Nor, But, Or, Yet, So) to join two independent clauses. A comma alone creates a comma splice.' },
    ],
  },
  {
    id: 'timing',
    icon: '⏱',
    label: 'Timing',
    color: 'bg-amber-600',
    light: 'bg-amber-50 border-amber-100',
    text: 'text-amber-700',
    strategies: [
      { title: 'Two-Pass Strategy', body: 'First pass: answer everything you know quickly. Second pass: return to skipped questions with remaining time.' },
      { title: 'Never Leave Blank', body: 'There\'s NO penalty for wrong answers on the SAT. Always guess before time expires — even a random guess has a 25% chance.' },
      { title: 'Mark and Move', body: 'If stuck after 90 seconds, make your best guess, mark it mentally (or on scratch paper), and move on. Return if time allows.' },
      { title: 'Pace Yourself', body: 'Check your progress at the 10-minute mark. If you\'re behind, speed up. If ahead, slow down and be more careful.' },
      { title: 'Don\'t Second-Guess', body: 'Research shows your first instinct is usually right. Only change an answer if you have a concrete reason — not just a feeling.' },
    ],
  },
  {
    id: 'testday',
    icon: '🎓',
    label: 'Test Day',
    color: 'bg-rose-600',
    light: 'bg-rose-50 border-rose-100',
    text: 'text-rose-700',
    strategies: [
      { title: '8+ Hours of Sleep', body: 'Sleep is more important than a late-night study session. Sleep consolidates memory — cramming before bed hurts more than it helps.' },
      { title: 'Eat a Real Breakfast', body: 'Complex carbs + protein: oatmeal, eggs, whole grain toast. Avoid heavy sugar (crash mid-test) or nothing at all (brain fog).' },
      { title: 'Arrive Early', body: 'Aim to arrive 30 minutes before start. Rushing in late spikes cortisol and derails the first module.' },
      { title: 'Breathe During Hard Questions', body: 'If anxiety spikes: 4 counts in, hold 4, out 4. One breath resets your prefrontal cortex. Use it.' },
      { title: 'Trust Your Prep', body: 'You\'ve practiced. Your brain knows this material. Trust the process — over-thinking questions hurts more than it helps.' },
      { title: 'Don\'t Panic on Hard Questions', body: 'Hard questions are designed to be hard. Everyone else is also struggling. Stay calm, eliminate, and guess if needed.' },
    ],
  },
]

export default function StrategyGuide({ onBack }) {
  const [activeSection, setActiveSection] = useState('math')
  const [expandedTip, setExpandedTip] = useState(null)

  const section = SECTIONS.find(s => s.id === activeSection)

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Back</button>
          <div>
            <h1 className="text-lg font-black text-gray-900">SAT Strategy Guide</h1>
            <p className="text-xs text-gray-400">Condensed cheat sheet for every section</p>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => { setActiveSection(s.id); setExpandedTip(null) }}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === s.id ? `${s.color} text-white shadow-md` : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Strategy cards */}
        <div className="space-y-2">
          {section.strategies.map((tip, i) => (
            <button
              key={i}
              onClick={() => setExpandedTip(expandedTip === i ? null : i)}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${expandedTip === i ? `${section.light} border-current` : 'bg-white border-gray-100 hover:border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black w-5 h-5 rounded-full ${section.color} text-white flex items-center justify-center shrink-0`}>{i+1}</span>
                  <p className={`text-sm font-bold ${expandedTip === i ? section.text : 'text-gray-800'}`}>{tip.title}</p>
                </div>
                <span className="text-gray-400 text-xs ml-2">{expandedTip === i ? '▲' : '▼'}</span>
              </div>
              {expandedTip === i && (
                <p className="text-sm text-gray-600 mt-3 leading-relaxed pl-7">{tip.body}</p>
              )}
            </button>
          ))}
        </div>

        <div className={`mt-6 rounded-2xl border-2 ${section.light} p-4 text-center`}>
          <p className={`text-xs font-bold ${section.text} mb-1`}>Remember</p>
          <p className="text-sm text-gray-600 leading-snug">
            {activeSection === 'math' ? 'Speed + accuracy = score. Practice until the basics are automatic so mental energy goes to hard questions.' :
             activeSection === 'reading' ? 'Every correct answer lives in the text. Never infer beyond what the passage explicitly supports.' :
             activeSection === 'writing' ? 'Read every answer choice aloud in your head. The grammatically correct one usually sounds right.' :
             activeSection === 'timing' ? 'Time is your most limited resource. Manage it like money — don\'t overspend on any single question.' :
             'Your preparation is already done. Trust it. The test is just showing your work.'}
          </p>
        </div>
      </div>
    </div>
  )
}
