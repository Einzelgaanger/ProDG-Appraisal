import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { AppraisalPendingAdminEmail } from '../_shared/email-templates/appraisal-pending-admin.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://appraisal.prodg.studio'
const FROM_DOMAIN = 'appraisal.prodg.studio'
const SENDER_DOMAIN = 'notify.appraisal.prodg.studio'
const SITE_NAME = 'ProDG Performance Appraisal'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
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
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!employeeId || !responseId) {
    return new Response(JSON.stringify({ error: 'employeeId and responseId are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id)
  const roleSet = new Set((roles ?? []).map((r) => r.role))
  const isAdmin = roleSet.has('admin')
  if (!roleSet.has('pm') && !isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!isAdmin) {
    let q = supabase
      .from('pm_developer_assignments')
      .select('id')
      .eq('pm_user_id', user.id)
      .eq('employee_id', employeeId)
    if (assignmentId) q = q.eq('id', assignmentId)
    const { data: assignment } = await q.maybeSingle()
    if (!assignment) {
      return new Response(JSON.stringify({ error: 'Developer not assigned to you' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const { data: response } = await supabase
    .from('survey_responses')
    .select('id, created_at, admin_notified_at')
    .eq('id', responseId)
    .eq('employee_id', employeeId)
    .maybeSingle()

  if (!response) {
    return new Response(JSON.stringify({ error: 'Invalid appraisal response' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (response.admin_notified_at) {
    return new Response(JSON.stringify({ success: true, skipped: 'already_notified' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('name')
    .eq('id', employeeId)
    .maybeSingle()

  const { data: pmProfile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .maybeSingle()

  let projectName: string | undefined
  if (assignmentId) {
    const { data: a } = await supabase
      .from('pm_developer_assignments')
      .select('group_name')
      .eq('id', assignmentId)
      .maybeSingle()
    projectName = a?.group_name ?? undefined
  }

  const completedAt = new Date(response.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const adminUrl = `${SITE_URL}/appraisal?tab=release`

  const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin')
  const adminIds = (adminRoles ?? []).map((r) => r.user_id)
  if (!adminIds.length) {
    await supabase.from('survey_responses').update({ admin_notified_at: new Date().toISOString() }).eq('id', responseId)
    return new Response(JSON.stringify({ success: true, skipped: 'no_admins' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('email, name')
    .in('id', adminIds)

  const templateProps = {
    developerName: employee?.name ?? 'Developer',
    projectName,
    pmName: pmProfile?.name,
    completedAt,
    adminUrl,
  }

  const html = await renderAsync(React.createElement(AppraisalPendingAdminEmail, templateProps))
  const text = await renderAsync(React.createElement(AppraisalPendingAdminEmail, templateProps), { plainText: true })

  let queued = 0
  for (const admin of adminProfiles ?? []) {
    if (!admin.email) continue
    const messageId = crypto.randomUUID()
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'appraisal-pending-admin',
      recipient_email: admin.email,
      status: 'pending',
    })
    const { error } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: admin.email,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: `Appraisal ready for review — ${employee?.name ?? 'developer'}`,
        html,
        text,
        purpose: 'transactional',
        label: 'appraisal-pending-admin',
        queued_at: new Date().toISOString(),
      },
    })
    if (!error) queued++
  }

  await supabase.from('survey_responses').update({ admin_notified_at: new Date().toISOString() }).eq('id', responseId)

  return new Response(JSON.stringify({ success: true, adminsNotified: queued }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
