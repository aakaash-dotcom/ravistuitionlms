import { Link } from 'react-router-dom';
import { useSession } from '@/lib/useSession';
import { BRAND } from '@/lib/brand';
import { ClipboardList, CalendarCheck, BookOpen, Bell, ClipboardPen } from 'lucide-react';

export default function TeacherDashboard() {
  const s = useSession();
  const navItems = [
    { to: '/teacher/marks', label: 'Enter Marks', icon: ClipboardList, color: 'bg-blue-500' },
    { to: '/teacher/attendance', label: 'Attendance', icon: CalendarCheck, color: 'bg-green-500' },
    { to: '/teacher/diary', label: 'Study Diary', icon: BookOpen, color: 'bg-amber-500' },
    { to: '/teacher/notices', label: 'Notices', icon: Bell, color: 'bg-rose-500' },
    { to: '/teacher/planner', label: 'Planner', icon: ClipboardPen, color: 'bg-violet-500' },
  ];

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <h2 className="font-bold text-lg">Welcome, {s?.teacherName || 'Teacher'}</h2>
        <p className="text-sm text-slate-500">{BRAND.name}</p>
      </div>
      <div>
        <h2 className="section-title mb-3">Quick Access</h2>
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
    </div>
  );
}
