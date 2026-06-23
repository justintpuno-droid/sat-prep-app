import { useState, useMemo } from 'react'
import allQuestions from './data/questions'
import { TAXONOMY } from './data/taxonomy'
import QuestionCard from './components/QuestionCard'

const PAGE_SIZES = [10, 30, 50]

const DIFF_LABEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' }
const DIFF_CHIP_ON  = { 1: 'bg-emerald-500 text-white border-emerald-500', 2: 'bg-amber-500 text-white border-amber-500', 3: 'bg-rose-500 text-white border-rose-500' }
const DIFF_CHIP_OFF = 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'

function DifficultyBars({ level }) {
  const segments = [
    level >= 1 ? (level === 1 ? 'bg-emerald-500' : level === 2 ? 'bg-amber-400' : 'bg-rose-500') : 'bg-gray-200',
    level >= 2 ? (level === 2 ? 'bg-amber-400' : 'bg-rose-500') : 'bg-gray-200',
    level >= 3 ? 'bg-rose-500' : 'bg-gray-200',
  ]
  return (
    <div className="flex gap-0.5 items-center">
      {segments.map((cls, i) => (
        <div key={i} className={`h-2.5 w-5 rounded-sm ${cls}`} />
      ))}
    </div>
  )
}

// Flat lookup maps, computed once
const DOMAIN_MAP = Object.fromEntries(
  TAXONOMY.flatMap(s => s.domains).map(d => [d.id, d])
)
const SKILL_MAP = Object.fromEntries(
  TAXONOMY.flatMap(s => s.domains).flatMap(d => d.skills).map(sk => [sk.id, sk])
)
const ALL_DOMAIN_IDS = new Set(TAXONOMY.flatMap(s => s.domains.map(d => d.id)))

