import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import BackBar from '@/components/BackBar';
import { useLang } from '@/components/LanguageProvider';
import { t } from '@/lib/i18n';
import type { DiaryEntry, Student } from '@/lib/types';
import { Loader2, BookOpen } from 'lucide-react';

export default function ParentDiary() {
  const { lang } = useLang();
  const s = useSession();
  const ids = s?.studentIds || [];
  const [kids, setKids] = useState<Student[]>([]);
  const [active, setActive] = useState<Student | null>(null);
  const [rows, setRows] = useState<DiaryEntry[]>([]);
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
        .from('diary_entries')
        .select('*')
        .eq('student_id', active.id)
        .order('entry_date', { ascending: false });
      setRows((data as DiaryEntry[]) || []);
      setLoading(false);
    })();
  }, [active]);

  if (!active) return <div className="card p-8 text-center text-slate-500">{t(lang, 'loading')}</div>;

  return (
    <div className="space-y-4">
      <BackBar to="/parent" label={t(lang, 'back')} />
      <h2 className="section-title">{t(lang, 'studyDiary')}</h2>

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
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <BookOpen size={18} /> {t(lang, 'noData')}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((e) => (
            <div key={e.id} className="card p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="badge bg-blue-100 text-blue-700">{e.subject}</span>
                <span
                  className={`badge ${
                    e.status === 'Approved'
                      ? 'bg-green-100 text-green-700'
                      : e.status === 'Pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {e.status}
                </span>
              </div>
              <div className="font-semibold text-sm">{e.topic}</div>
              <div className="text-xs text-slate-400">{e.entry_date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
