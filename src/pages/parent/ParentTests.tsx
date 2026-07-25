import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import BackBar from '@/components/BackBar';
import { useLang } from '@/components/LanguageProvider';
import { t } from '@/lib/i18n';
import type { DailyTest, Student, TestReport } from '@/lib/types';
import { downloadReportCard, shareReportOnWhatsapp, gradeFor, pctOf } from '@/lib/pdf';
import {
  Download,
  MessageCircle,
  Loader2,
  Award,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react';

type Tab = 'Daily' | 'Weekly' | 'Monthly';

export default function ParentTests() {
  const { lang } = useLang();
  const s = useSession();
  const ids = s?.studentIds || [];
  const [kids, setKids] = useState<Student[]>([]);
  const [active, setActive] = useState<Student | null>(null);
  const [reports, setReports] = useState<TestReport[]>([]);
  const [daily, setDaily] = useState<DailyTest[]>([]);
  const [tab, setTab] = useState<Tab>('Weekly');
  const [loading, setLoading] = useState(true);
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
      const [{ data: r }, { data: d }] = await Promise.all([
        supabase.from('test_reports').select('*').eq('student_id', active.id).order('test_date', { ascending: false }),
        supabase.from('daily_tests').select('*').eq('student_id', active.id).order('created_at', { ascending: false }),
      ]);
      setReports((r as TestReport[]) || []);
      setDaily((d as DailyTest[]) || []);
      setLoading(false);
    })();
  }, [active]);

  const allRows = useMemo(() => {
    const weekly = reports.map((r) => ({
      subject: r.subject,
      type: r.test_type,
      marks: Number(r.marks),
      outOf: Number(r.out_of),
      pct: pctOf(Number(r.marks), Number(r.out_of)),
      date: r.test_date,
      remark: r.remark,
    }));
    const mcq = daily.map((d) => ({
      subject: d.subject || 'MCQ',
      type: 'Daily MCQ',
      marks: Number(d.score),
      outOf: Number(d.total),
      pct: Math.round(Number(d.percentage)),
      date: new Date(d.created_at).toISOString().slice(0, 10),
      remark: null,
    }));
    return [...weekly, ...mcq];
  }, [reports, daily]);

  const filtered = useMemo(() => {
    if (tab === 'Daily') return allRows.filter((r) => r.type === 'Daily MCQ');
    if (tab === 'Weekly') return allRows.filter((r) => r.type === 'Weekly');
    return allRows.filter((r) => r.type === 'Monthly');
  }, [allRows, tab]);

  const avg = filtered.length > 0 ? Math.round(filtered.reduce((s, r) => s + r.pct, 0) / filtered.length) : 0;
  const highest = filtered.length > 0 ? Math.max(...filtered.map((r) => r.pct)) : 0;
  const lowest = filtered.length > 0 ? Math.min(...filtered.map((r) => r.pct)) : 0;

  const dist = {
    excellent: filtered.filter((r) => r.pct >= 90).length,
    good: filtered.filter((r) => r.pct >= 75 && r.pct < 90).length,
    average: filtered.filter((r) => r.pct >= 50 && r.pct < 75).length,
    below: filtered.filter((r) => r.pct < 50).length,
  };

  // subject-wise
  const subjectMap: Record<string, { total: number; count: number }> = {};
  filtered.forEach((r) => {
    subjectMap[r.subject] = subjectMap[r.subject] || { total: 0, count: 0 };
    subjectMap[r.subject].total += r.pct;
    subjectMap[r.subject].count += 1;
  });
  const subjectStats = Object.entries(subjectMap).map(([subject, v]) => ({
    subject,
    avg: Math.round(v.total / v.count),
    count: v.count,
  }));

  async function download() {
    if (!active) return;
    setDownloading(true);
    try {
      await downloadReportCard(active, reports, daily);
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
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">{t(lang, 'noData')}</div>
      ) : (
        <>
          {/* Overall summary */}
          <div className="card p-4">
            <div className="flex items-center gap-4">
              {/* Circular progress */}
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#0052FF"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(avg / 100) * 264} 264`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900">{avg}%</span>
                  <span className="text-[10px] text-slate-400">{t(lang, 'average')}</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{highest}%</div>
                    <div className="text-xs text-slate-500">{t(lang, 'highest')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                    <TrendingDown size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{lowest}%</div>
                    <div className="text-xs text-slate-500">{t(lang, 'lowest')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <BarChart3 size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{filtered.length}</div>
                    <div className="text-xs text-slate-500">{t(lang, 'totalTests')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Award size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{gradeFor(avg)}</div>
                    <div className="text-xs text-slate-500">{t(lang, 'grade')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subject-wise bars */}
          {subjectStats.length > 0 && (
            <div className="card p-4">
              <h3 className="font-bold text-sm mb-3">{t(lang, 'subjectWise')}</h3>
              <div className="space-y-2">
                {subjectStats.map((s) => (
                  <div key={s.subject}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold">{s.subject}</span>
                      <span className="text-slate-500">
                        {s.avg}% · {s.count} tests
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          s.avg >= 75 ? 'bg-green-500' : s.avg >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${s.avg}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Distribution */}
          <div className="card p-4">
            <h3 className="font-bold text-sm mb-3">{t(lang, 'performanceDistribution')}</h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-xl font-bold text-green-600">{dist.excellent}</div>
                <div className="text-[10px] text-slate-500">{t(lang, 'excellent')}</div>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">{dist.good}</div>
                <div className="text-[10px] text-slate-500">{t(lang, 'good')}</div>
              </div>
              <div>
                <div className="text-xl font-bold text-amber-600">{dist.average}</div>
                <div className="text-[10px] text-slate-500">{t(lang, 'averagePerf')}</div>
              </div>
              <div>
                <div className="text-xl font-bold text-red-600">{dist.below}</div>
                <div className="text-[10px] text-slate-500">{t(lang, 'below50')}</div>
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {(['Daily', 'Weekly', 'Monthly'] as Tab[]).map((tb) => (
              <button
                key={tb}
                onClick={() => setTab(tb)}
                className={`badge ${tab === tb ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
              >
                {tb === 'Daily' ? t(lang, 'dailyMcq') : tb === 'Weekly' ? t(lang, 'weekly') : t(lang, 'monthly')}
              </button>
            ))}
          </div>

          {/* Detailed results */}
          <div className="card divide-y divide-slate-100">
            {filtered.map((r, i) => (
              <div key={i} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{r.subject}</span>
                    <span className="badge bg-slate-100 text-slate-500">{r.type}</span>
                    <span
                      className={`badge ${
                        r.pct >= 90
                          ? 'bg-green-100 text-green-700'
                          : r.pct >= 75
                            ? 'bg-blue-100 text-blue-700'
                            : r.pct >= 50
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {gradeFor(r.pct)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {r.marks}/{r.outOf} · {r.date}
                    {r.remark ? ` · ${r.remark}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">{r.pct}%</div>
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full ${r.pct >= 75 ? 'bg-green-500' : r.pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
