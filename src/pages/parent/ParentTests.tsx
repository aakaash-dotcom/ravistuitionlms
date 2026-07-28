import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { useLang } from '@/components/LanguageProvider';
import { t } from '@/lib/i18n';
import type { Student, TestReport, DailyTest } from '@/lib/types';
import { downloadPeriodReportCard, sharePeriodReportOnWhatsapp, pctOf } from '@/lib/pdf';
import BackBar from '@/components/BackBar';
import { BRAND } from '@/lib/brand';
import { Download, MessageCircle, Loader2, TrendingUp, FileText, Award, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

type Mode = 'Weekly' | 'Monthly' | 'Daily MCQ';

const COLORS = ['#0052FF', '#F59E0B', '#22C55E', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ParentTests() {
  const { lang } = useLang();
  const s = useSession();
  const ids = s?.studentIds || [];
  const [kids, setKids] = useState<Student[]>([]);
  const [active, setActive] = useState<Student | null>(null);
  const [reports, setReports] = useState<TestReport[]>([]);
  const [mcqResults, setMcqResults] = useState<DailyTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('Weekly');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [downloading, setDownloading] = useState<string | null>(null);

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
      const { data: r } = await supabase.from('test_reports').select('*').eq('student_id', active.id).order('test_date', { ascending: true });
      setReports((r as TestReport[]) || []);
      const { data: mcq } = await supabase.from('daily_tests').select('*').eq('student_id', active.id).order('created_at', { ascending: false });
      setMcqResults((mcq as DailyTest[]) || []);
      setLoading(false);
    })();
  }, [active]);

  const modeReports = useMemo(() => reports.filter((r) => r.test_type === mode), [reports, mode]);

  const periods = useMemo(() => {
    const set = new Set<string>();
    modeReports.forEach((r) => {
      if (mode === 'Weekly' && r.week) set.add(r.week);
      if (mode === 'Monthly' && r.month) set.add(r.month);
    });
    return Array.from(set).sort((a, b) => {
      if (mode === 'Weekly') {
        const na = parseInt(a.replace(/\D/g, '')) || 0;
        const nb = parseInt(b.replace(/\D/g, '')) || 0;
        return na - nb;
      }
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return months.indexOf(a) - months.indexOf(b);
    });
  }, [modeReports, mode]);

  const subjectsInData = useMemo(() => {
    const set = new Set<string>();
    modeReports.forEach((r) => set.add(r.subject));
    return Array.from(set);
  }, [modeReports]);

  const chartSubjects = subjectFilter === 'All' ? subjectsInData : [subjectFilter];

  // Build chart data: one entry per period, with each subject as a key
  const chartData = useMemo(() => {
    return periods.map((p) => {
      const row: Record<string, number | string | null> = { period: p };
      chartSubjects.forEach((subject) => {
        const matching = modeReports.filter((r) => {
          const rp = mode === 'Weekly' ? r.week : r.month;
          return r.subject === subject && rp === p;
        });
        if (matching.length === 0) {
          row[subject] = null;
        } else {
          const avg = matching.reduce((sum, r) => sum + pctOf(Number(r.marks), Number(r.out_of)), 0) / matching.length;
          row[subject] = Math.round(avg);
        }
      });
      return row;
    });
  }, [periods, chartSubjects, modeReports, mode]);

  // Compute trend: compare last two periods for "All Subjects" average
  const trendInfo = useMemo(() => {
    if (periods.length < 2) return null;
    const getLastAvg = (p: string) => {
      const matching = modeReports.filter((r) => {
        const rp = mode === 'Weekly' ? r.week : r.month;
        return rp === p;
      });
      if (matching.length === 0) return null;
      return Math.round(matching.reduce((sum, r) => sum + pctOf(Number(r.marks), Number(r.out_of)), 0) / matching.length);
    };
    const prev = getLastAvg(periods[periods.length - 2]);
    const curr = getLastAvg(periods[periods.length - 1]);
    if (prev === null || curr === null) return null;
    const diff = curr - prev;
    return { diff, curr, prev };
  }, [periods, modeReports, mode]);

  async function downloadPeriod(period: string) {
    if (!active) return;
    setDownloading(period);
    try {
      const periodReports = modeReports.filter((r) => (mode === 'Weekly' ? r.week === period : r.month === period));
      await downloadPeriodReportCard(active, periodReports, period, mode as 'Weekly' | 'Monthly');
    } finally {
      setDownloading(null);
    }
  }

  function sharePeriod(period: string) {
    if (!active) return;
    const periodReports = modeReports.filter((r) => (mode === 'Weekly' ? r.week === period : r.month === period));
    const avg = periodReports.length > 0 ? Math.round(periodReports.reduce((sum, r) => sum + pctOf(Number(r.marks), Number(r.out_of)), 0) / periodReports.length) : 0;
    sharePeriodReportOnWhatsapp(active, period, mode as 'Weekly' | 'Monthly', avg);
  }

  if (!active) return <div className="card p-8 text-center text-slate-500">{t(lang, 'loading')}</div>;

  return (
    <div className="space-y-4">
      <BackBar to="/parent" label={t(lang, 'back')} />
      <h2 className="section-title">{t(lang, 'testReportCard')}</h2>

      {kids.length > 1 && (
        <div className="card p-3 flex gap-2 overflow-x-auto no-scrollbar">
          {kids.map((k) => (
            <button key={k.id} onClick={() => setActive(k)} className={`badge ${active.id === k.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
              {k.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> {t(lang, 'loading')}
        </div>
      ) : (
        <>
          {/* Mode tabs */}
          <div className="flex gap-2">
            {(['Weekly', 'Monthly', 'Daily MCQ'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setSubjectFilter('All'); }}
                className={`badge ${mode === m ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
              >
                {m === 'Weekly' ? t(lang, 'weekly') : m === 'Monthly' ? t(lang, 'monthly') : t(lang, 'dailyMcq')}
              </button>
            ))}
          </div>

          {mode === 'Daily MCQ' ? (
            mcqResults.length === 0 ? (
              <div className="card p-8 text-center text-slate-500">{t(lang, 'noData')}</div>
            ) : (
              <div className="space-y-2">
                {mcqResults.map((m) => (
                  <div key={m.id} className="card p-3 flex items-center gap-3">
                    <FileText size={16} className="text-purple-500" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{m.subject || 'MCQ Test'}</div>
                      <div className="text-xs text-slate-400">{new Date(m.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{m.score}/{m.total}</div>
                      <div className="text-xs text-slate-500">{m.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <>
              {/* Subject filter */}
              <div className="card p-3">
                <label className="label">{t(lang, 'subject')}</label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  <button onClick={() => setSubjectFilter('All')} className={`badge ${subjectFilter === 'All' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {t(lang, 'all')}
                  </button>
                  {subjectsInData.map((sub) => (
                    <button key={sub} onClick={() => setSubjectFilter(sub)} className={`badge ${subjectFilter === sub ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* Premium chart card */}
              {periods.length > 0 ? (
                <div className="card p-5 bg-gradient-to-br from-white to-blue-50/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <TrendingUp size={18} className="text-blue-600" /> {t(lang, 'subjectWise')}
                    </h3>
                    {trendInfo && (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
                        trendInfo.diff > 0
                          ? 'bg-green-100 text-green-700'
                          : trendInfo.diff < 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {trendInfo.diff > 0 ? <ArrowUpRight size={16} /> : trendInfo.diff < 0 ? <ArrowDownRight size={16} /> : <Minus size={16} />}
                        {trendInfo.diff > 0 ? '+' : ''}{trendInfo.diff}%
                        {trendInfo.diff > 5 && <span className="ml-1 text-xs">Improving!</span>}
                      </div>
                    )}
                  </div>

                  {/* Big average number */}
                  {trendInfo && (
                    <div className="mb-4 flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-slate-800">{trendInfo.curr}%</span>
                      <span className="text-sm text-slate-400">avg this {mode === 'Weekly' ? 'week' : 'month'}</span>
                      {trendInfo.diff > 0 && (
                        <span className="badge bg-green-100 text-green-700 ml-2">
                          <Award size={12} className="mr-1" /> Great progress!
                        </span>
                      )}
                    </div>
                  )}

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <defs>
                          {COLORS.map((c, i) => (
                            <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={c} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={c} stopOpacity={0} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <ReferenceLine y={75} stroke="#22C55E" strokeDasharray="5 5" strokeOpacity={0.3} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(v) => [`${v}%`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {chartSubjects.map((sub, i) => (
                          <Line
                            key={sub}
                            type="monotone"
                            dataKey={sub}
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth={3}
                            dot={{ r: 5, fill: COLORS[i % COLORS.length] }}
                            activeDot={{ r: 7 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="text-xs text-slate-400 mt-3 text-center">
                    The green dashed line shows 75% — the goal for good performance.
                  </p>
                </div>
              ) : (
                <div className="card p-6 text-center text-sm text-slate-500">
                  No {mode.toLowerCase()} marks recorded yet.
                </div>
              )}

              {/* Per-period report cards */}
              {periods.map((p) => {
                const periodReports = modeReports.filter((r) => (mode === 'Weekly' ? r.week === p : r.month === p));
                if (periodReports.length === 0) return null;
                const totalMarks = periodReports.reduce((sum, r) => sum + Number(r.marks), 0);
                const totalOutOf = periodReports.reduce((sum, r) => sum + Number(r.out_of), 0);
                const totalPct = pctOf(totalMarks, totalOutOf);
                return (
                  <div key={p} className="card overflow-hidden">
                    <div className="bg-[#0052FF] text-white px-4 py-2 flex items-center gap-2">
                      <img src={BRAND.logo} alt="logo" className="w-6 h-6 rounded object-cover bg-white/10" />
                      <div className="flex-1">
                        <div className="font-bold text-sm">{mode} Report — {p}</div>
                        <div className="text-xs text-white/70">{active.name} · {active.class}{active.stream ? ` · ${active.stream}` : ''}</div>
                      </div>
                      <span className="badge bg-white/20 text-white">{totalPct}%</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {periodReports.map((r) => {
                        const pct = pctOf(Number(r.marks), Number(r.out_of));
                        return (
                          <div key={r.id} className="p-3 flex items-center gap-3">
                            <span className="badge bg-blue-100 text-blue-700">{r.subject}</span>
                            <div className="flex-1">
                              <div className="text-sm font-semibold">{r.marks}/{r.out_of}</div>
                              {r.remark && <div className="text-xs text-slate-400">{r.remark}</div>}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-sm">{pct}%</div>
                              <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                                <div className={`h-full ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-3 py-2 bg-slate-50 flex items-center justify-between text-sm font-bold">
                      <span>Total</span>
                      <span>{totalMarks}/{totalOutOf} · {totalPct}%</span>
                    </div>
                    <div className="p-3 flex gap-2">
                      <button onClick={() => downloadPeriod(p)} className="btn-primary flex-1 !py-2" disabled={downloading === p}>
                        {downloading === p ? <Loader2 size={16} className="animate-spin" /> : <><Download size={14} /> {t(lang, 'downloadReport')}</>}
                      </button>
                      <button onClick={() => sharePeriod(p)} className="btn-wa !py-2">
                        <MessageCircle size={14} /> {t(lang, 'shareWhatsapp')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
}
