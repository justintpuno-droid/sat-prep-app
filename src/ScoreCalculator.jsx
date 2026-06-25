import { useState, useMemo } from 'react'

// Approximate Digital SAT conversion tables (2024 format)
// RW: 54 questions → 200–800 scaled
// Math: 44 questions → 200–800 scaled
const RW_TABLE = [
  200, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, // 0–10
  300, 310, 320, 330, 340, 350, 360, 370, 380, 390,       // 11–20
  400, 410, 420, 430, 440, 450, 460, 470, 480, 490,       // 21–30
  500, 510, 520, 530, 540, 550, 560, 570, 580, 590,       // 31–40
  600, 620, 640, 660, 680, 700, 720, 740, 760, 780, 800, 800, 800, 800, // 41–54
]
const MATH_TABLE = [
  200, 200, 210, 220, 230, 240, 250, 260, 270, 280,       // 0–9
  290, 300, 310, 320, 330, 340, 360, 380, 400, 420,       // 10–19
  440, 460, 480, 500, 520, 540, 560, 580, 600, 620,       // 20–29
  640, 660, 680, 700, 720, 740, 760, 780, 800, 800, 800, 800, 800, 800, 800, // 30–44
]

const PERCENTILE = [
  [1600,99],[1550,99],[1500,98],[1450,96],[1400,94],[1350,91],[1300,87],
  [1250,82],[1200,74],[1150,66],[1100,58],[1050,49],[1000,40],[950,32],
  [900,25],[850,18],[800,12],[750,8],[700,5],[650,3],[600,1],
]
function getPercentile(total) {
  for (const [score, pct] of PERCENTILE) {
    if (total >= score) return pct
  }
  return 1
}

function ScaleBar({ value, max = 800, min = 200, color = 'bg-indigo-500' }) {
  const pct = Math.round(((value - min) / (max - min)) * 100)
  return (
    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function ScoreCalculator({ onBack }) {
  const [rwRaw, setRwRaw] = useState(27)
  const [mathRaw, setMathRaw] = useState(22)

  const rwScaled  = RW_TABLE[Math.min(rwRaw, RW_TABLE.length - 1)]
  const mathScaled = MATH_TABLE[Math.min(mathRaw, MATH_TABLE.length - 1)]
  const total = rwScaled + mathScaled
  const percentile = getPercentile(total)

  const goal = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('sat_prep_goal') ?? 'null')?.target ?? null } catch { return null }
  }, [])

  const tierLabel = total >= 1500 ? 'Elite' : total >= 1400 ? 'Highly Selective' : total >= 1250 ? 'Selective' : total >= 1100 ? 'State Flagship' : total >= 900 ? 'Regional' : 'Community College'
  const tierColor = total >= 1500 ? 'text-amber-600' : total >= 1400 ? 'text-violet-600' : total >= 1250 ? 'text-indigo-600' : total >= 1100 ? 'text-teal-600' : total >= 900 ? 'text-blue-500' : 'text-gray-500'

  function InputRow({ label, max, value, onChange }) {
    return (
      <div className="bg-gray-50 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-700">{label}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onChange(Math.max(0, value - 1))}
              className="w-8 h-8 rounded-xl border-2 border-gray-200 bg-white text-gray-600 text-lg font-bold hover:bg-gray-100 transition-colors flex items-center justify-center"
            >−</button>
            <span className="text-lg font-black text-gray-900 w-12 text-center tabular-nums">{value}<span className="text-sm font-normal text-gray-400">/{max}</span></span>
            <button
              onClick={() => onChange(Math.min(max, value + 1))}
              className="w-8 h-8 rounded-xl border-2 border-gray-200 bg-white text-gray-600 text-lg font-bold hover:bg-gray-100 transition-colors flex items-center justify-center"
            >+</button>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={max}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 px-4 pt-safe-8 pb-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition-colors shrink-0">← Back</button>
          <div>
            <h1 className="text-lg font-black text-gray-900">SAT Score Calculator</h1>
            <p className="text-xs text-gray-400">Enter your raw score to see your scaled 1600 score</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">How many did you get correct?</p>
          <div className="space-y-4">
            <InputRow label="Reading & Writing (54 total)" max={54} value={rwRaw} onChange={setRwRaw} />
            <InputRow label="Math (44 total)" max={44} value={mathRaw} onChange={setMathRaw} />
          </div>
        </div>

        {/* Result card */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 mb-4 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Estimated Total Score</p>
          <p className="text-5xl font-black leading-none mb-1">{total}</p>
          <p className="text-white/60 text-xs mb-4">out of 1600 · {percentile}th percentile nationally</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{rwScaled}</p>
              <p className="text-white/60 text-xs">Reading & Writing</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">{mathScaled}</p>
              <p className="text-white/60 text-xs">Math</p>
            </div>
          </div>
        </div>

        {/* Section breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Section Breakdown</p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700">Reading & Writing</span>
                <span className="font-bold text-indigo-600">{rwScaled}/800</span>
              </div>
              <ScaleBar value={rwScaled} color="bg-indigo-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700">Math</span>
                <span className="font-bold text-violet-600">{mathScaled}/800</span>
              </div>
              <ScaleBar value={mathScaled} color="bg-violet-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700">Total</span>
                <span className="font-bold text-gray-800">{total}/1600</span>
              </div>
              <ScaleBar value={total} max={1600} min={400} color="bg-gradient-to-r from-indigo-500 to-violet-500" />
            </div>
          </div>
        </div>

        {/* Goal comparison + college tier */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Context</p>
          <div className="space-y-2">
            {goal && (
              <div className={`flex items-center gap-3 rounded-xl p-3 ${total >= goal ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                <span className="text-xl">{total >= goal ? '✅' : '📈'}</span>
                <div>
                  <p className={`text-sm font-bold ${total >= goal ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {total >= goal ? `You hit your goal (${goal})!` : `${goal - total} pts below your goal (${goal})`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {total >= goal ? 'Keep this up on test day.' : `Focus on your weaker section to close the gap.`}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <span className="text-xl">🏛️</span>
              <div>
                <p className={`text-sm font-bold ${tierColor}`}>{tierLabel} range</p>
                <p className="text-xs text-gray-500">Top {100 - percentile + 1}% of test takers nationally</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-2">Approximate conversions based on 2024 Digital SAT data · actual curves vary</p>
      </div>
    </div>
  )
}
