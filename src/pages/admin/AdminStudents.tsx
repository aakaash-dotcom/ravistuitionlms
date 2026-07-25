import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  CLASSES,
  BOARDS,
  STREAMS,
  COMMERCE_ELECTIVES,
  STATUSES,
} from '@/lib/brand';
import type { Student } from '@/lib/types';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Eye,
  Loader2,
  Wallet,
} from 'lucide-react';

const empty: Omit<Student, 'id' | 'created_at'> = {
  roll_no: '',
  name: '',
  password: '',
  class: '10th',
  board: 'State',
  stream: null,
  commerce_elective: null,
  school: '',
  phone: '',
  parent_name: '',
  parent_phone: '',
  photo_url: '',
  total_fee: 0,
  fee_paid: 0,
  status: 'Active',
};

export default function AdminStudents() {
  const [params] = useSearchParams();
  const feeFilter = params.get('filter') === 'pending';

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [fClass, setFClass] = useState('');
  const [fBoard, setFBoard] = useState('');
  const [fStream, setFStream] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(true);

  async function load() {
    setLoading(true);
    let query = supabase.from('students').select('*').order('roll_no');
    if (fClass) query = query.eq('class', fClass);
    if (fBoard) query = query.eq('board', fBoard);
    if (fStream) query = query.eq('stream', fStream);
    if (fStatus) query = query.eq('status', fStatus);
    const { data } = await query;
    let list = (data as Student[]) || [];
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q.toLowerCase()) ||
          s.roll_no.toLowerCase().includes(q.toLowerCase()),
      );
    }
    if (feeFilter) list = list.filter((s) => s.total_fee - s.fee_paid > 0);
    setStudents(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fClass, fBoard, fStream, fStatus, feeFilter]);

  function openAdd() {
    setEditing(null);
    setForm({ ...empty });
    setShowForm(true);
  }
  function openEdit(s: Student) {
    setEditing(s);
    setForm({ ...s });
    setShowForm(true);
  }

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      stream: form.class === '11th' || form.class === '12th' ? form.stream : null,
      commerce_elective:
        form.class === '11th' && form.stream === 'Commerce' ? form.commerce_elective : null,
      total_fee: Number(form.total_fee) || 0,
      fee_paid: Number(form.fee_paid) || 0,
    };
    if (editing) {
      await supabase.from('students').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('students').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function del(s: Student) {
    if (!confirm(`Delete ${s.name}? This cannot be undone.`)) return;
    await supabase.from('students').delete().eq('id', s.id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Students</h2>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Add Student
        </button>
      </div>

      <div className="card p-3 grid grid-cols-2 md:grid-cols-6 gap-2">
        <div className="relative col-span-2">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-8"
            placeholder="Search name or roll no"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className="input" value={fClass} onChange={(e) => setFClass(e.target.value)}>
          <option value="">All Classes</option>
          {CLASSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="input" value={fBoard} onChange={(e) => setFBoard(e.target.value)}>
          <option value="">All Boards</option>
          {BOARDS.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <select className="input" value={fStream} onChange={(e) => setFStream(e.target.value)}>
          <option value="">All Streams</option>
          {STREAMS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className="input" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">All Status</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card p-8 flex items-center justify-center text-slate-500">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading...
        </div>
      ) : students.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">No students found.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map((s) => {
            const pending = s.total_fee - s.fee_paid;
            return (
              <div key={s.id} className="card p-3">
                <div className="flex items-start gap-3">
                  <img
                    src={s.photo_url || 'https://images.pexels.com/photos/220457/pexels-photo-220457.jpeg'}
                    alt={s.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{s.name}</div>
                    <div className="text-xs text-slate-500">
                      {s.roll_no} · {s.class}
                      {s.stream ? ` · ${s.stream}` : ''}
                    </div>
                    <div className="text-xs text-slate-400">{s.school}</div>
                    <div className="text-xs text-slate-400">Parent: {s.parent_phone}</div>
                    {pending > 0 ? (
                      <div className="badge bg-amber-100 text-amber-700 mt-1">
                        <Wallet size={10} className="mr-1" /> ₹{pending.toLocaleString('en-IN')} pending
                      </div>
                    ) : (
                      <div className="badge bg-green-100 text-green-700 mt-1">Fees clear</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(s)} className="btn-ghost flex-1 !py-1.5">
                    <Pencil size={14} /> Edit
                  </button>
                  <button onClick={() => del(s)} className="btn-danger !py-1.5 !px-3">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="font-bold">{editing ? 'Edit Student' : 'Add Student'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div>
                <label className="label">Roll No *</label>
                <input className="input" value={form.roll_no} onChange={(e) => set('roll_no', e.target.value)} />
              </div>
              <div>
                <label className="label">Password *</label>
                <div className="flex gap-1">
                  <input
                    className="input"
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="btn-ghost !px-2">
                    <Eye size={14} />
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Class</label>
                <select className="input" value={form.class} onChange={(e) => set('class', e.target.value)}>
                  {CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Board</label>
                <select className="input" value={form.board} onChange={(e) => set('board', e.target.value)}>
                  {BOARDS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>
              {(form.class === '11th' || form.class === '12th') && (
                <div>
                  <label className="label">Stream</label>
                  <select
                    className="input"
                    value={form.stream || ''}
                    onChange={(e) => set('stream', e.target.value || null)}
                  >
                    <option value="">—</option>
                    {STREAMS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              {form.class === '11th' && form.stream === 'Commerce' && (
                <div>
                  <label className="label">Commerce Elective</label>
                  <select
                    className="input"
                    value={form.commerce_elective || ''}
                    onChange={(e) => set('commerce_elective', e.target.value || null)}
                  >
                    {COMMERCE_ELECTIVES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="col-span-2">
                <label className="label">School</label>
                <input className="input" value={form.school || ''} onChange={(e) => set('school', e.target.value)} />
              </div>
              <div>
                <label className="label">Student Phone</label>
                <input className="input" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Parent Name</label>
                <input className="input" value={form.parent_name || ''} onChange={(e) => set('parent_name', e.target.value)} />
              </div>
              <div>
                <label className="label">Parent Phone</label>
                <input className="input" value={form.parent_phone || ''} onChange={(e) => set('parent_phone', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Photo URL</label>
                <input className="input" value={form.photo_url || ''} onChange={(e) => set('photo_url', e.target.value)} />
              </div>
              <div>
                <label className="label">Total Fee (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={form.total_fee}
                  onChange={(e) => set('total_fee', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Fee Paid (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={form.fee_paid}
                  onChange={(e) => set('fee_paid', Number(e.target.value))}
                />
              </div>
              <div className="col-span-2 text-xs text-slate-500">
                Pending: ₹{Math.max(0, (Number(form.total_fee) || 0) - (Number(form.fee_paid) || 0)).toLocaleString('en-IN')}
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
