export default async function handler(
  req: { method: string; body: Record<string, unknown>; headers: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (data: unknown) => void } }
) {
  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'jiSECURE Webhook Proxy — Send POST to trigger.' });
  }

  const SUPABASE_URL = 'https://gzdrltwhugvpvqqhqgcm.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6ZHJsdHdodWd2cHZxcWhxZ2NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MjYzNjIsImV4cCI6MjEwMDUwMjM2Mn0.Lmwk926azrmnhXj2Dq4HN4ZOZ_8qztqGNfHWgb_RBBA';

  try {
    console.log('jiSECURE punch:', JSON.stringify(req.body));

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/biometric-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.json();
    console.log('Edge Function:', response.status, JSON.stringify(data));

    return res.status(200).json({ success: true, forwarded: true, data });
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(200).json({ success: false, error: String(err) });
  }
}