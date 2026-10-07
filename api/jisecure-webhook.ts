/*
 * api/jisecure-webhook.ts — Vercel API Route
 *
 * This is a PROXY that jiSECURE calls instead of the Supabase Edge Function directly.
 * jiSECURE sends a plain POST without auth headers, but Supabase Edge Functions require
 * the apikey header. This proxy receives the jiSECURE webhook, adds the Supabase auth,
 * and forwards it to the biometric-webhook Edge Function.
 *
 * jiSECURE webhook URL: https://your-app.vercel.app/api/jisecure-webhook
 * No auth headers needed from jiSECURE — we add them here.
 */

export default async function handler(
  req: { method: string; body: Record<string, unknown>; headers: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (data: unknown) => void; send: (data: string) => void } }
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'jiSECURE Webhook Proxy is running. Send POST to trigger.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const body = req.body;
    console.log('jiSECURE webhook received:', JSON.stringify(body));

    // Forward to Supabase Edge Function with proper auth headers
    const response = await fetch(
      `${supabaseUrl}/functions/v1/biometric-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    console.log('Edge Function response:', response.status, JSON.stringify(data));

    return res.status(200).json({ success: true, forwarded: true, data });
  } catch (err) {
    console.error('Webhook proxy error:', err);
    return res.status(200).json({ success: false, error: String(err) });
  }
}