const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface WhatsAppMessage {
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

export async function sendWhatsApp(msg: WhatsAppMessage): Promise<{ success: boolean; data: unknown }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(msg),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      console.warn("WhatsApp send warning:", json);
      return { success: false, data: json };
    }
    return { success: true, data: json };
  } catch (e) {
    console.error("WhatsApp send error:", e);
    return { success: false, data: { error: String(e) } };
  }
}

export function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.length === 10) p = "91" + p;
  return p;
}
