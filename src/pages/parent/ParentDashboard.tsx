import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { BRAND } from '@/lib/brand';
import { useLang } from '@/components/LanguageProvider';
import { t } from '@/lib/i18n';
import type { Banner, Student } from '@/lib/types';
import ContactBox from '@/components/ContactBox';
import {
  CalendarCheck,
  BookOpen,
  BarChart3,
  Bell,
  Wallet,
  ChevronDown,
  Image as ImageIcon,
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
    })();
  }, [ids]);

  useEffect(() => {
    if (!active) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
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
    })();
  }, [active]);

  const navItems = [
    { to: '/parent/attendance', label: t(lang, 'attendance'), icon: CalendarCheck, color: 'bg-green-500' },
    { to: '/parent/diary', label: t(lang, 'studyDiary'), icon: BookOpen, color: 'bg-amber-500' },
    { to: '/parent/tests', label: t(lang, 'testReportCard'), icon: BarChart3, color: 'bg-blue-500' },
    { to: '/parent/notices', label: t(lang, 'notices'), icon: Bell, color: 'bg-rose-500' },
    { to: '/parent/fees', label: t(lang, 'feeStatus'), icon: Wallet, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-5">
      {/* Banner */}
      {banners.length > 0 && (
        <div className="rounded-xl overflow-hidden shadow-sm">
          <img src={banners[0].image_url} alt={banners[0].title} className="w-full h-40 object-cover" />
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

      {/* Child info card */}
      {active && (
        <div className="card p-4 flex items-center gap-4">
          <img
            src={active.photo_url || 'https://images.pexels.com/photos/220457/pexels-photo-220457.jpeg'}
            alt={active.name}
            className="w-16 h-16 rounded-xl object-cover"
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
    </div>
  );
}
