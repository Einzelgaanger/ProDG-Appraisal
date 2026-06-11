import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const token = url.searchParams.get('token')?.trim()
  if (!token) {
    return new Response(JSON.stringify({ error: 'token is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: delivery, error } = await supabase
    .from('appraisal_result_deliveries')
    .select('storage_path, expires_at, employee_id, employees(name)')
    .eq('token', token)
    .maybeSingle()

  if (error || !delivery) {
    return new Response(JSON.stringify({ error: 'Invalid or expired link' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (new Date(delivery.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: 'This download link has expired' }), {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: file, error: dlError } = await supabase.storage
    .from('appraisal-pdfs')
    .download(delivery.storage_path)

  if (dlError || !file) {
    console.error('PDF download failed', dlError)
    return new Response(JSON.stringify({ error: 'Could not retrieve PDF' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const employeeName = (delivery as { employees?: { name?: string } }).employees?.name ?? 'appraisal'
  const safeName = employeeName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
  const bytes = new Uint8Array(await file.arrayBuffer())

  return new Response(bytes, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ProDG-Appraisal-${safeName}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
})
