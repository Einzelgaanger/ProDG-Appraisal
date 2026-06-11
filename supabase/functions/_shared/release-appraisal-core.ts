import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { AppraisalReadyEmail } from './email-templates/appraisal-ready.tsx'
import { buildAppraisalPdf, type PdfAnswerRow } from './appraisal-pdf.ts'

const SITE_NAME = 'ProDG Performance Appraisal'
const SENDER_DOMAIN = 'notify.appraisal.prodg.studio'
const FROM_DOMAIN = 'appraisal.prodg.studio'
const DEV_SUBJECT = 'Your ProDG performance appraisal is ready'

export async function releaseAppraisalToDeveloper(
  supabase: SupabaseClient,
  opts: {
    responseId: string
    releasedBy: string
    supabaseUrl: string
  },
): Promise<{ downloadUrl: string }> {
  const { data: response, error: respError } = await supabase
    .from('survey_responses')
    .select('id, employee_id, assignment_id, created_at, released_at')
    .eq('id', opts.responseId)
    .maybeSingle()

  if (respError || !response) throw new Error('Invalid appraisal response')
  if (response.released_at) throw new Error('Report already released')

  const employeeId = response.employee_id
  const assignmentId = response.assignment_id as string | null

  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('name, email, is_pm')
    .eq('id', employeeId)
    .maybeSingle()

  if (empError || !employee) throw new Error('Could not load developer')
  if (employee.is_pm) throw new Error('Cannot release a PM employee record')
  if (!employee.email) throw new Error('Developer has no email on file')

  const { data: suppressed } = await supabase
    .from('suppressed_emails')
    .select('email')
    .eq('email', employee.email.toLowerCase())
    .maybeSingle()

  if (suppressed) throw new Error('Developer email is suppressed')

  const { data: answerRows, error: ansError } = await supabase
    .from('survey_answers')
    .select('score, text_answer, question_id, survey_questions(question_text, question_type, sort_order, survey_categories(name))')
    .eq('response_id', opts.responseId)

  if (ansError) throw new Error('Could not build appraisal PDF')

  const pdfRows: PdfAnswerRow[] = (answerRows ?? []).map((a: Record<string, unknown>) => {
    const q = a.survey_questions as Record<string, unknown> | null
    const cat = q?.survey_categories as { name?: string } | null
    return {
      category: cat?.name ?? 'Assessment',
      question: String(q?.question_text ?? 'Question'),
      question_type: String(q?.question_type ?? 'scored'),
      sort_order: Number(q?.sort_order ?? 0),
      score: a.score as number | null,
      text_answer: a.text_answer as string | null,
    }
  })

  const completedAt = new Date(response.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  let projectName: string | undefined
  if (assignmentId) {
    const { data: assignmentRow } = await supabase
      .from('pm_developer_assignments')
      .select('group_name')
      .eq('id', assignmentId)
      .maybeSingle()
    projectName = assignmentRow?.group_name ?? undefined
  }

  const pdfBytes = await buildAppraisalPdf({
    employeeName: employee.name,
    projectName,
    completedAt,
    answers: pdfRows,
  })

  const storagePath = `${employeeId}/${opts.responseId}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('appraisal-pdfs')
    .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

  if (uploadError) throw new Error('Failed to store appraisal PDF')

  const { data: delivery, error: deliveryError } = await supabase
    .from('appraisal_result_deliveries')
    .insert({
      employee_id: employeeId,
      response_id: opts.responseId,
      storage_path: storagePath,
    })
    .select('token')
    .single()

  if (deliveryError || !delivery) throw new Error('Failed to create download link')

  const downloadUrl = `${opts.supabaseUrl}/functions/v1/download-appraisal-result?token=${delivery.token}`

  const templateProps = {
    siteName: SITE_NAME,
    recipientName: employee.name ?? undefined,
    projectName,
    downloadUrl,
  }

  const html = await renderAsync(React.createElement(AppraisalReadyEmail, templateProps))
  const text = await renderAsync(React.createElement(AppraisalReadyEmail, templateProps), { plainText: true })

  const messageId = crypto.randomUUID()
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'appraisal-ready',
    recipient_email: employee.email,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: employee.email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: DEV_SUBJECT,
      html,
      text,
      purpose: 'transactional',
      label: 'appraisal-ready',
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) throw new Error('Failed to enqueue developer email')

  const { error: releaseError } = await supabase
    .from('survey_responses')
    .update({ released_at: new Date().toISOString(), released_by: opts.releasedBy })
    .eq('id', opts.responseId)
    .is('released_at', null)

  if (releaseError) throw new Error('Failed to mark report as released')

  return { downloadUrl }
}
