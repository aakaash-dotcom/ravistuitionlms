/*
 * biometric-webhook — Supabase Edge Function
 *
 * Receives punch events from jiSECURE SmartOffice webhook.
 * Uses correct database columns: emp_code, company_id, raw_payload, processed, student_id, session.
 *
 * WhatsApp settings checked from settings table:
 *   biometric_whatsapp_on_entry — if 'false', no message on entry punch
 *   biometric_whatsapp_on_exit  — if 'false', no message on exit punch
 */

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Webhook-Secret, apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function sendWhatsApp(number: string, message: string): Promise<boolean> {
  const accessToken = Deno.env.get("DEROPO_API_KEY");
  if (!accessToken) {
    console.warn("DEROPO_API_KEY not set, skipping WhatsApp");
    return false;
  }
  try {
    const res = await fetch("https://api.deropo.com/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Access-Token": accessToken },
      body: JSON.stringify({ number, type: "text", message }),
    });
    console.log("WhatsApp:", res.status, number);
    return res.ok;
  } catch (e) {
    console.error("WhatsApp error:", e);
    return false;
  }
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.length === 10) p = "91" + p;
  return p;
}

function formatTimeIST(date: Date): string {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatDateIST(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  });
}

function getDateIST(d: Date): string {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffset);
  return istDate.toISOString().slice(0, 10);
}

async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data ? (data as { value: string }).value : null;
}

async function processPunch(body: Record<string, unknown>) {
  const empCode = String(body.emp_code || body.empCode || "");
  const companyId = body.company_id ?? body.companyId ?? null;
  const timestamp = String(body.timestamp || body.punch_time || new Date().toISOString());

  console.log(`Punch received: emp_code=${empCode}, time=${timestamp}`);

  if (!empCode) {
    return { success: false, error: "Missing emp_code in webhook payload" };
  }

  // Parse timestamp — jiSECURE sends "2026-10-07 13:51:51" (no timezone, assume IST)
  const tsStr = timestamp.replace(" ", "T");
  let punchTime: Date;
  if (tsStr.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(tsStr)) {
    punchTime = new Date(tsStr);
  } else {
    punchTime = new Date(tsStr + "+05:30");
  }
  if (isNaN(punchTime.getTime())) {
    return { success: false, error: `Invalid timestamp: ${timestamp}` };
  }

  const today = getDateIST(punchTime);
  const istHour = parseInt(
    punchTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false })
  );
  const session = istHour < 14 ? "Morning" : "Evening";
  const timeStr = formatTimeIST(punchTime);
  const dateStr = formatDateIST(punchTime);

  // Look up student by emp_code (= roll_no)
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("roll_no", empCode)
    .eq("status", "Active")
    .maybeSingle();

  if (!student) {
    console.log(`No student found with roll_no: ${empCode}`);
    await supabase.from("biometric_punches").insert({
      emp_code: empCode,
      company_id: companyId as number | null,
      punch_time: punchTime.toISOString(),
      raw_payload: body,
      processed: false,
      session,
    });
    return { success: true, message: `Punch stored but no student with roll_no=${empCode}`, action: "unmapped" };
  }

  const s = student as Record<string, unknown>;
  const studentId = s.id as string;
  const studentName = s.name as string;
  const rollNo = s.roll_no as string;
  const parentPhone = s.parent_phone as string | null;

  // Record the raw punch
  await supabase.from("biometric_punches").insert({
    emp_code: empCode,
    company_id: companyId as number | null,
    punch_time: punchTime.toISOString(),
    raw_payload: body,
    processed: true,
    student_id: studentId,
    session,
  });

  // Check if attendance record exists for today + session
  const { data: existingAttendance } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_id", studentId)
    .eq("date", today)
    .eq("session", session)
    .maybeSingle();

  if (!existingAttendance) {
    // FIRST PUNCH = ENTRY
    await supabase.from("attendance").insert({
      student_id: studentId,
      date: today,
      session,
      status: "Present",
      entry_time: timeStr,
      exit_time: null,
      punch_source: "biometric",
    });

    // Update biometric_student_map
    await supabase.from("biometric_student_map").upsert(
      { emp_code: empCode, student_id: studentId, jisecure_registered: true, registered_at: new Date().toISOString() },
      { onConflict: "emp_code" }
    );

    // WhatsApp on entry — only if setting is 'true'
    const entryEnabled = await getSetting("biometric_whatsapp_on_entry");
    if (entryEnabled === "true" && parentPhone) {
      const msg =
        `✅ *Ravi's Tuition Centre*\n\n` +
        `Your child *${studentName}* (${rollNo}) has entered the centre at *${timeStr}*.\n\n` +
        `📅 Date: ${dateStr}\n` +
        `📍 Session: ${session}\n\n` +
        `_Biometric Attendance_`;
      await sendWhatsApp(normalizePhone(parentPhone), msg);
    }

    return { success: true, action: "entry", student: studentName, time: timeStr, whatsapp: entryEnabled === "true" };
  }

  // SECOND PUNCH = EXIT
  const existing = existingAttendance as Record<string, unknown>;
  const entryTime = existing.entry_time as string | null;

  if (entryTime && (existing.exit_time as string | null)) {
    return { success: true, action: "extra_punch", message: "Already has entry and exit", student: studentName };
  }

  await supabase
    .from("attendance")
    .update({ exit_time: timeStr, status: "Present", punch_source: "biometric" })
    .eq("id", existing.id as string);

  // WhatsApp on exit — only if setting is NOT 'false' (default ON)
  const exitEnabled = await getSetting("biometric_whatsapp_on_exit");
  if (exitEnabled !== "false" && parentPhone) {
    const msg =
      `📋 *Ravi's Tuition Centre*\n\n` +
      `Your child *${studentName}* (${rollNo}) has left the centre.\n\n` +
      `📅 Date: ${dateStr}\n` +
      `📍 Session: ${session}\n\n` +
      `*Today's Attendance: Present* ✅\n\n` +
      `⏰ Entry Time: ${entryTime || "N/A"}\n` +
      `⏰ Exit Time: ${timeStr}\n\n` +
      `_Biometric Attendance_`;
    await sendWhatsApp(normalizePhone(parentPhone), msg);
  }

  return { success: true, action: "exit", student: studentName, entry: entryTime, exit: timeStr, whatsapp: exitEnabled !== "false" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    if (req.method === "POST") {
      const body = await req.json();
      console.log("Webhook received:", JSON.stringify(body));
      const result = await processPunch(body);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && url.searchParams.get("mode") === "status") {
      const { count: punches } = await supabase
        .from("biometric_punches")
        .select("*", { count: "exact", head: true });
      return new Response(
        JSON.stringify({ status: "ok", total_punches: punches, timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ name: "jiSECURE XS200 Biometric Webhook", status: "running" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
