import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Banner } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { Plus, Trash2, X, Loader2, Image } from 'lucide-react';

const AUDIENCES = ['Everyone', 'Parents Only', 'Students Only'];

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    image_url: '',
    link_url: '',
    audience: 'Everyone',
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('banners').select('*').order('created_at', { ascending: false });
    setBanners((data as Banner[]) || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function toggle(b: Banner) {
    await supabase.from('banners').update({ active: !b.active }).eq('id', b.id);
    load();
  }
  async function del(b: Banner) {
    if (!confirm(`Delete banner "${b.title}"?`)) return;
    await supabase.from('banners').delete().eq('id', b.id);
    load();
  }
  async function save() {
    if (!form.title || !form.image_url) return;
    setSaving(true);
    await supabase.from('banners').insert({
      title: form.title,
      image_url: form.image_url,
      link_url: form.link_url || null,
      audience: form.audience,
      active: true,
    });
    setSaving(false);
    setShowForm(false);
    setForm({ title: '', image_url: '', link_url: '', audience: 'Everyone' });
    load();
  }

  return (
    <div className="space-y-4">
      <BackBar to="/admin" label="Back to Dashboard" />
      <div className="flex items-center justify-between">
        <h2 className="section-title">Banners</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add Banner
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : banners.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <Image size={18} /> No banners.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {banners.map((b) => (
            <div key={b.id} className="card overflow-hidden">
              <img src={b.image_url} alt={b.title} className="w-full h-32 object-cover" />
              <div className="p-3">
                <div className="font-bold text-sm">{b.title}</div>
                <div className="text-xs text-slate-400">{b.audience}</div>
                {b.link_url && (
                  <div className="text-xs text-blue-600 truncate mt-0.5">Link: {b.link_url}</div>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => toggle(b)}
                    className={`badge ${b.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {b.active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => del(b)} className="btn-danger !p-1.5 ml-auto">
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
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold">Add Banner</h3>
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
                <label className="label">Image URL</label>
                <input className="input" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              </div>
              {form.image_url && (
                <img src={form.image_url} alt="preview" className="w-full h-32 object-cover rounded-lg" />
              )}
              <div>
                <label className="label">Link URL (where banner takes you when tapped)</label>
                <input className="input" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
              </div>
              <div>
                <label className="label">Target Audience</label>
                <select className="input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                  {AUDIENCES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
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
