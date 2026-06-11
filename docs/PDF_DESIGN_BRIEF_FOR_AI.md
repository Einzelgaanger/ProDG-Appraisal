# ProDG Performance Appraisal — PDF Design Brief (for external AI)

> **Purpose of this document:** You are an AI with strong PDF generation and document-design capabilities. Read this brief thoroughly to understand **ProDG’s product, brand, and web UI theme**. Then produce a **new Markdown file** (your deliverable) that documents—in exhaustive detail—how **you** would design the appraisal results PDF: layout, typography, color, spacing, hierarchy, content blocks, score visualizations, page flow, and print rules.  
>  
> **Important:** Do not copy a generic corporate template. Your spec must feel like a **natural extension of the ProDG web app** described below—the same brutalist-editorial personality, the same warm paper palette, the same monospace “system label” voice—adapted for a professional A4 PDF a developer receives by email.

---

## What we need from you (your output)

Please return a Markdown file structured roughly like this:

```markdown
# ProDG Appraisal PDF — Design Specification (by [your name/model])

## 1. Design intent & personality
## 2. Page size, margins, grid
## 3. Color tokens (hex + usage rules)
## 4. Typography scale (families, sizes, weights, letter-spacing)
## 5. Component library (header band, meta card, category section, score bar, quote block, footer, etc.)
## 6. Page-by-page wireframe (ASCII or described blocks)
## 7. Content mapping (which data fields appear where)
## 8. Score semantics & visual encoding (1–5 scale, category averages, overall)
## 9. Accessibility & print considerations
## 10. Implementation notes for pdf-lib / React-PDF / HTML-to-PDF
## 11. Do / Don’t checklist
```

Be **pixel- and token-level specific** where possible (e.g. “category title: 11pt JetBrains Mono, uppercase, tracking 0.2em, color `#1D9A6C`”). We will implement your spec in `supabase/functions/_shared/appraisal-pdf.ts` using **pdf-lib** in Deno, so include practical guidance for programmatic drawing (rectangles, lines, text wrapping, page breaks).

---

## Product context (what this PDF is for)

**ProDG Performance Appraisal** is an internal HR/growth tool for ProDG Studio (a software/product studio). The flow:

1. **Admins** assign developers to **Project Managers (PMs)** in **named project groups** (e.g. `RICC`, `DealRoom`, `Baobab`). The same developer can sit under multiple PMs or multiple projects.
2. **PMs** sign in and complete a structured appraisal form for each assigned developer **per project group**.
3. On submit, the system generates a **PDF** and emails the developer a **download link** (no login required).
4. The PDF must **never reveal who appraised them** (anonymous to the developer). It **may** show the **project/group name** (e.g. “Project: RICC”).
5. Tone: **growth-focused, honest, professional—not punitive, not gamified.** Copy elsewhere on the site says: *“Not awards. Not rankings. Growth.”*

**Live site:** https://appraisal.prodg.studio  
**Logo asset (square):** https://appraisal.prodg.studio/favicon.png

---

## Web app design system (match this personality in PDF)

### Design philosophy: **Warm brutalism / editorial tech**

The UI is **not** soft SaaS rounded cards. It is:

- **Warm off-white paper** backgrounds (cream, not clinical white)
- **Near-black ink** for primary text and heavy borders
- **Sharp corners** (`border-radius: 0` everywhere)
- **2px solid borders** on panels, inputs, and cards
- **Hard offset shadows** on active/hover states: `4px 4px 0 accent` or `3px 3px 0 foreground/10`
- **Micro-translate** on hover (`-translate-x-0.5 -translate-y-0.5`) — implies tactile, physical UI
- **Dual type system:** humanist-geometric sans for prose + monospace for labels/metadata
- **Comment-style labels** like `// pm_assignments`, `// appraising`, `// authenticate` in JetBrains Mono, small caps feel, wide tracking

Think: **design portfolio meets terminal aesthetic** — confident, direct, slightly austere, but warmed by the cream palette and green accent.

---

## Color tokens (HSL → approximate hex for PDF)

These are the canonical CSS variables from `src/index.css`. Use these—not random blues or generic orange.

