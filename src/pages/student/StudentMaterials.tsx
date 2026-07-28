import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import BackBar from '@/components/BackBar';
import { CLASSES } from '@/lib/brand';
import { ALL_SUBJECTS } from '@/lib/subjects';
import type { StudyMaterial, Student } from '@/lib/types';
import { Loader2, BookMarked, Download, ExternalLink } from 'lucide-react';

export default function StudentMaterials() {
  const s = useSession();
  const sid = s?.studentId;
  const [student, setStudent] = useState<Student | null>(null);
  const [items, setItems] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [fSubject, setFSubject] = useState('');
  const [fType, setFType] = useState('');

  useEffect(() => {
    if (!sid) return;
    (async () => {
      const { data: stu } = await supabase.from('students').select('*').eq('id', sid).maybeSingle();
      const st = stu as Student;
      setStudent(st);
      if (st) {
        const { data } = await supabase
          .from('study_materials')
          .select('*')
          .or(`class.eq.${st.class},class.is.null`)
          .order('created_at', { ascending: false });
        let list = (data as StudyMaterial[]) || [];
        if (st.stream) {
          list = list.filter((m) => !m.stream || m.stream === st.stream);
        }
        setItems(list);
      }
      setLoading(false);
    })();
  }, [sid]);

  const filtered = items.filter(
    (m) => (!fSubject || m.subject === fSubject) && (!fType || m.type === fType),
  );

  if (loading)
    return (
      <div className="card p-8 text-center text-slate-500">
        <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
      </div>
    );

  return (
    <div className="space-y-4">
      <BackBar to="/student" label="Back" />
      <h2 className="section-title">Study Materials</h2>

      <div className="card p-3 grid grid-cols-2 gap-3">
        <select className="input" value={fSubject} onChange={(e) => setFSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {ALL_SUBJECTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className="input" value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">All Types</option>
          <option>textbook</option>
          <option>question_paper</option>
          <option>other</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <BookMarked size={18} /> No materials found.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((m) => (
            <div key={m.id} className="card p-3 flex items-center gap-3">
              <BookMarked size={20} className="text-cyan-600" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{m.title}</div>
                <div className="text-xs text-slate-400">
                  {m.type} · {m.subject} · {m.class || 'All'}
                </div>
              </div>
              <a href={m.file_url} target="_blank" rel="noreferrer" className="btn-ghost !p-2">
                <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
