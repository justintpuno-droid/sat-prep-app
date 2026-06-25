import { useMemo, useState } from 'react'
import { loadHistory } from './utils/history'
import allQuestions from './data/questions'
import { domainById, skillById } from './data/taxonomy'

const JOURNAL_KEY = 'sat_prep_wrong_journal'

function loadJournal() {
  try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) ?? '{}') } catch { return {} }
}

function saveJournal(j) {
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(j)) } catch {}
}

const DIFF_LABEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' }
const DIFF_COLOR = { 1: 'text-emerald-600 bg-emerald-50', 2: 'text-amber-600 bg-amber-50', 3: 'text-rose-600 bg-rose-50' }

export default function WrongAnswerJournal({ onBack, onPractice }) {
  const [journal, setJournal] = useState(loadJournal)
  const [noteTarget, setNoteTarget] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [filter, setFilter] = useState('all')

  const byId = useMemo(() => Object.fromEntries(allQuestions.map(q => [q.id, q])), [])

  const entries = useMemo(() => {
    const history = loadHistory()
    const wrongCount = {}, lastWrong = {}
    for (const s of history) {
      for (const q of s.questions) {
        const ans = s.answers?.[q.id] ?? null
        if (ans !== null && ans !== q.answer) {
          wrongCount[q.id] = (wrongCount[q.id] ?? 0) + 1
          lastWrong[q.id] = s.completedAt
        }
      }
    }
    return Object.entries(wrongCount)
      .filter(([id]) => !journal[id]?.mastered)
      .sort(([, a], [, b]) => b - a)
      .map(([id, count]) => ({ id, count, lastWrong: lastWrong[id], q: byId[id] }))
      .filter(e => e.q)
  }, [byId, journal])

  const filtered = useMemo(() => {
    if (filter === 'all') return entries
    if (filter === 'hard') return entries.filter(e => e.q.difficulty === 3)
    if (filter === 'repeat') return entries.filter(e => e.count >= 3)
    return entries
  }, [entries, filter])

  function markMastered(id) {
    const next = { ...journal, [id]: { ...journal[id], mastered: true, masteredAt: new Date().toISOString() } }
    saveJournal(next)
    setJournal(next)
  }

  function saveNote(id) {
    const next = { ...journal, [id]: { ...journal[id], note: noteText } }
    saveJournal(next)
    setJournal(next)
    setNoteTarget(null)
    setNoteText('')
  }

  const masterCount = Object.values(journal).filter(j => j.mastered).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50 to-slate-100 px-4 pt-safe-10 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">← Back</button>

        <div className="mb-5">
          <div className="flex items-end justify-between mb-1">
            <h1 className="text-2xl font-black text-gray-900">Wrong Answer Journal</h1>
            {masterCount > 0 && <span className="text-xs text-emerald-600 font-bold">{masterCount} mastered ✓</span>}
          </div>
          <p className="text-sm text-gray-500">Questions you keep missing — add notes, then drill them.</p>
        </div>

        {entries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-black text-gray-800 mb-1">No persistent mistakes!</p>
            <p className="text-sm text-gray-400">Keep practicing — missed questions will show up here.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 mb-4">
              {[['all', 'All'], ['repeat', '3+ misses'], ['hard', 'Hard only']].map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === v ? 'bg-rose-500 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {l}
                </button>
              ))}
              {filtered.length > 0 && (
                <button
                  onClick={() => onPractice(filtered.slice(0, 15).map(e => e.q))}
                  className="ml-auto px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                >
                  Drill {Math.min(filtered.length, 15)}
                </button>
              )}
            </div>

            <div className="space-y-3">
              {filtered.map(({ id, count, lastWrong, q }) => {
                const note = journal[id]?.note
                const domain = domainById[q.domain]
                const skill = q.skill ? skillById[q.skill] : null
                const dateStr = lastWrong ? new Date(lastWrong).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
                return (
                  <div key={id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${DIFF_COLOR[q.difficulty ?? 2]}`}>{DIFF_LABEL[q.difficulty ?? 2]}</span>
                      <p className="text-sm text-gray-800 leading-snug flex-1">{q.question?.slice(0, 100)}{q.question?.length > 100 ? '…' : ''}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {domain && <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">{domain.label}</span>}
                      {skill && <span className="text-[10px] text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full">{skill.label}</span>}
                      <span className="text-[10px] text-gray-400 ml-auto">{count}× wrong{dateStr ? ` · last ${dateStr}` : ''}</span>
                    </div>
                    {note && noteTarget !== id && (
                      <p className="text-xs text-indigo-600 italic bg-indigo-50 rounded-lg px-2.5 py-1.5 mb-2">📝 {note}</p>
                    )}
                    {noteTarget === id ? (
                      <div className="mt-2">
                        <textarea
                          autoFocus
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          placeholder="What tricked you? How will you remember it?"
                          rows={2}
                          className="w-full text-xs border border-indigo-200 rounded-xl p-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                        <div className="flex gap-2 mt-1.5">
                          <button onClick={() => saveNote(id)} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-indigo-700 transition-colors">Save</button>
                          <button onClick={() => { setNoteTarget(null); setNoteText('') }} className="text-xs text-gray-400 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-1.5">
                        <button
                          onClick={() => { setNoteTarget(id); setNoteText(journal[id]?.note ?? '') }}
                          className="text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
                        >
                          {note ? '✏️ Edit note' : '+ Add note'}
                        </button>
                        <button
                          onClick={() => markMastered(id)}
                          className="text-[11px] text-emerald-500 hover:text-emerald-700 font-semibold ml-auto transition-colors"
                        >
                          ✓ Got it!
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