| Token | HSL | ~Hex | Role |
|-------|-----|------|------|
| `--background` | `48 20% 97%` | `#F7F6F2` | Page background (warm cream) |
| `--foreground` | `0 0% 4%` | `#0A0A0A` | Primary text, header bands, primary buttons |
| `--card` | `48 15% 95%` | `#F3F2ED` | Panel fills, inset sections |
| `--muted-foreground` | `0 0% 42%` | `#6B6B6B` | Secondary text, captions |
| `--border` | `48 8% 82%` | `#D6D4CC` | Rules, panel borders |
| `--accent` | `158 64% 32%` | `#1D9A6C` | **Brand green** — active states, progress, category labels, CTA emphasis |
| `--accent-foreground` | white | `#FFFFFF` | Text on accent fills |
| `--success` | `142 71% 45%` | `#22C55E` | Scores ≥ 4 (excellent) |
| `--warning` | `38 92% 50%` | `#F59E0B` | Scores ~3 (average) |
| `--destructive` | `0 72% 51%` | `#DC2626` | Scores ≤ 2 (poor) |
| `--primary` | same as foreground | `#0A0A0A` | Solid buttons, inverted panels |

**Score semantic colors** (used in admin dashboards):

| Score band | CSS token | Use |
|------------|-----------|-----|
| ≥ 4.0 | `--score-excellent` / success green | Strong / Exemplary |
| 3.0–3.9 | `--score-good` / primary ink | Meets / Good |
| 2.0–2.9 | `--score-average` / warning amber | Below / Average |
| < 2.0 | `--score-poor` / destructive red | Lacking |

**Sidebar** (PM hub): inverted — `background #0A0A0A`, text cream, accent green on active nav item with `shadow-accent` offset.

---

## Typography

| Role | Family | Notes |
|------|--------|-------|
| **UI / headings / body** | **Space Grotesk** (400–700) | Google Font. Tight tracking (`-0.01em` body). Bold headlines. |
| **Labels / metadata / code voice** | **JetBrains Mono** (400–700) | Used for `.label-mono`, `.mono`, section tags like `// team_pulse` |

### `.label-mono` pattern (critical brand marker)

```
font-family: JetBrains Mono
font-size: 10px (web; scale up slightly for print legibility)
text-transform: uppercase
letter-spacing: 0.2em
color: muted-foreground (or accent on dark panels)
font-weight: 500
```

Examples in product copy:
- `// performance_appraisal`
- `// pm_assignments`
- `// appraising`
- `// RICC` (project group name in PM hub)

### Heading scale (web)

- **Hero:** `text-4xl`–`text-6xl`, bold, tight leading — often broken across lines (`PM<br/>PORTAL_`)
- **Section titles:** `text-xl`–`text-2xl` bold uppercase or bold sentence case
- **Card titles:** `text-sm` bold uppercase tracking-wide
- **Body:** `text-sm`–`text-base`, `leading-relaxed`
- **Micro:** `text-[9px]`–`text-[11px]` mono for emails, badges

### Typographic personality

- Underscores and ALL CAPS used deliberately (`PORTAL_`, `GROWTH_`, `ASSIGN → APPRAISE → DELIVER`)
- Typewriter animation on onboarding hero (optional flourish—not required in PDF)
- Selection highlight: accent green at 40% opacity

**PDF note:** pdf-lib only ships Standard Fonts (Helvetica) unless we embed custom TTFs. In your spec, tell us whether to **embed Space Grotesk + JetBrains Mono** (preferred for fidelity) or which system fallbacks map acceptably.

---

## Layout & component patterns (web → translate to PDF)

### Panels

- `.glass-panel` / `.brutal-card`: `bg-card`, `border-2 border-foreground/10`, **no border-radius**
- Section padding: `p-5 sm:p-6` (20–24px)
- Section header stack: `.label-mono` tag above bold title

### Buttons

- Primary: `bg-foreground text-background`, bold uppercase, `tracking-[0.08em]`, `border-2`
- Hover: hard shadow `4px 4px 0 accent`, slight translate
- Outline: `border-2 border-foreground`

