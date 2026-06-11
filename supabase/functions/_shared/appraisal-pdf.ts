import {
  PDFDocument,
  PDFImage,
  PDFPage,
  type PDFFont,
  type RGB,
} from 'npm:pdf-lib@1.17.1'

import {
  C,
  CONTENT_W,
  COVER_BAND_H,
  FOOTER_RESERVE,
  M,
  PAGE_H,
  PAGE_W,
  RUNNING_HEADER_H,
  SCALE_LEGEND,
  bandColor,
  bandForAverage,
  bandForScore,
  computeCategoryAverage,
  computeOverallAverage,
  groupAnswersByCategory,
  labelForScore,
  orderedCategories,
  slugify,
  type PdfAnswerRow,
} from './appraisal-pdf-tokens.ts'

export type { PdfAnswerRow } from './appraisal-pdf-tokens.ts'

type Fonts = {
  sans: PDFFont
  sansBold: PDFFont
  mono: PDFFont
  monoMedium: PDFFont
}

type FooterMeta = {
  employeeName: string
  projectName?: string
  completedAt: string
}

class PdfBuilder {
  doc: PDFDocument
  fonts: Fonts
  logo: PDFImage | null
  pages: PDFPage[] = []
  page!: PDFPage
  pageIndex = 0
  y = 0
  meta: FooterMeta
  showRunningHeader = false

  constructor(doc: PDFDocument, fonts: Fonts, logo: PDFImage | null, meta: FooterMeta) {
    this.doc = doc
    this.fonts = fonts
    this.logo = logo
    this.meta = meta
  }

  addPage(runningHeader = false) {
    this.page = this.doc.addPage([PAGE_W, PAGE_H])
    this.pages.push(this.page)
    this.pageIndex = this.pages.length
    this.showRunningHeader = runningHeader
    this.fillBackground()
    if (runningHeader) this.drawRunningHeader()
    this.y = PAGE_H - M - (runningHeader ? RUNNING_HEADER_H + 8 : 0)
  }

