import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { AppraisalGroupPendingAdminEmail } from '../_shared/email-templates/appraisal-group-pending-admin.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://appraisal.prodg.studio'
const FROM_DOMAIN = 'appraisal.prodg.studio'
const SENDER_DOMAIN = 'notify.appraisal.prodg.studio'
const SITE_NAME = 'ProDG Performance Appraisal'

function assignmentIdsKey(ids: string[]): string {
  return [...ids].sort().join(',')
}

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

  if (!employeeId || !responseId || !assignmentId) {
    return new Response(JSON.stringify({ error: 'employeeId, responseId, and assignmentId are required' }), {
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
    const { data: assignment } = await supabase
      .from('pm_developer_assignments')
      .select('id')
      .eq('pm_user_id', user.id)
      .eq('employee_id', employeeId)
      .eq('id', assignmentId)
      .maybeSingle()
    if (!assignment) {
      return new Response(JSON.stringify({ error: 'Developer not assigned to you' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const { data: response } = await supabase
    .from('survey_responses')
    .select('id')
    .eq('id', responseId)
    .eq('employee_id', employeeId)
    .maybeSingle()

  if (!response) {
    return new Response(JSON.stringify({ error: 'Invalid appraisal response' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: currentAssignment } = await supabase
    .from('pm_developer_assignments')
    .select('id, group_name, pm_user_id')
    .eq('id', assignmentId)
    .maybeSingle()

  if (!currentAssignment) {
    return new Response(JSON.stringify({ success: true, groupComplete: false, skipped: 'no_assignment' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const pmUserId = currentAssignment.pm_user_id
  const projectName = currentAssignment.group_name

  const { data: groupAssignments } = await supabase
    .from('pm_developer_assignments')
    .select('id, employee_id, employees(name)')
    .eq('pm_user_id', pmUserId)
    .eq('group_name', projectName)

  const groupAssignmentIds = (groupAssignments ?? []).map((a) => a.id)
  if (!groupAssignmentIds.length) {
    return new Response(JSON.stringify({ success: true, groupComplete: false }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: completions } = await supabase
    .from('review_completions')
    .select('assignment_id')
    .eq('reviewer_id', pmUserId)
    .in('assignment_id', groupAssignmentIds)

  const completedSet = new Set((completions ?? []).map((c) => c.assignment_id))
  const allComplete = groupAssignmentIds.every((id) => completedSet.has(id))

  if (!allComplete) {
    return new Response(JSON.stringify({ success: true, groupComplete: false }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const assignmentKey = assignmentIdsKey(groupAssignmentIds)
  const { data: priorNotifications } = await supabase
    .from('pm_group_admin_notifications')
    .select('assignment_ids')
    .eq('pm_user_id', pmUserId)
    .eq('group_name', projectName)

  const alreadyNotified = (priorNotifications ?? []).some(
    (row) => assignmentIdsKey(row.assignment_ids as string[]) === assignmentKey,
  )

  if (alreadyNotified) {
    return new Response(JSON.stringify({ success: true, groupComplete: true, skipped: 'already_notified' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: pmProfile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', pmUserId)
    .maybeSingle()

  const developerNames = (groupAssignments ?? [])
    .map((a) => (a.employees as { name: string } | null)?.name)
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b))

  const completedAt = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const adminUrl = `${SITE_URL}/appraisal?tab=release`

  const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin')
  const adminIds = (adminRoles ?? []).map((r) => r.user_id)

  const templateProps = {
    projectName,
    pmName: pmProfile?.name,
    developerNames,
    completedAt,
    adminUrl,
  }

  const html = await renderAsync(React.createElement(AppraisalGroupPendingAdminEmail, templateProps))
  const text = await renderAsync(React.createElement(AppraisalGroupPendingAdminEmail, templateProps), { plainText: true })

  let queued = 0
  if (adminIds.length) {
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('email, name')
      .in('id', adminIds)

    for (const admin of adminProfiles ?? []) {
      if (!admin.email) continue
      const messageId = crypto.randomUUID()
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'appraisal-group-pending-admin',
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
          subject: `Project reviews complete — ${projectName}`,
          html,
          text,
          purpose: 'transactional',
          label: 'appraisal-group-pending-admin',
          queued_at: new Date().toISOString(),
        },
      })
      if (!error) queued++
    }
  }

  await supabase.from('pm_group_admin_notifications').insert({
    pm_user_id: pmUserId,
    group_name: projectName,
    assignment_ids: groupAssignmentIds,
  })

  await supabase
    .from('survey_responses')
    .update({ admin_notified_at: new Date().toISOString() })
    .in('assignment_id', groupAssignmentIds)
    .is('admin_notified_at', null)

  return new Response(JSON.stringify({ success: true, groupComplete: true, adminsNotified: queued }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