export default function QuestionBank({ onBack, onPractice }) {
  const [section, setSection] = useState('all')
  const [selectedDomains, setSelectedDomains] = useState(() => new Set(ALL_DOMAIN_IDS))
  const [diffFilter, setDiffFilter] = useState(new Set([1, 2, 3]))
  const [skillFilter, setSkillFilter] = useState('all')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [expandedQ, setExpandedQ] = useState(null)

  // Domains visible in sidebar based on section selection
  const visibleDomains = useMemo(
    () => TAXONOMY.filter(s => section === 'all' || s.id === section).flatMap(s => s.domains),
    [section]
  )

  // Skills available in the top filter (based on selected domains)
  const visibleSkills = useMemo(
    () => visibleDomains.filter(d => selectedDomains.has(d.id)).flatMap(d => d.skills),
    [visibleDomains, selectedDomains]
  )

  function handleSectionChange(s) {
    setSection(s)
    const ids = TAXONOMY.filter(sub => s === 'all' || sub.id === s).flatMap(sub => sub.domains.map(d => d.id))
    setSelectedDomains(new Set(ids))
    setSkillFilter('all')
    setPage(1)
    setExpandedQ(null)
  }

  function toggleDomain(id) {
    setSelectedDomains(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setPage(1)
    setExpandedQ(null)
  }

  function toggleDiff(d) {
    setDiffFilter(prev => {
      const next = new Set(prev)
      next.has(d) ? next.delete(d) : next.add(d)
      return next
    })
    setPage(1)
  }

  const filtered = useMemo(
    () => allQuestions.filter(q =>
      (section === 'all' || q.subject === section) &&
      selectedDomains.has(q.domain) &&
      diffFilter.has(q.difficulty) &&
      (skillFilter === 'all' || q.skill === skillFilter)
    ),
    [section, selectedDomains, diffFilter, skillFilter]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageQs = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function goTo(p) { setPage(Math.max(1, Math.min(totalPages, p))); setExpandedQ(null) }

  function pageRange() {
    const delta = 2
    const out = []
    for (let i = Math.max(1, safePage - delta); i <= Math.min(totalPages, safePage + delta); i++) out.push(i)
    return out
  }

  const allDomainsSelected = visibleDomains.every(d => selectedDomains.has(d.id))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-6">
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-700 mb-3 flex items-center gap-1 transition-colors">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-sm text-gray-500 mt-0.5">{allQuestions.length} questions available</p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start">

          {/* ── Left sidebar ─────────────────────────────────────────────── */}
          <aside className="w-full lg:w-56 lg:shrink-0 lg:sticky lg:top-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

              {/* Section */}
              <div className="px-4 py-4 border-b border-gray-100">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Section</p>
                <div className="space-y-2">
                  {[
                    { id: 'all',     label: 'Both' },
                    { id: 'math',    label: 'Math' },
                    { id: 'english', label: 'Reading & Writing' },
                  ].map(s => (
                    <label key={s.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="section"
                        value={s.id}
                        checked={section === s.id}
                        onChange={() => handleSectionChange(s.id)}
                        className="accent-blue-600 w-3.5 h-3.5"
                      />
                      <span className={`text-sm leading-none ${section === s.id ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                        {s.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Domain */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Domain</p>
                  <button
                    onClick={() => {
                      const ids = visibleDomains.map(d => d.id)
                      setSelectedDomains(allDomainsSelected ? new Set() : new Set(ids))
                      setPage(1)
                    }}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                  >
                    {allDomainsSelected ? 'Clear' : 'All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 lg:grid-cols-1">
                  {visibleDomains.map(domain => (
                    <label key={domain.id} className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDomains.has(domain.id)}
                        onChange={() => toggleDomain(domain.id)}
                        className="accent-blue-600 w-3.5 h-3.5 mt-0.5 shrink-0"
                      />
                      <span className="text-sm text-gray-700 leading-snug">{domain.label}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </aside>

          {/* ── Main content ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Top filters bar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 mb-4 flex flex-wrap items-center gap-4">

              {/* Difficulty */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Difficulty</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map(d => (
                    <button
                      key={d}
                      onClick={() => toggleDiff(d)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${diffFilter.has(d) ? DIFF_CHIP_ON[d] : DIFF_CHIP_OFF}`}
                    >
                      {DIFF_LABEL[d]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skill */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Skill</span>
                <select
                  value={skillFilter}
                  onChange={e => { setSkillFilter(e.target.value); setPage(1); setExpandedQ(null) }}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-gray-700 max-w-[220px]"
                >
                  <option value="all">All Skills</option>
                  {visibleSkills.map(sk => (
                    <option key={sk.id} value={sk.id}>{sk.label}</option>
                  ))}
                </select>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {filtered.length} question{filtered.length !== 1 ? 's' : ''}
                </span>
                {onPractice && filtered.length > 0 && (
                  <button
                    onClick={() => onPractice(filtered)}
                    className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
                  >
                    Practice {filtered.length} →
                  </button>
                )}
              </div>
            </div>

            {/* Per-page + page info */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Show</span>
                {PAGE_SIZES.map(n => (
                  <button
                    key={n}
                    onClick={() => { setPageSize(n); setPage(1) }}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${pageSize === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                  >
                    {n}
                  </button>
                ))}
                <span className="text-xs text-gray-500">per page</span>
              </div>
              {totalPages > 1 && (
                <span className="text-xs text-gray-400">Page {safePage} of {totalPages}</span>
              )}
            </div>

            {/* Questions table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto mb-4">
            <div className="min-w-[540px]">

              {/* Table header */}
              <div className="grid items-center gap-3 px-4 py-2.5 bg-gray-700 text-xs font-semibold text-gray-300 uppercase tracking-wide"
                style={{ gridTemplateColumns: '20px 90px 100px 1fr 1fr' }}>
                <div />
                <div>ID</div>
                <div>Difficulty</div>
                <div>Domain</div>
                <div>Skill</div>
              </div>

              {pageQs.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-2xl mb-2">🔍</p>
                  <p className="text-sm text-gray-400">No questions match your filters.</p>
                </div>
              ) : (
                pageQs.map((q, idx) => {
                  const isExpanded = expandedQ === q.id
                  return (
                    <div key={q.id} className={`border-b border-gray-100 last:border-b-0 ${idx % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'}`}>
                      {/* Row button */}
                      <button
                        onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                        className="w-full grid items-center gap-3 px-4 py-3 text-left hover:bg-blue-50/60 transition-colors"
                        style={{ gridTemplateColumns: '20px 90px 100px 1fr 1fr' }}
                      >
                        {/* Expand indicator */}
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isExpanded ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                          {isExpanded && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>

                        {/* ID */}
                        <span className="text-xs font-mono text-blue-600 font-semibold">{q.id}</span>

                        {/* Difficulty bars */}
                        <DifficultyBars level={q.difficulty} />

                        {/* Domain */}
                        <span className="text-xs text-gray-700 truncate">{DOMAIN_MAP[q.domain]?.label}</span>

                        {/* Skill */}
                        <span className="text-xs text-gray-700 truncate">{SKILL_MAP[q.skill]?.label}</span>
                      </button>

                      {/* Expanded question view */}
                      {isExpanded && (
                        <div className="border-t border-blue-100 bg-white px-6 pb-6 pt-4">
                          <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
                            <span className="font-mono font-semibold text-gray-600">{q.id}</span>
                            <span>·</span>
                            <span className={
                              q.difficulty === 1 ? 'text-emerald-600 font-medium' :
                              q.difficulty === 2 ? 'text-amber-600 font-medium' : 'text-rose-600 font-medium'
                            }>{DIFF_LABEL[q.difficulty]}</span>
                            <span>·</span>
                            <span>{DOMAIN_MAP[q.domain]?.label}</span>
                            <span>·</span>
                            <span>{SKILL_MAP[q.skill]?.label}</span>
                          </div>
                          <QuestionCard
                            question={q}
                            selectedAnswer={q.answer}
                            onSelect={() => {}}
                            showFeedback
                          />
                          {q.explanation && (
                            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
                              <p className="text-xs font-bold text-blue-600 mb-1.5 uppercase tracking-wider">Explanation</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5">
                <button
                  onClick={() => goTo(safePage - 1)}
                  disabled={safePage === 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>

                {safePage > 3 && (
                  <>
                    <button onClick={() => goTo(1)} className="w-8 h-8 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">1</button>
                    {safePage > 4 && <span className="text-gray-400 text-xs">…</span>}
                  </>
                )}

                {pageRange().map(p => (
                  <button
                    key={p}
                    onClick={() => goTo(p)}
                    className={`w-8 h-8 text-xs rounded-lg border transition-all ${p === safePage ? 'bg-blue-600 text-white border-blue-600 font-semibold' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                ))}

                {safePage < totalPages - 2 && (
                  <>
                    {safePage < totalPages - 3 && <span className="text-gray-400 text-xs">…</span>}
                    <button onClick={() => goTo(totalPages)} className="w-8 h-8 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">{totalPages}</button>
                  </>
                )}

                <button
                  onClick={() => goTo(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
