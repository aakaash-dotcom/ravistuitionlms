import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import BackBar from '@/components/BackBar';
import { useLang } from '@/components/LanguageProvider';
import { t } from '@/lib/i18n';
import type { AttendanceRow, Student } from '@/lib/types';
import { Loader2, CalendarCheck } from 'lucide-react';

export default function ParentAttendance() {
  const { lang } = useLang();
  const s = useSession();
  const ids = s?.studentIds || [];
  const [kids, setKids] = useState<Student[]>([]);
  const [active, setActive] = useState<Student | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

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
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', active.id)
        .order('date', { ascending: false });
      setRows((data as AttendanceRow[]) || []);
      setLoading(false);
    })();
  }, [active]);

  const present = rows.filter((r) => r.status === 'Present').length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  // monthly breakdown
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
            <button
              key={k.id}
              onClick={() => setActive(k)}
              className={`badge ${active.id === k.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}
            >
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
          <div className="card p-4">
            <h3 className="font-bold text-sm mb-3">{t(lang, 'monthlyBreakdown')}</h3>
            <div className="space-y-2">
              {Object.entries(monthly).map(([m, v]) => (
                <div key={m}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold">{m}</span>
                    <span className="text-slate-500">
                      {v.present}/{v.total} ({Math.round((v.present / v.total) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(v.present / v.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

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
        </>
      )}
    </div>
  );
}
