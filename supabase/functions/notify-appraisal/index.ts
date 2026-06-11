import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { AppraisalReadyEmail } from '../_shared/email-templates/appraisal-ready.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'ProDG Performance Appraisal'
const SENDER_DOMAIN = 'notify.appraisal.prodg.studio'
const ROOT_DOMAIN = 'appraisal.prodg.studio'
const FROM_DOMAIN = 'appraisal.prodg.studio'
const SUBJECT = 'Your ProDG appraisal results are ready'

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
  try {
    const body = await req.json()
    employeeId = body.employeeId
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!employeeId) {
    return new Response(
      JSON.stringify({ error: 'employeeId is required' }),
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
  if (!roleSet.has('pm') && !roleSet.has('admin')) {
    return new Response(
      JSON.stringify({ error: 'Forbidden' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: completion } = await supabase
    .from('review_completions')
    .select('id')
    .eq('reviewer_id', user.id)
    .eq('employee_id', employeeId)
    .maybeSingle()

  if (!completion) {
    return new Response(
      JSON.stringify({ error: 'Appraisal not completed for this developer' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('name, email, is_pm')
    .eq('id', employeeId)
    .maybeSingle()

  if (empError) {
    console.error('Failed to load employee', { employeeId, error: empError })
    return new Response(
      JSON.stringify({ error: 'Could not load developer' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (employee?.is_pm) {
    return new Response(
      JSON.stringify({ error: 'Cannot notify a PM employee record' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!employee?.email) {
    console.warn('Developer has no email; skipping appraisal notification', { employeeId })
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

  const templateProps = {
    siteName: SITE_NAME,
    recipientName: employee.name ?? undefined,
    resultsUrl: `https://${ROOT_DOMAIN}/hub?tab=growth`,
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
    JSON.stringify({ success: true, queued: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
