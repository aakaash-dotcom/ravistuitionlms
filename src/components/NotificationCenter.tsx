import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/components/LanguageProvider';
import { t } from '@/lib/i18n';
import type { AttendanceRow, DiaryEntry, Notice, Student, TestReport, McqQuiz } from '@/lib/types';
import { isTodayBirthday } from '@/components/BirthdayCard';
import { Bell, X, BookOpen, CalendarCheck, Cake, HelpCircle, BarChart3, FileText } from 'lucide-react';

interface NotifItem {
  id: string;
  type: 'birthday' | 'attendance' | 'diary' | 'notice' | 'mcq' | 'test';
  title: string;
  subtitle: string;
  timestamp: string;
  icon: typeof Bell;
  color: string;
}

const READ_KEY = 'rtc_last_read_time';

export default function NotificationCenter({ studentIds }: { studentIds: string[] }) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [readTs, setReadTs] = useState<number>(() => Number(localStorage.getItem(READ_KEY) || 0));

  useEffect(() => {
    if (studentIds.length === 0) return;
    (async () => {
      setLoading(true);
      const { data: stuData } = await supabase.from('students').select('*').in('id', studentIds);
      const students = (stuData as Student[]) || [];

      const list: NotifItem[] = [];

      for (const student of students) {
        // Birthday
        if (isTodayBirthday(student.dob)) {
          list.push({
            id: `birthday-${student.id}`,
            type: 'birthday',
            title: `Happy Birthday, ${student.name}!`,
            subtitle: t(lang, 'birthdayWish'),
            timestamp: new Date().toISOString(),
            icon: Cake,
            color: 'bg-amber-100 text-amber-600',
          });
        }

        // Attendance (latest)
        const { data: attData } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', student.id)
          .order('date', { ascending: false })
          .limit(1);
        const att = (attData as AttendanceRow[]) || [];
        if (att.length > 0) {
          const a = att[0];
          list.push({
            id: `att-${a.id}`,
            type: 'attendance',
            title: `${student.name}: ${t(lang, 'attendanceAlert')}`,
            subtitle: `${a.status} · ${a.session || 'Morning'} · ${a.date}`,
            timestamp: a.date,
            icon: CalendarCheck,
            color: 'bg-green-100 text-green-600',
          });
        }

        // Diary / Homework (last 48h)
        const { data: diaryData } = await supabase
          .from('diary_entries')
          .select('*')
          .eq('student_id', student.id)
          .order('entry_date', { ascending: false })
          .limit(3);
        const diary = (diaryData as DiaryEntry[]) || [];
        const now = Date.now();
        diary.forEach((d) => {
          const ts = new Date(d.entry_date).getTime();
          if (now - ts < 48 * 60 * 60 * 1000) {
            list.push({
              id: `diary-${d.id}`,
              type: 'diary',
              title: `${student.name}: ${t(lang, 'newHomework')}`,
              subtitle: `${d.subject}: ${d.topic}`,
              timestamp: d.entry_date,
              icon: BookOpen,
              color: 'bg-blue-100 text-blue-600',
            });
          }
        });

        // Weekly & Monthly test marks (latest)
        const { data: testData } = await supabase
          .from('test_reports')
          .select('*')
          .eq('student_id', student.id)
          .order('test_date', { ascending: false })
          .limit(2);
        const tests = (testData as TestReport[]) || [];
        tests.forEach((tr) => {
          list.push({
            id: `test-${tr.id}`,
            type: 'test',
            title: `${student.name}: ${t(lang, 'weeklyMonthlyAlert')}`,
            subtitle: `${tr.subject}: ${tr.marks}/${tr.out_of} (${tr.test_type})`,
            timestamp: tr.test_date,
            icon: BarChart3,
            color: 'bg-purple-100 text-purple-600',
          });
        });

        // Daily MCQ quizzes for their class
        const { data: quizData } = await supabase
          .from('mcq_quizzes')
          .select('*')
          .eq('active', true)
          .eq('class', student.class)
          .order('created_at', { ascending: false })
          .limit(1);
        const quizzes = (quizData as McqQuiz[]) || [];
        if (quizzes.length > 0) {
          const q = quizzes[0];
          if (student.stream && q.stream && q.stream !== student.stream) {
            // skip — stream mismatch
          } else {
            list.push({
              id: `mcq-${q.id}`,
              type: 'mcq',
              title: `${student.name}: ${t(lang, 'dailyMcqAlert')}`,
              subtitle: q.title,
              timestamp: q.created_at || new Date().toISOString(),
              icon: HelpCircle,
              color: 'bg-cyan-100 text-cyan-600',
            });
          }
        }
      }

      // Centre notices (latest active)
      const { data: noticeData } = await supabase
        .from('notices')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      const notices = (noticeData as Notice[]) || [];
      if (notices.length > 0) {
        const n = notices[0];
        list.push({
          id: `notice-${n.id}`,
          type: 'notice',
          title: t(lang, 'noticeAlert'),
          subtitle: n.title,
          timestamp: n.created_at || new Date().toISOString(),
          icon: FileText,
          color: 'bg-rose-100 text-rose-600',
        });
      }

      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setItems(list);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentIds.join(','), lang]);

  const unreadCount = items.filter((i) => new Date(i.timestamp).getTime() > readTs).length;

  function markAllRead() {
    const ts = Date.now();
    setReadTs(ts);
    localStorage.setItem(READ_KEY, String(ts));
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-ghost !bg-white/10 !border-white/20 !text-white hover:!bg-white/20 !py-1.5 !px-3 relative"
      >
        <Bell size={14} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-sm bg-white h-full shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold flex items-center gap-2">
                <Bell size={18} /> {t(lang, 'notifications')}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600">
                    {t(lang, 'markAsRead')}
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-slate-400">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">{t(lang, 'noNotifications')}</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const isNew = new Date(item.timestamp).getTime() > readTs;
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className={`p-4 flex gap-3 ${isNew ? 'bg-blue-50/50' : ''}`}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{item.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{item.subtitle}</div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                        {isNew && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
