import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CLASSES, STREAMS } from '@/lib/brand';
import { getSubjectsForClass } from '@/lib/subjects';
import type { McqQuestion, McqQuiz } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { sendPushAlert } from '@/lib/onesignal';
import { Plus, Trash2, X, Loader2, HelpCircle, Save, ClipboardPaste } from 'lucide-react';

interface QForm {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: 'A' | 'B' | 'C' | 'D';
  marks: number;
}

export default function AdminMcq() {
  const [quizzes, setQuizzes] = useState<McqQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    topic: '',
    subject: 'Tamil',
    class: '10th',
    stream: '',
    total_marks: 100,
    duration: 30,
  });
  const [questions, setQuestions] = useState<QForm[]>([
    { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', answer: 'A', marks: 1 },
  ]);
  const [saving, setSaving] = useState(false);
  const [entryMode, setEntryMode] = useState<'manual' | 'bulk'>('manual');
  const [bulkText, setBulkText] = useState('');
  const [bulkResult, setBulkResult] = useState<{ added: number; skipped: number } | null>(null);

  // filters for quiz list
  const [fClass, setFClass] = useState('');
  const [fStream, setFStream] = useState('');
  const [fSubject, setFSubject] = useState('');

  const subjects = getSubjectsForClass(form.class, form.stream || null, 'Computer Application');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('mcq_quizzes').select('*').order('created_at', { ascending: false });
    setQuizzes((data as McqQuiz[]) || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filteredQuizzes = quizzes.filter((q) => {
    if (fClass && q.class !== fClass) return false;
    if (fStream && q.stream !== fStream) return false;
    if (fSubject && q.subject !== fSubject) return false;
    return true;
  });

  function addQ() {
    setQuestions([...questions, { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', answer: 'A', marks: 1 }]);
  }
  function setQ(i: number, patch: Partial<QForm>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function delQ(i: number) {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  }

  function parseBulkPaste(text: string): QForm[] {
    const lines = text.trim().split('\n').filter((l) => l.trim());
    const result: QForm[] = [];
    let skipped = 0;
    for (const line of lines) {
      // try tab, then |, then comma
      let parts = line.split('\t');
      if (parts.length < 4) parts = line.split('|');
      if (parts.length < 4) parts = line.split(',');
      // Need at least: question, A, B, C, D, correct
      if (parts.length < 6) {
        skipped++;
        continue;
      }
      const [q, a, b, c, d, correct, marks] = parts.map((p) => p.trim());
      const correctUpper = (correct || 'A').toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(correctUpper)) {
        skipped++;
        continue;
      }
      if (!q) {
        skipped++;
        continue;
      }
      result.push({
        question_text: q,
        option_a: a || '',
        option_b: b || '',
        option_c: c || '',
        option_d: d || '',
        answer: correctUpper as 'A' | 'B' | 'C' | 'D',
        marks: marks ? Number(marks) || 1 : 1,
      });
    }
    return result;
  }

  function applyBulk() {
    const parsed = parseBulkPaste(bulkText);
    if (parsed.length === 0) {
      setBulkResult({ added: 0, skipped: 0 });
      return;
    }
    const skipped = (bulkText.trim().split('\n').filter((l) => l.trim())).length - parsed.length;
    setQuestions(parsed);
    setBulkResult({ added: parsed.length, skipped: Math.max(0, skipped) });
  }

  async function save() {
    if (!form.title) return;
    const validQs = questions.filter((q) => q.question_text);
    if (validQs.length === 0) return;
    setSaving(true);
    const { data: quiz } = await supabase
      .from('mcq_quizzes')
      .insert({
        title: form.title,
        topic: form.topic || null,
        subject: form.subject,
        class: form.class,
        stream: (form.class === '11th' || form.class === '12th') && form.stream ? form.stream : null,
        total_marks: Number(form.total_marks),
        duration: Number(form.duration),
        active: true,
      })
      .select()
      .single();
    if (quiz) {
      const rows = validQs.map((q) => ({ ...q, quiz_id: (quiz as McqQuiz).id, marks: Number(q.marks) }));
      await supabase.from('mcq_questions').insert(rows);
      await sendPushAlert(
        "Ravi's Tuition Centre · Daily MCQ",
        `New practice quiz available for ${form.class} (${form.subject}). Test your knowledge now!`,
      );
    }
    setSaving(false);
    setShowForm(false);
    setForm({ title: '', topic: '', subject: 'Tamil', class: '10th', stream: '', total_marks: 100, duration: 30 });
    setQuestions([{ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', answer: 'A', marks: 1 }]);
    setBulkText('');
    setBulkResult(null);
    setEntryMode('manual');
    load();
  }

  async function toggle(q: McqQuiz) {
    await supabase.from('mcq_quizzes').update({ active: !q.active }).eq('id', q.id);
    load();
  }
  async function del(q: McqQuiz) {
    if (!confirm(`Delete quiz "${q.title}"?`)) return;
    await supabase.from('mcq_quizzes').delete().eq('id', q.id);
    load();
  }

  return (
    <div className="space-y-4">
      <BackBar to="/admin" label="Back to Dashboard" />
      <div className="flex items-center justify-between">
        <h2 className="section-title">MCQ Quizzes</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Create Quiz
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3 grid grid-cols-3 gap-3">
        <select className="input" value={fClass} onChange={(e) => setFClass(e.target.value)}>
          <option value="">All Classes</option>
          {CLASSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="input" value={fStream} onChange={(e) => setFStream(e.target.value)}>
          <option value="">All Streams</option>
          {STREAMS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className="input" value={fSubject} onChange={(e) => setFSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {getSubjectsForClass(fClass || '10th', fStream || null, null).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <HelpCircle size={18} /> No quizzes found.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredQuizzes.map((q) => (
            <div key={q.id} className="card p-3 flex items-center gap-3">
              <HelpCircle size={18} className="text-purple-500" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{q.title}</div>
                <div className="text-xs text-slate-400">
                  {q.subject} · {q.class}{q.stream ? ` · ${q.stream}` : ''} · {q.duration} min · {q.total_marks} marks
                </div>
              </div>
              <button onClick={() => toggle(q)} className={`badge ${q.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {q.active ? 'Active' : 'Inactive'}
              </button>
              <button onClick={() => del(q)} className="btn-danger !p-1.5">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="font-bold">Create Quiz</h3>
              <button onClick={() => setShowForm(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Class</label>
                  <select className="input" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value, stream: '' })}>
                    {CLASSES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                {(form.class === '11th' || form.class === '12th') && (
                  <div>
                    <label className="label">Stream</label>
                    <select className="input" value={form.stream} onChange={(e) => setForm({ ...form, stream: e.target.value })}>
                      <option value="">All</option>
                      {STREAMS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="label">Subject</label>
                  <select className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                    {subjects.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Topic</label>
                  <input className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
                </div>
                <div>
                  <label className="label">Total Marks</label>
                  <input type="number" className="input" value={form.total_marks} onChange={(e) => setForm({ ...form, total_marks: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Duration (min)</label>
                  <input type="number" className="input" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
                </div>
              </div>

              {/* Entry mode toggle */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEntryMode('manual')}
                  className={`badge ${entryMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  <Plus size={12} /> Manual Entry
                </button>
                <button
                  onClick={() => setEntryMode('bulk')}
                  className={`badge ${entryMode === 'bulk' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  <ClipboardPaste size={12} /> Bulk Paste (from Excel)
                </button>
              </div>

              {entryMode === 'bulk' ? (
                <div className="space-y-2">
                  <label className="label">Paste from Excel — one question per line</label>
                  <p className="text-xs text-slate-500">
                    Format: Question | Option A | Option B | Option C | Option D | Correct (A/B/C/D) | Marks
                    <br />Tab-separated (paste directly from Excel), or use | or , as separators.
                  </p>
                  <textarea
                    className="input min-h-[200px] font-mono text-xs"
                    placeholder={'What is 2+2?\t2\t3\t4\t5\tC\t1\nCapital of India?\tMumbai\tDelhi\tChennai\tKolkata\tB\t1'}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                  />
                  <button onClick={applyBulk} className="btn-primary">
                    <ClipboardPaste size={14} /> Parse & Add Questions
                  </button>
                  {bulkResult && (
                    <p className="text-sm text-green-600">
                      Added: {bulkResult.added} question(s)
                      {bulkResult.skipped > 0 && `, Skipped: ${bulkResult.skipped} invalid line(s)`}
                    </p>
                  )}
                  {questions.filter((q) => q.question_text).length > 0 && (
                    <p className="text-xs text-slate-500">
                      Total questions ready: {questions.filter((q) => q.question_text).length}
                    </p>
                  )}
                </div>
              ) : (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm">Questions</h4>
                    <button onClick={addQ} className="btn-ghost !py-1">
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  <div className="space-y-3">
                    {questions.map((q, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">Q{i + 1}</span>
                          {questions.length > 1 && (
                            <button onClick={() => delQ(i)} className="text-red-500">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <input
                          className="input"
                          placeholder="Question text"
                          value={q.question_text}
                          onChange={(e) => setQ(i, { question_text: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                            <div key={opt} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setQ(i, { answer: opt })}
                                className={`w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                                  q.answer === opt ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {opt}
                              </button>
                              <input
                                className="input"
                                placeholder={`Option ${opt}`}
                                value={q[`option_${opt.toLowerCase()}` as keyof QForm] as string}
                                onChange={(e) => setQ(i, { [`option_${opt.toLowerCase()}`]: e.target.value } as Partial<QForm>)}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="label !mb-0">Marks</label>
                          <input
                            type="number"
                            className="input w-20"
                            value={q.marks}
                            onChange={(e) => setQ(i, { marks: Number(e.target.value) })}
                          />
                          <span className="text-xs text-slate-400">Correct answer: {q.answer}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t p-4 flex gap-2">
              <button onClick={save} className="btn-primary flex-1" disabled={saving || questions.filter((q) => q.question_text).length === 0}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={14} /> Save Quiz ({questions.filter((q) => q.question_text).length} Q)</>}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
