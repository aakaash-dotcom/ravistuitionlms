import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CLASSES } from '@/lib/brand';
import { ALL_SUBJECTS } from '@/lib/subjects';
import type { Teacher } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { Plus, Pencil, Trash2, X, Loader2, Search, Eye, UserCog } from 'lucide-react';

const empty: Omit<Teacher, 'id' | 'created_at'> = {
  name: '',
  phone: '',
  password: '',
  subjects: [],
  classes: [],
  schedule: 'Mon,Tue,Wed,Thu,Fri',
  status: 'Active',
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('teachers').select('*').order('name');
    let list = (data as Teacher[]) || [];
    if (q) list = list.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()) || t.phone.includes(q));
    setTeachers(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function openAdd() {
    setEditing(null);
    setForm({ ...empty });
    setShowForm(true);
  }
  function openEdit(t: Teacher) {
    setEditing(t);
    setForm({ ...t });
    setShowForm(true);
  }

  function toggleArr(field: 'subjects' | 'classes', val: string) {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter((v) => v !== val) : [...f[field], val],
    }));
  }
  function toggleDay(day: string) {
    const days = form.schedule ? form.schedule.split(',') : [];
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    setForm((f) => ({ ...f, schedule: next.join(',') }));
  }

  async function save() {
    setSaving(true);
    if (editing) {
      await supabase.from('teachers').update(form).eq('id', editing.id);
    } else {
      await supabase.from('teachers').insert(form);
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function del(t: Teacher) {
    if (!confirm(`Delete teacher ${t.name}?`)) return;
    await supabase.from('teachers').delete().eq('id', t.id);
    load();
  }

  return (
    <div className="space-y-4">
      <BackBar to="/admin" label="Back to Dashboard" />
      <div className="flex items-center justify-between">
        <h2 className="section-title">Teachers</h2>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Add Teacher
        </button>
      </div>

      <div className="card p-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-8" placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : teachers.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <UserCog size={18} /> No teachers yet.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teachers.map((t) => (
            <div key={t.id} className="card p-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                  <UserCog size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.phone}</div>
                  <div className="text-xs text-slate-400">
                    {t.subjects?.length ? t.subjects.join(', ') : 'No subjects'}
                  </div>
                  <div className="text-xs text-slate-400">
                    Classes: {t.classes?.length ? t.classes.join(', ') : 'None'}
                  </div>
                  <div className="text-xs text-slate-400">Schedule: {t.schedule || '—'}</div>
                  <span className={`badge mt-1 ${t.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {t.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openEdit(t)} className="btn-ghost flex-1 !py-1.5">
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={() => del(t)} className="btn-danger !py-1.5 !px-3">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="font-bold">{editing ? 'Edit Teacher' : 'Add Teacher'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone *</label>
                  <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit number" />
                </div>
                <div>
                  <label className="label">Password *</label>
                  <div className="flex gap-1">
                    <input className="input" type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="btn-ghost !px-2">
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Subjects</label>
                <div className="flex gap-1 flex-wrap">
                  {ALL_SUBJECTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleArr('subjects', s)}
                      className={`badge ${form.subjects.includes(s) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Classes</label>
                <div className="flex gap-1 flex-wrap">
                  {CLASSES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleArr('classes', c)}
                      className={`badge ${form.classes.includes(c) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Schedule (days teacher comes)</label>
                <div className="flex gap-1 flex-wrap">
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`badge ${(form.schedule || '').split(',').includes(d) ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t p-4 flex gap-2">
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
