import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

export interface WhatsAppRequest {
  number: string;
  type?: "text" | "image" | "document" | "audio";
  message?: string;
  image_url?: string;
  document_url?: string;
  file_name?: string;
  audio_url?: string;
  template_id?: number;
  variables?: Record<string, string>;
}

export async function sendWhatsApp(req: WhatsAppRequest): Promise<{ success: boolean; status: number; data: unknown }> {
  const accessToken = Deno.env.get("DEROPO_API_KEY");
  if (!accessToken) {
    return { success: false, status: 500, data: { error: "DEROPO_API_KEY not configured" } };
  }

  const baseUrl = "https://api.deropo.com/api/send";
  const body: Record<string, unknown> = {
    number: req.number,
    type: req.type || "text",
  };
  if (req.message) body.message = req.message;
  if (req.image_url) body.variables = { ...body.variables as Record<string, unknown>, imageUrl: req.image_url };
  if (req.document_url) body.variables = { ...body.variables as Record<string, unknown>, documentUrl: req.document_url, fileName: req.file_name || "file.pdf" };
  if (req.audio_url) body.variables = { ...body.variables as Record<string, unknown>, audioUrl: req.audio_url };
  if (req.template_id) body.template_id = req.template_id;
  if (req.variables) body.variables = { ...(body.variables as Record<string, unknown>), ...req.variables };

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Token": accessToken,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return { success: response.ok, status: response.status, data };
  } catch (err) {
    return { success: false, status: 500, data: { error: String(err) } };
  }
}

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
    const payload: WhatsAppRequest = await req.json();
    const result = await sendWhatsApp(payload);
    return new Response(JSON.stringify(result), {
      status: result.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
