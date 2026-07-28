import { useEffect, useState } from 'react';
import { getSetting, setSetting } from '@/lib/settings';
import BackBar from '@/components/BackBar';
import { Loader2, Settings as SettingsIcon, BookOpen, Wallet, Eye, EyeOff } from 'lucide-react';

export default function AdminSettings() {
  const [diaryEnabled, setDiaryEnabled] = useState(false);
  const [feeMode, setFeeMode] = useState<'full' | 'simple'>('full');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const d = await getSetting('student_diary_enabled');
      setDiaryEnabled(d === 'true');
      const f = await getSetting('fee_display_mode');
      setFeeMode(f === 'simple' ? 'simple' : 'full');
      setLoading(false);
    })();
  }, []);

  async function toggleDiary() {
    setSaving(true);
    const next = !diaryEnabled;
    setDiaryEnabled(next);
    await setSetting('student_diary_enabled', next ? 'true' : 'false');
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function setFeeDisplay(mode: 'full' | 'simple') {
    setSaving(true);
    setFeeMode(mode);
    await setSetting('fee_display_mode', mode);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading)
    return (
      <div className="card p-8 text-center text-slate-500">
        <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
      </div>
    );

  return (
    <div className="space-y-4">
      <BackBar to="/admin" label="Back to Dashboard" />
      <h2 className="section-title flex items-center gap-2">
        <SettingsIcon size={20} className="text-slate-600" /> Settings
      </h2>

      {/* Diary toggle */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <BookOpen size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm">Student Diary Entry from Mobile</h3>
            <p className="text-xs text-slate-500 mt-1">
              When ON, students can write and submit their own diary entries from the student app
              on their phones. When OFF, diary entries can only be added by you or a teacher.
            </p>
            <button onClick={toggleDiary} disabled={saving} className="btn-primary mt-3">
              {saving ? <Loader2 size={16} className="animate-spin" /> : diaryEnabled ? 'ON — Tap to turn OFF' : 'OFF — Tap to turn ON'}
            </button>
            <div className="mt-2">
              <span className={`badge ${diaryEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {diaryEnabled ? 'Students can submit from mobile' : 'Only admin/teacher can add entries'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fee display mode */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Wallet size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm">Fee Display Mode for Parents</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">
              Choose how fee information appears on the parent portal.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFeeDisplay('full')}
                className={`card p-3 text-left transition ${feeMode === 'full' ? 'ring-2 ring-blue-500 bg-blue-50' : 'border border-slate-200'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Eye size={16} className="text-blue-600" />
                  <span className="font-bold text-sm">Full Details</span>
                </div>
                <p className="text-xs text-slate-500">Shows amounts, paid, pending, and payment history.</p>
              </button>
              <button
                onClick={() => setFeeDisplay('simple')}
                className={`card p-3 text-left transition ${feeMode === 'simple' ? 'ring-2 ring-blue-500 bg-blue-50' : 'border border-slate-200'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <EyeOff size={16} className="text-amber-600" />
                  <span className="font-bold text-sm">Simple Status</span>
                </div>
                <p className="text-xs text-slate-500">Only shows "Fees clear" or "Fee pending — contact centre". No numbers.</p>
              </button>
            </div>
            <div className="mt-2">
              <span className={`badge ${feeMode === 'full' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                Currently: {feeMode === 'full' ? 'Full Details' : 'Simple Status'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {saved && <p className="text-center text-sm text-green-600">Settings saved!</p>}
    </div>
  );
}
