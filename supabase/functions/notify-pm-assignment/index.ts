import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { PmAssignmentEmail } from '../_shared/email-templates/pm-assignment.tsx'
import { triggerEmailQueueProcessor } from '../_shared/trigger-email-queue.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://appraisal.prodg.studio'
const FROM_DOMAIN = 'appraisal.prodg.studio'
const SENDER_DOMAIN = 'notify.appraisal.prodg.studio'
const SITE_NAME = 'ProDG Performance Appraisal'

async function resolvePmEmail(
  supabase: ReturnType<typeof createClient>,
  pmUserId: string,
): Promise<{ email: string; name?: string } | null> {
  const { data: pmProfile } = await supabase
    .from('profiles')
    .select('email, name, employee_id')
    .eq('id', pmUserId)
    .maybeSingle()

  if (pmProfile?.email) {
    return { email: pmProfile.email, name: pmProfile.name ?? undefined }
  }

  if (pmProfile?.employee_id) {
    const { data: emp } = await supabase
      .from('employees')
      .select('email, name')
      .eq('id', pmProfile.employee_id)
      .maybeSingle()
    if (emp?.email) {
      return { email: emp.email, name: emp.name ?? pmProfile.name ?? undefined }
    }
  }

  return null
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

  let pmUserId: string | undefined
  let groupName: string | undefined
  let developerIds: string[] | undefined
  try {
    const body = await req.json()
    pmUserId = body.pmUserId
    groupName = body.groupName
    developerIds = body.developerIds
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!pmUserId || !groupName?.trim() || !developerIds?.length) {
    return new Response(JSON.stringify({ error: 'pmUserId, groupName, and developerIds are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id)
  if (!(roles ?? []).some((r) => r.role === 'admin')) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const pmContact = await resolvePmEmail(supabase, pmUserId)
  if (!pmContact?.email) {
    return new Response(JSON.stringify({ error: 'PM has no email on file' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: devs } = await supabase
    .from('employees')
    .select('name')
    .in('id', developerIds)
    .order('name')

  const developerNames = (devs ?? []).map((d) => d.name)
  const projectName = groupName.trim()
  const hubUrl = `${SITE_URL}/hub`

  const templateProps = {
    pmName: pmContact.name,
    projectName,
    developerNames,
    hubUrl,
  }

  const html = await renderAsync(React.createElement(PmAssignmentEmail, templateProps))
  const text = await renderAsync(React.createElement(PmAssignmentEmail, templateProps), { plainText: true })

  const messageId = crypto.randomUUID()
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'pm-assignment',
    recipient_email: pmContact.email,
    status: 'pending',
  })

  const { error } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: pmContact.email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: `New appraisal assignment — ${projectName}`,
      html,
      text,
      purpose: 'transactional',
      label: 'pm-assignment',
      queued_at: new Date().toISOString(),
    },
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  triggerEmailQueueProcessor(supabaseUrl, serviceKey)

  return new Response(JSON.stringify({ success: true, emailed: pmContact.email }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
