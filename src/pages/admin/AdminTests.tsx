import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CLASSES,
  STREAMS,
  COMMERCE_ELECTIVES,
} from '@/lib/brand';
import { getSubjectsForClass } from '@/lib/subjects';
import type { Student, TestReport } from '@/lib/types';
import {
  ClipboardPaste,
  Save,
  Loader2,
  CheckCircle2,
  Grid3x3,
} from 'lucide-react';

type Cell = { marks: string; outOf: string; remark: string };

export default function AdminTests() {
  const [grade, setGrade] = useState('10th');
  const [stream, setStream] = useState<string>('');
  const [commerceElective, setCommerceElective] = useState<string>('Computer Application');
  const [testType, setTestType] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [week, setWeek] = useState('W1');
  const [month, setMonth] = useState('July');
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [outOf, setOutOf] = useState('100');

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const subjects = useMemo(
    () => getSubjectsForClass(grade, stream || null, commerceElective || null),
    [grade, stream, commerceElective],
  );

  // grid[studentId][subjectIndex] = Cell
  const [grid, setGrid] = useState<Record<string, Cell[]>>({});

  useEffect(() => {
    if (grade !== '11th' && grade !== '12th') {
      setStream('');
    }
  }, [grade]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from('students').select('*').eq('class', grade);
      if ((grade === '11th' || grade === '12th') && stream) {
        q = q.eq('stream', stream);
      }
      const { data } = await q.order('roll_no');
      const list = (data as Student[]) || [];
      setStudents(list);
      // init grid
      const g: Record<string, Cell[]> = {};
      list.forEach((s) => {
        g[s.id] = subjects.map(() => ({ marks: '', outOf: outOf, remark: '' }));
      });
      setGrid(g);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, stream]);

  // re-init outOf default when changed
  useEffect(() => {
    setGrid((prev) => {
      const g = { ...prev };
      Object.keys(g).forEach((sid) => {
        g[sid] = g[sid].map((c) => ({ ...c, outOf: c.outOf || outOf }));
      });
      return g;
    });
  }, [outOf]);

  function setCell(sid: string, si: number, field: keyof Cell, val: string) {
    setGrid((prev) => {
      const row = [...(prev[sid] || [])];
      row[si] = { ...row[si], [field]: val };
      return { ...prev, [sid]: row };
    });
  }

  // Keyboard navigation: Enter moves down to next student same subject column
  function onKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    sid: string,
    si: number,
    field: 'marks' | 'outOf' | 'remark',
  ) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = students.findIndex((s) => s.id === sid);
      const next = students[idx + 1];
      if (next) {
        const el = document.querySelector<HTMLInputElement>(
          `[data-cell="${next.id}-${si}-${field}"]`,
        );
        el?.focus();
      }
    }
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const rows: Omit<TestReport, 'id' | 'created_at'>[] = [];
    students.forEach((s) => {
      subjects.forEach((sub, si) => {
        const cell = grid[s.id]?.[si];
        if (cell && cell.marks !== '') {
          rows.push({
            student_id: s.id,
            subject: sub,
            marks: Number(cell.marks) || 0,
            out_of: Number(cell.outOf) || 100,
            test_type: testType,
            week: testType === 'Weekly' ? week : null,
            month: testType === 'Monthly' ? month : null,
            test_date: testDate,
            remark: cell.remark || null,
          });
        }
      });
    });
    if (rows.length === 0) {
      setSaving(false);
      return;
    }
    const { error } = await supabase.from('test_reports').insert(rows);
    setSaving(false);
    if (!error) {
      setSaved(true);
      // clear marks
      setGrid((prev) => {
        const g = { ...prev };
        Object.keys(g).forEach((sid) => {
          g[sid] = g[sid].map((c) => ({ ...c, marks: '', remark: '' }));
        });
        return g;
      });
      setTimeout(() => setSaved(false), 2500);
    }
  }

  function applyPaste() {
    // Parse tab/newline separated values from Google Sheets.
    // Expected: rows of students, columns = subject marks (in subject order).
    const lines = pasteText.trim().split(/\r?\n/);
    let applied = 0;
    const g = { ...grid };
    lines.forEach((line, li) => {
      const cells = line.split(/\t|,/).map((c) => c.trim());
      const stu = students[li];
      if (!stu) return;
      g[stu.id] = subjects.map((sub, si) => {
        const val = cells[si] ?? '';
        return {
          marks: val,
          outOf: g[stu.id]?.[si]?.outOf || outOf,
          remark: g[stu.id]?.[si]?.remark || '',
        };
      });
      applied++;
    });
    setGrid(g);
    setPasteText('');
    setPasteOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="section-title flex items-center gap-2">
          <Grid3x3 size={20} className="text-blue-600" /> Marks Entry (Grid)
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setPasteOpen((v) => !v)} className="btn-ghost">
            <ClipboardPaste size={16} /> Paste from Sheet
          </button>
          <button onClick={save} className="btn-primary" disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 size={16} /> Saved!
              </>
            ) : (
              <>
                <Save size={16} /> Save All
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="label">Class</label>
          <select className="input" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {CLASSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {(grade === '11th' || grade === '12th') && (
          <div>
            <label className="label">Stream</label>
            <select className="input" value={stream} onChange={(e) => setStream(e.target.value)}>
              <option value="">All streams</option>
              {STREAMS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
        {grade === '11th' && stream === 'Commerce' && (
          <div>
            <label className="label">Commerce Elective</label>
            <select
              className="input"
              value={commerceElective}
              onChange={(e) => setCommerceElective(e.target.value)}
            >
              {COMMERCE_ELECTIVES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Test Type</label>
          <select
            className="input"
            value={testType}
            onChange={(e) => setTestType(e.target.value as 'Weekly' | 'Monthly')}
          >
            <option>Weekly</option>
            <option>Monthly</option>
          </select>
        </div>
        {testType === 'Weekly' ? (
          <div>
            <label className="label">Week</label>
            <input className="input" value={week} onChange={(e) => setWeek(e.target.value)} />
          </div>
        ) : (
          <div>
            <label className="label">Month</label>
            <input className="input" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        )}
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Default Out Of</label>
          <input className="input" value={outOf} onChange={(e) => setOutOf(e.target.value)} />
        </div>
      </div>

      {/* Subjects legend */}
      <div className="card p-3">
        <div className="text-xs font-semibold text-slate-500 mb-2">
          Subjects ({subjects.length}): {subjects.join(' · ')}
        </div>
      </div>

      {pasteOpen && (
        <div className="card p-4 space-y-3 border-blue-300">
          <h3 className="font-bold text-sm">Paste from Google Sheets</h3>
          <p className="text-xs text-slate-500">
            Copy a range from Google Sheets where rows = students (in the same order as the list
            below) and columns = subject marks (in this order: {subjects.join(', ')}). Paste below.
          </p>
          <textarea
            className="input min-h-[120px] font-mono"
            placeholder="88\t76\t92\t81\t74"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={applyPaste} className="btn-primary">
              Apply Paste
            </button>
            <button onClick={() => setPasteOpen(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="card p-8 flex items-center justify-center text-slate-500">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading students...
        </div>
      ) : students.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          No students found for this class/stream.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-100 sticky top-0">
              <tr>
                <th className="text-left p-2 border-b border-slate-200 min-w-[140px]">Student</th>
                {subjects.map((sub) => (
                  <th key={sub} className="p-2 border-b border-l border-slate-200 min-w-[90px]">
                    <div className="text-xs font-semibold">{sub}</div>
                    <div className="text-[10px] text-slate-400 font-normal">Marks / OutOf</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-2 border-b border-slate-100">
                    <div className="font-semibold text-slate-800">{s.name}</div>
                    <div className="text-[11px] text-slate-400">{s.roll_no}</div>
                  </td>
                  {subjects.map((sub, si) => {
                    const cell = grid[s.id]?.[si] || { marks: '', outOf, remark: '' };
                    return (
                      <td key={sub} className="p-1 border-b border-l border-slate-100">
                        <input
                          data-cell={`${s.id}-${si}-marks`}
                          className="w-14 text-center rounded border border-slate-200 px-1 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                          value={cell.marks}
                          onChange={(e) => setCell(s.id, si, 'marks', e.target.value)}
                          onKeyDown={(e) => onKeyDown(e, s.id, si, 'marks')}
                          placeholder="—"
                        />
                        <input
                          data-cell={`${s.id}-${si}-outOf`}
                          className="w-14 text-center rounded border border-slate-100 px-1 py-0.5 text-[11px] text-slate-500 mt-0.5 outline-none focus:border-blue-400"
                          value={cell.outOf}
                          onChange={(e) => setCell(s.id, si, 'outOf', e.target.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-400">
        Tip: press <kbd className="px-1 bg-slate-200 rounded">Enter</kbd> in a marks cell to jump to
        the next student in the same subject column. Use "Paste from Sheet" to bulk-fill from
        Google Sheets.
      </p>
    </div>
  );
}
