import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface ResponseRow {
  id: string
  employee_id: string
  assignment_id: string | null
  reviewer_id: string | null
  created_at: string
  released_at: string | null
}

interface EmployeeRow { id: string; name: string }
interface ProfileRow { id: string; name: string }
interface AssignmentRow { id: string; group_name: string }
interface AnswerRow { id: string; response_id: string; question_id: string; score: number | null; text_answer: string | null }
interface QuestionRow { id: string; question_text: string; question_type: string; category_id: string }
interface CategoryRow { id: string; name: string }

interface Props {
  responses: ResponseRow[]
  employees: EmployeeRow[]
  assignments: AssignmentRow[]
  reviewerProfiles: ProfileRow[]
  answers: AnswerRow[]
  questions: QuestionRow[]
  categories: CategoryRow[]
  onReleased: () => void
}

export default function AdminReleasePanel({
  responses,
  employees,
  assignments,
  reviewerProfiles,
  answers,
  questions,
  categories,
  onReleased,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [releasingId, setReleasingId] = useState<string | null>(null)

  const pending = useMemo(
    () => responses.filter((r) => !r.released_at).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [responses],
  )

  const getEmployeeName = (id: string) => employees.find((e) => e.id === id)?.name ?? 'Unknown'
  const getProject = (assignmentId: string | null) =>
    assignmentId ? assignments.find((a) => a.id === assignmentId)?.group_name : undefined
  const getPmName = (reviewerId: string | null) =>
    reviewerId ? reviewerProfiles.find((p) => p.id === reviewerId)?.name : undefined

  const release = async (responseId: string, developerName: string) => {
    if (!confirm(`Release the appraisal PDF to ${developerName}? They will receive an email with a download link.`)) {
      return
    }
    setReleasingId(responseId)
    try {
      const { data, error } = await supabase.functions.invoke('release-appraisal', {
        body: { responseId },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast.success(`Report released to ${developerName}`)
      onReleased()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Could not release report')
    } finally {
      setReleasingId(null)
    }
  }

  if (!pending.length) {
    return (
      <div className="glass-panel p-10 text-center">
        <Send className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-bold mb-2">No pending releases</h3>
        <p className="text-sm text-muted-foreground">
          When PMs submit appraisals, they appear here for your review. Release when ready to email the developer their PDF.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent" /> Pending release
          <Badge variant="secondary" className="text-[10px]">{pending.length}</Badge>
        </h3>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Review PM submissions, then release to send the developer their PDF.
        </p>
      </div>

      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {pending.map((r) => {
          const expanded = expandedId === r.id
          const project = getProject(r.assignment_id)
          const pmName = getPmName(r.reviewer_id)
          const devName = getEmployeeName(r.employee_id)
          const responseAnswers = expanded ? answers.filter((a) => a.response_id === r.id) : []

          return (
            <div key={r.id} className="border-2 border-foreground/10 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-card">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="font-bold text-sm">{devName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                    {project && <span>Project: {project}</span>}
                    {pmName && <span>PM: {pmName}</span>}
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="gap-1.5 font-bold uppercase text-[10px]"
                    disabled={releasingId === r.id}
                    onClick={() => release(r.id, devName)}
                  >
                    {releasingId === r.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Release report
                  </Button>
                  <button type="button" onClick={() => setExpandedId(expanded ? null : r.id)} className="p-1">
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {expanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-t-2 border-foreground/10 p-3 bg-secondary/10 space-y-2 text-xs"
                >
                  {categories.map((cat) => {
                    const catQ = questions.filter((q) => q.category_id === cat.id)
                    const catA = responseAnswers.filter((a) => catQ.some((q) => q.id === a.question_id))
                    if (!catA.length) return null
                    return (
                      <div key={cat.id}>
                        <p className="font-bold text-[11px] uppercase mb-1">{cat.name}</p>
                        {catA.map((a) => {
                          const q = questions.find((x) => x.id === a.question_id)
                          if (!q) return null
                          return (
                            <div key={a.id} className="mb-2 pl-2 border-l-2 border-foreground/15">
                              <p className="text-muted-foreground">{q.question_text}</p>
                              <p className="font-medium">
                                {a.score != null ? `${a.score}/5` : a.text_answer ?? '—'}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </motion.div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
