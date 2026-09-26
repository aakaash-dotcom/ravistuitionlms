import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

export default serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { title, message, targetIds } = await req.json();

    const appId = Deno.env.get("VITE_ONESIGNAL_APP_ID") || Deno.env.get("ONESIGNAL_APP_ID");
    const restApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!appId || !restApiKey) {
      return new Response(JSON.stringify({ error: "Missing OneSignal keys. Set ONESIGNAL_REST_API_KEY and ONESIGNAL_APP_ID as edge function secrets." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
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
        payload.target_channel = "push";
      } else {
        payload.included_segments = [segmentName || "Total Subscriptions"];
      }
      return await fetch("https://api.onesignal.com/notifications", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    }

    let response = await sendToOneSignal("Total Subscriptions");
    let json = await response.json();

    if (!response.ok && JSON.stringify(json).toLowerCase().includes("segment")) {
      response = await sendToOneSignal("Subscribed Users");
      json = await response.json();
    }

    return new Response(JSON.stringify(json), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
