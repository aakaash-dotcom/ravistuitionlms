import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import type { AttendanceRow } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function StudentAttendance() {
  const s = useSession();
  const sid = s?.studentId;
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!sid) return;
    (async () => {
      const { data } = await supabase.from('attendance').select('*').eq('student_id', sid).order('date', { ascending: false });
      setRows((data as AttendanceRow[]) || []);
      setLoading(false);
    })();
  }, [sid]);

  const present = rows.filter((r) => r.status === 'Present').length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const statusByDate: Record<string, string> = {};
  rows.forEach((r) => { statusByDate[r.date] = r.status; });

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const monthName = new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  }

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
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="btn-ghost !p-1.5"><ChevronLeft size={16} /></button>
            <span className="font-bold text-sm">{monthName}</span>
            <button onClick={nextMonth} className="btn-ghost !p-1.5"><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-[10px] font-semibold text-slate-400 py-1">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const status = statusByDate[dateStr];
              return (
                <div
                  key={day}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs ${
                    status === 'Present' ? 'bg-green-100 text-green-700 font-bold' :
                    status === 'Absent' ? 'bg-red-100 text-red-700 font-bold' :
                    status === 'Leave' ? 'bg-amber-100 text-amber-700 font-bold' :
                    'bg-slate-50 text-slate-400'
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100" /> Present</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100" /> Absent</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100" /> Leave</span>
          </div>
        </div>
      )}
    </div>
  );
}
