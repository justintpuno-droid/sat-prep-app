import { useState, useMemo } from 'react'

const RULES = [
  {
    category: 'Punctuation',
    color: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200',
    rules: [
      {
        title: 'Comma + FANBOYS joins two independent clauses',
        example: 'She studied hard, but she was still nervous.',
        wrong: 'She studied hard but she was still nervous.',
        tip: 'FANBOYS = For, And, Nor, But, Or, Yet, So. Without the comma, it\'s a comma splice.',
      },
      {
        title: 'Semicolon = period between two independent clauses',
        example: 'The test was long; she finished with 5 minutes to spare.',
        wrong: 'The test was long, she finished with 5 minutes to spare.',
        tip: 'A semicolon links two complete sentences. Never use it before a list without an introductory clause.',
      },
      {
        title: 'Colon introduces a list, explanation, or quotation',
        example: 'She needed three things: a pencil, an eraser, and her ID.',
        wrong: 'She needed: a pencil, an eraser, and her ID.',
        tip: 'The clause before the colon must be a complete sentence. Don\'t put a colon after a verb.',
      },
      {
        title: 'Em dash adds emphasis or sets off a parenthetical',
        example: 'The answer — after hours of work — was surprisingly simple.',
        wrong: 'The answer, after hours of work, was surprisingly simple. (both work, dash is more emphatic)',
        tip: 'Em dashes come in pairs when used parenthetically. You can also use one to introduce an explanation.',
      },
      {
        title: 'Apostrophe shows possession (not plurals)',
        example: 'The student\'s notebook was full. / Students\' notebooks were full.',
        wrong: 'The students notebooks were full.',
        tip: 'Singular: add \'s. Plural ending in s: add apostrophe only. It\'s = it is; its = belonging to it.',
      },
    ],
  },
  {
    category: 'Subject-Verb Agreement',
    color: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200',
    rules: [
      {
        title: 'Cross out prepositional phrases to find the real subject',
        example: 'The box of cookies [is/are] empty. → Subject = "box" → IS',
        wrong: '"The box of cookies are empty" (wrong)',
        tip: 'Prepositional phrases (of, in, on, with, for…) never contain the subject.',
      },
      {
        title: 'Inverted sentences: verb comes before subject',
        example: 'There are three reasons why…  → "reasons" is the subject → ARE',
        wrong: '"There is three reasons" (wrong)',
        tip: 'In sentences starting with "there" or "here," the subject comes after the verb.',
      },
      {
        title: '"Each," "every," "either," "neither" are singular',
        example: 'Each of the students was required to submit an essay.',
        wrong: '"Each of the students were required" (wrong)',
        tip: 'These indefinite pronouns always take singular verbs, even with a plural noun nearby.',
      },
      {
        title: 'Compound subjects joined by "or/nor" match the nearest subject',
        example: 'Neither the teacher nor the students were prepared.',
        wrong: '"Neither the teacher nor the students was prepared" (wrong)',
        tip: 'The verb agrees with the subject closest to it when using or/nor.',
      },
    ],
  },
  {
    category: 'Pronouns',
    color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
    rules: [
      {
        title: 'Pronoun must agree in number with its antecedent',
        example: 'Every student must bring their (or his or her) ID card.',
        wrong: '"Every student must bring their ID" is now accepted. "Each must bring their own" works.',
        tip: '"They/their" as singular is accepted on the SAT for gender-neutral reference.',
      },
      {
        title: 'Ambiguous pronoun reference',
        example: 'Maria told Julia that she had been selected. (Who? Ambiguous!)',
        wrong: 'Pronouns must clearly refer to one noun. Rewrite: "Maria told Julia that Maria had been selected."',
        tip: 'If the pronoun could refer to more than one noun, it\'s ambiguous. SAT will ask you to fix this.',
      },
      {
        title: 'Subject vs. object pronouns',
        example: 'Between you and me, the answer is C. / She and I went to the library.',
        wrong: '"Between you and I" (wrong) / "Her and me went" (wrong)',
        tip: 'After prepositions, use object pronouns (me, him, her, us, them). In compound subjects, use subject pronouns.',
      },
    ],
  },
  {
    category: 'Verb Tense & Modifiers',
    color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
    rules: [
      {
        title: 'Keep tenses consistent within a passage',
        example: 'She entered the room and sat down. (not: entered… sits down)',
        wrong: '"She entered the room and sits down" (inconsistent)',
        tip: 'Match the dominant tense of the passage. Don\'t switch from past to present without a reason.',
      },
      {
        title: 'Dangling modifier must be next to what it modifies',
        example: 'Running late, she missed the bus. (she is the one running)',
        wrong: '"Running late, the bus was missed." (the bus can\'t run!)',
        tip: 'The introductory phrase must modify the subject of the main clause. If not, it\'s dangling.',
      },
      {
        title: 'Misplaced modifier: put the modifier near the word it modifies',
        example: 'She only reads mysteries. / She reads only mysteries.',
        wrong: '"Only she reads mysteries" changes the meaning.',
        tip: '"Only," "just," "nearly," and "almost" must be placed directly before what they modify.',
      },
    ],
  },
  {
    category: 'Sentence Structure',
    color: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200',
    rules: [
      {
        title: 'Parallel structure: matched forms in a list',
        example: 'She likes hiking, swimming, and biking.',
        wrong: '"She likes hiking, swimming, and to bike" (not parallel)',
        tip: 'All items in a series must use the same grammatical form: all gerunds, all infinitives, or all nouns.',
      },
      {
        title: 'Fragment: a group of words that is not a complete sentence',
        example: 'Although the test was hard. (fragment) → Although the test was hard, she passed.',
        wrong: '"Although the test was hard." by itself is a fragment.',
        tip: 'A complete sentence needs a subject and verb and must express a complete thought.',
      },
      {
        title: 'Run-on: two complete sentences joined without proper punctuation',
        example: 'The test was hard; she passed. OR: The test was hard, but she passed.',
        wrong: '"The test was hard she passed" (run-on)',
        tip: 'Fix run-ons with: (1) period, (2) semicolon, (3) comma + FANBOYS, (4) subordinating conjunction.',
      },
      {
        title: 'Transition word logic: contrast vs. addition vs. cause/effect',
        example: 'She studied hard; therefore, she passed. / However, she was nervous.',
        wrong: 'Using "furthermore" when the relationship is contrast.',
        tip: 'Contrast: however, although, despite. Addition: furthermore, additionally. Cause: therefore, thus, consequently.',
      },
    ],
  },
  {
    category: 'Conciseness',
    color: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200',
    rules: [
      {
        title: 'Shorter is better when meaning is the same',
        example: '"She returned back home" → "She returned home"',
        wrong: '"Returned back" is redundant — "returned" already means going back.',
        tip: 'On the SAT, if two choices say the same thing, pick the shorter one. Redundancy = wrong.',
      },
      {
        title: 'Avoid redundant pairs and wordy phrases',
        example: '"The reason is because…" → "The reason is that…"',
        wrong: '"The reason is because" is redundant.',
        tip: 'Red flags: "due to the fact that" (use "because"), "in order to" (use "to"), "at this point in time" (use "now").',
      },
      {
        title: 'Active voice is preferred over passive voice',
        example: '"The student solved the problem" (active) vs. "The problem was solved by the student" (passive).',
        wrong: '"The problem was solved by the student" — passive is often wordier.',
        tip: 'On the SAT, if two choices say the same thing but one is active (subject does the action), it\'s usually better.',
      },
      {
        title: '"Which" vs. "that": restrictive vs. non-restrictive clauses',
        example: '"The test that I studied for…" (essential) vs. "The test, which was long, …" (extra info)',
        wrong: '"The test, that was long, started on time." (wrong: use "which" with commas for non-essential info)',
        tip: 'Use "that" for essential clauses (no commas). Use "which" with commas for parenthetical, non-essential info.',
      },
    ],
  },
  {
    category: 'Commonly Confused',
    color: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200',
    rules: [
      {
        title: 'Affect (verb) vs. Effect (noun)',
        example: '"The weather affected her mood." / "The effect of the storm was devastating."',
        wrong: '"The weather effected her mood." (wrong — effect is usually a noun)',
        tip: 'Affect = verb (to influence). Effect = noun (the result). Exception: "to effect change" uses effect as a verb.',
      },
      {
        title: 'Less vs. Fewer',
        example: '"Fewer students attended." (countable) / "Less water remained." (uncountable)',
        wrong: '"Less students attended." (wrong — students are countable)',
        tip: 'Use "fewer" with things you can count (people, items). Use "less" with uncountable quantities (water, time, money).',
      },
      {
        title: 'Who vs. Whom',
        example: '"Who called?" / "To whom did you speak?" / "She is the one who called."',
        wrong: '"Who did you call?" (should be "Whom did you call?")',
        tip: 'Use "who" as a subject (who does the action). Use "whom" as an object (receiving the action). Replace with he/him: if "him" fits, use "whom."',
      },
      {
        title: 'Comparatives vs. Superlatives',
        example: '"She is taller than her brother." (comparative) / "She is the tallest in the class." (superlative)',
        wrong: '"She is the most tallest in the class." (double superlative — never use "most + -est")',
        tip: 'Use comparative (-er / more) for two things. Use superlative (-est / most) for three or more. Never double up: "more smarter" or "most fastest" are always wrong.',
      },
      {
        title: 'Reflexive pronouns (myself, himself, etc.)',
        example: '"She hurt herself." / "He completed the work himself."',
        wrong: '"Please contact myself if you have questions." (wrong — use "me" not "myself" unless referring back to the subject)',
        tip: 'Use reflexive pronouns ONLY when the subject and object are the same person, or for emphasis. "Myself" cannot replace "me" or "I."',
      },
      {
        title: 'Gerunds and infinitives as subjects',
        example: '"Swimming is good exercise." (gerund) / "To err is human." (infinitive)',
        wrong: '"Swim is good exercise." (bare verb cannot be subject)',
        tip: 'A verb used as a subject must be a gerund (-ing form) or an infinitive (to + verb). This is a common error source in SAT Conventions questions.',
      },
      {
        title: '"Than" vs. "Then"',
        example: '"She scored higher than her classmates." / "Study first; then take the test."',
        wrong: '"She scored higher then her classmates."',
        tip: '"Than" is used for comparisons. "Then" refers to time or sequence. When comparing, always use "than."',
      },
    ],
  },
  {
    category: 'SAT-Specific Traps',
    color: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200',
    rules: [
      {
        title: 'Shortest correct answer wins (Conciseness trap)',
        example: '"She left quickly." vs. "She departed in a rapid manner."',
        wrong: '"She departed in a rapid and hasty manner due to the urgency of the situation."',
        tip: 'On Expression of Ideas questions, the SAT rewards brevity. If two options are both grammatically correct, pick the shorter one that preserves meaning.',
      },
      {
        title: 'Transition words signal logical relationship',
        example: '"However" = contrast. "Therefore" = result. "Moreover" = addition. "For example" = illustration.',
        wrong: '"The evidence was weak. Furthermore, the defendant was found not guilty." (Furthermore = addition, but the relationship is contrast → use "Nevertheless")',
        tip: 'Always determine the logical relationship FIRST, then match the transition: contrast, cause-effect, addition, or illustration.',
      },
      {
        title: 'Dangling modifier: the subject must match the opening phrase',
        example: '"Running down the hall, Maria tripped." (Maria was running)',
        wrong: '"Running down the hall, a backpack was left behind." (backpacks can\'t run)',
        tip: 'The noun right after the comma must be able to perform the action in the opening phrase. If it can\'t, it\'s a dangling modifier.',
      },
      {
        title: 'Parallel structure: list items must match form',
        example: '"She enjoys reading, writing, and hiking." (all gerunds)',
        wrong: '"She enjoys reading, to write, and hiking." (mixed forms)',
        tip: 'All items in a series must use the same grammatical form. Look for lists with conjunctions (and, or, but) and ensure each element is in the same form.',
      },
      {
        title: 'Non-restrictive vs. restrictive clauses',
        example: '"My sister, who lives in Boston, called me." (non-restrictive, adds info)\n"Students who study daily earn better grades." (restrictive, identifies which students)',
        wrong: '"Students, who study daily, earn better grades." (comma makes it non-restrictive — implies ALL students study daily)',
        tip: 'If the clause is essential to identify the noun (restrictive), do NOT use commas. If it\'s bonus info (non-restrictive), DO use commas. That\'s it.',
      },
    ],
  },
]

