import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CLASSES } from '@/lib/brand';
import type { Student } from '@/lib/types';
import BackBar from '@/components/BackBar';
import {
  Check,
  X,
  Clock,
  Save,
  Loader2,
  CheckCircle2,
  Search,
} from 'lucide-react';

type Status = 'Present' | 'Absent' | 'Leave';

export default function AdminAttendance() {
  const [grade, setGrade] = useState('10th');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('class', grade)
        .eq('status', 'Active')
        .order('roll_no');
      const list = (data as Student[]) || [];
      setStudents(list);
      // load existing
      const { data: existing } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', date)
        .in(
          'student_id',
          list.map((s) => s.id),
        );
      const m: Record<string, Status> = {};
      list.forEach((s) => (m[s.id] = 'Present'));
      (existing as { student_id: string; status: Status }[])?.forEach(
        (r) => (m[r.student_id] = r.status),
      );
      setMarks(m);
      setLoading(false);
    })();
  }, [grade, date]);

  function setAll(status: Status) {
    const m: Record<string, Status> = {};
    students.forEach((s) => (m[s.id] = status));
    setMarks(m);
  }

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.roll_no.toLowerCase().includes(q.toLowerCase()),
  );

  const present = Object.values(marks).filter((s) => s === 'Present').length;
  const absent = Object.values(marks).filter((s) => s === 'Absent').length;
  const leave = Object.values(marks).filter((s) => s === 'Leave').length;

  async function save() {
    setSaving(true);
    setSaved(false);
    // upsert rows
    const rows = students.map((s) => ({
      student_id: s.id,
      date,
      status: marks[s.id] || 'Present',
    }));
    // delete existing then insert
    await supabase
      .from('attendance')
      .delete()
      .eq('date', date)
      .in(
        'student_id',
        students.map((s) => s.id),
      );
    await supabase.from('attendance').insert(rows);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <BackBar to="/admin" label="Back to Dashboard" />
      <div className="flex items-center justify-between">
        <h2 className="section-title">Attendance</h2>
        <button onClick={save} className="btn-primary" disabled={saving}>
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : saved ? (
            <CheckCircle2 size={16} />
          ) : (
            <Save size={16} />
          )}
          Save ({present + absent + leave})
        </button>
      </div>

      <div className="card p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="label">Class</label>
          <select className="input" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {CLASSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="relative col-span-2">
          <label className="label">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-8"
              placeholder="Name or roll no"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-blue-600">{present}</div>
          <div className="text-xs text-slate-500">Present</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-red-500">{absent}</div>
          <div className="text-xs text-slate-500">Absent</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-amber-500">{leave}</div>
          <div className="text-xs text-slate-500">Leave</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-slate-700">{present + absent + leave}</div>
          <div className="text-xs text-slate-500">Total</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setAll('Present')} className="btn-ghost flex-1">
          <Check size={14} /> All Present
        </button>
        <button onClick={() => setAll('Absent')} className="btn-ghost flex-1">
          <X size={14} /> All Absent
        </button>
        <button onClick={() => setAll('Leave')} className="btn-ghost flex-1">
          <Clock size={14} /> All Leave
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className="card p-3 flex items-center gap-3">
              <img
                src={s.photo_url || 'https://images.pexels.com/photos/220457/pexels-photo-220457.jpeg'}
                className="w-9 h-9 rounded-lg object-cover"
                alt={s.name}
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{s.name}</div>
                <div className="text-xs text-slate-400">{s.roll_no}</div>
              </div>
              <div className="flex gap-1">
                {(['Present', 'Absent', 'Leave'] as Status[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => setMarks((m) => ({ ...m, [s.id]: st }))}
                    className={`btn !py-1 !px-2.5 text-xs ${
                      marks[s.id] === st
                        ? st === 'Present'
                          ? 'bg-green-500 text-white'
                          : st === 'Absent'
                            ? 'bg-red-500 text-white'
                            : 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {st === 'Present' ? 'P' : st === 'Absent' ? 'A' : 'L'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
