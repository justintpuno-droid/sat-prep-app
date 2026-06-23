import { useState } from 'react'
import { loadHistory, clearHistory, updateSessionName, deleteSessions } from './utils/history'
import { formatTime, pct } from './utils/index'
import { domainById } from './data/taxonomy'

function scoreColor(p) {
  if (p >= 80) return 'text-emerald-600'
  if (p >= 60) return 'text-amber-600'
  return 'text-rose-500'
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function getDomainNames(session) {
  const ids = [...new Set(session.questions.map(q => q.domain))]
  return ids.map(id => domainById[id]?.label ?? id).join(', ')
}

function HistoryCard({ session, deleteMode, selected, onToggleSelect, onRename, onReview }) {
  const [expanded, setExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const modeColor = session.mode === 'learning' ? 'bg-indigo-100 text-indigo-700' : 'bg-violet-100 text-violet-700'

  function startEdit(e) {
    e.stopPropagation()
    setEditName(session.sessionName || '')
    setIsEditing(true)
  }

  function saveEdit(e) {
    e?.stopPropagation()
    onRename(session.id, editName.trim() || null)
    setIsEditing(false)
  }

  function cancelEdit(e) {
    e?.stopPropagation()
    setIsEditing(false)
  }

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden transition-colors ${selected ? 'border-indigo-400' : 'border-gray-200'}`}>
      <div className="flex">
        {/* Checkbox in delete mode */}
        {deleteMode && (
          <div
            onClick={onToggleSelect}
            className="flex items-center px-4 cursor-pointer border-r border-gray-100 hover:bg-gray-50 shrink-0"
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
              {selected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Card body */}
        <div
          onClick={deleteMode ? onToggleSelect : (isEditing ? undefined : () => setExpanded(e => !e))}
          className={`flex-1 min-w-0 px-5 py-4 ${!deleteMode && !isEditing ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${modeColor}`}>{session.formatLabel}</span>
              </div>

              {/* Name area */}
              {!deleteMode && (
                isEditing ? (
                  <div className="flex items-center gap-1.5 mb-1" onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value.slice(0, 60))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      placeholder="Session name..."
                      className="flex-1 min-w-0 text-sm border border-indigo-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button onClick={saveEdit} className="shrink-0 text-xs text-indigo-600 font-semibold hover:text-indigo-800">Save</button>
                    <button onClick={cancelEdit} className="shrink-0 text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mb-0.5 group" onClick={e => e.stopPropagation()}>
                    {session.sessionName ? (
                      <>
                        <p className="text-sm font-semibold text-gray-700">{session.sessionName}</p>
                        <button
                          onClick={startEdit}
                          className="opacity-0 group-hover:opacity-100 text-xs text-gray-300 hover:text-indigo-400 transition-all ml-1"
                        >
                          ✏
                        </button>
                      </>
                    ) : (
                      <button onClick={startEdit} className="text-xs text-gray-300 hover:text-indigo-400 transition-colors">
                        + Add name
                      </button>
                    )}
                  </div>
                )
              )}

              {/* Name (read-only in delete mode) */}
              {deleteMode && session.sessionName && (
                <p className="text-sm font-semibold text-gray-700 mb-0.5">{session.sessionName}</p>
              )}

              <p className="text-xs text-gray-400">{formatDate(session.completedAt)}</p>
            </div>

            <div className="text-right shrink-0">
              <p className={`text-xl font-black ${scoreColor(session.score.percent)}`}>{session.score.percent}%</p>
              <p className="text-xs text-gray-400">{session.score.correct}/{session.score.total} · {formatTime(session.elapsedSeconds)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 truncate">{getDomainNames(session)}</p>
        </div>

        {/* Expand indicator (normal mode only) */}
        {!deleteMode && (
          <div className="flex items-center pr-4 pointer-events-none">
            <span className="text-gray-300 text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        )}
      </div>

      {/* Expanded domain breakdown */}
      {expanded && !deleteMode && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-2">
          {Object.entries(session.score.byDomain).map(([id, stats]) => {
            const p = pct(stats.correct, stats.total)
            return (
              <div key={id} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-36 shrink-0 truncate">{domainById[id]?.label ?? id}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${p >= 80 ? 'bg-emerald-500' : p >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${p}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-10 text-right shrink-0">{p}%</span>
              </div>
            )
          })}
          {onReview && (
            <div className="pt-2">
              <button
                onClick={() => onReview(session)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Review questions →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SessionHistory({ onBack, onNewSession, onAnalytics, onReview }) {
  const [sessions, setSessions] = useState(() => loadHistory())
  const [confirmClear, setConfirmClear] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleSelectAll() {
    if (selectedIds.size === sessions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sessions.map(s => s.id)))
    }
  }

  function exitDeleteMode() {
    setDeleteMode(false)
    setSelectedIds(new Set())
  }

  function handleDeleteSelected() {
    const updated = deleteSessions([...selectedIds])
    if (updated !== null) setSessions(updated)
    exitDeleteMode()
  }

  function handleClearAll() {
    clearHistory()
    setSessions([])
    setConfirmClear(false)
  }

  function handleRename(id, name) {
    const updated = updateSessionName(id, name)
    if (updated !== null) setSessions(updated)
  }

  const allSelected = sessions.length > 0 && selectedIds.size === sessions.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 px-4 py-10">
      <div className="max-w-2xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            {!deleteMode && (
              <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-700 transition-colors mb-2 flex items-center gap-1">
                ← Back
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900">Session History</h1>
          </div>

          <div className="flex gap-2">
            {!deleteMode && onAnalytics && (
              <button
                onClick={onAnalytics}
                className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-1.5 transition-colors font-medium"
              >
                Analytics
              </button>
            )}
            {sessions.length > 0 && !deleteMode && (
              <>
                <button
                  onClick={() => setDeleteMode(true)}
                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 bg-white rounded-lg px-3 py-1.5 transition-colors"
                >
                  Select
                </button>
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-xs text-rose-400 hover:text-rose-600 border border-rose-200 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Clear All
                </button>
              </>
            )}
            {deleteMode && (
              <>
                <button
                  onClick={exitDeleteMode}
                  className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 bg-white rounded-lg px-3 py-1.5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0}
                  className={`text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors ${
                    selectedIds.size > 0
                      ? 'bg-rose-500 hover:bg-rose-600 text-white'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Select all / count row in delete mode */}
        {deleteMode && sessions.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              onClick={handleSelectAll}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500 mb-6">No sessions yet. Complete your first study session to see it here.</p>
            <button onClick={onNewSession} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
              Start a Session →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <HistoryCard
                key={s.id}
                session={s}
                deleteMode={deleteMode}
                selected={selectedIds.has(s.id)}
                onToggleSelect={() => toggleSelect(s.id)}
                onRename={handleRename}
                onReview={onReview}
              />
            ))}
          </div>
        )}

      </div>

      {/* Clear all confirmation */}
      {confirmClear && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Clear all history?</h3>
            <p className="text-gray-500 text-sm mb-5">
              This will permanently delete {sessions.length} session{sessions.length !== 1 ? 's' : ''}. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmClear(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-sm font-medium text-white transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
