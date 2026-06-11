import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { AppraisalReadyEmail } from '../_shared/email-templates/appraisal-ready.tsx'
import { buildAppraisalPdf, type PdfAnswerRow } from '../_shared/appraisal-pdf.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'ProDG Performance Appraisal'
const SENDER_DOMAIN = 'notify.appraisal.prodg.studio'
const ROOT_DOMAIN = 'appraisal.prodg.studio'
const FROM_DOMAIN = 'appraisal.prodg.studio'
const SUBJECT = 'Your ProDG performance appraisal (PDF attached)'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error('Missing Supabase environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let employeeId: string | undefined
  let responseId: string | undefined
  let assignmentId: string | undefined
  try {
    const body = await req.json()
    employeeId = body.employeeId
    responseId = body.responseId
    assignmentId = body.assignmentId
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!employeeId || !responseId) {
    return new Response(
      JSON.stringify({ error: 'employeeId and responseId are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['pm', 'admin'])

  const roleSet = new Set((roles ?? []).map((r) => r.role))
  const isAdmin = roleSet.has('admin')
  if (!roleSet.has('pm') && !isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Forbidden' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!isAdmin) {
    let assignmentQuery = supabase
      .from('pm_developer_assignments')
      .select('id, group_name')
      .eq('pm_user_id', user.id)
      .eq('employee_id', employeeId)

    if (assignmentId) {
      assignmentQuery = assignmentQuery.eq('id', assignmentId)
    }

    const { data: assignment } = await assignmentQuery.maybeSingle()

    if (!assignment) {
      return new Response(
        JSON.stringify({ error: 'Developer not assigned to you' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  let completionQuery = supabase
    .from('review_completions')
    .select('id')
    .eq('reviewer_id', user.id)

  if (assignmentId) {
    completionQuery = completionQuery.eq('assignment_id', assignmentId)
  } else {
    completionQuery = completionQuery.eq('employee_id', employeeId)
  }

  const { data: completion } = await completionQuery.maybeSingle()

  if (!completion) {
    return new Response(
      JSON.stringify({ error: 'Appraisal not completed for this developer' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: response, error: respError } = await supabase
    .from('survey_responses')
    .select('id, employee_id, created_at')
    .eq('id', responseId)
    .eq('employee_id', employeeId)
    .maybeSingle()

  if (respError || !response) {
    return new Response(
      JSON.stringify({ error: 'Invalid appraisal response' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('name, email, is_pm')
    .eq('id', employeeId)
    .maybeSingle()

  if (empError || !employee) {
    return new Response(
      JSON.stringify({ error: 'Could not load developer' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (employee.is_pm) {
    return new Response(
      JSON.stringify({ error: 'Cannot notify a PM employee record' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!employee.email) {
    return new Response(
      JSON.stringify({ success: true, skipped: 'no_email' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: suppressed } = await supabase
    .from('suppressed_emails')
    .select('email')
    .eq('email', employee.email.toLowerCase())
    .maybeSingle()

  if (suppressed) {
    return new Response(
      JSON.stringify({ success: true, skipped: 'suppressed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: answerRows, error: ansError } = await supabase
    .from('survey_answers')
    .select('score, text_answer, question_id, survey_questions(question_text, question_type, sort_order, survey_categories(name))')
    .eq('response_id', responseId)

  if (ansError) {
    console.error('Failed to load answers', ansError)
    return new Response(
      JSON.stringify({ error: 'Could not build appraisal PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

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

  const storagePath = `${employeeId}/${responseId}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('appraisal-pdfs')
    .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    console.error('PDF upload failed', uploadError)
    return new Response(
      JSON.stringify({ error: 'Failed to store appraisal PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: delivery, error: deliveryError } = await supabase
    .from('appraisal_result_deliveries')
    .insert({
      employee_id: employeeId,
      response_id: responseId,
      storage_path: storagePath,
    })
    .select('token')
    .single()

  if (deliveryError || !delivery) {
    console.error('Delivery record failed', deliveryError)
    return new Response(
      JSON.stringify({ error: 'Failed to create download link' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const downloadUrl = `${supabaseUrl}/functions/v1/download-appraisal-result?token=${delivery.token}`

  const templateProps = {
    siteName: SITE_NAME,
    recipientName: employee.name ?? undefined,
    projectName,
    downloadUrl,
  }

  const html = await renderAsync(React.createElement(AppraisalReadyEmail, templateProps))
  const text = await renderAsync(React.createElement(AppraisalReadyEmail, templateProps), {
    plainText: true,
  })

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
      subject: SUBJECT,
      html,
      text,
      purpose: 'transactional',
      label: 'appraisal-ready',
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('Failed to enqueue appraisal email', { employeeId, error: enqueueError })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'appraisal-ready',
      recipient_email: employee.email,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return new Response(
      JSON.stringify({ error: 'Failed to enqueue email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, queued: true, downloadUrl }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

