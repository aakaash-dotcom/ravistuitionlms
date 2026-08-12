import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { BRAND } from '@/lib/brand';
import { useLang } from '@/components/LanguageProvider';
import { t } from '@/lib/i18n';
import { pctOf } from '@/lib/pdf';
import type { Banner, Student, TestReport, DiaryEntry, StudyMaterial, MaterialProgress } from '@/lib/types';
import ContactBox from '@/components/ContactBox';
import BirthdayCard from '@/components/BirthdayCard';
import { linkUserToNotification, requestNotificationPermission, getNotificationPermission } from '@/lib/onesignal';
import {
  CalendarCheck,
  BookOpen,
  BarChart3,
  Bell,
  Wallet,
  ChevronDown,
  BellRing,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  ClipboardList,
} from 'lucide-react';

export default function ParentDashboard() {
  const { lang } = useLang();
  const nav = useNavigate();
  const s = useSession();
  const ids = s?.studentIds || [];
  const [kids, setKids] = useState<Student[]>([]);
  const [active, setActive] = useState<Student | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [picker, setPicker] = useState(false);
  const [stats, setStats] = useState({ attendance: 0, diary: 0, tests: 0 });
  const [notifEnabled, setNotifEnabled] = useState(false);

  // weekly digest data
  const [weekAttendance, setWeekAttendance] = useState({ present: 0, total: 0 });
  const [latestTest, setLatestTest] = useState<{ pct: number; subject: string; trend: number | null } | null>(null);
  const [pendingHomework, setPendingHomework] = useState({ total: 0, verified: 0 });
  const [materialProgress, setMaterialProgress] = useState<{ subject: string; revised: number; total: number }[]>([]);

  useEffect(() => {
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase.from('students').select('*').in('id', ids);
      const list = (data as Student[]) || [];
      setKids(list);
      setActive(list[0] || null);
      const { data: bs } = await supabase
        .from('banners')
        .select('*')
        .eq('active', true)
        .in('audience', ['Everyone', 'Parents Only']);
      setBanners((bs as Banner[]) || []);
      if (list.length > 0 && list[0].parent_phone) {
        linkUserToNotification(list[0].parent_phone);
      }
    })();
  }, [ids]);

  useEffect(() => {
    if (!active) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

      const [{ count: att }, { count: pres }, { count: diary }, { count: tests }] = await Promise.all([
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('student_id', active.id),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('student_id', active.id).eq('status', 'Present'),
        supabase.from('diary_entries').select('*', { count: 'exact', head: true }).eq('student_id', active.id).eq('status', 'Approved'),
        supabase.from('test_reports').select('*', { count: 'exact', head: true }).eq('student_id', active.id),
      ]);
      setStats({
        attendance: att && att > 0 ? Math.round(((pres || 0) / att) * 100) : 0,
        diary: diary || 0,
        tests: tests || 0,
      });

      // Weekly attendance (last 7 days)
      const { count: wTotal } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', active.id)
        .gte('date', weekAgo)
        .lte('date', today);
      const { count: wPresent } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', active.id)
        .eq('status', 'Present')
        .gte('date', weekAgo)
        .lte('date', today);
      setWeekAttendance({ present: wPresent || 0, total: wTotal || 0 });

      // Latest test score + trend
      const { data: tr } = await supabase
        .from('test_reports')
        .select('*')
        .eq('student_id', active.id)
        .order('test_date', { ascending: false })
        .limit(2);
      const testRows = (tr as TestReport[]) || [];
      if (testRows.length > 0) {
        const latest = testRows[0];
        const latestPct = Math.round(pctOf(Number(latest.marks), Number(latest.out_of)));
        let trend: number | null = null;
        if (testRows.length > 1) {
          const prev = testRows[1];
          trend = latestPct - Math.round(pctOf(Number(prev.marks), Number(prev.out_of)));
        }
        setLatestTest({ pct: latestPct, subject: latest.subject, trend });
      } else {
        setLatestTest(null);
      }

      // Pending homework (this week)
      const { data: hw } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('student_id', active.id)
        .eq('status', 'Approved')
        .gte('entry_date', weekAgo)
        .lte('entry_date', today);
      const hwRows = (hw as DiaryEntry[]) || [];
      setPendingHomework({
        total: hwRows.length,
        verified: hwRows.filter((r) => r.parent_verified).length,
      });

      // Material progress per subject
      const { data: mats } = await supabase
        .from('study_materials')
        .select('*')
        .or(`class.eq.${active.class},class.is.null`)
        .order('created_at', { ascending: false });
      let matList = (mats as StudyMaterial[]) || [];
      if (active.stream) {
        matList = matList.filter((m) => !m.stream || m.stream === active.stream);
      }
      const { data: prog } = await supabase
        .from('material_progress')
        .select('*')
        .eq('student_id', active.id);
      const progList = (prog as MaterialProgress[]) || [];
      const revisedIds = new Set(progList.map((p) => p.material_id));
      const bySubject: Record<string, { revised: number; total: number }> = {};
      matList.forEach((m) => {
        const subj = m.subject || 'Other';
        if (!bySubject[subj]) bySubject[subj] = { revised: 0, total: 0 };
        bySubject[subj].total++;
        if (revisedIds.has(m.id)) bySubject[subj].revised++;
      });
      setMaterialProgress(
        Object.entries(bySubject).map(([subject, v]) => ({ subject, ...v })),
      );
    })();
  }, [active]);

  useEffect(() => {
    setNotifEnabled(getNotificationPermission());
  }, []);

  async function enableAlerts() {
    const granted = await requestNotificationPermission();
    setNotifEnabled(granted);
  }

  const navItems = [
    { to: '/parent/attendance', label: t(lang, 'attendance'), icon: CalendarCheck, color: 'bg-green-500' },
    { to: '/parent/diary', label: t(lang, 'studyDiary'), icon: BookOpen, color: 'bg-amber-500' },
    { to: '/parent/tests', label: t(lang, 'testReportCard'), icon: BarChart3, color: 'bg-blue-500' },
    { to: '/parent/notices', label: t(lang, 'notices'), icon: Bell, color: 'bg-rose-500' },
    { to: '/parent/fees', label: t(lang, 'feeStatus'), icon: Wallet, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-5">
      {/* Birthday card */}
      {active && <BirthdayCard student={active} />}

      {/* Banner */}
      {banners.length > 0 && (
        <div className="rounded-xl overflow-hidden shadow-sm">
          <a href={banners[0].link_url || '#'} target={banners[0].link_url ? '_blank' : undefined} rel="noreferrer">
            <img src={banners[0].image_url} alt={banners[0].title} className="w-full h-auto object-contain" />
          </a>
        </div>
      )}

      {/* Child selector */}
      {kids.length > 1 && (
        <div className="card p-3 relative">
          <button
            onClick={() => setPicker((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="text-left">
              <div className="text-xs text-slate-500">{t(lang, 'selectChild')}</div>
              <div className="font-bold">{active?.name}</div>
            </div>
            <ChevronDown size={18} className="text-slate-400" />
          </button>
          {picker && (
            <div className="absolute z-10 top-full left-3 right-3 mt-1 card p-1 shadow-lg">
              {kids.map((k) => (
                <button
                  key={k.id}
                  onClick={() => {
                    setActive(k);
                    setPicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    active?.id === k.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50'
                  }`}
                >
                  {k.name} ({k.roll_no})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly Academic Digest */}
      {active && (
        <div className="card p-4 bg-gradient-to-br from-blue-50 to-white">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <CalendarDays size={16} className="text-blue-600" />
            This Week's Academic Digest
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {/* Attendance */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {weekAttendance.present}/{weekAttendance.total}
              </div>
              <div className="text-[11px] text-slate-500">Days Present</div>
            </div>
            {/* Latest test */}
            <div className="text-center">
              {latestTest ? (
                <>
                  <div className="text-2xl font-bold text-blue-600">{latestTest.pct}%</div>
                  <div className="text-[11px] text-slate-500">{latestTest.subject}</div>
                  {latestTest.trend !== null && (
                    <div
                      className={`text-[11px] font-semibold flex items-center justify-center gap-0.5 mt-0.5 ${
                        latestTest.trend > 0
                          ? 'text-green-600'
                          : latestTest.trend < 0
                            ? 'text-red-500'
                            : 'text-slate-400'
                      }`}
                    >
                      {latestTest.trend > 0 ? (
                        <TrendingUp size={11} />
                      ) : latestTest.trend < 0 ? (
                        <TrendingDown size={11} />
                      ) : null}
                      {latestTest.trend > 0
                        ? `+${latestTest.trend}% Improved`
                        : latestTest.trend < 0
                          ? 'Attention Needed'
                          : 'Stable'}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-300">—</div>
                  <div className="text-[11px] text-slate-500">No Tests</div>
                </>
              )}
            </div>
            {/* Pending homework */}
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {pendingHomework.total - pendingHomework.verified}
              </div>
              <div className="text-[11px] text-slate-500">Pending HW Verify</div>
              {pendingHomework.total > 0 && (
                <div className="text-[11px] text-slate-400">
                  {pendingHomework.verified}/{pendingHomework.total} signed
                </div>
              )}
            </div>
          </div>
          {/* Material progress bars */}
          {materialProgress.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
              {materialProgress.map((mp) => {
                const pct = mp.total > 0 ? Math.round((mp.revised / mp.total) * 100) : 0;
                return (
                  <div key={mp.subject} className="flex items-center gap-2 text-xs">
                    <span className="w-20 font-semibold text-slate-600 truncate">{mp.subject}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-slate-400 w-16 text-right">
                      {mp.revised}/{mp.total} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Child info card */}
      {active && (
        <div className="card p-4 flex items-center gap-4">
          <img
            src={active.photo_url || BRAND.logo}
            alt={active.name}
            className="w-16 h-16 rounded-xl object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = BRAND.logo;
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg">{active.name}</div>
            <div className="text-sm text-slate-500">
              {active.roll_no} · {active.class}
              {active.stream ? ` · ${active.stream}` : ''}
            </div>
            <div className="text-xs text-slate-400">{active.school}</div>
          </div>
        </div>
      )}

      {/* Quick stats */}
      {active && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <div className="text-xl font-bold text-green-600">{stats.attendance}%</div>
            <div className="text-xs text-slate-500">{t(lang, 'attendance')}</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xl font-bold text-amber-600">{stats.diary}</div>
            <div className="text-xs text-slate-500">{t(lang, 'studyDiary')}</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xl font-bold text-blue-600">{stats.tests}</div>
            <div className="text-xs text-slate-500">{t(lang, 'totalTests')}</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div>
        <h2 className="section-title mb-3">{t(lang, 'quickAccess')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {navItems.map((n) => (
            <Link key={n.to} to={n.to} className="nav-tile">
              <div className={`w-12 h-12 rounded-xl ${n.color} text-white flex items-center justify-center`}>
                <n.icon size={24} />
              </div>
              <span className="text-sm font-semibold text-slate-700">{n.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <ContactBox />

      {/* Enable push alerts */}
      <button
        onClick={notifEnabled ? undefined : enableAlerts}
        disabled={notifEnabled}
        className={notifEnabled ? 'btn-primary w-full !bg-green-600' : 'btn-primary w-full'}
      >
        {notifEnabled ? <><CheckCircle2 size={16} /> {t(lang, 'alertsEnabled')}</> : <><BellRing size={16} /> {t(lang, 'enableAlerts')}</>}
      </button>
    </div>
  );
}