  fillBackground() {
    this.page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.background })
  }

  bottomLimit() {
    return M + FOOTER_RESERVE
  }

  ensureSpace(h: number) {
    if (this.y - h < this.bottomLimit()) {
      this.addPage(true)
    }
  }

  wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    return font.splitTextToSize(text, maxWidth)
  }

  drawText(
    text: string,
    x: number,
    y: number,
    opts: { font: PDFFont; size: number; color: RGB; bold?: boolean },
  ) {
    if (opts.bold) {
      this.page.drawText(text, { x, y, size: opts.size, font: opts.font, color: opts.color })
      this.page.drawText(text, { x: x + 0.35, y, size: opts.size, font: opts.font, color: opts.color })
    } else {
      this.page.drawText(text, { x, y, size: opts.size, font: opts.font, color: opts.color })
    }
  }

  drawLines(
    lines: string[],
    x: number,
    startY: number,
    lineHeight: number,
    font: PDFFont,
    size: number,
    color: RGB,
    bold = false,
  ): number {
    let y = startY
    for (const line of lines) {
      this.drawText(line, x, y, { font, size, color, bold })
      y -= lineHeight
    }
    return y
  }

  drawMonoLabel(text: string, x: number, color: RGB = C.muted) {
    this.ensureSpace(14)
    this.drawText(text.toUpperCase(), x, this.y, {
      font: this.fonts.monoMedium,
      size: 9,
      color,
    })
    this.y -= 14
  }

  drawSectionTitle(text: string) {
    this.ensureSpace(22)
    this.drawText(text, M, this.y, { font: this.fonts.sansBold, size: 16, color: C.foreground, bold: true })
    this.y -= 24
  }

  drawCoverBand() {
    const bandY = PAGE_H - COVER_BAND_H
    this.page.drawRectangle({ x: 0, y: bandY, width: PAGE_W, height: COVER_BAND_H, color: C.foreground })

    for (let gx = 0; gx <= PAGE_W; gx += 40) {
      this.page.drawLine({
        start: { x: gx, y: bandY },
        end: { x: gx, y: PAGE_H },
        thickness: 0.5,
        color: C.gridLine,
      })
    }
    for (let gy = bandY; gy <= PAGE_H; gy += 40) {
      this.page.drawLine({
        start: { x: 0, y: gy },
        end: { x: PAGE_W, y: gy },
        thickness: 0.5,
        color: C.gridLine,
      })
    }

    const logoX = M
    const logoY = bandY + (COVER_BAND_H - 40) / 2
    if (this.logo) {
      this.page.drawImage(this.logo, { x: logoX, y: logoY, width: 40, height: 40 })
    }

    const textX = logoX + (this.logo ? 56 : 0)
    this.drawText('// performance_appraisal', textX, PAGE_H - 52, {
      font: this.fonts.monoMedium,
      size: 10,
      color: C.accent,
    })
    this.drawText('ProDG', textX, PAGE_H - 72, {
      font: this.fonts.sansBold,
      size: 24,
      color: C.white,
      bold: true,
    })
    this.drawText('PERFORMANCE APPRAISAL', textX, PAGE_H - 88, {
      font: this.fonts.mono,
      size: 9,
      color: C.whiteMuted,
    })

    this.y = bandY - 32
  }

  drawMetaCard(opts: { employeeName: string; projectName?: string; completedAt: string }) {
    const pad = 20
    const labelW = 120
    const rows: [string, string][] = [
      ['DEVELOPER', opts.employeeName],
      ['PROJECT', opts.projectName?.trim() || '—'],
      ['COMPLETED', opts.completedAt],
      ['DOCUMENT', 'Growth appraisal · confidential'],
    ]

    const rowH = 18
    const cardH = pad * 2 + rows.length * rowH
    this.ensureSpace(cardH + 12)

    const cardY = this.y - cardH
    this.page.drawRectangle({
      x: M + 3,
      y: cardY - 3,
      width: CONTENT_W,
      height: cardH,
      color: C.accent,
    })
    this.page.drawRectangle({
      x: M,
      y: cardY,
      width: CONTENT_W,
      height: cardH,
      color: C.card,
      borderColor: C.foreground,
      borderWidth: 2,
    })

    let rowY = cardY + cardH - pad - 12
    for (const [label, value] of rows) {
      this.drawText(label, M + pad, rowY, { font: this.fonts.monoMedium, size: 8, color: C.muted })
      const valueLines = this.wrap(value, this.fonts.sans, 11, CONTENT_W - labelW - pad * 2)
      this.drawLines(valueLines, M + pad + labelW, rowY, 13, this.fonts.sans, 11, C.foreground)
      rowY -= rowH
    }

    this.y = cardY - 20
  }

  drawPrivacyStrip() {
    const pad = 12
    const body =
      'Your reviewer is not named in this report. This document is private to you.'
    const bodyLines = this.wrap(body, this.fonts.sans, 9, CONTENT_W - pad * 2)
    const h = pad * 2 + 14 + bodyLines.length * 13
    this.ensureSpace(h + 8)

    const boxY = this.y - h
    this.page.drawRectangle({
      x: M,
      y: boxY,
      width: CONTENT_W,
      height: h,
      color: C.background,
      borderColor: C.border,
      borderWidth: 1,
    })
    this.drawText('// anonymous_review', M + pad, boxY + h - pad - 10, {
      font: this.fonts.monoMedium,
      size: 9,
      color: C.muted,
    })
    this.drawLines(bodyLines, M + pad, boxY + h - pad - 24, 13, this.fonts.sans, 9, C.foreground)
    this.y = boxY - 24
  }

  drawHeroScore(overall: number, scoredCount: number) {
    const band = bandForAverage(overall)
    const color = bandColor(band)
    const label = labelForScore(overall)
    const blockH = 100
    this.ensureSpace(blockH)

    const heroX = M
    const heroY = this.y
    this.drawText(`${overall.toFixed(1)}`, heroX, heroY - 8, {
      font: this.fonts.sansBold,
      size: 48,
      color,
      bold: true,
    })
    this.drawText('/ 5', heroX, heroY - 52, { font: this.fonts.mono, size: 14, color: C.muted })
    this.drawText(label.toUpperCase(), heroX, heroY - 72, {
      font: this.fonts.monoMedium,
      size: 10,
      color,
    })

    const barW = 200
    const barY = heroY - 88
    this.page.drawRectangle({ x: heroX, y: barY, width: barW, height: 8, color: C.border })
    this.page.drawRectangle({
      x: heroX,
      y: barY,
      width: (overall / 5) * barW,
      height: 8,
      color,
    })

    const summary = `Across ${scoredCount} scored area${scoredCount === 1 ? '' : 's'}, your average signal is ${overall.toFixed(1)} / 5 — ${label}.`
    const lines = this.wrap(summary, this.fonts.sans, 10, CONTENT_W - 160)
    this.drawLines(lines, M + 160, heroY - 20, 14, this.fonts.sans, 10, C.muted)

    this.y = heroY - blockH - 8
  }

  drawScaleLegend() {
    const cellW = 58
    const cellH = 28
    const gap = 8
    const totalW = SCALE_LEGEND.length * cellW + (SCALE_LEGEND.length - 1) * gap
    const startX = M + (CONTENT_W - totalW) / 2
    this.ensureSpace(cellH + 24)

    const baseY = this.y - cellH
    for (let i = 0; i < SCALE_LEGEND.length; i++) {
      const item = SCALE_LEGEND[i]
      const x = startX + i * (cellW + gap)
      const color = bandColor(item.band)
      this.page.drawRectangle({
        x,
        y: baseY,
        width: cellW,
        height: cellH,
        color: C.background,
        borderColor: C.border,
        borderWidth: 1,
      })
      this.drawText(String(item.value), x + 6, baseY + cellH - 12, {
        font: this.fonts.sansBold,
        size: 11,
        color,
        bold: true,
      })
      this.drawText(item.label, x + 6, baseY + 6, {
        font: this.fonts.mono,
        size: 7,
        color: C.muted,
      })
    }
    this.y = baseY - 20
  }

  drawRunningHeader() {
    const top = PAGE_H - M
    this.drawText('ProDG', M, top - 10, { font: this.fonts.mono, size: 8, color: C.muted })
    const name = this.meta.employeeName
    const nameW = this.fonts.sans.widthOfTextAtSize(name, 9)
    this.drawText(name, (PAGE_W - nameW) / 2, top - 10, {
      font: this.fonts.sans,
      size: 9,
      color: C.foreground,
    })
    if (this.meta.projectName) {
      const proj = this.meta.projectName
      const projW = this.fonts.mono.widthOfTextAtSize(proj, 8)
      this.drawText(proj, PAGE_W - M - projW, top - 10, {
        font: this.fonts.mono,
        size: 8,
        color: C.accent,
      })
    }
    this.page.drawLine({
      start: { x: M, y: top - 18 },
      end: { x: PAGE_W - M, y: top - 18 },
      thickness: 0.5,
      color: C.border,
    })
  }

  drawCategoryHeader(category: string, avg: number | null, continued = false) {
    this.ensureSpace(continued ? 36 : 52)
    const tag = continued
      ? `// ${slugify(category)} · continued`
      : `// ${slugify(category)}`
    this.drawMonoLabel(tag, M, continued ? C.muted : C.accent)

    this.drawText(category.toUpperCase(), M, this.y, {
      font: this.fonts.sansBold,
      size: 13,
      color: C.foreground,
      bold: true,
    })
    this.y -= 18

    if (avg != null && !continued) {
      const band = bandForAverage(avg)
      const color = bandColor(band)
      const avgText = `${avg.toFixed(1)} / 5`
      this.drawText('CATEGORY AVERAGE', M, this.y, {
        font: this.fonts.monoMedium,
        size: 8,
        color: C.muted,
      })
      this.drawText(avgText, M + 110, this.y - 1, {
        font: this.fonts.sansBold,
        size: 14,
        color,
        bold: true,
      })
      const barW = 120
      const barX = M + 170
      const barY = this.y - 6
      this.page.drawRectangle({ x: barX, y: barY, width: barW, height: 6, color: C.border })
      this.page.drawRectangle({
        x: barX,
        y: barY,
        width: (avg / 5) * barW,
        height: 6,
        color,
      })
      this.y -= 20
    }

    this.page.drawLine({
      start: { x: M, y: this.y },
      end: { x: PAGE_W - M, y: this.y },
      thickness: 2,
      color: C.foreground,
    })
    this.y -= 16
  }

  drawScoredRow(question: string, score: number) {
    const band = bandForScore(score)
    const color = bandColor(band)
    const label = labelForScore(score)
    const rowH = 52
    this.ensureSpace(rowH)

    const scoreColW = 60
    const qWidth = CONTENT_W - scoreColW - 8
    const qLines = this.wrap(question, this.fonts.sans, 10, qWidth)
    const startY = this.y
    this.drawLines(qLines.slice(0, 2), M, startY, 13, this.fonts.sans, 10, C.foreground)

    const scoreX = PAGE_W - M - scoreColW
    this.drawText(`${score} / 5`, scoreX, startY, {
      font: this.fonts.sansBold,
      size: 14,
      color,
      bold: true,
    })
    this.drawText(label.toUpperCase(), scoreX, startY - 16, {
      font: this.fonts.mono,
      size: 8,
      color: C.muted,
    })

    const barY = startY - 32
    this.page.drawRectangle({ x: M, y: barY, width: CONTENT_W, height: 6, color: C.border })
    this.page.drawRectangle({
      x: M,
      y: barY,
      width: (score / 5) * CONTENT_W,
      height: 6,
      color,
    })

    this.y = barY - 20
  }

  drawOpenBlock(question: string, answer: string, category: string, continued = false) {
    const pad = 16
    const stripe = 4
    const qLines = this.wrap(question, this.fonts.sansBold, 10, CONTENT_W - pad * 2 - stripe)
    const aLines = this.wrap(answer.trim(), this.fonts.sans, 10, CONTENT_W - pad * 2 - stripe)
    const blockH = pad * 2 + qLines.length * 13 + 8 + aLines.length * 15 + 8

    if (this.y - blockH < this.bottomLimit()) {
      this.addPage(true)
      this.drawCategoryHeader(category, null, true)
    }

    const boxY = this.y - blockH
    this.page.drawRectangle({
      x: M,
      y: boxY,
      width: CONTENT_W,
      height: blockH,
      color: C.card,
      borderColor: C.foreground,
      borderWidth: 2,
    })
    this.page.drawRectangle({
      x: M,
      y: boxY,
      width: stripe,
      height: blockH,
      color: C.accent,
    })

    let ty = boxY + blockH - pad - 10
    this.drawLines(qLines, M + pad + stripe, ty, 13, this.fonts.sansBold, 10, C.foreground, true)
    ty -= qLines.length * 13 + 8
    if (aLines.length) {
      this.drawText('"', M + pad + stripe, ty, { font: this.fonts.sans, size: 18, color: C.muted })
    }
    this.drawLines(aLines, M + pad + stripe, ty, 15, this.fonts.sans, 10, C.foreground)

    this.y = boxY - 20
  }

  drawFooters() {
    const total = this.pages.length
    this.pages.forEach((page, i) => {
      const ruleY = M + 20
      page.drawLine({
        start: { x: M, y: ruleY + 10 },
        end: { x: PAGE_W - M, y: ruleY + 10 },
        thickness: 1,
        color: C.border,
      })
      const left = 'ProDG Studio · Confidential · For recipient only'
      page.drawText(left, M, ruleY, {
        font: this.fonts.mono,
        size: 8,
        color: C.muted,
      })
      const pageLabel = `// page ${String(i + 1).padStart(2, '0')}`
      const pw = this.fonts.mono.widthOfTextAtSize(pageLabel, 8)
      page.drawText(pageLabel, PAGE_W - M - pw, ruleY, {
        font: this.fonts.mono,
        size: 8,
        color: C.muted,
      })
      const dateW = this.fonts.mono.widthOfTextAtSize(this.meta.completedAt, 8)
      page.drawText(this.meta.completedAt, (PAGE_W - dateW) / 2, ruleY, {
        font: this.fonts.mono,
        size: 8,
        color: C.muted,
      })
    })
  }
}

