/*
 * jisecure-sync — Supabase Edge Function
 *
 * Syncs student data FROM Ravistuitionlms TO jiSECURE SmartOffice platform.
 *
 * jiSECURE API Endpoints (from official docs):
 *   POST /api/employee/add     — Add or update employee (upsert by emp_code)
 *   GET  /api/employee/list    — List all employees
 *   POST /api/employee/delete  — Delete/inactivate employee
 *
 * Auth: Bearer token in Authorization header
 *   Authorization: Bearer <token>
 *
 * Employee fields:
 *   emp_code    (required) — unique ID, we use student roll_no
 *   full_name   (required) — student name
 *   email       (optional) — student email
 *   contact_no  (optional) — parent phone with +91 prefix
 *   designation (optional) — we use "Student - {class}"
 *   gender      (optional) — 0=Male, 1=Female, 2=Other
 *   joining_date(optional) — ISO date YYYY-MM-DD
 *   state_id    (optional) — 1=Active, 0=Inactive
 *   company_id  (optional) — defaults to token owner's company
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/* ─── Get jiSECURE config from biometric_devices table ─── */
async function getJisecureConfig(): Promise<{
  apiUrl: string;
  accessToken: string;
  companyId?: number;
} | null> {
  const { data: device } = await supabase
    .from("biometric_devices")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!device) return null;

  const d = device as Record<string, unknown>;
  const accessToken = d.api_key as string; // Bearer token stored in api_key field
  const apiUrl = (d.api_url as string) || "https://xs.jisecure.com/api";
  const companyId = d.company_id ? Number(d.company_id) : undefined;

  if (!accessToken) return null;

  return { apiUrl, accessToken, companyId };
}

/* ─── Generic jiSECURE API call ─── */
async function jisecureApi(
  apiUrl: string,
  accessToken: string,
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<{ success: boolean; data: unknown; error?: string }> {
  const url = `${apiUrl}${path}`;
  try {
    const options: RequestInit = {
      method,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };
    if (body && method === "POST") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return { success: response.ok, data };
  } catch (err) {
    return { success: false, data: null, error: String(err) };
  }
}

/* ─── Add/Update student in jiSECURE ─── */
async function upsertStudent(
  apiUrl: string,
  accessToken: string,
  companyId: number | undefined,
  student: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  const empCode = student.roll_no as string;
  const fullName = student.name as string;

  if (!empCode || !fullName) {
    return { success: false, message: "Missing roll_no or name" };
  }

  const payload: Record<string, unknown> = {
    emp_code: empCode,
    full_name: fullName,
    designation: `Student - ${student.class || ""}`,
    state_id: 1, // Active
  };

  // Optional fields
  if (student.phone) payload.contact_no = `+91${(student.phone as string).replace(/\D/g, "")}`;
  if (student.parent_phone) payload.email = undefined; // Could use parent phone as contact
  if (companyId) payload.company_id = companyId;

  const result = await jisecureApi(apiUrl, accessToken, "POST", "/employee/add", payload);

  return {
    success: result.success,
    message: result.success
      ? `✅ ${fullName} (${empCode}) registered in jiSECURE`
      : `❌ Failed for ${empCode}: ${result.error || JSON.stringify(result.data)}`,
  };
}

/* ─── Delete student from jiSECURE ─── */
async function deleteStudent(
  apiUrl: string,
  accessToken: string,
  rollNo: string,
  permanent: boolean = false
): Promise<{ success: boolean; message: string }> {
  const result = await jisecureApi(apiUrl, accessToken, "POST", "/employee/delete", {
    emp_code: rollNo,
    state_id: permanent ? 2 : 0,
  });

  return {
    success: result.success,
    message: result.success
      ? `Student ${rollNo} ${permanent ? "permanently deleted" : "deactivated"} from jiSECURE`
      : `Failed: ${result.error || JSON.stringify(result.data)}`,
  };
}

/* ─── List employees from jiSECURE ─── */
async function listEmployees(apiUrl: string, accessToken: string) {
  return await jisecureApi(apiUrl, accessToken, "GET", "/employee/list");
}

/* ─── Main handler ─── */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");

    const config = await getJisecureConfig();

    // ─── GET /?mode=setup — Show setup instructions ───
    if (req.method === "GET" && mode === "setup") {
      return new Response(
        JSON.stringify({
          message: "jiSECURE SmartOffice API Integration",
          api_base: "https://xs.jisecure.com/api",
          auth: "Bearer Token (from Settings > API Tokens on xs.jisecure.com)",
          endpoints: {
            "POST /api/employee/add": "Add/update student (upsert by emp_code)",
            "GET /api/employee/list": "List all employees",
            "POST /api/employee/delete": "Delete/inactivate employee",
          },
          status: config ? "configured" : "not_configured",
          current_config: config
            ? { api_url: config.apiUrl, token: "***configured***", company_id: config.companyId }
            : null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── POST /?mode=add-student — Add one student ───
    if (req.method === "POST" && mode === "add-student") {
      if (!config) {
        return new Response(
          JSON.stringify({ error: "jiSECURE not configured. Add device in Admin > Biometric with your API token." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const studentId = body.student_id as string;

      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .maybeSingle();

      if (!student) {
        return new Response(
          JSON.stringify({ error: "Student not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await upsertStudent(config.apiUrl, config.accessToken, config.companyId, student as Record<string, unknown>);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── POST /?mode=sync-all — Sync all active students ───
    if (req.method === "POST" && mode === "sync-all") {
      if (!config) {
        return new Response(
          JSON.stringify({ error: "jiSECURE not configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: students } = await supabase
        .from("students")
        .select("*")
        .eq("status", "Active")
        .order("roll_no");

      if (!students || students.length === 0) {
        return new Response(
          JSON.stringify({ message: "No active students to sync" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      for (const student of students) {
        const result = await upsertStudent(
          config.apiUrl,
          config.accessToken,
          config.companyId,
          student as Record<string, unknown>
        );
        results.push({
          roll_no: (student as Record<string, unknown>).roll_no,
          name: (student as Record<string, unknown>).name,
          ...result,
        });
        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 200));
      }

      const successCount = results.filter((r) => r.success).length;

      return new Response(
        JSON.stringify({
          total: students.length,
          success: successCount,
          failed: students.length - successCount,
          results,
          next_step: "✅ Students registered! Now enroll their fingerprints on the XS200 device using Roll Number as the Employee Code.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── POST /?mode=delete-student — Remove student ───
    if (req.method === "POST" && mode === "delete-student") {
      if (!config) {
        return new Response(
          JSON.stringify({ error: "jiSECURE not configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();
      const rollNo = body.roll_no as string;

      if (!rollNo) {
        return new Response(
          JSON.stringify({ error: "Missing roll_no" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await deleteStudent(config.apiUrl, config.accessToken, rollNo);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET /?mode=list — List employees from jiSECURE ───
    if (req.method === "GET" && mode === "list") {
      if (!config) {
        return new Response(
          JSON.stringify({ error: "jiSECURE not configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await listEmployees(config.apiUrl, config.accessToken);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Default info ───
    return new Response(
      JSON.stringify({
        name: "jiSECURE SmartOffice API Sync",
        api_base: "https://xs.jisecure.com/api",
        endpoints: {
          "POST /?mode=add-student": "Register one student (body: { student_id })",
          "POST /?mode=sync-all": "Register all active students",
          "POST /?mode=delete-student": "Deactivate student (body: { roll_no })",
          "GET /?mode=list": "List employees from jiSECURE",
          "GET /?mode=setup": "Setup instructions",
        },
        configured: !!config,
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