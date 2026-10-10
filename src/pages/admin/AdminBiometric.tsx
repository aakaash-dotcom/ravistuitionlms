import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Student, BiometricDevice, BiometricStudentMap } from '@/lib/types';
import { BRAND } from '@/lib/brand';
import BackBar from '@/components/BackBar';
import {
  Loader2,
  Save,
  Fingerprint,
  Plus,
  Trash2,
  Link,
  Wifi,
  RefreshCw,
  Settings,
  CheckCircle2,
  AlertCircle,
  Upload,
  Send,
} from 'lucide-react';

interface MappedStudent extends BiometricStudentMap {
  students?: Student;
}

export default function AdminBiometric() {
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [mappings, setMappings] = useState<MappedStudent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // New device form
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDevice, setNewDevice] = useState({
    device_serial: '',
    device_name: 'XS200',
    location: '',
    api_key: '',        // Bearer token from jiSECURE Settings > API Tokens
    api_url: 'https://xs.jisecure.com/api',
  });

  // New mapping form
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [newMapping, setNewMapping] = useState({
    device_serial: '',
    device_user_id: '',
    student_id: '',
  });

  // Settings — exit messages ON, night check ON
  const [exitMessages, setExitMessages] = useState(true);
  const [absentEnabled, setAbsentEnabled] = useState(true);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ total: number; success: number; failed: number; next_step?: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [devRes, mapRes, stuRes, settingsRes] = await Promise.all([
        supabase.from('biometric_devices').select('*').order('created_at', { ascending: false }),
        supabase
          .from('biometric_student_map')
          .select('*, students(*)')
          .order('created_at', { ascending: false }),
        supabase.from('students').select('*').eq('status', 'Active').order('roll_no'),
        supabase.from('settings').select('*').in('key', [
          'biometric_exit_messages',
          'biometric_absent_enabled',
        ]),
      ]);

      setDevices((devRes.data as BiometricDevice[]) || []);
      setMappings((mapRes.data as MappedStudent[]) || []);
      setStudents((stuRes.data as Student[]) || []);

      // Parse settings
      const settingsMap: Record<string, string> = {};
      ((settingsRes.data || []) as Array<{ key: string; value: string }>).forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      setExitMessages(settingsMap['biometric_exit_messages'] !== 'false');
      setAbsentEnabled(settingsMap['biometric_absent_enabled'] !== 'false');
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }

  async function addDevice() {
    if (!newDevice.device_serial.trim()) {
      setError('Device serial number is required');
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.from('biometric_devices').insert(newDevice);
    if (err) {
      setError(err.message);
    } else {
      setShowAddDevice(false);
      setNewDevice({ device_serial: '', device_name: 'XS200', location: '', api_key: '', api_url: 'http://122.166.44.18:82/api/v2/WebAPI' });
      await loadData();
      showSaved();
    }
    setSaving(false);
  }

  async function deleteDevice(id: string) {
    if (!confirm('Delete this device? All associated mappings will remain.')) return;
    await supabase.from('biometric_devices').delete().eq('id', id);
    await loadData();
  }

  async function addMapping() {
    if (!newMapping.device_serial || !newMapping.device_user_id || !newMapping.student_id) {
      setError('All mapping fields are required');
      return;
    }
    setSaving(true);
    const { error: err } = await supabase.from('biometric_student_map').insert(newMapping);
    if (err) {
      setError(err.message);
    } else {
      setShowAddMapping(false);
      setNewMapping({ device_serial: '', device_user_id: '', student_id: '' });
      await loadData();
      showSaved();
    }
    setSaving(false);
  }

  async function deleteMapping(id: string) {
    if (!confirm('Remove this student-device mapping?')) return;
    await supabase.from('biometric_student_map').delete().eq('id', id);
    await loadData();
  }

  async function saveSettings() {
    setSaving(true);
    const updates = [
      { key: 'biometric_exit_messages', value: exitMessages ? 'true' : 'false' },
      { key: 'biometric_absent_enabled', value: absentEnabled ? 'true' : 'false' },
    ];
    for (const u of updates) {
      await supabase.from('settings').upsert(u);
    }
    setSaving(false);
    showSaved();
  }

  async function syncAllToJisecure() {
    if (!confirm('This will register ALL active students in the jiSECURE SmartOffice system. Continue?')) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/jisecure-sync?mode=sync-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
      });
      const data = await res.json();
      setSyncResult(data);
      showSaved();
    } catch (e) {
      setError(`Sync failed: ${String(e)}`);
    }
    setSyncing(false);
  }

  async function addStudentToJisecure(studentId: string) {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/jisecure-sync?mode=add-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({ student_id: studentId }),
      });
      const data = await res.json();
      if (data.success) {
        showSaved();
      } else {
        setError(data.message || 'Failed to add student to jiSECURE');
      }
    } catch (e) {
      setError(`Failed: ${String(e)}`);
    }
  }

  function showSaved() {
    setSaved(true);
    setError('');
    setTimeout(() => setSaved(false), 2000);
  }

  const mappedStudentIds = new Set(mappings.map((m) => m.student_id));
  const unmappedStudents = students.filter((s) => !mappedStudentIds.has(s.id));

  if (loading) {
    return (
      <div className="card p-8 text-center text-slate-500">
        <Loader2 size={20} className="animate-spin inline mr-2" /> Loading Biometric Settings...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BackBar to="/admin" label="Back to Dashboard" />
      <h2 className="section-title flex items-center gap-2">
        <Fingerprint size={20} className="text-blue-600" /> Biometric Attendance
      </h2>

      {error && (
        <div className="card p-3 bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError('')} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {/* ─── Device Management ─── */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Wifi size={16} className="text-green-600" /> Registered Devices
          </h3>
          <button onClick={() => setShowAddDevice(!showAddDevice)} className="btn-ghost !py-1 !px-2 text-xs">
            <Plus size={14} /> Add Device
          </button>
        </div>

        {showAddDevice && (
          <div className="bg-blue-50 rounded-lg p-3 mb-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input text-sm"
                placeholder="Device Serial *"
                value={newDevice.device_serial}
                onChange={(e) => setNewDevice({ ...newDevice, device_serial: e.target.value })}
              />
              <input
                className="input text-sm"
                placeholder="Device Name"
                value={newDevice.device_name}
                onChange={(e) => setNewDevice({ ...newDevice, device_name: e.target.value })}
              />
            </div>
            <input
              className="input text-sm"
              placeholder="Location (e.g. Main Gate)"
              value={newDevice.location}
              onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
            />
            <input
              className="input text-sm"
              placeholder="SmartOffice API Key"
              value={newDevice.api_key}
              onChange={(e) => setNewDevice({ ...newDevice, api_key: e.target.value })}
            />
            <input
              className="input text-sm"
              placeholder="API URL"
              value={newDevice.api_url}
              onChange={(e) => setNewDevice({ ...newDevice, api_url: e.target.value })}
            />
            <p className="text-xs text-slate-500">
              Get your <strong>API Token</strong> from xs.jisecure.com → Settings → API Tokens.
              Paste it as the "API Key" field above. Serial number is printed on the back of your XS200.
            </p>
            <button onClick={addDevice} disabled={saving} className="btn-primary text-xs">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Save Device</>}
            </button>
          </div>
        )}

        {devices.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            No biometric devices registered yet. Add your jiSECURE XS200 above.
          </p>
        ) : (
          <div className="space-y-2">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Fingerprint size={20} className="text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{d.device_name}</div>
                  <div className="text-xs text-slate-400">S/N: {d.device_serial}</div>
                  {d.location && <div className="text-xs text-slate-400">📍 {d.location}</div>}
                </div>
                <span className={`badge text-xs ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {d.is_active ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => deleteDevice(d.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Student ↔ Device Mapping ─── */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Link size={16} className="text-purple-600" /> Student ↔ Device Mapping
          </h3>
          <button onClick={() => setShowAddMapping(!showAddMapping)} className="btn-ghost !py-1 !px-2 text-xs">
            <Plus size={14} /> Add Mapping
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Map each student's biometric device User ID (the number enrolled on the XS200 fingerprint scanner) to their
          student record. When the student punches on the device, the system will automatically identify them.
        </p>

        {showAddMapping && (
          <div className="bg-purple-50 rounded-lg p-3 mb-3 space-y-2">
            <select
              className="input text-sm"
              value={newMapping.device_serial}
              onChange={(e) => setNewMapping({ ...newMapping, device_serial: e.target.value })}
            >
              <option value="">Select Device</option>
              {devices.map((d) => (
                <option key={d.id} value={d.device_serial}>
                  {d.device_name} ({d.device_serial})
                </option>
              ))}
            </select>
            <input
              className="input text-sm"
              placeholder="Device User ID (number on the scanner, e.g. 1, 2, 3...)"
              value={newMapping.device_user_id}
              onChange={(e) => setNewMapping({ ...newMapping, device_user_id: e.target.value })}
            />
            <select
              className="input text-sm"
              value={newMapping.student_id}
              onChange={(e) => setNewMapping({ ...newMapping, student_id: e.target.value })}
            >
              <option value="">Select Student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.roll_no}) — {s.class}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              💡 Tip: Use the student's roll number as the Device User ID on the XS200 for easy management.
            </p>
            <button onClick={addMapping} disabled={saving} className="btn-primary text-xs">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <><Link size={14} /> Save Mapping</>}
            </button>
          </div>
        )}

        {mappings.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-400">No mappings configured yet.</p>
            <p className="text-xs text-slate-300 mt-1">
              Enroll students on the XS200 device, then map their User IDs here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {mappings.map((m) => {
              const student = m.students;
              return (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {m.device_user_id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{student?.name || 'Unknown Student'}</div>
                    <div className="text-xs text-slate-400">
                      Roll: {student?.roll_no} • Class: {student?.class} • Device: {m.device_serial}
                    </div>
                  </div>
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  <button onClick={() => deleteMapping(m.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {unmappedStudents.length > 0 && (
          <div className="mt-3 p-3 bg-amber-50 rounded-lg">
            <p className="text-xs font-semibold text-amber-700 mb-1">
              ⚠️ {unmappedStudents.length} student(s) not yet mapped to a device:
            </p>
            <p className="text-xs text-amber-600">
              {unmappedStudents.map((s) => `${s.name} (${s.roll_no})`).join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* ─── Sync Students to jiSECURE ─── */}
      {devices.length > 0 && (
        <div className="card p-4">
          <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
            <Upload size={16} className="text-teal-600" /> Sync Students to jiSECURE
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Register your students as "Employees" in the jiSECURE SmartOffice system.
            After syncing, you'll need to <strong>enroll their fingerprints on the physical XS200 device</strong> using
            their <strong>Roll Number</strong> as the Employee ID.
          </p>

          <button
            onClick={syncAllToJisecure}
            disabled={syncing}
            className="btn-primary w-full mb-3"
          >
            {syncing ? (
              <><Loader2 size={16} className="animate-spin" /> Syncing {students.length} students...</>
            ) : (
              <><Send size={16} /> Register All {students.length} Students in jiSECURE</>
            )}
          </button>

          {syncResult && (
            <div className="bg-green-50 rounded-lg p-3 mb-3 text-sm">
              <div className="font-semibold text-green-700">✅ Sync Complete!</div>
              <div className="text-green-600 text-xs mt-1">
                {syncResult.success} of {syncResult.total} students registered successfully.
                {syncResult.failed > 0 && ` (${syncResult.failed} failed)`}
              </div>
              {syncResult.next_step && (
                <div className="text-amber-700 text-xs mt-2 p-2 bg-amber-50 rounded">
                  ⚠️ <strong>Next Step:</strong> {syncResult.next_step}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Or register individual students:</p>
            {unmappedStudents.slice(0, 10).map((s) => (
              <div key={s.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-slate-400">{s.roll_no} — {s.class}</div>
                </div>
                <button
                  onClick={() => addStudentToJisecure(s.id)}
                  className="btn-ghost !py-1 !px-2 text-xs"
                >
                  <Upload size={12} /> Register
                </button>
              </div>
            ))}
            {unmappedStudents.length > 10 && (
              <p className="text-xs text-slate-400">...and {unmappedStudents.length - 10} more. Use "Register All" above.</p>
            )}
          </div>
        </div>
      )}

      {/* ─── Notification Settings ─── */}
      <div className="card p-4">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
          <Settings size={16} className="text-orange-600" /> Notification Settings
        </h3>

        <div className="space-y-4">
          {/* Exit Messages */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <div className="font-semibold text-sm">Exit WhatsApp Messages</div>
              <div className="text-xs text-slate-500">
                Send WhatsApp to parents when student punches out (includes entry time, exit time, date and session)
              </div>
            </div>
            <button
              onClick={() => setExitMessages(!exitMessages)}
              className={`badge cursor-pointer ${exitMessages ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}
            >
              {exitMessages ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Night Check Messages */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <div className="font-semibold text-sm">10 PM Night Check Messages</div>
              <div className="text-xs text-slate-500">
                At 10:00 PM IST, sends WhatsApp to parents of students who were absent or did not punch out
              </div>
            </div>
            <button
              onClick={() => setAbsentEnabled(!absentEnabled)}
              className={`badge cursor-pointer ${absentEnabled ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}
            >
              {absentEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <button onClick={saveSettings} disabled={saving} className="btn-primary w-full">
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Save size={16} /> Save Notification Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── How It Works ─── */}
      <div className="card p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
          <RefreshCw size={16} className="text-blue-600" /> How Biometric Attendance Works
        </h3>
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex gap-2">
            <span className="font-bold text-blue-600">1.</span>
            <span>Student registers their fingerprint on the jiSECURE XS200 device with a User ID (e.g., their roll number)</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-600">2.</span>
            <span>Map the device User ID to the student record using the mapping section above</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-600">3.</span>
            <span>1st punch = Entry → system records entry time. No WhatsApp sent.</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-600">4.</span>
            <span>2nd punch = Exit → system records exit time & sends WhatsApp to parent with both times</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold text-blue-600">5.</span>
            <span>At 10 PM IST, night check runs: absent students get a message, students who entered but did not punch out get a reminder</span>
          </div>
        </div>
      </div>

      {saved && (
        <p className="text-center text-sm text-green-600 flex items-center justify-center gap-1">
          <CheckCircle2 size={14} /> Settings saved successfully!
        </p>
      )}
    </div>
  );
}