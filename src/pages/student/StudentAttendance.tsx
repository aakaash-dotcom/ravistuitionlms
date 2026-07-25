import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import BackBar from '@/components/BackBar';
import type { AttendanceRow } from '@/lib/types';
import { Loader2, CalendarCheck } from 'lucide-react';

export default function StudentAttendance() {
  const s = useSession();
  const sid = s?.studentId;
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sid) return;
    (async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', sid)
        .order('date', { ascending: false });
      setRows((data as AttendanceRow[]) || []);
      setLoading(false);
    })();
  }, [sid]);

  const present = rows.filter((r) => r.status === 'Present').length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <BackBar to="/student" label="Back" />
      <h2 className="section-title">Attendance</h2>
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-green-600">{present}</div>
          <div className="text-xs text-slate-500">Present</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-slate-700">{total}</div>
          <div className="text-xs text-slate-500">Total Days</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-blue-600">{pct}%</div>
          <div className="text-xs text-slate-500">Percentage</div>
        </div>
      </div>
      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {rows.map((r) => (
            <div key={r.id} className="p-3 flex items-center gap-3">
              <CalendarCheck size={16} className="text-slate-400" />
              <span className="flex-1 text-sm">{r.date}</span>
              <span
                className={`badge ${
                  r.status === 'Present'
                    ? 'bg-green-100 text-green-700'
                    : r.status === 'Absent'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                }`}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
