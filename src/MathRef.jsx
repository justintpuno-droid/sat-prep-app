import { useState, useMemo } from 'react'

const FORMULAS = [
  {
    category: 'Algebra',
    color: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200',
    items: [
      { title: 'Slope of a line', formula: 'm = (y₂ − y₁) / (x₂ − x₁)', tip: 'Rise over run. Positive = goes up left to right. Slope of horizontal line = 0, vertical line = undefined.' },
      { title: 'Slope-intercept form', formula: 'y = mx + b', tip: 'm = slope, b = y-intercept (where line crosses y-axis). Use this form to graph quickly.' },
      { title: 'Standard form of a line', formula: 'Ax + By = C', tip: 'SAT often gives lines in standard form. Rewrite as y = mx + b to find slope: m = −A/B.' },
      { title: 'Quadratic formula', formula: 'x = [−b ± √(b² − 4ac)] / 2a', tip: 'Use when ax² + bx + c = 0. Discriminant (b²−4ac): >0 → 2 real roots, =0 → 1 root, <0 → no real roots.' },
      { title: 'FOIL (expanding binomials)', formula: '(a+b)(c+d) = ac + ad + bc + bd', tip: 'First, Outer, Inner, Last. Special case: (a+b)² = a² + 2ab + b².' },
      { title: 'Difference of squares', formula: 'a² − b² = (a+b)(a−b)', tip: 'Memorize this. The SAT loves asking you to factor expressions that look like x² − 9 → (x+3)(x−3).' },
      { title: 'Vertex form of a parabola', formula: 'y = a(x − h)² + k', tip: 'Vertex = (h, k). If a > 0, parabola opens up; a < 0, opens down. SAT may give this form directly.' },
      { title: 'Systems of equations — substitution', formula: 'Solve one equation for a variable, plug into the other.', tip: 'Works best when one variable is already isolated. Check your answer in BOTH equations.' },
      { title: 'Percent change', formula: '% change = (new − old) / old × 100', tip: 'Positive = increase, negative = decrease. SAT often hides this in word problems.' },
    ],
  },
  {
    category: 'Geometry',
    color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
    items: [
      { title: 'Area of a triangle', formula: 'A = ½ × base × height', tip: 'Height must be perpendicular to the base. For a right triangle: legs are base and height.' },
      { title: 'Pythagorean theorem', formula: 'a² + b² = c² (c = hypotenuse)', tip: 'Common triples: 3-4-5, 5-12-13, 8-15-17. Multiplies also work: 6-8-10, 9-12-15.' },
      { title: 'Area of a circle', formula: 'A = πr²', tip: 'r = radius. The SAT gives π ≈ 3.14159 if needed, but most answers leave it as π.' },
      { title: 'Circumference of a circle', formula: 'C = 2πr = πd', tip: 'd = diameter = 2r. Arc length = (central angle / 360) × 2πr.' },
      { title: 'Area of a sector', formula: 'A = (θ/360) × πr²', tip: 'θ = central angle in degrees. For radians: A = ½r²θ.' },
      { title: 'Volume of a rectangular prism', formula: 'V = l × w × h', tip: 'Also: V = Area of base × height. SAT gives this formula in the reference sheet.' },
      { title: 'Volume of a cylinder', formula: 'V = πr²h', tip: 'Provided in the SAT reference. r = radius, h = height.' },
      { title: 'Special right triangles', formula: '30-60-90: sides x, x√3, 2x | 45-45-90: x, x, x√2', tip: 'Memorize these! SAT gives them in the reference sheet but knowing them instantly saves time.' },
      { title: 'Parallel lines cut by a transversal', formula: 'Alternate interior angles = equal | Co-interior angles = 180°', tip: 'Corresponding angles (same position) are equal. Vertical angles are equal.' },
    ],
  },
  {
    category: 'Statistics & Data',
    color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
    items: [
      { title: 'Mean (average)', formula: 'Mean = sum of values / count', tip: 'The SAT likes to give you the mean and ask for a missing value. Work backwards: sum = mean × count.' },
      { title: 'Median', formula: 'Middle value when ordered. If even: average of two middle values.', tip: 'The median is not affected by outliers; the mean is. SAT tests when to use which.' },
      { title: 'Mode', formula: 'Most frequently occurring value', tip: 'A set can have no mode, one mode, or multiple modes. "Bimodal" = two modes.' },
      { title: 'Range', formula: 'Range = max − min', tip: 'Measures spread. Not affected by values in the middle, only the extremes.' },
      { title: 'Standard deviation', formula: 'Measures spread around the mean. Larger SD = more spread out.', tip: 'SAT will ask whether SD increases or decreases when values are added or removed.' },
      { title: 'Scatterplot line of best fit', formula: 'Use slope and y-intercept to write y = mx + b for the trend.', tip: 'Read the graph carefully. SAT often asks what the y-intercept means in context.' },
      { title: 'Probability basics', formula: 'P(event) = favorable outcomes / total outcomes', tip: 'P(A and B) = P(A) × P(B) if independent. P(A or B) = P(A) + P(B) − P(A and B).' },
    ],
  },
  {
    category: 'Functions & Graphs',
    color: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200',
    items: [
      { title: 'Function notation', formula: 'f(x) means "output when input is x"', tip: 'f(3) = plug 3 in for every x. Composite: f(g(x)) = apply g first, then f.' },
      { title: 'Transformations of f(x)', formula: 'f(x)+k → up k | f(x+h) → left h | af(x) → stretch vertically', tip: 'Inside the function: horizontal changes (opposite direction). Outside: vertical, same direction.' },
      { title: 'Domain and range', formula: 'Domain = valid inputs (x). Range = valid outputs (y).', tip: 'Watch for: division by zero (excluded from domain), square root of negatives (excluded), vertical asymptotes.' },
      { title: 'Linear vs. exponential growth', formula: 'Linear: y = mx + b (constant rate) | Exponential: y = abˣ (percent rate)', tip: 'Linear adds the same amount each time. Exponential multiplies by the same factor. SAT tests which model fits.' },
      { title: 'Zero product property', formula: 'If ab = 0, then a = 0 or b = 0', tip: 'Factor the quadratic first, then set each factor to 0. Solutions = x-intercepts of the parabola.' },
    ],
  },
  {
    category: 'Ratios & Word Problems',
    color: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200',
    items: [
      { title: 'Unit rate / proportions', formula: 'a/b = c/d → a×d = b×c (cross-multiply)', tip: 'Use proportions for scaling problems. Make sure units match across the proportion.' },
      { title: 'Distance = Rate × Time', formula: 'd = r × t', tip: 'For two objects: set up two d=rt equations. If meeting: d₁ + d₂ = total distance.' },
      { title: 'Compound interest', formula: 'A = P(1 + r/n)^(nt)', tip: 'P = principal, r = rate (decimal), n = compounds per year, t = years. SAT usually gives annual compounding (n=1).' },
      { title: 'Mixture / weighted average', formula: 'Total value = (amount₁ × value₁) + (amount₂ × value₂)', tip: 'Great for "two solutions mixed together" or "average score from two groups" problems.' },
      { title: 'Direct vs. inverse variation', formula: 'Direct: y = kx | Inverse: y = k/x', tip: '"y varies directly with x" → they grow together. "Inversely" → one goes up, other goes down.' },
      { title: 'Absolute value equations', formula: '|ax + b| = c → ax + b = c  OR  ax + b = −c', tip: 'Set up two equations by removing the absolute value. One gives a positive solution, one gives negative. Check both in the original.' },
      { title: 'Exponent rules', formula: 'xᵃ × xᵇ = xᵃ⁺ᵇ | xᵃ / xᵇ = xᵃ⁻ᵇ | (xᵃ)ᵇ = xᵃᵇ | x⁰ = 1 | x⁻ᵃ = 1/xᵃ', tip: 'Multiply → add exponents. Divide → subtract. Power of power → multiply. SAT frequently tests these with radicals: x^(1/2) = √x.' },
      { title: 'Systems — no solution vs. infinite solutions', formula: 'No solution: same slope, different y-intercepts (parallel lines). Infinite: identical lines (same slope AND same intercept).', tip: 'Rewrite both equations in y = mx + b form. If slopes match but intercepts differ → no solution. If both equations simplify to the same line → infinitely many solutions.' },
      { title: 'Remainder theorem', formula: 'If p(x) is divided by (x − c), the remainder = p(c)', tip: 'To find the remainder when x³ − 2x + 1 is divided by (x − 3), just evaluate: p(3) = 27 − 6 + 1 = 22. If p(c) = 0, then (x − c) is a factor.' },
      { title: 'Rational expression simplification', formula: '(a² − b²) / (a − b) = a + b (difference of squares factoring)', tip: 'Always try to factor numerator and denominator first, then cancel common factors. Never cancel across addition/subtraction — only multiplication.' },
      { title: 'Vertex form of a parabola', formula: 'f(x) = a(x − h)² + k; vertex = (h, k)', tip: 'Vertex form directly gives you the vertex (h, k). If a < 0, parabola opens down (max). If a > 0, opens up (min). SAT often asks: "for what value of x is f(x) maximum/minimum?"' },
      { title: 'Sum of angles in polygon', formula: 'Sum of interior angles = (n − 2) × 180°', tip: 'Triangle: 180°. Quadrilateral: 360°. Pentagon: 540°. Hexagon: 720°. Each interior angle of a regular polygon = (n−2)×180°/n.' },
      { title: 'Conditional probability', formula: 'P(A|B) = P(A and B) / P(B)', tip: 'Read as "the probability of A given B." For a two-way table: find the cell that matches both conditions, divide by the row or column total of the given condition.' },
      { title: 'Negative and fractional exponents', formula: 'x^(−n) = 1/xⁿ; x^(m/n) = ⁿ√(xᵐ) = (ⁿ√x)ᵐ', tip: 'x^(1/2) = √x. x^(1/3) = ∛x. x^(2/3) = (∛x)². Negative exponents flip to denominator — they do NOT make the answer negative.' },
    ],
  },
]

