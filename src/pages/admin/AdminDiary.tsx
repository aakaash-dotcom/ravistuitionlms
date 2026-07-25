import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CLASSES } from '@/lib/brand';
import { ALL_SUBJECTS, getSubjectsForClass } from '@/lib/subjects';
import type { DiaryEntry, Student } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { Plus, Check, X, Loader2, BookOpen, Search, Trash2 } from 'lucide-react';

interface EntryRow {
  subject: string;
  topic: string;
}

export default function AdminDiary() {
  const [entries, setEntries] = useState<(DiaryEntry & { student_name?: string })[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [fClass, setFClass] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [rollSearch, setRollSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<EntryRow[]>([{ subject: 'Tamil', topic: '' }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let q = supabase.from('diary_entries').select('*, students(name)').order('entry_date', { ascending: false });
    if (fStatus) q = q.eq('status', fStatus);
    const { data } = await q;
    let list = (data as (DiaryEntry & { students?: { name: string } })[]) || [];
    if (fClass) {
      const { data: cls } = await supabase.from('students').select('id').eq('class', fClass);
      const ids = (cls as { id: string }[])?.map((r) => r.id) || [];
      list = list.filter((e) => ids.includes(e.student_id || ''));
    }
    setEntries(list.map((e) => ({ ...e, student_name: e.students?.name })));
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('students').select('*').order('name');
      setStudents((data as Student[]) || []);
    })();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fClass, fStatus]);

  async function setStatus(e: DiaryEntry, status: string) {
    await supabase.from('diary_entries').update({ status }).eq('id', e.id);
    load();
  }

  async function delEntry(e: DiaryEntry) {
    if (!confirm('Delete this diary entry?')) return;
    await supabase.from('diary_entries').delete().eq('id', e.id);
    load();
  }

  function pickStudent() {
    const stu = students.find((s) => s.roll_no.toLowerCase() === rollSearch.toLowerCase());
    if (stu) {
      setSelectedStudent(stu);
      setRollSearch('');
    } else {
      alert('No student found with that roll number.');
    }
  }

  function addRow() {
    setRows([...rows, { subject: 'Tamil', topic: '' }]);
  }
  function setRow(i: number, patch: Partial<EntryRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function delRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!selectedStudent) return;
    const valid = rows.filter((r) => r.topic.trim());
    if (valid.length === 0) return;
    setSaving(true);
    const inserts = valid.map((r) => ({
      student_id: selectedStudent.id,
      subject: r.subject,
      topic: r.topic,
      entry_date: entryDate,
      status: 'Approved',
    }));
    await supabase.from('diary_entries').insert(inserts);
    setSaving(false);
    setShowAdd(false);
    setSelectedStudent(null);
    setRows([{ subject: 'Tamil', topic: '' }]);
    load();
  }

  const availableSubjects = selectedStudent
    ? getSubjectsForClass(selectedStudent.class, selectedStudent.stream, selectedStudent.commerce_elective)
    : ALL_SUBJECTS;

  return (
    <div className="space-y-4">
      <BackBar to="/admin" label="Back to Dashboard" />
      <div className="flex items-center justify-between">
        <h2 className="section-title">Study Diary</h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Add Entry
        </button>
      </div>

      <div className="card p-3 grid grid-cols-2 md:grid-cols-3 gap-3">
        <select className="input" value={fClass} onChange={(e) => setFClass(e.target.value)}>
          <option value="">All Classes</option>
          {CLASSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="input" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">All Status</option>
          <option>Approved</option>
          <option>Pending</option>
          <option>Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <BookOpen size={18} /> No diary entries.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {e.student_name || 'All students'} · {e.subject}
                </div>
                <div className="text-xs text-slate-500 truncate">{e.topic}</div>
                <div className="text-[11px] text-slate-400">{e.entry_date}</div>
              </div>
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
              <div className="flex gap-1">
                <button onClick={() => setStatus(e, 'Approved')} className="btn-ghost !p-1.5" title="Approve">
                  <Check size={14} className="text-green-600" />
                </button>
                <button onClick={() => setStatus(e, 'Rejected')} className="btn-ghost !p-1.5" title="Reject">
                  <X size={14} className="text-red-600" />
                </button>
                <button onClick={() => delEntry(e)} className="btn-ghost !p-1.5" title="Delete">
                  <Trash2 size={14} className="text-slate-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="font-bold">Add Diary Entry</h3>
              <button onClick={() => { setShowAdd(false); setSelectedStudent(null); setRows([{ subject: 'Tamil', topic: '' }]); }}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {!selectedStudent ? (
                <div>
                  <label className="label">Enter Roll Number to find student</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        className="input pl-8"
                        placeholder="e.g. RT2026001"
                        value={rollSearch}
                        onChange={(e) => setRollSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && pickStudent()}
                      />
                    </div>
                    <button onClick={pickStudent} className="btn-primary">Find</button>
                  </div>
                  <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                    {students.slice(0, 50).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStudent(s)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 text-sm"
                      >
                        {s.name} · {s.roll_no} · {s.class}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="card p-3 bg-blue-50 border-blue-200 flex items-center gap-3">
                    <img src={selectedStudent.photo_url || 'https://images.pexels.com/photos/220457/pexels-photo-220457.jpeg'} className="w-10 h-10 rounded-lg object-cover" alt="" />
                    <div className="flex-1">
                      <div className="font-bold text-sm">{selectedStudent.name}</div>
                      <div className="text-xs text-slate-500">{selectedStudent.roll_no} · {selectedStudent.class}{selectedStudent.stream ? ` · ${selectedStudent.stream}` : ''}</div>
                    </div>
                    <button onClick={() => setSelectedStudent(null)} className="text-xs text-blue-600">Change</button>
                  </div>
                  <div>
                    <label className="label">Date</label>
                    <input type="date" className="input" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label !mb-0">Subjects studied</label>
                      <button onClick={addRow} className="btn-ghost !py-1 text-xs">
                        <Plus size={12} /> Add subject
                      </button>
                    </div>
                    <div className="space-y-2">
                      {rows.map((r, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <select className="input w-32" value={r.subject} onChange={(e) => setRow(i, { subject: e.target.value })}>
                            {availableSubjects.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                          <input
                            className="input flex-1"
                            placeholder="Topic covered"
                            value={r.topic}
                            onChange={(e) => setRow(i, { topic: e.target.value })}
                          />
                          {rows.length > 1 && (
                            <button onClick={() => delRow(i)} className="btn-ghost !p-2">
                              <X size={14} className="text-red-500" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            {selectedStudent && (
              <div className="sticky bottom-0 bg-white border-t p-4 flex gap-2">
                <button onClick={save} className="btn-primary flex-1" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save & Approve'}
                </button>
                <button onClick={() => { setShowAdd(false); setSelectedStudent(null); setRows([{ subject: 'Tamil', topic: '' }]); }} className="btn-ghost">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
