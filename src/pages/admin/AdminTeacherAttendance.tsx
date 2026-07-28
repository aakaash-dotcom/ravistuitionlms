import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Teacher, TeacherAttendanceRow } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { Loader2, Save, Sun, Moon, UserCog } from 'lucide-react';

export default function AdminTeacherAttendance() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [session, setSession] = useState<'Morning' | 'Evening'>('Morning');
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('teachers').select('*').eq('status', 'Active').order('name');
      const list = (data as Teacher[]) || [];
      setTeachers(list);
      const init: Record<string, string> = {};
      list.forEach((t) => (init[t.id] = 'Present'));

      const { data: existing } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('date', date)
        .eq('session', session);
      (existing as TeacherAttendanceRow[])?.forEach((r) => {
        init[r.teacher_id] = r.status;
      });
      setStatuses({ ...init });
      setLoading(false);
    })();
  }, [date, session]);

  async function save() {
    setSaving(true);
    const rows = teachers.map((t) => ({
      teacher_id: t.id,
      date,
      status: statuses[t.id] || 'Present',
      session,
    }));
    await supabase.from('teacher_attendance').delete().in('teacher_id', teachers.map((t) => t.id)).eq('date', date).eq('session', session);
    await supabase.from('teacher_attendance').insert(rows);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <BackBar to="/admin" label="Back to Dashboard" />
      <h2 className="section-title">Teacher Attendance</h2>

      <div className="card p-3 grid grid-cols-2 md:grid-cols-3 gap-3">
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

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : teachers.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <UserCog size={18} /> No active teachers.
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {teachers.map((t) => (
            <div key={t.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-slate-400">{t.phone} · {t.schedule}</div>
              </div>
              <div className="flex gap-1">
                {['Present', 'Absent', 'Leave'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatuses({ ...statuses, [t.id]: st })}
                    className={`badge ${
                      statuses[t.id] === st
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
