# COMPLETE BIOMETRIC INTEGRATION PROMPT FOR BOLT AI

Copy everything below this line and paste it into Bolt AI:

---

## TASK: Integrate jiSECURE XS200 Biometric Device with WhatsApp Attendance Notifications

I have a tuition centre management app (React + Supabase + Vercel). I bought a **jiSECURE Smart Office XS200** fingerprint biometric attendance device. I need to connect it to my app so that:

1. When a student punches their fingerprint on the XS200 **on entry**, a WhatsApp message goes to the parent: *"Your child [name] has entered the centre at [time]"*
2. When the same student punches **on exit**, a WhatsApp message goes: *"Today's attendance: Present ✅ — Entry: [time], Exit: [time]"*
3. At **9 PM every day**, for students who did NOT punch at all, a WhatsApp goes: *"Today's attendance: Absent ❌"*
4. Admin should be able to register students in jiSECURE directly from the app (using jiSECURE's REST API)

## WHAT HAS ALREADY BEEN BUILT

All the code is already written and committed in the repo. Here are the files:

### New Files Created:
1. `supabase/migrations/20261007000000_add_biometric_integration.sql` — Database migration (creates 3 new tables + adds columns to attendance table)
2. `supabase/functions/biometric-webhook/index.ts` — Supabase Edge Function that receives real-time punch events from jiSECURE webhook
3. `supabase/functions/jisecure-sync/index.ts` — Supabase Edge Function that syncs students to jiSECURE via their REST API
4. `supabase/functions/absent-whatsapp-cron/index.ts` — Supabase Edge Function that marks absent students and sends WhatsApp at 9 PM
5. `api/biometric-poll.ts` — Vercel cron function (polls jiSECURE API every 5 min as backup)
6. `api/absent-morning.ts` — Vercel cron function (triggers morning absent check at 9 AM)
7. `api/absent-evening.ts` — Vercel cron function (triggers evening absent check at 9 PM)
8. `src/pages/admin/AdminBiometric.tsx` — Full admin page for biometric device management

### Modified Files:
9. `src/App.tsx` — Added `/admin/biometric` route
10. `src/lib/types.ts` — Added BiometricDevice, BiometricPunch, BiometricStudentMap types
11. `src/lib/whatsapp.ts` — Added WhatsAppRequest type alias
12. `src/pages/admin/AdminDashboard.tsx` — Added "Biometric" quick action card
13. `src/pages/admin/AdminAttendance.tsx` — Added biometric link banner
14. `src/pages/parent/ParentAttendance.tsx` — Shows entry/exit times with biometric icon
15. `src/pages/student/StudentAttendance.tsx` — Same entry/exit display
16. `supabase/config.toml` — Registered new Edge Functions (verify_jwt = false)
17. `vercel.json` — Added 3 cron schedules

## jiSECURE API DETAILS (CONFIRMED FROM OFFICIAL DOCS)

### Authentication
```
Authorization: Bearer <API_TOKEN>
Content-Type: application/json
```
The API token is generated from xs.jisecure.com → Settings → API Tokens

### API Endpoints

**Add/Update Employee (Upsert):**
```
POST https://xs.jisecure.com/api/employee/add
Body: {
  "emp_code": "RT1001",        // Student's roll number
  "full_name": "Aakaash",      // Student's name
  "designation": "Student - 10th",
  "contact_no": "+919876543210", // Parent phone
  "state_id": 1                 // 1=Active
}
```

**Delete Employee:**
```
POST https://xs.jisecure.com/api/employee/delete
Body: { "emp_code": "RT1001", "state_id": 0 }  // 0=soft delete, 2=permanent
```

**List Employees:**
```
GET https://xs.jisecure.com/api/employee/list
```

### Webhook (Real-time Punch Events)
jiSECURE sends a POST to our webhook URL with this payload:
```json
{
  "event": "punch_log",
  "emp_code": "RT1001",
  "company_id": 10000,
  "timestamp": "2026-10-07 13:51:51"
}
```

## WHAT BOLT AI NEEDS TO DO

### Step 1: Run the database migration
Execute the SQL in `supabase/migrations/20261007000000_add_biometric_integration.sql` in my Supabase database. This creates:
- `biometric_devices` table (stores jiSECURE device info + API token)
- `biometric_punches` table (raw punch logs from device)
- `biometric_student_map` table (maps device employee_id to student)
- Adds `entry_time`, `exit_time`, `punch_source` columns to existing `attendance` table
- Adds settings for absent message timing

### Step 2: Deploy the 3 Supabase Edge Functions
Deploy these Edge Functions to Supabase:

1. **biometric-webhook** (from `supabase/functions/biometric-webhook/index.ts`)
   - Receives real-time punch webhooks from jiSECURE
   - On ENTRY punch: creates attendance record + sends WhatsApp "Your child [name] has entered the centre at [time]"
   - On EXIT punch: updates attendance with exit time + sends WhatsApp "Today's attendance: Present ✅, Entry: [time], Exit: [time]"
   - Looks up student by `emp_code` matching `roll_no` in students table

2. **jisecure-sync** (from `supabase/functions/jisecure-sync/index.ts`)
   - Registers students in jiSECURE SmartOffice via their REST API
   - Uses `POST https://xs.jisecure.com/api/employee/add` with Bearer token
   - `emp_code` = student's roll_no, `full_name` = student's name

3. **absent-whatsapp-cron** (from `supabase/functions/absent-whatsapp-cron/index.ts`)
   - Called by Vercel cron at 9 PM (evening) and 9 AM (morning)
   - Finds students with no attendance record for today's session
   - Marks them absent + sends WhatsApp "Today's attendance: Absent ❌"

### Step 3: Set Supabase Edge Function Secrets
Set these environment variables/secrets for the Edge Functions:
- `DEROPO_API_KEY` — my Deropo WhatsApp API key (should already be set for the existing whatsapp-send function)
- `JISECURE_WEBHOOK_SECRET` — set this to a random string like `jisecure_hook_ravis2026` (for webhook security)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — these should be auto-available to Edge Functions

### Step 4: Deploy the 3 Vercel API routes
These are cron-triggered serverless functions:
- `api/biometric-poll.ts` — polls jiSECURE API every 5 min (backup for webhook)
- `api/absent-morning.ts` — triggers morning absent check at 9 AM IST
- `api/absent-evening.ts` — triggers evening absent check at 9 PM IST

The cron schedule is already configured in `vercel.json`.

Set these Vercel environment variables:
- `SUPABASE_SERVICE_ROLE_KEY` — my Supabase service role key
- `CRON_SECRET` — a random string to secure the cron endpoints

### Step 5: Verify the build
Run `npm run build` to make sure everything compiles correctly.

## AFTER DEPLOYMENT — WHAT I WILL DO MANUALLY

After Bolt AI deploys everything, I will:
1. Get the webhook URL from the deployed biometric-webhook Edge Function
2. Go to xs.jisecure.com → Integrations > Webhook Settings
3. Add the webhook URL there
4. Go to my app → Admin → Biometric → add my jiSECURE device with API token
5. Click "Register All Students" to sync them to jiSECURE
6. Enroll fingerprints on the physical XS200 device

## EXACT WHATSAPP MESSAGES

**On Entry Punch (first punch of the session):**
```
✅ *Ravi's Tuition Centre*

Your child *Aakaash* (RT1001) has entered the centre at *5:15 PM*.

📅 Date: 07/10/2026
📍 Session: Evening

_Biometric Attendance_
```

**On Exit Punch (second punch of the session):**
```
📋 *Ravi's Tuition Centre*

Your child *Aakaash* (RT1001) has left the centre.

📅 Date: 07/10/2026
📍 Session: Evening

*Today's Attendance: Present* ✅

⏰ Entry Time: 5:15 PM
⏰ Exit Time: 8:45 PM

_Biometric Attendance_
```

**Absent Message (at 9 PM for evening, 9 AM for morning):**
```
📋 *Ravi's Tuition Centre*

Your child *Aakaash* (RT1001) did not attend today's Evening class.

📅 Date: 07/10/2026
📍 Session: Evening

*Today's Attendance: Absent* ❌

If there is a valid reason for absence, please contact the centre.

_Biometric Attendance_
```

## COMPLETE FLOW DIAGRAM

```
Student scans fingerprint on XS200
        ↓ (WiFi, instant)
jiSECURE SmartOffice Cloud
        ↓ (real-time webhook POST)
Supabase Edge Function: biometric-webhook
        ↓
  ┌─────────────────────────────────────┐
  │ 1. Receive { event: "punch_log",    │
  │    emp_code: "RT1001",              │
  │    timestamp: "2026-10-07 17:15" }  │
  │                                     │
  │ 2. Look up student by roll_no       │
  │                                     │
  │ 3. If FIRST punch today+session:    │
  │    → Create attendance (Present)    │
  │    → WhatsApp: "entered at 5:15 PM" │
  │                                     │
  │ 4. If SECOND punch today+session:   │
  │    → Update attendance (exit_time)  │
  │    → WhatsApp: "Present ✅          │
  │       Entry: 5:15, Exit: 8:45"     │
  │                                     │
  │ 5. At 9 PM (cron):                  │
  │    → No punch = mark Absent         │
  │    → WhatsApp: "Absent ❌"          │
  └─────────────────────────────────────┘
```

## IMPORTANT NOTES
- The jiSECURE API token is stored in the `biometric_devices` table's `api_key` field
- The webhook URL will be: `https://[project-ref].supabase.co/functions/v1/biometric-webhook`
- WhatsApp is sent via the existing Deropo API (same as the current whatsapp-send function)
- The `emp_code` in jiSECURE = student's `roll_no` in our app (this is the link between the two systems)
- All existing code and functionality should remain unchanged — we are ONLY ADDING the biometric feature