import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import type { AttendanceRow } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { Loader2, Sun, Moon, CheckCircle2, XCircle, Clock, Fingerprint } from 'lucide-react';

interface DaySessions {
  morning?: string;
  evening?: string;
  morningEntry?: string | null;
  morningExit?: string | null;
  eveningEntry?: string | null;
  eveningExit?: string | null;
  morningSource?: string | null;
  eveningSource?: string | null;
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
    if (r.session === 'Evening') {
      byDate[r.date].evening = r.status;
      byDate[r.date].eveningEntry = r.entry_time;
      byDate[r.date].eveningExit = r.exit_time;
      byDate[r.date].eveningSource = r.punch_source;
    } else {
      byDate[r.date].morning = r.status;
      byDate[r.date].morningEntry = r.entry_time;
      byDate[r.date].morningExit = r.exit_time;
      byDate[r.date].morningSource = r.punch_source;
    }
  });

  const totalSessions = rows.length;
  const presentSessions = rows.filter((r) => r.status === 'Present').length;
  const pct = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;
  const distinctDays = Object.keys(byDate).length;

  function StatusBadge({ status, entryTime, exitTime, source }: { status?: string; entryTime?: string | null; exitTime?: string | null; source?: string | null }) {
    if (!status) return <span className="text-xs text-slate-300">—</span>;
    const isBiometric = source === 'biometric';
    return (
      <div className="flex flex-col gap-0.5">
        {status === 'Present' ? (
          <span className="badge bg-green-100 text-green-700">
            <CheckCircle2 size={10} className="mr-1" /> {status}
            {isBiometric && <Fingerprint size={10} className="ml-1" />}
          </span>
        ) : status === 'Absent' ? (
          <span className="badge bg-red-100 text-red-700"><XCircle size={10} className="mr-1" /> {status}</span>
        ) : (
          <span className="badge bg-amber-100 text-amber-700"><Clock size={10} className="mr-1" /> {status}</span>
        )}
        {(entryTime || exitTime) && (
          <div className="text-[10px] text-slate-400 leading-tight">
            {entryTime && <span>↗ {entryTime}</span>}
            {entryTime && exitTime && <span> · </span>}
            {exitTime && <span>↙ {exitTime}</span>}
          </div>
        )}
      </div>
    );
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
                      <StatusBadge
                        status={sessions.morning}
                        entryTime={sessions.morningEntry}
                        exitTime={sessions.morningExit}
                        source={sessions.morningSource}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Moon size={14} className="text-indigo-500" />
                      <span className="text-xs text-slate-500">Evening:</span>
                      <StatusBadge
                        status={sessions.evening}
                        entryTime={sessions.eveningEntry}
                        exitTime={sessions.eveningExit}
                        source={sessions.eveningSource}
                      />
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
