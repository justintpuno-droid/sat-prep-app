import { useState, useMemo } from 'react'

const NOTES_KEY = 'sat_prep_notes'

const CATEGORIES = [
  { id: 'math', label: 'Math', icon: '📐', color: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  { id: 'reading', label: 'Reading', icon: '📖', color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { id: 'writing', label: 'Writing', icon: '✏️', color: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  { id: 'general', label: 'General', icon: '💡', color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
]

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) ?? '[]') } catch { return [] }
}
function saveNotes(notes) {
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)) } catch {}
}

export default function StudyNotes({ onBack }) {
  const [notes, setNotes] = useState(loadNotes)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [composing, setComposing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({ title: '', body: '', category: 'math' })

  const visible = useMemo(() => {
    let list = [...notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    if (filter !== 'all') list = list.filter(n => n.category === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(n => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
    }
    return list
  }, [notes, filter, search])

  function startNew() {
    setDraft({ title: '', body: '', category: 'math' })
    setEditingId(null)
    setComposing(true)
  }

  function startEdit(note) {
    setDraft({ title: note.title, body: note.body, category: note.category })
    setEditingId(note.id)
    setComposing(true)
  }

  function saveNote() {
    if (!draft.body.trim()) return
    let updated
    if (editingId) {
      updated = notes.map(n => n.id === editingId ? { ...n, ...draft, updatedAt: new Date().toISOString() } : n)
    } else {
      const newNote = { id: Date.now().toString(), ...draft, createdAt: new Date().toISOString() }
      updated = [newNote, ...notes]
    }
    saveNotes(updated)
    setNotes(updated)
    setComposing(false)
    setEditingId(null)
  }

  function deleteNote(id) {
    const updated = notes.filter(n => n.id !== id)
    saveNotes(updated)
    setNotes(updated)
  }

  function cancelCompose() {
    setComposing(false)
    setEditingId(null)
  }

  const cat = (id) => CATEGORIES.find(c => c.id === id) ?? CATEGORIES[3]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-slate-100 px-4 pt-safe-10 pb-10">
      <div className="max-w-md mx-auto">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">← Back</button>

        <div className="flex items-end justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Study Notes</h1>
            <p className="text-sm text-gray-500 mt-0.5">{notes.length} note{notes.length !== 1 ? 's' : ''} · your personal SAT cheat sheet</p>
          </div>
          <button
            onClick={startNew}
            className="bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-md"
          >
            + New
          </button>
        </div>

        {/* Compose / Edit */}
        {composing && (
          <div className="bg-white rounded-2xl border-2 border-indigo-200 p-5 mb-5 shadow-lg">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-3">{editingId ? 'Edit Note' : 'New Note'}</p>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setDraft(d => ({ ...d, category: c.id }))}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${draft.category === c.id ? `${c.color} text-white border-transparent shadow` : `${c.bg} ${c.text} ${c.border}`}`}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
              placeholder="Title (optional)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-800"
            />
            <textarea
              value={draft.body}
              onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
              placeholder="Write your note… formulas, tips, things to remember"
              rows={5}
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-800"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={saveNote}
                disabled={!draft.body.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {editingId ? 'Save changes' : 'Save note'}
              </button>
              <button onClick={cancelCompose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {notes.length > 3 && (
          <div className="mb-4 space-y-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search notes…"
              className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-700"
            />
            <div className="flex gap-1.5 flex-wrap">
              {[{ id: 'all', label: 'All', icon: '📋' }, ...CATEGORIES].map(c => (
                <button
                  key={c.id}
                  onClick={() => setFilter(c.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filter === c.id ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {visible.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            {notes.length === 0 ? (
              <>
                <p className="text-4xl mb-3">📝</p>
                <p className="font-black text-gray-700 mb-1">Your notes start here</p>
                <p className="text-sm text-gray-400 mb-4">Write down formulas, tips, and anything you want to remember.</p>
                <button onClick={startNew} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-xl px-4 py-2 hover:bg-indigo-50 transition-colors">
                  Create first note →
                </button>
              </>
            ) : (
              <>
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm text-gray-400">No notes match your filter.</p>
              </>
            )}
          </div>
        )}

        <div className="space-y-3">
          {visible.map(note => {
            const c = cat(note.category)
            const dateStr = new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            return (
              <div key={note.id} className={`bg-white rounded-2xl border ${c.border} p-4`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text} shrink-0`}>
                      {c.icon} {c.label}
                    </span>
                    {note.title && <p className="text-sm font-bold text-gray-800 truncate">{note.title}</p>}
                  </div>
                  <span className="text-[10px] text-gray-300 shrink-0">{dateStr}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{note.body}</p>
                <div className="flex gap-3 mt-3 pt-2 border-t border-gray-50">
                  <button onClick={() => startEdit(note)} className="text-xs text-indigo-400 hover:text-indigo-600 font-medium transition-colors">
                    ✏️ Edit
                  </button>
                  <button onClick={() => deleteNote(note.id)} className="text-xs text-rose-300 hover:text-rose-500 font-medium transition-colors ml-auto">
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {notes.length >= 5 && (
          <p className="text-center text-xs text-gray-300 mt-6">{notes.length} notes saved · keep building your cheat sheet!</p>
        )}
      </div>
    </div>
  )
}
