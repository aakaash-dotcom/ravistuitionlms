import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { CLASSES, STREAMS } from '@/lib/brand';
import { ALL_SUBJECTS, getSubjectsForClass } from '@/lib/subjects';
import type { Student, TestReport } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { Loader2, Save, Plus, X, Search, ClipboardPaste } from 'lucide-react';
import { sendPushAlert } from '@/lib/onesignal';

interface Cell {
  marks: string;
  outOf: number;
  remark: string;
}

export default function TeacherMarks() {
  const sess = useSession();
  const [students, setStudents] = useState<Student[]>([]);
  const [fClass, setFClass] = useState('10th');
  const [fStream, setFStream] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [grid, setGrid] = useState<Record<string, Cell[]>>({});
  const [outOf, setOutOf] = useState(100);
  const [testType, setTestType] = useState('Weekly');
  const [week, setWeek] = useState('');
  const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const weeks = ['W1', 'W2', 'W3', 'W4', 'W5'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    setSubjects(getSubjectsForClass(fClass, fStream || null, null));
    setSelectedSubjects([]);
  }, [fClass, fStream]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from('students').select('*').eq('status', 'Active').eq('class', fClass);
      if (fStream) q = q.eq('stream', fStream);
      const { data } = await q.order('roll_no');
      const list = (data as Student[]) || [];
      setStudents(list);
      const g: Record<string, Cell[]> = {};
      list.forEach((s) => {
        g[s.id] = selectedSubjects.map(() => ({ marks: '', outOf, remark: '' }));
      });
      setGrid(g);
      setLoading(false);
    })();
  }, [fClass, fStream, selectedSubjects, outOf]);

  function toggleSubject(sub: string) {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub],
    );
  }

  function setCell(sid: string, i: number, patch: Partial<Cell>) {
    setGrid((g) => ({
      ...g,
      [sid]: g[sid].map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));
  }

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  async function save() {
    setSaving(true);
    const rows: Omit<TestReport, 'id' | 'created_at'>[] = [];
    students.forEach((s) => {
      selectedSubjects.forEach((sub, i) => {
        const cell = grid[s.id]?.[i];
        if (cell && cell.marks !== '') {
          rows.push({
            student_id: s.id,
            subject: sub,
            marks: Number(cell.marks),
            out_of: cell.outOf,
            test_type: testType,
            week: testType === 'Weekly' ? week : null,
            month: testType === 'Monthly' ? month : null,
            test_date: testDate,
            remark: cell.remark || null,
          });
        }
      });
    });
    if (rows.length > 0) {
      await supabase.from('test_reports').insert(rows);
      const parentPhones = students.filter((s) => s.parent_phone).map((s) => s.parent_phone!);
      await sendPushAlert(
        "Ravi's Tuition Centre · Test Marks Published",
        `${testType} test marks for ${selectedSubjects.join(', ')} have been published. Open app to view.`,
        parentPhones.length > 0 ? parentPhones : undefined,
      );
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function applyPaste() {
    const lines = pasteText.trim().split(/\r?\n/);
    const g = { ...grid };
    lines.forEach((line) => {
      const cells = line.split(/\t|,/).map((c) => c.trim());
      const rollNo = cells[0];
      if (!rollNo) return;
      const stu = students.find((s) => s.roll_no.toLowerCase() === rollNo.toLowerCase());
      if (!stu) return;
      g[stu.id] = selectedSubjects.map((_, i) => ({
        marks: cells[i + 1] || '',
        outOf,
        remark: g[stu.id]?.[i]?.remark || '',
      }));
    });
    setGrid(g);
    setPasteText('');
    setPasteOpen(false);
  }

  return (
    <div className="space-y-4">
      <BackBar to="/teacher" label="Back" />
      <h2 className="section-title">Enter Marks</h2>

      <div className="card p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <select className="input" value={fClass} onChange={(e) => setFClass(e.target.value)}>
          {CLASSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {(fClass === '11th' || fClass === '12th') && (
          <select className="input" value={fStream} onChange={(e) => setFStream(e.target.value)}>
            <option value="">All Streams</option>
            {STREAMS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
        <select className="input" value={testType} onChange={(e) => setTestType(e.target.value)}>
          <option>Weekly</option>
          <option>Monthly</option>
        </select>
        <select className="input" value={outOf} onChange={(e) => setOutOf(Number(e.target.value))}>
          <option value={25}>Out of 25</option>
          <option value={50}>Out of 50</option>
          <option value={100}>Out of 100</option>
        </select>
        {testType === 'Weekly' ? (
          <select className="input" value={week} onChange={(e) => setWeek(e.target.value)}>
            <option value="">Select Week</option>
            {weeks.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        ) : (
          <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        )}
        <input type="date" className="input" value={testDate} onChange={(e) => setTestDate(e.target.value)} />
      </div>

      <div className="card p-3">
        <label className="label">Select Subjects</label>
        <div className="flex gap-2 flex-wrap">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => toggleSubject(s)}
              className={`badge ${selectedSubjects.includes(s) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : selectedSubjects.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">Select at least one subject above.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="text-left p-2 sticky left-0 bg-slate-50">Student</th>
                {selectedSubjects.map((s) => (
                  <th key={s} className="p-2 text-center min-w-[100px]">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((stu) => (
                <tr key={stu.id} className="border-t border-slate-100">
                  <td className="p-2 sticky left-0 bg-white">
                    <div className="font-semibold">{stu.name}</div>
                    <div className="text-xs text-slate-400">{stu.roll_no}</div>
                  </td>
                  {selectedSubjects.map((_, i) => (
                    <td key={i} className="p-1 text-center">
                      <input
                        type="number"
                        className="input !py-1 !px-2 w-16 text-center"
                        placeholder={`/${outOf}`}
                        value={grid[stu.id]?.[i]?.marks || ''}
                        onChange={(e) => setCell(stu.id, i, { marks: e.target.value })}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={() => setPasteOpen((v) => !v)} className="btn-ghost w-full">
        <ClipboardPaste size={16} /> Bulk Paste Marks from Excel
      </button>

      {pasteOpen && (
        <div className="card p-4 space-y-3 border-blue-300">
          <h3 className="font-bold text-sm">Paste Marks from Excel</h3>
          <p className="text-xs text-slate-500">
            Format: RollNumber | Marks (one subject) or RollNumber | Marks1 | Marks2 (multiple subjects in order: {selectedSubjects.join(', ')})
          </p>
          <textarea
            className="input min-h-[120px] font-mono"
            placeholder={'26001\t88\n26002\t76\n26003\t92'}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={applyPaste} className="btn-primary">Apply Paste</button>
            <button onClick={() => setPasteOpen(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <button onClick={save} className="btn-primary w-full" disabled={saving || selectedSubjects.length === 0}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save Marks</>}
      </button>
      {saved && <p className="text-center text-sm text-green-600">Marks saved successfully!</p>}
    </div>
  );
}
