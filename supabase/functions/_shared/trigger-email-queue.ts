/** Fire-and-forget: wake the email queue processor after enqueueing. */
export function triggerEmailQueueProcessor(supabaseUrl: string, serviceKey: string): void {
  fetch(`${supabaseUrl}/functions/v1/process-email-queue`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  }).catch((err) => console.error('process-email-queue trigger failed', err))
}