async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  const base = new URL('.', import.meta.url)
  try {
    const sansBytes = await Deno.readFile(new URL('./fonts/SpaceGrotesk-Variable.ttf', base))
    const monoBytes = await Deno.readFile(new URL('./fonts/JetBrainsMono-Variable.ttf', base))
    const sans = await doc.embedFont(sansBytes)
    const mono = await doc.embedFont(monoBytes)
    return { sans, sansBold: sans, mono, monoMedium: mono }
  } catch {
    const { StandardFonts } = await import('npm:pdf-lib@1.17.1')
    const sans = await doc.embedFont(StandardFonts.Helvetica)
    const sansBold = await doc.embedFont(StandardFonts.HelveticaBold)
    const mono = await doc.embedFont(StandardFonts.Courier)
    return { sans, sansBold, mono, monoMedium: mono }
  }
}

async function loadLogo(doc: PDFDocument): Promise<PDFImage | null> {
  try {
    const base = new URL('.', import.meta.url)
    const bytes = await Deno.readFile(new URL('./assets/prodg-logo.png', base))
    return await doc.embedPng(bytes)
  } catch {
    return null
  }
}

export async function buildAppraisalPdf(opts: {
  employeeName: string
  projectName?: string
  completedAt: string
  answers: PdfAnswerRow[]
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`${opts.employeeName} — ProDG Performance Appraisal — ${opts.completedAt}`)
  doc.setAuthor('ProDG Studio')
  doc.setSubject('Confidential performance appraisal')

  const fonts = await loadFonts(doc)
  const logo = await loadLogo(doc)
  const meta: FooterMeta = {
    employeeName: opts.employeeName,
    projectName: opts.projectName,
    completedAt: opts.completedAt,
  }

  const builder = new PdfBuilder(doc, fonts, logo, meta)
  builder.addPage(false)
  builder.drawCoverBand()
  builder.drawMetaCard({
    employeeName: opts.employeeName,
    projectName: opts.projectName,
    completedAt: opts.completedAt,
  })
  builder.drawPrivacyStrip()

  builder.drawMonoLabel('// summary', M, C.accent)
  builder.drawSectionTitle('Overall signal')

  const overall = computeOverallAverage(opts.answers)
  const scoredCount = opts.answers.filter((a) => a.question_type === 'scored' && a.score != null).length
  if (overall != null) {
    builder.drawHeroScore(overall, scoredCount)
  }

  builder.drawScaleLegend()
  builder.drawMonoLabel('// up_next', M)
  const note = 'Category breakdown begins on the following page.'
  const noteLines = builder.wrap(note, fonts.sans, 10, CONTENT_W)
  builder.y = builder.drawLines(noteLines, M, builder.y, 14, fonts.sans, 10, C.muted)

  const grouped = groupAnswersByCategory(opts.answers)
  const categories = orderedCategories(grouped)

  builder.addPage(true)
  for (const category of categories) {
    const rows = grouped.get(category) ?? []
    const avg = computeCategoryAverage(rows)
    builder.drawCategoryHeader(category, avg)

    for (const row of rows) {
      if (row.question_type === 'scored' && row.score != null) {
        builder.drawScoredRow(row.question, row.score)
      } else if (row.text_answer?.trim()) {
        builder.drawOpenBlock(row.question, row.text_answer, category)
      }
    }
    builder.y -= 16
  }

  builder.drawFooters()
  return doc.save()
}
