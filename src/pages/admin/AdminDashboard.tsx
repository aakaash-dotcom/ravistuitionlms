import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Wallet,
  CalendarCheck,
  BookOpen,
  ClipboardList,
  CalendarDays,
  Bell,
  BookMarked,
  Image,
  FileText,
  HelpCircle,
  Settings,
  UserCog,
  CalendarClock,
  ClipboardPen,
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pendingFees: 0,
    presentToday: 0,
    diaryPending: 0,
  });
  const [recentNotices, setRecentNotices] = useState<
    { id: string; title: string; created_at: string }[]
  >([]);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [{ count: total }, { data: feeStudents }, { data: presentRows }, { count: diary }] =
        await Promise.all([
          supabase.from('students').select('*', { count: 'exact', head: true }),
          supabase.from('students').select('total_fee, fee_paid'),
          supabase
            .from('attendance')
            .select('student_id')
            .eq('date', today)
            .eq('status', 'Present'),
          supabase
            .from('diary_entries')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Pending'),
        ]);
      const distinctPresent = new Set((presentRows || []).map((r: { student_id: string }) => r.student_id)).size;
      const pending =
        (feeStudents || []).reduce(
          (s, r: { total_fee: number; fee_paid: number }) =>
            s + Math.max(0, r.total_fee - r.fee_paid),
          0,
        ) || 0;
      setStats({
        total: total ?? 0,
        pendingFees: pending,
        presentToday: distinctPresent,
        diaryPending: diary ?? 0,
      });

      const { data: notices } = await supabase
        .from('notices')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(2);
      setRecentNotices((notices as { id: string; title: string; created_at: string }[]) || []);
    })();
  }, []);

  const actions = [
    { to: '/admin/tests', label: 'Marks Entry', icon: ClipboardList, color: 'bg-blue-500' },
    { to: '/admin/attendance', label: 'Attendance', icon: CalendarCheck, color: 'bg-green-500' },
    { to: '/admin/students', label: 'Students', icon: Users, color: 'bg-indigo-500' },
    { to: '/admin/diary', label: 'Diary', icon: BookOpen, color: 'bg-amber-500' },
    { to: '/admin/mcq', label: 'MCQ Quiz', icon: HelpCircle, color: 'bg-purple-500' },
    { to: '/admin/notices', label: 'Notices', icon: Bell, color: 'bg-rose-500' },
    { to: '/admin/materials', label: 'Materials', icon: BookMarked, color: 'bg-cyan-500' },
    { to: '/admin/banners', label: 'Banners', icon: Image, color: 'bg-pink-500' },
    { to: '/admin/fees', label: 'Fees', icon: Wallet, color: 'bg-emerald-500' },
    { to: '/admin/settings', label: 'Settings', icon: Settings, color: 'bg-slate-500' },
    { to: '/admin/teachers', label: 'Teachers', icon: UserCog, color: 'bg-teal-500' },
    { to: '/admin/teacher-attendance', label: 'Teacher Att', icon: CalendarClock, color: 'bg-orange-500' },
    { to: '/admin/planners', label: 'Planners', icon: ClipboardPen, color: 'bg-violet-500' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/admin/students" className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Users size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-slate-500">Total Students</div>
          </div>
        </Link>
        <Link to="/admin/students?filter=pending" className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
            <Wallet size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold">₹{stats.pendingFees.toLocaleString('en-IN')}</div>
            <div className="text-xs text-slate-500">Pending Fees</div>
          </div>
        </Link>
        <Link to="/admin/attendance" className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
            <CalendarCheck size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.presentToday}</div>
            <div className="text-xs text-slate-500">Present Today</div>
          </div>
        </Link>
        <Link to="/admin/diary" className="stat-card">
          <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.diaryPending}</div>
            <div className="text-xs text-slate-500">Diary Pending</div>
          </div>
        </Link>
      </div>

      <div>
        <h2 className="section-title mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {actions.map((a) => (
            <Link key={a.to} to={a.to} className="nav-tile">
              <div
                className={`w-11 h-11 rounded-xl ${a.color} text-white flex items-center justify-center`}
              >
                <a.icon size={22} />
              </div>
              <span className="text-xs font-semibold text-slate-700">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Recent Notices</h2>
          <Link to="/admin/notices" className="text-sm text-blue-600 font-semibold">
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {recentNotices.length === 0 && (
            <div className="card p-4 text-sm text-slate-500 flex items-center gap-2">
              <FileText size={16} /> No notices yet.
            </div>
          )}
          {recentNotices.map((n) => (
            <div key={n.id} className="card p-3 flex items-center gap-3">
              <Bell size={16} className="text-rose-500" />
              <span className="text-sm font-medium flex-1">{n.title}</span>
              <span className="text-xs text-slate-400">
                {new Date(n.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
