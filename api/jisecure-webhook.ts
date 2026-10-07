/*
 * api/jisecure-webhook.ts — Vercel API Route (Webhook Proxy)
 *
 * jiSECURE calls this URL instead of the Supabase Edge Function directly.
 * This proxy adds the Supabase auth headers and forwards the punch event.
 */

export default async function handler(
  req: { method: string; body: Record<string, unknown>; headers: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (data: unknown) => void } }
) {
  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'jiSECURE Webhook Proxy — Send POST to trigger.' });
  }

  // Read from Vercel env vars (Bolt sets these automatically)
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase config. Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('VITE')).join(', '));
    // Still return 200 so jiSECURE doesn't retry endlessly
    return res.status(200).json({ success: false, error: 'Server misconfigured — missing Supabase keys in Vercel env vars' });
  }

  try {
    console.log('jiSECURE punch received:', JSON.stringify(req.body));

    const response = await fetch(
      `${supabaseUrl}/functions/v1/biometric-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.json();
    console.log('Edge Function result:', response.status, JSON.stringify(data));

    return res.status(200).json({ success: true, forwarded: true, data });
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(200).json({ success: false, error: String(err) });
  }
}