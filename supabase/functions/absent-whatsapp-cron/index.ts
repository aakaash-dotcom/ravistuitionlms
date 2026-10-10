/*
 * absent-whatsapp-cron — Supabase Edge Function
 *
 * Called once at 10:00 PM IST by Vercel Cron.
 * Single nightly check — NO session parameter needed.
 *
 * For each active student, checks today's attendance (both sessions combined):
 *   - Has BOTH entry AND exit → do nothing (exit message already sent at punch-out)
 *   - Has entry but NO exit  → WhatsApp: "entered but not punched out, please check"
 *   - Has NO entry at all    → WhatsApp: "was absent today"
 *
 * Setting: biometric_absent_enabled — if 'false', skip entirely.
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
    // Check if night check is enabled — default ON
    const { data: absentSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "biometric_absent_enabled")
      .maybeSingle();

    const absentEnabled = absentSetting ? (absentSetting as { value: string }).value !== "false" : true;

    if (!absentEnabled) {
      return new Response(
        JSON.stringify({ message: "Night check messages are disabled" }),
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

    // Get today's attendance for ALL sessions (both Morning and Evening combined)
    const { data: todayAttendance } = await supabase
      .from("attendance")
      .select("student_id, status, session, entry_time, exit_time")
      .eq("date", today);

    // Group by student: any record with entry_time = has entry; any with exit_time = has exit
    const attendanceMap = new Map<string, { hasEntry: boolean; hasExit: boolean; sessions: string[] }>();
    for (const att of (todayAttendance || []) as Array<{ student_id: string; entry_time: string | null; exit_time: string | null; session: string }>) {
      const existing = attendanceMap.get(att.student_id) || { hasEntry: false, hasExit: false, sessions: [] as string[] };
      if (att.entry_time) existing.hasEntry = true;
      if (att.exit_time) existing.hasExit = true;
      if (!existing.sessions.includes(att.session)) existing.sessions.push(att.session);
      attendanceMap.set(att.student_id, existing);
    }

    const results: Array<{ student: string; roll_no: string; status: string; whatsapp: boolean }> = [];
    let absentCount = 0;
    let noExitCount = 0;
    let whatsappSent = 0;

    for (const student of students) {
      const s = student as Record<string, unknown>;
      const studentId = s.id as string;
      const studentName = s.name as string;
      const rollNo = s.roll_no as string;
      const parentPhone = s.parent_phone as string | null;

      const att = attendanceMap.get(studentId);

      if (att && att.hasEntry && att.hasExit) {
        // Both entry and exit — exit message already sent at punch-out, skip
        results.push({ student: studentName, roll_no: rollNo, status: "complete", whatsapp: false });
        continue;
      }

      let status = "";
      let waMsg = "";

      if (att && att.hasEntry && !att.hasExit) {
        // Entry but no exit
        status = "no_exit";
        noExitCount++;
        waMsg =
          `📋 *Ravi's Tuition Centre*\n\n` +
          `Your child *${studentName}* (${rollNo}) entered the centre today but has NOT punched out.\n\n` +
          `📅 Date: ${today}\n\n` +
          `⚠️ Please check with your child or contact the centre.\n\n` +
          `_Biometric Attendance_`;
      } else {
        // No entry at all = absent
        status = "absent";
        absentCount++;

        // Mark absent in attendance (Evening session as the record for the day)
        await supabase.from("attendance").insert({
          student_id: studentId,
          date: today,
          session: "Evening",
          status: "Absent",
          punch_source: "auto_absent",
        });

        waMsg =
          `📋 *Ravi's Tuition Centre*\n\n` +
          `Your child *${studentName}* (${rollNo}) was absent today.\n\n` +
          `📅 Date: ${today}\n\n` +
          `If there is a valid reason for absence, please contact the centre.\n\n` +
          `_Biometric Attendance_`;
      }

      let sent = false;
      if (parentPhone) {
        sent = await sendWhatsApp(normalizePhone(parentPhone), waMsg);
        if (sent) whatsappSent++;
      }

      results.push({ student: studentName, roll_no: rollNo, status, whatsapp: sent });
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        total_active: students.length,
        complete: results.filter((r) => r.status === "complete").length,
        no_exit: noExitCount,
        absent: absentCount,
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
