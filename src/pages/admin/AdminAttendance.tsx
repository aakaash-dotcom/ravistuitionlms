import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CLASSES, STREAMS } from '@/lib/brand';
import type { Student, AttendanceRow } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { sendPushAlert } from '@/lib/onesignal';
import { Loader2, Save, Sun, Moon } from 'lucide-react';

export default function AdminAttendance() {
  const [students, setStudents] = useState<Student[]>([]);
  const [fClass, setFClass] = useState('10th');
  const [fStream, setFStream] = useState('');
  const [session, setSession] = useState<'Morning' | 'Evening'>('Morning');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from('students').select('*').eq('status', 'Active').eq('class', fClass);
      if (fStream) q = q.eq('stream', fStream);
      const { data } = await q.order('roll_no');
      const list = (data as Student[]) || [];
      setStudents(list);
      const init: Record<string, string> = {};
      list.forEach((s) => (init[s.id] = 'Present'));
      setStatuses(init);

      if (list.length > 0) {
        const { data: existing } = await supabase
          .from('attendance')
          .select('*')
          .in('student_id', list.map((s) => s.id))
          .eq('date', date)
          .eq('session', session);
        (existing as AttendanceRow[])?.forEach((r) => {
          init[r.student_id] = r.status;
        });
        setStatuses({ ...init });
      }
      setLoading(false);
    })();
  }, [fClass, fStream, date, session]);

  async function save() {
    setSaving(true);
    const rows = students.map((s) => ({
      student_id: s.id,
      date,
      status: statuses[s.id] || 'Present',
      session,
    }));
    await supabase.from('attendance').delete().in('student_id', students.map((s) => s.id)).eq('date', date).eq('session', session);
    await supabase.from('attendance').insert(rows);
    await sendPushAlert(
      "Ravi's Tuition Centre · Attendance",
      `Attendance marked for ${date} (${session} Session). Open app to check status.`,
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function markAll(status: string) {
    const next: Record<string, string> = {};
    students.forEach((s) => (next[s.id] = status));
    setStatuses(next);
  }

  return (
    <div className="space-y-4">
      <BackBar to="/admin" label="Back to Dashboard" />
      <h2 className="section-title">Attendance</h2>

      <div className="card p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <select className="input" value={fClass} onChange={(e) => setFClass(e.target.value)}>
          {CLASSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {(fClass === '11th' || fClass === '12th') && (
          <select className="input" value={fStream} onChange={(e) => setFStream(e.target.value)}>
            <option value="">All Streams</option>
            {STREAMS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="flex gap-2">
          <button
            onClick={() => setSession('Morning')}
            className={`badge flex-1 justify-center ${session === 'Morning' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            <Sun size={14} /> Morning
          </button>
          <button
            onClick={() => setSession('Evening')}
            className={`badge flex-1 justify-center ${session === 'Evening' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            <Moon size={14} /> Evening
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => markAll('Present')} className="btn-ghost !py-1.5 text-xs">Mark All Present</button>
        <button onClick={() => markAll('Absent')} className="btn-ghost !py-1.5 text-xs">Mark All Absent</button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {students.map((s) => (
            <div key={s.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{s.name}</div>
                <div className="text-xs text-slate-400">{s.roll_no}</div>
              </div>
              <div className="flex gap-1">
                {['Present', 'Absent', 'Leave'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatuses({ ...statuses, [s.id]: st })}
                    className={`badge ${
                      statuses[s.id] === st
                        ? st === 'Present'
                          ? 'bg-green-500 text-white'
                          : st === 'Absent'
                            ? 'bg-red-500 text-white'
                            : 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={save} className="btn-primary w-full" disabled={saving}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save {session} Attendance</>}
      </button>
      {saved && <p className="text-center text-sm text-green-600">Attendance saved!</p>}
    </div>
  );
}