export default function MathRef({ onBack }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const allItems = useMemo(() =>
    FORMULAS.flatMap(cat => cat.items.map(r => ({ ...r, category: cat.category, bg: cat.bg, text: cat.text, border: cat.border }))),
    [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allItems.filter(r => {
      const matchesSearch = !q || r.title.toLowerCase().includes(q) || r.formula.toLowerCase().includes(q) || r.tip.toLowerCase().includes(q)
      const matchesCat = activeCategory === 'all' || r.category === activeCategory
      return matchesSearch && matchesCat
    })
  }, [allItems, search, activeCategory])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100 px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 transition-colors shrink-0">← Back</button>
          <div>
            <h1 className="text-lg font-black text-gray-900">Math Formula Sheet</h1>
            <p className="text-xs text-gray-400">Key formulas and concepts for SAT Math</p>
          </div>
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search formulas…"
          className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-700"
        />

        <div className="flex gap-1.5 flex-wrap mb-4">
          {[{ id: 'all', label: 'All' }, ...FORMULAS.map(c => ({ id: c.category, label: c.category }))].map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${activeCategory === c.id ? 'bg-gray-800 text-white border-transparent' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 mb-3">{filtered.length} formula{filtered.length !== 1 ? 's' : ''} · tap to expand</p>

        <div className="space-y-2">
          {filtered.map((item, i) => {
            const key = item.category + item.title
            const isOpen = expanded === key
            return (
              <button
                key={i}
                onClick={() => setExpanded(isOpen ? null : key)}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${isOpen ? `${item.bg} ${item.border}` : 'bg-white border-gray-100 hover:border-gray-200'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${item.bg} ${item.text}`}>{item.category}</span>
                    <p className={`text-sm font-bold leading-snug ${isOpen ? item.text : 'text-gray-800'}`}>{item.title}</p>
                  </div>
                  <span className="text-gray-400 text-xs shrink-0 mt-1">{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && (
                  <div className="mt-3 space-y-2.5">
                    <div className={`rounded-xl p-3 ${item.bg} border ${item.border}`}>
                      <p className={`text-[10px] font-bold ${item.text} uppercase tracking-widest mb-1.5`}>Formula</p>
                      <p className="text-base font-bold text-gray-800 font-mono leading-relaxed">{item.formula}</p>
                    </div>
                    <div className="rounded-xl p-3 bg-gray-50 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">💡 SAT Tip</p>
                      <p className="text-sm text-gray-600 leading-snug">{item.tip}</p>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">{allItems.length} formulas total · the SAT provides some — knowing all saves time</p>
      </div>
    </div>
  )
}
