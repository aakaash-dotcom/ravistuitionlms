/*
 * absent-whatsapp-cron — Supabase Edge Function
 *
 * Called by Vercel Cron at 9 AM IST (morning) and 9 PM IST (evening).
 * For each active student with no attendance record for today's session:
 *   - Mark absent in attendance table
 *   - Send WhatsApp to parent (if biometric_absent_enabled = 'true')
 *
 * Defaults to DISABLED when setting is missing.
 */

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function sendWhatsApp(number: string, message: string): Promise<boolean> {
  const accessToken = Deno.env.get("DEROPO_API_KEY");
  if (!accessToken) return false;
  try {
    const res = await fetch("https://api.deropo.com/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Access-Token": accessToken },
      body: JSON.stringify({ number, type: "text", message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.length === 10) p = "91" + p;
  return p;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let session = url.searchParams.get("session");

    if (req.method === "POST") {
      const body = await req.json();
      session = body.session || session;
    }

    if (!session || !["Morning", "Evening"].includes(session)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid ?session=Morning|Evening" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if absent messages are enabled — DEFAULT to disabled if missing
    const { data: absentSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "biometric_absent_enabled")
      .maybeSingle();

    const absentEnabled = absentSetting ? (absentSetting as { value: string }).value === "true" : false;

    if (!absentEnabled) {
      return new Response(
        JSON.stringify({ message: "Absent messages are disabled", session }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use IST date (UTC + 5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const today = istDate.toISOString().slice(0, 10);

    // Get all active students
    const { data: students } = await supabase
      .from("students")
      .select("*")
      .eq("status", "Active");

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active students found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get today's attendance for this session
    const { data: todayAttendance } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("date", today)
      .eq("session", session);

    const presentIds = new Set(
      ((todayAttendance || []) as Array<{ student_id: string }>).map((a) => a.student_id)
    );

    const results: Array<{ student: string; roll_no: string; whatsapp: boolean }> = [];
    let absentCount = 0;
    let whatsappSent = 0;

    for (const student of students) {
      const s = student as Record<string, unknown>;
      const studentId = s.id as string;

      if (presentIds.has(studentId)) continue;

      // Mark absent in attendance
      await supabase.from("attendance").insert({
        student_id: studentId,
        date: today,
        session,
        status: "Absent",
        punch_source: "auto_absent",
      });

      absentCount++;

      const parentPhone = s.parent_phone as string | null;
      let sent = false;
      if (parentPhone) {
        const waMsg =
          `📋 *Ravi's Tuition Centre*\n\n` +
          `Your child *${s.name}* (${s.roll_no}) did not attend today's ${session} class.\n\n` +
          `📅 Date: ${today}\n` +
          `📍 Session: ${session}\n\n` +
          `*Today's Attendance: Absent* ❌\n\n` +
          `If there is a valid reason for absence, please contact the centre.\n\n` +
          `_Biometric Attendance_`;
        sent = await sendWhatsApp(normalizePhone(parentPhone), waMsg);
        if (sent) whatsappSent++;
      }

      results.push({ student: s.name as string, roll_no: s.roll_no as string, whatsapp: sent });
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        session,
        total_active: students.length,
        already_marked: presentIds.size,
        newly_absent: absentCount,
        whatsapp_sent: whatsappSent,
        details: results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