### Navigation (PM Hub sidebar)

- Active tab: **inverted** — black fill, cream text, `shadow-[3px_3px_0px_0px] shadow-accent`
- Inactive: transparent, muted description line below bold label

### Progress bars

- Track: `h-1 bg-foreground/10`
- Fill: `bg-accent` (green), animated width

### Score input (appraisal form)

- Five columns, each cell: `border-2`, selected state = inverted black fill + `shadow-accent` offset
- Labels under numbers: Lacking / Below / Meets / Strong / Exemplary

### Stat cards (admin)

- Large number + small `.label-mono` caption
- Charts use restrained palette: ink grays + accent green (`CHART_COLORS`)

### Login / marketing split panel

- Left: **full black** panel with subtle **graph-paper grid** overlay (repeating 40px lines at 3% opacity)
- Logo inverted white on black
- Accent green mono prefix before headline

---

## Brand assets & voice

| Element | Value |
|---------|-------|
| Product name | **ProDG** |
| Subtitle | **Performance Appraisal** |
| Studio | ProDG Studio |
| Logo | Square mark + “ProDG” wordmark (see favicon URL) |
| Voice | Direct, honest, growth-oriented, no corporate fluff |
| Confidentiality | Reviewer anonymous; PDF private to recipient |
| Tags / chips | `PM-Led`, `PDF Delivery`, `Growth-Focused`, `Anonymous`, `Honest`, `Secure` |

---

## Appraisal PDF — data model & content (what must appear)

The PDF is built server-side from one completed appraisal submission.

### Input props (TypeScript)

```ts
type PdfAnswerRow = {
  category: string           // e.g. "Code Quality & Technical Standards"
  question: string           // full question text
  question_type: 'scored' | 'open_ended'
  sort_order: number
  score: number | null       // 1–5 if scored
  text_answer: string | null // if open_ended
}

buildAppraisalPdf({
  employeeName: string       // "Jude Ocomi"
  projectName?: string       // "RICC" — from admin assignment group
  completedAt: string        // e.g. "11 June 2026" (en-GB)
  answers: PdfAnswerRow[]
})
```

### Survey structure (3 categories, 8 questions)

**1. Code Quality & Technical Standards**
- Scored (1–5): code quality & adherence to standards
- Open: specific technical strengths / recurring issues (sprint examples)

**2. Delivery & Reliability**
- Scored (1–5): delivery against deadlines and scope
- Open: how they handle blockers / communication timing

**3. Collaboration & Communication**
- Scored (1–5): collaboration & communication
- Open: ticket updates, PR responses, standups
- Open: greatest strength to lean into
- Open: current responsibilities / projects

### Score scale semantics (must be documented in PDF)

| Value | Label |
|-------|-------|
| 1 | Lacking |
| 2 | Below |
| 3 | Meets |
| 4 | Strong |
| 5 | Exemplary |

Category-level **average** of scored questions should be shown. An **overall average** across all scored questions should be prominent (hero stat).

### Required content rules

| Must include | Must NOT include |
|--------------|------------------|
| Developer name | PM / reviewer name |
| Project/group name (if provided) | Other reviewers’ identities |
| Completion date | Internal admin notes |
| Per-category scores + averages | Peer comparison / rankings |
| Open-ended feedback (quoted or indented) | “Wall of fame” language |
| Confidentiality footer | Login URLs |
| ProDG branding | Gamification (badges, trophies) |

### Suggested narrative order

1. **Cover / header band** — brand, document type, developer, project, date
2. **Executive summary** — overall score, one-line growth framing
3. **Privacy note** — reviewer not identified
4. **Category sections** — each with average + questions
5. **Scored items** — visual bar or badge + numeric score
6. **Open items** — pull-quote or bordered inset block
7. **Footer** — ProDG Studio · Confidential · Year

---

## Current PDF implementation (what we have today — improve this)

File: `supabase/functions/_shared/appraisal-pdf.ts`  
Library: **pdf-lib** (Deno edge function, no browser)

