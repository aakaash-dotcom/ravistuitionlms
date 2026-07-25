import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { useLang } from '@/components/LanguageProvider';
import { t } from '@/lib/i18n';
import type { Student, TestReport } from '@/lib/types';
import { downloadReportCard, shareReportOnWhatsapp, gradeFor, pctOf } from '@/lib/pdf';
import BackBar from '@/components/BackBar';
import { BRAND } from '@/lib/brand';
import {
  Download,
  MessageCircle,
  Loader2,
  Award,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react';

type Mode = 'Weekly' | 'Monthly';

export default function ParentTests() {
  const { lang } = useLang();
  const s = useSession();
  const ids = s?.studentIds || [];
  const [kids, setKids] = useState<Student[]>([]);
  const [active, setActive] = useState<Student | null>(null);
  const [reports, setReports] = useState<TestReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('Weekly');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [downloading, setDownloading] = useState(false);

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
      setLoading(false);
    })();
  }, [active]);

  const modeReports = useMemo(() => reports.filter((r) => r.test_type === mode), [reports, mode]);

  // periods: weeks (W1, W2...) or months (Jan, Feb...) sorted chronologically
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

  // Build series per subject: average % per period
  const series = useMemo(() => {
    return chartSubjects.map((subject) => {
      const points = periods.map((p) => {
        const matching = modeReports.filter((r) => {
          const rp = mode === 'Weekly' ? r.week : r.month;
          return r.subject === subject && rp === p;
        });
        if (matching.length === 0) return null;
        const avg = matching.reduce((sum, r) => sum + pctOf(Number(r.marks), Number(r.out_of)), 0) / matching.length;
        return Math.round(avg);
      });
      return { subject, points };
    });
  }, [chartSubjects, periods, modeReports, mode]);

  // Summary
  const filtered = useMemo(() => {
    let list = modeReports;
    if (subjectFilter !== 'All') list = list.filter((r) => r.subject === subjectFilter);
    return list;
  }, [modeReports, subjectFilter]);

  const avg = filtered.length > 0 ? Math.round(filtered.reduce((sum, r) => sum + pctOf(Number(r.marks), Number(r.out_of)), 0) / filtered.length) : 0;
  const highest = filtered.length > 0 ? Math.max(...filtered.map((r) => pctOf(Number(r.marks), Number(r.out_of)))) : 0;
  const lowest = filtered.length > 0 ? Math.min(...filtered.map((r) => pctOf(Number(r.marks), Number(r.out_of)))) : 0;

  // Chart dimensions
  const chartW = 320;
  const chartH = 140;
  const pad = 30;
  const colors = ['#0052FF', '#F59E0B', '#22C55E', '#EF4444', '#8B5CF6', '#EC4899'];

  function pointX(i: number) {
    if (periods.length <= 1) return chartW / 2;
    return pad + (i * (chartW - pad * 2)) / (periods.length - 1);
  }
  function pointY(val: number) {
    return chartH - pad - (val / 100) * (chartH - pad * 2);
  }

  async function download() {
    if (!active) return;
    setDownloading(true);
    try {
      await downloadReportCard(active, reports, []);
    } finally {
      setDownloading(false);
    }
  }

  function share() {
    if (!active) return;
    shareReportOnWhatsapp(active, avg);
  }

  if (!active) return <div className="card p-8 text-center text-slate-500">{t(lang, 'loading')}</div>;

  return (
    <div className="space-y-4">
      <BackBar to="/parent" label={t(lang, 'back')} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="section-title">{t(lang, 'testReportCard')}</h2>
        <div className="flex gap-2">
          <button onClick={download} className="btn-primary" disabled={downloading}>
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {t(lang, 'downloadReport')}
          </button>
          <button onClick={share} className="btn-wa">
            <MessageCircle size={16} /> {t(lang, 'shareWhatsapp')}
          </button>
        </div>
      </div>

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

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> {t(lang, 'loading')}
        </div>
      ) : reports.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">{t(lang, 'noData')}</div>
      ) : (
        <>
          {/* Mode tabs: Weekly / Monthly */}
          <div className="flex gap-2">
            {(['Weekly', 'Monthly'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setSubjectFilter('All'); }}
                className={`badge ${mode === m ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
              >
                {m === 'Weekly' ? t(lang, 'weekly') : t(lang, 'monthly')}
              </button>
            ))}
          </div>

          {/* Subject filter */}
          <div className="card p-3">
            <label className="label">Subject</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSubjectFilter('All')}
                className={`badge ${subjectFilter === 'All' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                All Subjects
              </button>
              {subjectsInData.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSubjectFilter(sub)}
                  className={`badge ${subjectFilter === sub ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Improvement line chart */}
          {periods.length > 0 ? (
            <div className="card p-4">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" /> Performance Trend ({mode})
              </h3>
              <div className="overflow-x-auto">
                <svg width={chartW} height={chartH} className="min-w-full">
                  {/* Y axis labels */}
                  {[0, 25, 50, 75, 100].map((v) => (
                    <g key={v}>
                      <line x1={pad} y1={pointY(v)} x2={chartW - pad} y2={pointY(v)} stroke="#e2e8f0" strokeWidth="1" />
                      <text x={pad - 6} y={pointY(v) + 3} textAnchor="end" fontSize="8" fill="#94a3b8">{v}</text>
                    </g>
                  ))}
                  {/* X axis labels */}
                  {periods.map((p, i) => (
                    <text key={p} x={pointX(i)} y={chartH - pad + 12} textAnchor="middle" fontSize="8" fill="#94a3b8">{p}</text>
                  ))}
                  {/* Lines */}
                  {series.map((s, si) => {
                    const color = colors[si % colors.length];
                    const pts = s.points.map((p, i) => (p === null ? null : `${pointX(i)},${pointY(p)}`)).filter(Boolean) as string[];
                    if (pts.length === 0) return null;
                    return (
                      <g key={s.subject}>
                        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                        {s.points.map((p, i) => p === null ? null : (
                          <circle key={i} cx={pointX(i)} cy={pointY(p)} r="3" fill={color} />
                        ))}
                      </g>
                    );
                  })}
                </svg>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-2 mt-2">
                {series.map((s, si) => (
                  <span key={s.subject} className="badge bg-slate-100 text-slate-600">
                    <span className="w-2 h-2 rounded-full mr-1" style={{ background: colors[si % colors.length] }} />
                    {s.subject}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                The line moves up when your child scores higher than the previous {mode === 'Weekly' ? 'week' : 'month'}.
              </p>
            </div>
          ) : (
            <div className="card p-6 text-center text-sm text-slate-500">
              No {mode.toLowerCase()} marks recorded yet.
            </div>
          )}

          {/* Summary */}
          {filtered.length > 0 && (
            <div className="card p-4">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#0052FF" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(avg / 100) * 264} 264`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">{avg}%</span>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div>
                    <div className="font-bold text-sm text-green-600">{highest}%</div>
                    <div className="text-xs text-slate-500">{t(lang, 'highest')}</div>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-red-600">{lowest}%</div>
                    <div className="text-xs text-slate-500">{t(lang, 'lowest')}</div>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-amber-600">{gradeFor(avg)}</div>
                    <div className="text-xs text-slate-500">{t(lang, 'grade')}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Per-period report cards */}
          {periods.map((p) => {
            const periodReports = modeReports.filter((r) => (mode === 'Weekly' ? r.week === p : r.month === p));
            if (periodReports.length === 0) return null;
            const periodAvg = Math.round(periodReports.reduce((sum, r) => sum + pctOf(Number(r.marks), Number(r.out_of)), 0) / periodReports.length);
            return (
              <div key={p} className="card overflow-hidden">
                <div className="bg-[#0052FF] text-white px-4 py-2 flex items-center gap-2">
                  <img src={BRAND.logo} alt="logo" className="w-6 h-6 rounded object-cover bg-white/10" />
                  <div className="flex-1">
                    <div className="font-bold text-sm">{mode === 'Weekly' ? 'Weekly' : 'Monthly'} Report — {p}</div>
                    <div className="text-xs text-white/70">{active.name} · {active.class}{active.stream ? ` · ${active.stream}` : ''}</div>
                  </div>
                  <span className="badge bg-white/20 text-white">{periodAvg}% · {gradeFor(periodAvg)}</span>
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
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