export default function GrammarRef({ onBack }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [expandedRule, setExpandedRule] = useState(null)

  const allRules = useMemo(() =>
    RULES.flatMap(cat => cat.rules.map(r => ({ ...r, category: cat.category, color: cat.color, bg: cat.bg, text: cat.text, border: cat.border }))),
    [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allRules.filter(r => {
      const matchesSearch = !q || r.title.toLowerCase().includes(q) || r.tip.toLowerCase().includes(q)
      const matchesCat = activeCategory === 'all' || r.category === activeCategory
      return matchesSearch && matchesCat
    })
  }, [allRules, search, activeCategory])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-slate-100 px-4 pt-safe-8 pb-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition-colors shrink-0">← Back</button>
          <div>
            <h1 className="text-lg font-black text-gray-900">Grammar Rules</h1>
            <p className="text-xs text-gray-400">All SAT English grammar rules with examples</p>
          </div>
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search rules…"
          className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-violet-300 text-gray-700"
        />

        <div className="flex gap-1.5 flex-wrap mb-4">
          {[{ id: 'all', label: 'All' }, ...RULES.map(c => ({ id: c.category, label: c.category }))].map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${activeCategory === c.id ? 'bg-gray-800 text-white border-transparent' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 mb-3">{filtered.length} rule{filtered.length !== 1 ? 's' : ''} · tap to expand</p>

        <div className="space-y-2">
          {filtered.map((rule, i) => {
            const key = rule.category + rule.title
            const isOpen = expandedRule === key
            return (
              <button
                key={i}
                onClick={() => setExpandedRule(isOpen ? null : key)}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${isOpen ? `${rule.bg} ${rule.border}` : 'bg-white border-gray-100 hover:border-gray-200'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${rule.bg} ${rule.text}`}>{rule.category}</span>
                    <p className={`text-sm font-bold leading-snug ${isOpen ? rule.text : 'text-gray-800'}`}>{rule.title}</p>
                  </div>
                  <span className="text-gray-400 text-xs shrink-0 mt-1">{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && (
                  <div className="mt-3 space-y-2.5 pl-0">
                    <div className={`rounded-xl p-3 ${rule.bg} border ${rule.border}`}>
                      <p className={`text-[10px] font-bold ${rule.text} uppercase tracking-widest mb-1`}>✓ Correct</p>
                      <p className="text-sm text-gray-700 italic leading-snug">{rule.example}</p>
                    </div>
                    {rule.wrong && (
                      <div className="rounded-xl p-3 bg-rose-50 border border-rose-100">
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">✗ Common Mistake</p>
                        <p className="text-sm text-gray-600 italic leading-snug">{rule.wrong}</p>
                      </div>
                    )}
                    <div className="rounded-xl p-3 bg-gray-50 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">💡 Remember</p>
                      <p className="text-sm text-gray-600 leading-snug">{rule.tip}</p>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">{allRules.length} grammar rules total · each one tested on the SAT</p>
      </div>
    </div>
  )
}
