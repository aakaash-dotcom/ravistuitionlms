import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import BackBar from '@/components/BackBar';
import { useLang } from '@/components/LanguageProvider';
import { t } from '@/lib/i18n';
import type { FeeRow, Student } from '@/lib/types';
import { getSetting } from '@/lib/settings';
import ContactBox from '@/components/ContactBox';
import { Loader2, Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ParentFees() {
  const { lang } = useLang();
  const s = useSession();
  const ids = s?.studentIds || [];
  const [kids, setKids] = useState<Student[]>([]);
  const [active, setActive] = useState<Student | null>(null);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [feeMode, setFeeMode] = useState<'full' | 'simple'>('full');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const mode = await getSetting('fee_display_mode');
      setFeeMode(mode === 'simple' ? 'simple' : 'full');
    })();
  }, []);

  useEffect(() => {
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase.from('students').select('*').in('id', ids);
      const list = (data as Student[]) || [];
      setKids(list);
      setActive(list[0] || null);
    })();
  }, [ids]);

  useEffect(() => {
    if (!active) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('fees')
        .select('*')
        .eq('student_id', active.id)
        .order('payment_date', { ascending: false });
      setFees((data as FeeRow[]) || []);
      setLoading(false);
    })();
  }, [active]);

  if (!active) return <div className="card p-8 text-center text-slate-500">{t(lang, 'loading')}</div>;

  const totalPaid = fees.reduce((sum, f) => sum + Number(f.amount), 0);
  const total = Number(active.total_fee);
  const pending = Math.max(0, total - totalPaid);
  const pct = total > 0 ? Math.round((totalPaid / total) * 100) : 0;
  const isClear = pending <= 0;

  return (
    <div className="space-y-4">
      <BackBar to="/parent" label={t(lang, 'back')} />
      <h2 className="section-title">{t(lang, 'feeStatus')}</h2>

      {kids.length > 1 && (
        <div className="card p-3 flex gap-2 overflow-x-auto no-scrollbar">
          {kids.map((k) => (
            <button
              key={k.id}
              onClick={() => setActive(k)}
              className={`badge ${active.id === k.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}
            >
              {k.name}
            </button>
          ))}
        </div>
      )}

      {feeMode === 'simple' ? (
        /* Simple mode — no numbers, just status */
        loading ? (
          <div className="card p-8 text-center text-slate-500">
            <Loader2 size={20} className="animate-spin inline mr-2" /> {t(lang, 'loading')}
          </div>
        ) : isClear ? (
          <div className="card p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-3 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h3 className="font-bold text-lg text-green-700">Fees clear</h3>
            <p className="text-sm text-slate-500 mt-1">All fees are settled for this academic year.</p>
          </div>
        ) : (
          <div className="card p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 mx-auto mb-3 flex items-center justify-center">
              <AlertTriangle size={32} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-lg text-amber-700">Fee pending</h3>
            <p className="text-sm text-slate-500 mt-1">Please contact the tuition centre to clear your dues.</p>
          </div>
        )
      ) : (
        /* Full mode — detailed view */
        <>
          <div className="card p-4">
            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div>
                <div className="text-lg font-bold text-slate-800">₹{total.toLocaleString('en-IN')}</div>
                <div className="text-xs text-slate-500">{t(lang, 'annualTotal')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">₹{totalPaid.toLocaleString('en-IN')}</div>
                <div className="text-xs text-slate-500">{t(lang, 'totalPaid')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-600">₹{pending.toLocaleString('en-IN')}</div>
                <div className="text-xs text-slate-500">{t(lang, 'pendingBalance')}</div>
              </div>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-center text-xs text-slate-500 mt-1">{pct}% {t(lang, 'paid')}</div>
          </div>

          {loading ? (
            <div className="card p-8 text-center text-slate-500">
              <Loader2 size={20} className="animate-spin inline mr-2" /> {t(lang, 'loading')}
            </div>
          ) : (
            <div className="card divide-y divide-slate-100">
              <div className="p-3 font-bold text-sm flex items-center gap-2">
                <Wallet size={16} className="text-emerald-500" /> {t(lang, 'paymentHistory')}
              </div>
              {fees.length === 0 && (
                <div className="p-4 text-center text-sm text-slate-500">{t(lang, 'noData')}</div>
              )}
              {fees.map((f) => (
                <div key={f.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{f.payment_type}</div>
                    <div className="text-xs text-slate-400">
                      {f.payment_date}
                      {f.receipt_no ? ` · ${f.receipt_no}` : ''}
                    </div>
                  </div>
                  <span className="font-bold text-green-600">₹{Number(f.amount).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {feeMode === 'simple' && !isClear && <ContactBox />}
      {feeMode === 'full' && pending > 0 && <ContactBox />}
    </div>
  );
}