**Current structure:**
- A4 (595×842 pt), 48pt margins
- Black header band with white “ProDG” + “PERFORMANCE APPRAISAL”
- Developer name, project, date
- Overall score panel (cream box, bold number, text label)
- Categories in uppercase accent color
- Category averages
- Scored questions: text + horizontal bar (fill width = score/5) + `X / 5`
- Open questions: question bold + quoted answer in muted gray
- Footer: “ProDG Studio · Confidential · For recipient only”

**Known gaps vs web brand:**
- Accent color in PDF code is **orange** (`rgb(0.85, 0.45, 0.12)`) — **wrong**; should be **green `#1D9A6C`**
- Fonts are Helvetica only — missing Space Grotesk / JetBrains Mono
- No 2px brutalist borders / offset shadows
- No `// label` mono section tags
- No score color coding (green/amber/red by band)
- No scale legend
- Page breaks are basic; long open answers may collide with footer

**Your spec should fix all of the above** while staying implementable in pdf-lib.

---

## Email context (PDF is linked from email)

The transactional email (`appraisal-ready.tsx`) uses:
- Cream outer background `#f4f4f0`
- White card, 12px radius (email exception—slightly softer than web)
- Centered logo + “ProDG” + “Performance Appraisal” tagline
- Black CTA button “Download my appraisal PDF”
- Copy mentions project name, no login, reviewer not identified

The PDF should feel like **opening that email’s promise**—the download is the “real” artifact; email is the envelope.

---

## Technical constraints for implementation

| Constraint | Detail |
|------------|--------|
| Runtime | Deno Supabase Edge Function |
| PDF library | `pdf-lib@1.17.1` (preferred) |
| Page size | A4 portrait |
| File size | Keep under ~500KB (storage limit 5MB) |
| No external requests at render time | Embed fonts if needed; logo as bytes or simple vector text |
| Privacy | PDF stored privately; served via tokenized URL |

If you recommend **React-PDF** or **HTML/CSS print** instead, explain tradeoffs for edge deployment—but default assumption is pdf-lib.

---

## Reference: web UI copy patterns (tone)

**Onboarding hero:**
> “NOT AWARDS. NOT RANKINGS. GROWTH.”

**PM portal:**
> “Sign in to complete developer appraisals assigned to you. Developers receive their results by email — no login needed.”

**After appraisal submit:**
> “A neat PDF will be emailed to them — your identity is not shown.”

**Developer info page:**
> “Your reviewer is never named in the report.”

Use this tone in PDF microcopy (footer, privacy callout, section intros)—not legalese.

---

## Questions for you to answer in your design spec

1. **Cover page vs continuous document?** Single scrolling doc or distinct page 1 “cover”?
2. **How should overall score be visualized?** Large numeral, ring, bar, letter grade equivalent?
3. **How to treat long open-ended answers?** Flow across pages with repeated category header?
4. **Should project name appear in header band or a bordered meta card?**
5. **How to echo brutalist `border-2` and hard shadows in print-safe way?**
6. **Exact font embedding strategy** for Space Grotesk + JetBrains Mono in pdf-lib?
7. **Score bar design** — height, radius (0?), fill color by band vs single accent?
8. **Empty state** — if no open-ended text for a question, omit or show “No written feedback”?
9. **Page numbers?** Mono footer `// page 01` style?
10. **Accessibility** — minimum font sizes, contrast ratios for cream/black/green combo?

---

## Success criteria

When we implement your spec, a developer who uses the web app should think:

> “This PDF looks like it came from the same team that built the ProDG appraisal site—not a generic HR export.”

The document should be **print-ready**, **skimmable in 30 seconds** (overall + category scores), and **readable in depth** for open feedback sections.

---

## Deliverable reminder

**Please output your Markdown design specification file** as described in the first section. Name it something like:

`PRODG_APPRAISAL_PDF_DESIGN_SPEC.md`

We will hand that file back to our implementation AI to rewrite `appraisal-pdf.ts` to match your spec exactly, using ProDG’s theme tokens and the data model above.

---

*Document prepared for external PDF/design AI — ProDG Appraisal codebase, June 2026.*
