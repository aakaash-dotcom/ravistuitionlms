export default async function handler(
  req: { method: string; headers: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (data: unknown) => void } }
) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase config' });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/absent-whatsapp-cron?session=Morning`,
      { method: 'GET', headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey } }
    );
    const data = await response.json();
    return res.status(200).json({ success: true, session: 'Morning', data });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}