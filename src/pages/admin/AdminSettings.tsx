import { useEffect, useState } from 'react';
import { getSetting, setSetting } from '@/lib/settings';
import { Loader2, Settings as SettingsIcon, BookOpen } from 'lucide-react';

export default function AdminSettings() {
  const [diaryEnabled, setDiaryEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const v = await getSetting('student_diary_enabled');
      setDiaryEnabled(v === 'true');
      setLoading(false);
    })();
  }, []);

  async function toggle() {
    setSaving(true);
    const next = !diaryEnabled;
    setDiaryEnabled(next);
    await setSetting('student_diary_enabled', next ? 'true' : 'false');
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
      <h2 className="section-title flex items-center gap-2">
        <SettingsIcon size={20} className="text-slate-600" /> Settings
      </h2>

      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <BookOpen size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm">Student Diary Entry from Mobile</h3>
            <p className="text-xs text-slate-500 mt-1">
              When ON, students can write and submit their own diary entries from the student app
              on their phones. When OFF, diary entries can only be added by you from the admin
              tablet in class. Use this when not everyone is able to use the admin tablet.
            </p>
            <button onClick={toggle} disabled={saving} className="btn-primary mt-3">
              {saving ? <Loader2 size={16} className="animate-spin" /> : diaryEnabled ? 'ON — Tap to turn OFF' : 'OFF — Tap to turn ON'}
            </button>
            {saved && <span className="text-xs text-green-600 ml-2">Saved!</span>}
            <div className="mt-2">
              <span className={`badge ${diaryEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {diaryEnabled ? 'Students can submit from mobile' : 'Only admin can add entries'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
