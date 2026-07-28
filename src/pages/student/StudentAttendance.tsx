import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import type { AttendanceRow } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { Loader2, Sun, Moon, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface DaySessions {
  morning?: string;
  evening?: string;
}

export default function StudentAttendance() {
  const s = useSession();
  const sid = s?.studentId;
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sid) return;
    (async () => {
      const { data } = await supabase.from('attendance').select('*').eq('student_id', sid).order('date', { ascending: false });
      setRows((data as AttendanceRow[]) || []);
      setLoading(false);
    })();
  }, [sid]);

  const byDate: Record<string, DaySessions> = {};
  rows.forEach((r) => {
    if (!byDate[r.date]) byDate[r.date] = {};
    if (r.session === 'Evening') byDate[r.date].evening = r.status;
    else byDate[r.date].morning = r.status;
  });

  const totalSessions = rows.length;
  const presentSessions = rows.filter((r) => r.status === 'Present').length;
  const pct = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;
  const distinctDays = Object.keys(byDate).length;

  function StatusBadge({ status }: { status?: string }) {
    if (!status) return <span className="text-xs text-slate-300">—</span>;
    if (status === 'Present') return <span className="badge bg-green-100 text-green-700"><CheckCircle2 size={10} className="mr-1" /> {status}</span>;
    if (status === 'Absent') return <span className="badge bg-red-100 text-red-700"><XCircle size={10} className="mr-1" /> {status}</span>;
    return <span className="badge bg-amber-100 text-amber-700"><Clock size={10} className="mr-1" /> {status}</span>;
  }

  return (
    <div className="space-y-4">
      <BackBar to="/student" label="Back" />
      <h2 className="section-title">Attendance</h2>
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-green-600">{presentSessions}</div>
          <div className="text-xs text-slate-500">Present</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-slate-700">{distinctDays}</div>
          <div className="text-xs text-slate-500">Days</div>
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
      ) : Object.keys(byDate).length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No attendance records yet.</div>
      ) : (
        <div className="space-y-2">
          {Object.entries(byDate)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, sessions]) => {
              const dayName = new Date(date).toLocaleDateString('default', { weekday: 'short' });
              return (
                <div key={date} className="card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-sm">{dayName}</span>
                      <span className="text-xs text-slate-400 ml-2">{date}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <Sun size={14} className="text-amber-500" />
                      <span className="text-xs text-slate-500">Morning:</span>
                      <StatusBadge status={sessions.morning} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Moon size={14} className="text-indigo-500" />
                      <span className="text-xs text-slate-500">Evening:</span>
                      <StatusBadge status={sessions.evening} />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
