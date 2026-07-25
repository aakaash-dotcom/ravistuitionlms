import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import BackBar from '@/components/BackBar';
import { ALL_SUBJECTS } from '@/lib/subjects';
import type { DiaryEntry } from '@/lib/types';
import { Loader2, BookOpen, Plus, Send, Clock, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { getSetting } from '@/lib/settings';

export default function StudentDiary() {
  const s = useSession();
  const sid = s?.studentId;
  const [rows, setRows] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    subject: 'Tamil',
    topic: '',
    entry_date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [diaryEnabled, setDiaryEnabled] = useState(false);

  async function load() {
    if (!sid) return;
    setLoading(true);
    const { data } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('student_id', sid)
      .order('entry_date', { ascending: false });
    setRows((data as DiaryEntry[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    getSetting('student_diary_enabled').then((v) => setDiaryEnabled(v === 'true'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);

  async function submit() {
    if (!sid || !form.topic) return;
    setSaving(true);
    await supabase.from('diary_entries').insert({
      student_id: sid,
      subject: form.subject,
      topic: form.topic,
      entry_date: form.entry_date,
      status: 'Pending',
    });
    setSaving(false);
    setShowForm(false);
    setForm({ ...form, topic: '' });
    load();
  }

  return (
    <div className="space-y-4">
      <BackBar to="/student" label="Back" />
      <div className="flex items-center justify-between">
        <h2 className="section-title">Study Diary</h2>
        {diaryEnabled && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={16} /> Add Entry
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 -mt-2">
        {diaryEnabled
          ? 'Write what you studied each day. Your entries are sent to the admin for approval before your parents can see them.'
          : 'Your diary entries are added by your teacher in class. Contact your tuition centre if you want to add entries from your phone.'}
      </p>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          {diaryEnabled ? <><BookOpen size={18} /> No diary entries yet. Tap "Add Entry" to record what you studied.</> : <><Lock size={18} /> No diary entries yet.</>}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((e) => (
            <div key={e.id} className="card p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="badge bg-blue-100 text-blue-700">{e.subject}</span>
                {e.status === 'Approved' && (
                  <span className="badge bg-green-100 text-green-700">
                    <CheckCircle2 size={10} className="mr-1" /> Approved
                  </span>
                )}
                {e.status === 'Pending' && (
                  <span className="badge bg-amber-100 text-amber-700">
                    <Clock size={10} className="mr-1" /> Waiting for approval
                  </span>
                )}
                {e.status === 'Rejected' && (
                  <span className="badge bg-red-100 text-red-700">
                    <XCircle size={10} className="mr-1" /> Rejected
                  </span>
                )}
              </div>
              <div className="font-semibold text-sm">{e.topic}</div>
              <div className="text-xs text-slate-400">{e.entry_date}</div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold">What did you study today?</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 text-xl leading-none">
                &times;
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="label">Subject</label>
                <select
                  className="input"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                >
                  {ALL_SUBJECTS.map((sub) => (
                    <option key={sub}>{sub}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Topic / What you studied</label>
                <textarea
                  className="input min-h-[100px]"
                  placeholder="e.g. Algebra - solved 10 linear equations"
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
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={submit} className="btn-primary flex-1" disabled={saving || !form.topic}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Send size={14} /> Send for Approval</>}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
