// Single source of truth for SAT subject → domain → skill hierarchy.
// IDs here are used as foreign keys in questions.js.

export const TAXONOMY = [
  {
    id: 'math',
    label: 'Math',
    icon: '∑',
    description: 'Algebra, geometry, data analysis & more',
    domains: [
      {
        id: 'algebra',
        label: 'Algebra',
        description: 'Linear equations, inequalities, systems',
        skills: [
          { id: 'linear-equations-one-variable',   label: 'Linear Equations in One Variable' },
          { id: 'linear-equations-two-variables',  label: 'Linear Equations in Two Variables' },
          { id: 'linear-functions',                label: 'Linear Functions' },
          { id: 'systems-two-linear-equations',    label: 'Systems of Two Linear Equations' },
          { id: 'linear-inequalities',             label: 'Linear Inequalities' },
        ],
      },
      {
        id: 'advanced-math',
        label: 'Advanced Math',
        description: 'Quadratics, polynomials, functions',
        skills: [
          { id: 'equivalent-expressions',          label: 'Equivalent Expressions' },
          { id: 'nonlinear-equations',             label: 'Nonlinear Equations & Systems' },
          { id: 'nonlinear-functions',             label: 'Nonlinear Functions' },
        ],
      },
      {
        id: 'problem-solving-data',
        label: 'Problem Solving & Data',
        description: 'Statistics, ratios, percentages',
        skills: [
          { id: 'ratios-rates-proportions',        label: 'Ratios, Rates & Proportions' },
          { id: 'percentages',                     label: 'Percentages' },
          { id: 'one-variable-data',               label: 'One-Variable Data & Statistics' },
          { id: 'two-variable-data',               label: 'Two-Variable Data & Scatterplots' },
          { id: 'probability',                     label: 'Probability & Conditional Probability' },
          { id: 'statistical-inference',           label: 'Statistical Inference' },
        ],
      },
      {
        id: 'geometry-trig',
        label: 'Geometry & Trig',
        description: 'Triangles, circles, sine & cosine',
        skills: [
          { id: 'area-volume',                     label: 'Area and Volume' },
          { id: 'lines-angles-triangles',          label: 'Lines, Angles & Triangles' },
          { id: 'right-triangles-trig',            label: 'Right Triangles & Trigonometry' },
          { id: 'circles',                         label: 'Circles' },
        ],
      },
    ],
  },
  {
    id: 'english',
    label: 'English',
    icon: 'Aa',
    description: 'Reading, writing, grammar & rhetoric',
    domains: [
      {
        id: 'information-ideas',
        label: 'Information & Ideas',
        description: 'Central ideas, details, inferences',
        skills: [
          { id: 'central-ideas-details',           label: 'Central Ideas and Details' },
          { id: 'command-of-evidence',             label: 'Command of Evidence' },
          { id: 'inferences',                      label: 'Inferences' },
        ],
      },
      {
        id: 'craft-structure',
        label: 'Craft & Structure',
        description: 'Words in context, text structure',
        skills: [
          { id: 'words-in-context',                label: 'Words in Context' },
          { id: 'text-structure-purpose',          label: 'Text Structure and Purpose' },
          { id: 'cross-text-connections',          label: 'Cross-Text Connections' },
        ],
      },
      {
        id: 'expression-ideas',
        label: 'Expression of Ideas',
        description: 'Transitions, rhetorical synthesis',
        skills: [
          { id: 'rhetorical-synthesis',            label: 'Rhetorical Synthesis' },
          { id: 'transitions',                     label: 'Transitions' },
        ],
      },
      {
        id: 'conventions',
        label: 'Standard English',
        description: 'Grammar, punctuation, usage',
        skills: [
          { id: 'boundaries',                      label: 'Boundaries' },
          { id: 'form-structure-sense',            label: 'Form, Structure, and Sense' },
        ],
      },
    ],
  },
]

export const MATH_DOMAIN_IDS = TAXONOMY.find(s => s.id === 'math').domains.map(d => d.id)
export const ENG_DOMAIN_IDS  = TAXONOMY.find(s => s.id === 'english').domains.map(d => d.id)

// Flat lookup helpers
export const domainById = Object.fromEntries(
  TAXONOMY.flatMap(s => s.domains).map(d => [d.id, d])
)

export const skillById = Object.fromEntries(
  TAXONOMY.flatMap(s => s.domains).flatMap(d => d.skills).map(sk => [sk.id, sk])
)
