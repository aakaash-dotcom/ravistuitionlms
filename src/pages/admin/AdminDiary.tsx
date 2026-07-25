import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CLASSES, STREAMS } from '@/lib/brand';
import { ALL_SUBJECTS } from '@/lib/subjects';
import type { DiaryEntry, Student } from '@/lib/types';
import { Plus, Check, X, Clock, Loader2, BookOpen } from 'lucide-react';

export default function AdminDiary() {
  const [entries, setEntries] = useState<(DiaryEntry & { student_name?: string })[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [fClass, setFClass] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    student_id: '',
    subject: 'Tamil',
    topic: '',
    entry_date: new Date().toISOString().slice(0, 10),
    status: 'Approved',
  });
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

  async function add() {
    if (!form.student_id || !form.topic) return;
    setSaving(true);
    await supabase.from('diary_entries').insert(form);
    setSaving(false);
    setShowAdd(false);
    setForm({ ...form, topic: '' });
    load();
  }

  return (
    <div className="space-y-4">
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
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold">Add Diary Entry</h3>
              <button onClick={() => setShowAdd(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="label">Student</label>
                <select
                  className="input"
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                >
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.roll_no} · {s.class})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Subject</label>
                <select
                  className="input"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                >
                  {ALL_SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Topic</label>
                <input
                  className="input"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.entry_date}
                  onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option>Approved</option>
                  <option>Pending</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={add} className="btn-primary flex-1" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
              </button>
              <button onClick={() => setShowAdd(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
