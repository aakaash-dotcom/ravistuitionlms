import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { useLang } from '@/components/LanguageProvider';
import { t } from '@/lib/i18n';
import type { AttendanceRow, Student } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ParentAttendance() {
  const { lang } = useLang();
  const s = useSession();
  const ids = s?.studentIds || [];
  const [kids, setKids] = useState<Student[]>([]);
  const [active, setActive] = useState<Student | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase.from('students').select('*').in('id', ids);
      const list = (data as Student[]) || [];
      setKids(list);
      setActive(list[0] || null);
    })();
  }, [ids]);

  useEffect(() => {
    if (!active) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('attendance').select('*').eq('student_id', active.id).order('date', { ascending: false });
      setRows((data as AttendanceRow[]) || []);
      setLoading(false);
    })();
  }, [active]);

  const present = rows.filter((r) => r.status === 'Present').length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  // calendar
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

  const monthly: Record<string, { present: number; total: number }> = {};
  rows.forEach((r) => {
    const m = r.date.slice(0, 7);
    monthly[m] = monthly[m] || { present: 0, total: 0 };
    monthly[m].total += 1;
    if (r.status === 'Present') monthly[m].present += 1;
  });

  if (!active) return <div className="card p-8 text-center text-slate-500">{t(lang, 'loading')}</div>;

  return (
    <div className="space-y-4">
      <BackBar to="/parent" label={t(lang, 'back')} />
      <h2 className="section-title">{t(lang, 'attendance')}</h2>

      {kids.length > 1 && (
        <div className="card p-3 flex gap-2 overflow-x-auto no-scrollbar">
          {kids.map((k) => (
            <button key={k.id} onClick={() => setActive(k)} className={`badge ${active.id === k.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
              {k.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-green-600">{present}</div>
          <div className="text-xs text-slate-500">{t(lang, 'presentDays')}</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-slate-700">{total}</div>
          <div className="text-xs text-slate-500">{t(lang, 'totalDays')}</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-blue-600">{pct}%</div>
          <div className="text-xs text-slate-500">{t(lang, 'attendancePercent')}</div>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> {t(lang, 'loading')}
        </div>
      ) : (
        <>
          {/* Calendar */}
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

          {/* Monthly breakdown */}
          <div className="card p-4">
            <h3 className="font-bold text-sm mb-3">{t(lang, 'monthlyBreakdown')}</h3>
            <div className="space-y-2">
              {Object.entries(monthly).map(([m, v]) => (
                <div key={m}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold">{m}</span>
                    <span className="text-slate-500">{v.present}/{v.total} ({Math.round((v.present / v.total) * 100)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${(v.present / v.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
