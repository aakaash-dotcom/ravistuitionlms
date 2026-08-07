export default async function handler(req: { method: string; body: { title: string; message: string; targetIds?: string[] } }, res: { status: (code: number) => { json: (data: unknown) => void } }) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { title, message, targetIds } = req.body;

    const appId = process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID;
    const restApiKey = process.env.VITE_ONESIGNAL_REST_API_KEY || process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !restApiKey) {
      return res.status(500).json({ error: 'Missing OneSignal keys in Vercel server environment' });
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Key ${restApiKey}`,
    };

    async function sendToOneSignal(segmentName?: string) {
      const payload: Record<string, unknown> = {
        app_id: appId,
        headings: { en: title },
        contents: { en: message },
      };
      if (targetIds && targetIds.length > 0) {
        payload.include_aliases = { external_id: targetIds };
        payload.target_channel = 'push';
      } else {
        payload.included_segments = [segmentName || 'Total Subscriptions'];
      }
      return await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    }

    let response = await sendToOneSignal('Total Subscriptions');
    let json = await response.json();

    if (!response.ok && JSON.stringify(json).toLowerCase().includes('segment')) {
      response = await sendToOneSignal('Subscribed Users');
      json = await response.json();
    }

    return res.status(response.status).json(json);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
