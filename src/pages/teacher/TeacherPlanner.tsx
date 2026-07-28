import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { ALL_SUBJECTS } from '@/lib/subjects';
import type { PlannerEntry } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { Loader2, Plus, Save, Trash2, CheckCircle2, Circle, Calendar } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TeacherPlanner() {
  const sess = useSession();
  const teacherId = sess?.teacherId;
  const [entries, setEntries] = useState<PlannerEntry[]>([]);
  const [weekStart, setWeekStart] = useState(getMondayStr(new Date()));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function getMondayStr(d: Date): string {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date.toISOString().slice(0, 10);
  }

  useEffect(() => {
    if (!teacherId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('planners')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('week_start', weekStart)
        .order('day');
      setEntries((data as PlannerEntry[]) || []);
      setLoading(false);
    })();
  }, [teacherId, weekStart]);

  function shiftWeek(days: number) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + days);
    setWeekStart(getMondayStr(d));
  }

  async function addPlan(day: string) {
    const newEntry: Partial<PlannerEntry> = {
      teacher_id: teacherId,
      week_start: weekStart,
      day,
      subject: '',
      planned_topic: '',
      taught_topic: '',
      status: 'Planned',
    };
    const { data } = await supabase.from('planners').insert(newEntry).select('*').single();
    if (data) setEntries([...entries, data as PlannerEntry]);
  }

  async function updateEntry(id: string, patch: Partial<PlannerEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    await supabase.from('planners').update(patch).eq('id', id);
  }

  async function delEntry(id: string) {
    await supabase.from('planners').delete().eq('id', id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function markTaught(id: string, taught: string) {
    await updateEntry(id, { taught_topic: taught, status: taught ? 'Taught' : 'Planned' });
  }

  return (
    <div className="space-y-4">
      <BackBar to="/teacher" label="Back" />
      <h2 className="section-title">Weekly Planner</h2>

      <div className="card p-3 flex items-center justify-between">
        <button onClick={() => shiftWeek(-7)} className="btn-ghost !py-1.5">Prev Week</button>
        <span className="font-bold text-sm flex items-center gap-2">
          <Calendar size={14} /> Week of {weekStart}
        </span>
        <button onClick={() => shiftWeek(7)} className="btn-ghost !py-1.5">Next Week</button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : (
        <div className="space-y-3">
          {DAYS.map((day) => {
            const dayEntries = entries.filter((e) => e.day === day);
            return (
              <div key={day} className="card p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm">{day}</h3>
                  <button onClick={() => addPlan(day)} className="btn-ghost !py-1 text-xs">
                    <Plus size={12} /> Add
                  </button>
                </div>
                {dayEntries.length === 0 ? (
                  <p className="text-xs text-slate-400">No plan for this day.</p>
                ) : (
                  <div className="space-y-2">
                    {dayEntries.map((e) => (
                      <div key={e.id} className="border border-slate-200 rounded-lg p-2 space-y-2">
                        <div className="flex gap-2">
                          <select
                            className="input !py-1 w-32 text-xs"
                            value={e.subject || ''}
                            onChange={(ev) => updateEntry(e.id, { subject: ev.target.value })}
                          >
                            <option value="">Subject</option>
                            {ALL_SUBJECTS.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                          <input
                            className="input !py-1 flex-1 text-xs"
                            placeholder="Planned topic"
                            value={e.planned_topic || ''}
                            onChange={(ev) => updateEntry(e.id, { planned_topic: ev.target.value })}
                          />
                          <button onClick={() => delEntry(e.id)} className="btn-ghost !p-1">
                            <Trash2 size={12} className="text-red-500" />
                          </button>
                        </div>
                        <div className="flex gap-2 items-center">
                          <input
                            className="input !py-1 flex-1 text-xs"
                            placeholder="What you actually taught..."
                            value={e.taught_topic || ''}
                            onChange={(ev) => markTaught(e.id, ev.target.value)}
                          />
                          {e.status === 'Taught' ? (
                            <span className="badge bg-green-100 text-green-700">
                              <CheckCircle2 size={10} className="mr-1" /> Taught
                            </span>
                          ) : (
                            <span className="badge bg-slate-100 text-slate-500">
                              <Circle size={10} className="mr-1" /> Planned
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
