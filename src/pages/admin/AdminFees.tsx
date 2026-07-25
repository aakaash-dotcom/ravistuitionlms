import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CLASSES } from '@/lib/brand';
import type { FeeRow, Student } from '@/lib/types';
import { Plus, X, Loader2, Wallet, Search } from 'lucide-react';

export default function AdminFees() {
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Record<string, FeeRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [fClass, setFClass] = useState('');
  const [q, setQ] = useState('');
  const [payFor, setPayFor] = useState<Student | null>(null);
  const [form, setForm] = useState({
    amount: 0,
    payment_type: 'Cash',
    receipt_no: '',
    payment_date: new Date().toISOString().slice(0, 10),
    remark: '',
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    let query = supabase.from('students').select('*').order('roll_no');
    if (fClass) query = query.eq('class', fClass);
    const { data } = await query;
    let list = (data as Student[]) || [];
    if (q) list = list.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.roll_no.toLowerCase().includes(q.toLowerCase()));
    setStudents(list);
    const ids = list.map((s) => s.id);
    if (ids.length) {
      const { data: fdata } = await supabase.from('fees').select('*').in('student_id', ids).order('payment_date', { ascending: false });
      const map: Record<string, FeeRow[]> = {};
      (fdata as FeeRow[])?.forEach((f) => {
        (map[f.student_id] = map[f.student_id] || []).push(f);
      });
      setFees(map);
    } else {
      setFees({});
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fClass]);

  async function addPayment() {
    if (!payFor || !form.amount) return;
    setSaving(true);
    await supabase.from('fees').insert({
      student_id: payFor.id,
      amount: Number(form.amount),
      payment_type: form.payment_type,
      receipt_no: form.receipt_no || null,
      payment_date: form.payment_date,
      remark: form.remark || null,
    });
    // update student fee_paid
    const newPaid = Number(payFor.fee_paid) + Number(form.amount);
    await supabase.from('students').update({ fee_paid: newPaid }).eq('id', payFor.id);
    setSaving(false);
    setPayFor(null);
    setForm({ amount: 0, payment_type: 'Cash', receipt_no: '', payment_date: new Date().toISOString().slice(0, 10), remark: '' });
    load();
  }

  return (
    <div className="space-y-4">
      <h2 className="section-title">Fees</h2>

      <div className="card p-3 grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="relative col-span-2">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-8" placeholder="Search name or roll no" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" value={fClass} onChange={(e) => setFClass(e.target.value)}>
          <option value="">All Classes</option>
          {CLASSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((s) => {
            const paid = (fees[s.id] || []).reduce((sum, f) => sum + Number(f.amount), 0);
            const pending = Math.max(0, Number(s.total_fee) - paid);
            return (
              <div key={s.id} className="card p-3">
                <div className="flex items-center gap-3">
                  <img src={s.photo_url || 'https://images.pexels.com/photos/220457/pexels-photo-220457.jpeg'} className="w-10 h-10 rounded-lg object-cover" alt={s.name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{s.name}</div>
                    <div className="text-xs text-slate-400">{s.roll_no} · {s.class}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Total ₹{Number(s.total_fee).toLocaleString('en-IN')}</div>
                    <div className="text-xs text-green-600">Paid ₹{paid.toLocaleString('en-IN')}</div>
                    <div className="text-sm font-bold text-amber-600">Pending ₹{pending.toLocaleString('en-IN')}</div>
                  </div>
                  <button onClick={() => setPayFor(s)} className="btn-primary !py-1.5">
                    <Plus size={14} /> Payment
                  </button>
                </div>
                {(fees[s.id] || []).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                    {(fees[s.id] || []).map((f) => (
                      <div key={f.id} className="flex items-center justify-between text-xs">
                        <span>{f.payment_date} · {f.payment_type} {f.receipt_no ? `· ${f.receipt_no}` : ''}</span>
                        <span className="font-semibold text-green-600">₹{Number(f.amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {payFor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold">Add Payment · {payFor.name}</h3>
              <button onClick={() => setPayFor(null)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="label">Amount (₹)</label>
                <input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })}>
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Card</option>
                    <option>Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="label">Receipt No</label>
                  <input className="input" value={form.receipt_no} onChange={(e) => setForm({ ...form, receipt_no: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
              </div>
              <div>
                <label className="label">Remark</label>
                <input className="input" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
              </div>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button onClick={addPayment} className="btn-primary flex-1" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Wallet size={14} /> Save Payment</>}
              </button>
              <button onClick={() => setPayFor(null)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
