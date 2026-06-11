import { rgb, type RGB } from 'npm:pdf-lib@1.17.1'

export type PdfAnswerRow = {
  category: string
  question: string
  question_type: string
  sort_order: number
  score: number | null
  text_answer: string | null
}

export const PAGE_W = 595.28
export const PAGE_H = 841.89
export const M = 48
export const CONTENT_W = PAGE_W - M * 2
export const FOOTER_RESERVE = 56
export const COVER_BAND_H = 120
export const RUNNING_HEADER_H = 28

export const CATEGORY_ORDER = [
  'Code Quality & Technical Standards',
  'Delivery & Reliability',
  'Collaboration & Communication',
] as const

export const SCALE_LEGEND = [
  { value: 1, label: 'Lacking', band: 'poor' as const },
  { value: 2, label: 'Below', band: 'average' as const },
  { value: 3, label: 'Meets', band: 'good' as const },
  { value: 4, label: 'Strong', band: 'excellent' as const },
  { value: 5, label: 'Exemplary', band: 'excellent' as const },
]

export type ScoreBand = 'excellent' | 'good' | 'average' | 'poor'

export const C = {
  background: rgb(0.969, 0.965, 0.949),
  foreground: rgb(0.039, 0.039, 0.039),
  card: rgb(0.953, 0.949, 0.929),
  muted: rgb(0.42, 0.42, 0.42),
  border: rgb(0.839, 0.831, 0.8),
  accent: rgb(0.114, 0.604, 0.424),
  white: rgb(1, 1, 1),
  success: rgb(0.133, 0.773, 0.369),
  warning: rgb(0.961, 0.62, 0.043),
  destructive: rgb(0.863, 0.149, 0.149),
  gridLine: rgb(0.91, 0.91, 0.898),
  whiteMuted: rgb(0.75, 0.75, 0.75),
} as const

export function bandForScore(score: number): ScoreBand {
  if (score >= 4) return 'excellent'
  if (score >= 3) return 'good'
  if (score >= 2) return 'average'
  return 'poor'
}

export function bandForAverage(avg: number): ScoreBand {
  if (avg >= 4.0) return 'excellent'
  if (avg >= 3.0) return 'good'
  if (avg >= 2.0) return 'average'
  return 'poor'
}

export function bandColor(band: ScoreBand): RGB {
  switch (band) {
    case 'excellent': return C.success
    case 'good': return C.foreground
    case 'average': return C.warning
    case 'poor': return C.destructive
  }
}

export function labelForScore(score: number): string {
  const n = Math.round(score)
  if (n >= 5) return 'Exemplary'
  if (n >= 4) return 'Strong'
  if (n >= 3) return 'Meets'
  if (n >= 2) return 'Below'
  return 'Lacking'
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export function groupAnswersByCategory(answers: PdfAnswerRow[]): Map<string, PdfAnswerRow[]> {
  const map = new Map<string, PdfAnswerRow[]>()
  for (const row of answers) {
    const list = map.get(row.category) ?? []
    list.push(row)
    map.set(row.category, list)
  }
  for (const [, rows] of map) {
    rows.sort((a, b) => a.sort_order - b.sort_order)
  }
  return map
}

export function orderedCategories(map: Map<string, PdfAnswerRow[]>): string[] {
  const ordered: string[] = []
  for (const cat of CATEGORY_ORDER) {
    if (map.has(cat)) ordered.push(cat)
  }
  for (const cat of map.keys()) {
    if (!ordered.includes(cat)) ordered.push(cat)
  }
  return ordered
}

export function computeOverallAverage(answers: PdfAnswerRow[]): number | null {
  const scored = answers.filter((a) => a.question_type === 'scored' && a.score != null)
  if (!scored.length) return null
  return scored.reduce((s, a) => s + (a.score ?? 0), 0) / scored.length
}

export function computeCategoryAverage(rows: PdfAnswerRow[]): number | null {
  const scored = rows.filter((r) => r.question_type === 'scored' && r.score != null)
  if (!scored.length) return null
  return scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length
}
