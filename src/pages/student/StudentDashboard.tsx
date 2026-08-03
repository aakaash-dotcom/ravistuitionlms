import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import BackBar from '@/components/BackBar';
import type { Banner, DailyTest, DiaryEntry, McqQuiz, StudyMaterial, Student } from '@/lib/types';
import ContactBox from '@/components/ContactBox';
import BirthdayCard from '@/components/BirthdayCard';
import { linkUserToNotification, promptNotificationPermission } from '@/lib/onesignal';
import { useLang } from '@/components/LanguageProvider';
import { t } from '@/lib/i18n';
import {
  HelpCircle,
  BookOpen,
  CalendarCheck,
  BookMarked,
  BarChart3,
  Bell,
  ChevronRight,
  BellRing,
} from 'lucide-react';

export default function StudentDashboard() {
  const s = useSession();
  const { lang } = useLang();
  const sid = s?.studentId;
  const [student, setStudent] = useState<Student | null>(null);
  const [quizzes, setQuizzes] = useState<McqQuiz[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [stats, setStats] = useState({ tests: 0, diary: 0, attendance: 0 });
  const [recentDiary, setRecentDiary] = useState<DiaryEntry[]>([]);
  const [recentTests, setRecentTests] = useState<DailyTest[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);

  useEffect(() => {
    if (!sid) return;
    (async () => {
      const { data: stu } = await supabase.from('students').select('*').eq('id', sid).maybeSingle();
      if (stu) {
        const st = stu as Student;
        setStudent(st);
        const { data: qs } = await supabase
          .from('mcq_quizzes')
          .select('*')
          .eq('active', true)
          .eq('class', st.class)
          .order('created_at', { ascending: false })
          .limit(3);
        setQuizzes((qs as McqQuiz[]) || []);
        const { data: ms } = await supabase
          .from('study_materials')
          .select('*')
          .or(`class.eq.${st.class},class.is.null`)
          .order('created_at', { ascending: false })
          .limit(3);
        setMaterials((ms as StudyMaterial[]) || []);
        if (st.roll_no) {
          linkUserToNotification(st.roll_no);
        }
      }
      const { data: bs } = await supabase
        .from('banners')
        .select('*')
        .eq('active', true)
        .in('audience', ['Everyone', 'Students Only']);
      setBanners((bs as Banner[]) || []);

      const [{ count: tests }, { data: d }, { count: diary }, { count: att }, { count: pres }] = await Promise.all([
        supabase.from('daily_tests').select('*', { count: 'exact', head: true }).eq('student_id', sid),
        supabase.from('daily_tests').select('*').eq('student_id', sid).order('created_at', { ascending: false }).limit(3),
        supabase.from('diary_entries').select('*', { count: 'exact', head: true }).eq('student_id', sid).eq('status', 'Approved'),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('student_id', sid),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('student_id', sid).eq('status', 'Present'),
      ]);
      setStats({
        tests: tests || 0,
        diary: diary || 0,
        attendance: att && att > 0 ? Math.round(((pres || 0) / att) * 100) : 0,
      });
      setRecentTests((d as DailyTest[]) || []);
      const { data: rd } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('student_id', sid)
        .eq('status', 'Approved')
        .order('entry_date', { ascending: false })
        .limit(3);
      setRecentDiary((rd as DiaryEntry[]) || []);
    })();
  }, [sid]);

  const navItems = [
    { to: '/student/tests', label: 'Daily Tests', icon: HelpCircle, color: 'bg-purple-500' },
    { to: '/student/diary', label: 'Study Diary', icon: BookOpen, color: 'bg-amber-500' },
    { to: '/student/attendance', label: 'Attendance', icon: CalendarCheck, color: 'bg-green-500' },
    { to: '/student/materials', label: 'Materials', icon: BookMarked, color: 'bg-cyan-500' },
  ];

  return (
    <div className="space-y-5">
      {/* Birthday card */}
      {student && <BirthdayCard student={student} />}

      {banners.length > 0 && (
        <div className="rounded-xl overflow-hidden shadow-sm">
          <img src={banners[0].image_url} alt={banners[0].title} className="w-full h-auto object-contain" />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-purple-600">{stats.tests}</div>
          <div className="text-xs text-slate-500">Tests Taken</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-amber-600">{stats.diary}</div>
          <div className="text-xs text-slate-500">Diary Entries</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-green-600">{stats.attendance}%</div>
          <div className="text-xs text-slate-500">Attendance</div>
        </div>
      </div>

      {quizzes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Available Quizzes</h2>
            <Link to="/student/tests" className="text-sm text-blue-600 font-semibold">
              View All
            </Link>
          </div>
          <div className="space-y-2">
            {quizzes.map((q) => (
              <Link key={q.id} to="/student/tests" className="card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                  <HelpCircle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{q.title}</div>
                  <div className="text-xs text-slate-400">
                    {q.subject} · {q.duration} min · {q.total_marks} marks
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="section-title mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
            <BookOpen size={16} className="text-amber-500" /> Recent Study Topics
          </h3>
          {recentDiary.length === 0 ? (
            <p className="text-xs text-slate-400">No entries yet.</p>
          ) : (
            <div className="space-y-2">
              {recentDiary.map((e) => (
                <div key={e.id} className="text-sm">
                  <span className="badge bg-blue-100 text-blue-700 mr-2">{e.subject}</span>
                  {e.topic}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
            <BarChart3 size={16} className="text-purple-500" /> Recent Test Scores
          </h3>
          {recentTests.length === 0 ? (
            <p className="text-xs text-slate-400">No tests taken yet.</p>
          ) : (
            <div className="space-y-2">
              {recentTests.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span>{t.subject || 'Quiz'}</span>
                  <span className="font-semibold">{t.score}/{t.total} ({Math.round(t.percentage)}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {materials.length > 0 && (
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
            <BookMarked size={16} className="text-cyan-500" /> Study Resources
          </h3>
          <div className="space-y-2">
            {materials.map((m) => (
              <a
                key={m.id}
                href={m.file_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <BookMarked size={14} /> {m.title}
              </a>
            ))}
          </div>
        </div>
      )}

      <ContactBox />

      {/* Enable push alerts */}
      <button
        onClick={() => promptNotificationPermission()}
        className="btn-primary w-full"
      >
        <BellRing size={16} /> {t(lang, 'enableAlerts')}
      </button>
    </div>
  );
}
