// Shared between LearningSession (showFeedback=true after answer) and QuizSession (showFeedback=false)
export default function QuestionCard({ question, selectedAnswer, onSelect, showFeedback = false }) {
  function optionStyle(id) {
    if (!showFeedback) {
      if (selectedAnswer === id) return 'border-indigo-500 bg-indigo-50 text-indigo-900'
      return 'border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:bg-gray-50 cursor-pointer'
    }
    if (id === question.answer) return 'border-emerald-500 bg-emerald-50 text-emerald-800'
    if (selectedAnswer === id) return 'border-rose-400 bg-rose-50 text-rose-700'
    return 'border-gray-200 bg-white text-gray-400'
  }

  function optionIcon(id) {
    if (!showFeedback || !selectedAnswer) return null
    if (id === question.answer) return <span className="shrink-0 text-emerald-500 font-bold text-sm">✓</span>
    if (selectedAnswer === id) return <span className="shrink-0 text-rose-400 font-bold text-sm">✗</span>
    return null
  }

  return (
    <div>
      {question.stimulus && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {question.stimulus}
        </div>
      )}
      <p className="text-gray-900 font-medium text-base leading-relaxed mb-4 whitespace-pre-line">
        {question.question}
      </p>
      <div className="space-y-2">
        {(question.options || []).map(opt => (
          <button
            key={opt.id}
            onClick={() => !showFeedback && onSelect?.(opt.id)}
            disabled={showFeedback}
            className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all duration-100 flex items-start gap-3 ${optionStyle(opt.id)}`}
          >
            <span className="font-bold text-sm shrink-0 w-5 mt-0.5">{opt.id}</span>
            <span className="text-sm leading-relaxed flex-1">{opt.text}</span>
            {optionIcon(opt.id)}
          </button>
        ))}
      </div>
    </div>
  )
}
