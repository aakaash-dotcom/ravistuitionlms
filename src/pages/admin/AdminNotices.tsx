import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Notice } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { Plus, Trash2, X, Loader2, Bell, FileText, Image as ImageIcon } from 'lucide-react';

export default function AdminNotices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', file_url: '', image_url: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
    setNotices((data as Notice[]) || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(n: Notice) {
    await supabase.from('notices').update({ active: !n.active }).eq('id', n.id);
    load();
  }
  async function del(n: Notice) {
    if (!confirm(`Delete "${n.title}"?`)) return;
    await supabase.from('notices').delete().eq('id', n.id);
    load();
  }
  async function save() {
    if (!form.title || !form.content) return;
    setSaving(true);
    await supabase.from('notices').insert({
      title: form.title,
      content: form.content,
      file_url: form.file_url || null,
      active: true,
    });
    setSaving(false);
    setShowForm(false);
    setForm({ title: '', content: '', file_url: '', image_url: '' });
    load();
  }

  return (
    <div className="space-y-4">
      <BackBar to="/admin" label="Back to Dashboard" />
      <div className="flex items-center justify-between">
        <h2 className="section-title">Notices</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add Notice
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : notices.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <Bell size={18} /> No notices.
        </div>
      ) : (
        <div className="space-y-2">
          {notices.map((n) => (
            <div key={n.id} className="card p-3">
              <div className="flex items-start gap-3">
                <Bell size={16} className="text-rose-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{n.title}</div>
                  <p className="text-sm text-slate-600 mt-1">{n.content}</p>
                  {n.file_url && (
                    <a href={n.file_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                      <FileText size={12} /> Download attachment
                    </a>
                  )}
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(n.created_at || '').toLocaleDateString()}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => toggle(n)}
                    className={`badge ${n.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {n.active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => del(n)} className="btn-danger !p-1.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold">Add Notice</h3>
              <button onClick={() => setShowForm(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="label">Content</label>
                <textarea className="input min-h-[100px]" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              </div>
              <div>
                <label className="label">Image URL (shown to parents, downloadable)</label>
                <input className="input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                {form.image_url && (
                  <img src={form.image_url} alt="preview" className="w-full h-32 object-cover rounded-lg mt-2" />
                )}
              </div>
              <div>
                <label className="label">File URL (PDF or document, optional)</label>
                <input className="input" value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} />
              </div>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={save} className="btn-primary flex-1" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
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
