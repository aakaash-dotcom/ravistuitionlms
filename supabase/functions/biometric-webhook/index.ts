/*
 * biometric-webhook — Supabase Edge Function
 *
 * Receives REAL-TIME punch events from jiSECURE SmartOffice webhook.
 *
 * jiSECURE Webhook Payload (from official docs):
 * {
 *   "event":      "punch_log",
 *   "emp_code":   "26000",
 *   "company_id": 10000,
 *   "timestamp":  "2026-10-07 13:51:51"
 * }
 *
 * Webhook Setup on jiSECURE:
 *   1. Go to xs.jisecure.com > Integrations > Webhook Settings
 *   2. Enter this function's URL as the webhook endpoint
 *   3. Set secret key if desired
 *
 * Flow:
 *   1. Receive punch webhook from jiSECURE
 *   2. Look up student by emp_code (roll_no) in students table
 *   3. Determine session (Morning/Evening) based on punch time
 *   4. First punch of session → ENTRY → create attendance, WhatsApp "arrived"
 *   5. Second punch of session → EXIT → update attendance, WhatsApp "left"
 *   6. No punch by cutoff → absent-whatsapp-cron marks absent at 9AM/9PM
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Webhook-Secret, apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("JISECURE_WEBHOOK_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/* ─── WhatsApp via Deropo API ─── */
async function sendWhatsApp(number: string, message: string): Promise<boolean> {
  const accessToken = Deno.env.get("DEROPO_API_KEY");
  if (!accessToken) {
    console.warn("DEROPO_API_KEY not set, skipping WhatsApp");
    return false;
  }
  try {
    const res = await fetch("https://api.deropo.com/api/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Token": accessToken,
      },
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

/* ─── Format helpers (IST) ─── */
function formatTimeIST(date: Date): string {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateIST(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/* ─── Process jiSECURE punch event ─── */
async function processPunch(body: Record<string, unknown>) {
  // jiSECURE webhook fields (from official API docs)
  const event = String(body.event || "");
  const empCode = String(body.emp_code || "");
  const companyId = body.company_id;
  const timestamp = String(body.timestamp || new Date().toISOString());

  console.log(`Punch received: event=${event}, emp_code=${empCode}, time=${timestamp}`);

  if (!empCode) {
    return { success: false, error: "Missing emp_code in webhook payload" };
  }

  const punchTime = new Date(timestamp);
  // Use IST date (UTC + 5:30) for attendance date
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(punchTime.getTime() + istOffset);
  const today = istDate.toISOString().slice(0, 10);

  // Determine session: Morning (before 2 PM IST) or Evening (2 PM onwards IST)
  const istHour = parseInt(
    punchTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false })
  );
  const session = istHour < 14 ? "Morning" : "Evening";

  // Store raw punch log
  await supabase.from("biometric_punches").insert({
    device_serial: `company_${companyId || "default"}`,
    device_user_id: empCode,
    punch_time: punchTime.toISOString(),
    punch_direction: "in", // jiSECURE doesn't specify direction in webhook, we determine from context
    verify_mode: "fingerprint",
  });

  // Look up student by emp_code (which = roll_no)
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("roll_no", empCode)
    .eq("status", "Active")
    .maybeSingle();

  if (!student) {
    console.log(`No student found with roll_no: ${empCode}`);
    return {
      success: true,
      message: `Punch stored but no student with roll_no=${empCode}`,
      action: "unmapped",
    };
  }

  const s = student as Record<string, unknown>;
  const studentId = s.id as string;
  const studentName = s.name as string;
  const rollNo = s.roll_no as string;
  const parentPhone = s.parent_phone as string | null;
  const timeStr = formatTimeIST(punchTime);
  const dateStr = formatDateIST(punchTime);

  // Mark punch as processed with student_id
  await supabase
    .from("biometric_punches")
    .update({ student_id: studentId, processed: true })
    .eq("device_user_id", empCode)
    .eq("processed", false);

  // Check if attendance record exists for today + session
  const { data: existingAttendance } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_id", studentId)
    .eq("date", today)
    .eq("session", session)
    .maybeSingle();

  if (!existingAttendance) {
    // ─── FIRST PUNCH = ENTRY ───
    await supabase.from("attendance").insert({
      student_id: studentId,
      date: today,
      session,
      status: "Present",
      entry_time: timeStr,
      exit_time: null,
      punch_source: "biometric",
    });

    // Also create/update mapping for future reference
    await supabase.from("biometric_student_map").upsert(
      {
        device_serial: `company_${companyId || "default"}`,
        device_user_id: empCode,
        student_id: studentId,
      },
      { onConflict: "device_serial,device_user_id" }
    );

    // WhatsApp: Student arrived
    if (parentPhone) {
      const msg =
        `✅ *Ravi's Tuition Centre*\n\n` +
        `Your child *${studentName}* (${rollNo}) has entered the centre at *${timeStr}*.\n\n` +
        `📅 Date: ${dateStr}\n` +
        `📍 Session: ${session}\n\n` +
        `_Biometric Attendance_`;
      await sendWhatsApp(normalizePhone(parentPhone), msg);
    }

    return { success: true, action: "entry", student: studentName, time: timeStr };
  }

  // ─── SECOND PUNCH = EXIT ───
  const existing = existingAttendance as Record<string, unknown>;
  const entryTime = existing.entry_time as string | null;

  await supabase
    .from("attendance")
    .update({ exit_time: timeStr, status: "Present" })
    .eq("id", existing.id as string);

  // WhatsApp: Student left (with attendance summary)
  if (parentPhone) {
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

  return { success: true, action: "exit", student: studentName, entry: entryTime, exit: timeStr };
}

/* ─── HTTP Handler ─── */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // ─── POST / — Receive jiSECURE webhook ───
    if (req.method === "POST") {
      // Verify webhook secret if configured
      if (WEBHOOK_SECRET) {
        const provided = req.headers.get("X-Webhook-Secret") || url.searchParams.get("secret");
        if (provided !== WEBHOOK_SECRET) {
          return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const body = await req.json();
      console.log("Webhook received:", JSON.stringify(body));

      const result = await processPunch(body);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET /?mode=status — Health check ───
    if (req.method === "GET" && url.searchParams.get("mode") === "status") {
      const { count: punches } = await supabase
        .from("biometric_punches")
        .select("*", { count: "exact", head: true });
      const { count: mapped } = await supabase
        .from("biometric_student_map")
        .select("*", { count: "exact", head: true });

      return new Response(
        JSON.stringify({
          status: "ok",
          message: "jiSECURE XS200 Biometric Webhook is running",
          total_punches: punches,
          mapped_students: mapped,
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── GET / — Info ───
    return new Response(
      JSON.stringify({
        name: "jiSECURE XS200 → Ravi's Tuition Biometric Webhook",
        webhook_payload: {
          event: "punch_log",
          emp_code: "string — maps to student roll_no",
          company_id: "integer",
          timestamp: "YYYY-MM-DD HH:mm:ss",
        },
        setup_steps: [
          "1. Deploy this Edge Function",
          "2. Go to xs.jisecure.com → Integrations > Webhook Settings",
          "3. Enter this URL as the webhook endpoint",
          "4. Click Test Payload to verify",
        ],
        endpoints: {
          "POST /": "Receive punch webhook from jiSECURE",
          "GET /?mode=status": "Health check",
        },
      }),
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