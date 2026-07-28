import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CLASSES, STREAMS } from '@/lib/brand';
import { ALL_SUBJECTS } from '@/lib/subjects';
import type { StudyMaterial } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { Plus, Trash2, X, Loader2, BookMarked, Download } from 'lucide-react';

export default function AdminMaterials() {
  const [items, setItems] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: 'textbook',
    subject: 'Tamil',
    class: '10th',
    stream: '',
    file_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [fClass, setFClass] = useState('');
  const [fStream, setFStream] = useState('');
  const [fSubject, setFSubject] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('study_materials').select('*').order('created_at', { ascending: false });
    setItems((data as StudyMaterial[]) || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((m) => {
    if (fClass && m.class !== fClass) return false;
    if (fStream && m.stream !== fStream) return false;
    if (fSubject && m.subject !== fSubject) return false;
    return true;
  });

  async function del(m: StudyMaterial) {
    if (!confirm(`Delete "${m.title}"?`)) return;
    await supabase.from('study_materials').delete().eq('id', m.id);
    load();
  }
  async function save() {
    if (!form.title || !form.file_url) return;
    setSaving(true);
    await supabase.from('study_materials').insert({
      title: form.title,
      type: form.type,
      subject: form.subject,
      class: form.class,
      stream: (form.class === '11th' || form.class === '12th') && form.stream ? form.stream : null,
      file_url: form.file_url,
    });
    setSaving(false);
    setShowForm(false);
    setForm({ ...form, title: '', file_url: '' });
    load();
  }

  return (
    <div className="space-y-4">
      <BackBar to="/admin" label="Back to Dashboard" />
      <div className="flex items-center justify-between">
        <h2 className="section-title">Study Materials</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add Material
        </button>
      </div>

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
          {ALL_SUBJECTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : filtered.length === 0 ? (
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
                  {m.type} · {m.subject} · {m.class || 'All'}{m.stream ? ` · ${m.stream}` : ''}
                </div>
              </div>
              <a href={m.file_url} target="_blank" rel="noreferrer" className="btn-ghost !p-2">
                <Download size={14} />
              </a>
              <button onClick={() => del(m)} className="btn-danger !p-2">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold">Add Material</h3>
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
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option>textbook</option>
                    <option>question_paper</option>
                    <option>other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Class</label>
                  <select className="input" value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value, stream: '' })}>
                    {CLASSES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              {(form.class === '11th' || form.class === '12th') && (
                <div>
                  <label className="label">Stream (optional)</label>
                  <select className="input" value={form.stream} onChange={(e) => setForm({ ...form, stream: e.target.value })}>
                    <option value="">All Streams</option>
                    {STREAMS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Subject</label>
                <select className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                  {ALL_SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">File URL</label>
                <input className="input" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} />
              </div>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={save} className="btn-primary flex-1" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
