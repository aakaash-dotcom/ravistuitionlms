import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CLASSES, STREAMS, DEFAULT_AVATAR } from '@/lib/brand';
import { ALL_SUBJECTS, getSubjectsForClass } from '@/lib/subjects';
import type { DiaryEntry, Student } from '@/lib/types';
import type { WhatsAppRequest } from '@/lib/whatsapp';
import { sendWhatsApp, normalizePhone } from '@/lib/whatsapp';
import { sendPushAlert } from '@/lib/onesignal';
import { BRAND } from '@/lib/brand';
import BackBar from '@/components/BackBar';
import { Plus, Check, X, Loader2, BookOpen, Search, Trash2, CheckCircle2, XCircle, Users, User } from 'lucide-react';

const PRESET_HOMEWORK = [
  '📖 Read Ch ',
  '📝 Complete Ch ',
  '✍️ Complete Ex ',
  '🔥 Test Revision for Saturday',
];

interface EntryRow {
  subject: string;
  topic: string;
}

export default function AdminDiary() {
  const [entries, setEntries] = useState<(DiaryEntry & { student_name?: string })[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [fClass, setFClass] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [rollSearch, setRollSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<EntryRow[]>([{ subject: 'Tamil', topic: '' }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Bulk mode state
  const [bulkClass, setBulkClass] = useState('10th');
  const [bulkStream, setBulkStream] = useState('');
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkStudents, setBulkStudents] = useState<Student[]>([]);

  async function load() {
    setLoading(true);
    let q = supabase.from('diary_entries').select('*, students(name)').order('entry_date', { ascending: false });
    if (fStatus) q = q.eq('status', fStatus);
    const { data } = await q;
    let list = (data as (DiaryEntry & { students?: { name: string } })[]) || [];
    if (fClass) {
      const { data: cls } = await supabase.from('students').select('id').eq('class', fClass);
      const ids = (cls as { id: string }[])?.map((r) => r.id) || [];
      list = list.filter((e) => ids.includes(e.student_id || ''));
    }
    setEntries(list.map((e) => ({ ...e, student_name: e.students?.name })));
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('students').select('*').order('name');
      setStudents((data as Student[]) || []);
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fClass, fStatus]);

  useEffect(() => {
    if (!showAdd || !bulkMode) return;
    (async () => {
      let q = supabase.from('students').select('*').eq('status', 'Active').eq('class', bulkClass);
      if (bulkStream) q = q.eq('stream', bulkStream);
      const { data } = await q.order('name');
      setBulkStudents((data as Student[]) || []);
    })();
  }, [showAdd, bulkMode, bulkClass, bulkStream]);

  async function setStatus(e: DiaryEntry, status: string) {
    await supabase.from('diary_entries').update({ status }).eq('id', e.id);
    load();
  }

  async function delEntry(e: DiaryEntry) {
    if (!confirm('Delete this diary entry?')) return;
    await supabase.from('diary_entries').delete().eq('id', e.id);
    load();
  }

  function pickStudent() {
    const stu = students.find((s) => s.roll_no.toLowerCase() === rollSearch.toLowerCase());
    if (stu) {
      setSelectedStudent(stu);
      setRollSearch('');
    } else {
      alert('No student found with that roll number.');
    }
  }

  function addRow() {
    setRows([...rows, { subject: 'Tamil', topic: '' }]);
  }
  function setRow(i: number, patch: Partial<EntryRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function delRow(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  function applyPreset(preset: string) {
    setRows((rs) => {
      const last = rs[rs.length - 1];
      return rs.map((r, i) => (i === rs.length - 1 ? { ...r, topic: (r.topic + ' ' + preset).trim() } : r));
    });
  }

  function toggleBulkStudent(id: string) {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllBulk() {
    setBulkSelectedIds(new Set(bulkStudents.map((s) => s.id)));
  }
  function clearBulkSelection() {
    setBulkSelectedIds(new Set());
  }

  const availableSubjects = bulkMode
    ? getSubjectsForClass(bulkClass, bulkStream || null, null)
    : selectedStudent
      ? getSubjectsForClass(selectedStudent.class, selectedStudent.stream, selectedStudent.commerce_elective)
      : ALL_SUBJECTS;

  async function notifyStudent(s: Student, valid: EntryRow[]) {
    const subjectSummary = valid.map((r) => `${r.subject}: ${r.topic}`).join('\n');
    const targetIds: string[] = [];
    if (s.parent_phone) targetIds.push(s.parent_phone);
    if (s.roll_no) targetIds.push(s.roll_no);
    await sendPushAlert(
      `${BRAND.name} · Homework Diary`,
      `${s.name} (${s.roll_no}) studied:\n${subjectSummary}\n\nPlease check the app and sign the diary.`,
      targetIds.length > 0 ? targetIds : undefined,
    );
    if (s.parent_phone) {
      const waMsg: WhatsAppRequest = {
        number: normalizePhone(s.parent_phone),
        type: 'text',
        message: `📚 ${BRAND.name} - Homework Diary\n\nStudent: ${s.name} (${s.roll_no})\nDate: ${entryDate}\n\nWhat was studied today:\n${subjectSummary}\n\nPlease check the app and sign the diary. ✍️`,
      };
      await sendWhatsApp(waMsg);
    }
  }

  async function saveSingle() {
    if (!selectedStudent) return;
    const valid = rows.filter((r) => r.topic.trim());
    if (valid.length === 0) return;
    setSaving(true);
    const inserts = valid.map((r) => ({
      student_id: selectedStudent.id,
      subject: r.subject,
      topic: r.topic,
      entry_date: entryDate,
      status: 'Approved',
    }));
    await supabase.from('diary_entries').insert(inserts);
    await notifyStudent(selectedStudent, valid);
    setSaving(false);
    setShowAdd(false);
    setSelectedStudent(null);
    setRows([{ subject: 'Tamil', topic: '' }]);
    load();
  }

  async function saveBulk() {
    const valid = rows.filter((r) => r.topic.trim());
    if (valid.length === 0 || bulkSelectedIds.size === 0) return;
    const selectedStudents = bulkStudents.filter((s) => bulkSelectedIds.has(s.id));
    setSaving(true);
    const inserts: Record<string, unknown>[] = [];
    for (const s of selectedStudents) {
      for (const r of valid) {
        inserts.push({
          student_id: s.id,
          subject: r.subject,
          topic: r.topic,
          entry_date: entryDate,
          status: 'Approved',
        });
      }
    }
    await supabase.from('diary_entries').insert(inserts);
    for (const s of selectedStudents) {
      await notifyStudent(s, valid);
    }
    setSaving(false);
    setShowAdd(false);
    setBulkSelectedIds(new Set());
    setRows([{ subject: 'Tamil', topic: '' }]);
    load();
  }

  const filteredBulkStudents = bulkSearch
    ? bulkStudents.filter((s) =>
        s.name.toLowerCase().includes(bulkSearch.toLowerCase()) ||
        s.roll_no.toLowerCase().includes(bulkSearch.toLowerCase()),
      )
    : bulkStudents;

  return (
    <div className="space-y-4">
      <BackBar to="/admin" label="Back to Dashboard" />
      <div className="flex items-center justify-between">
        <h2 className="section-title">Study Diary</h2>
        <button onClick={() => { setShowAdd(true); setBulkMode(false); }} className="btn-primary">
          <Plus size={16} /> Add Entry
        </button>
      </div>

      <div className="card p-3 grid grid-cols-2 md:grid-cols-3 gap-3">
        <select className="input" value={fClass} onChange={(e) => setFClass(e.target.value)}>
          <option value="">All Classes</option>
          {CLASSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="input" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">All Status</option>
          <option>Approved</option>
          <option>Pending</option>
          <option>Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <BookOpen size={18} /> No diary entries.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {e.student_name || 'All students'} · {e.subject}
                </div>
                <div className="text-xs text-slate-500 truncate">{e.topic}</div>
                <div className="text-[11px] text-slate-400">{e.entry_date}</div>
              </div>
              <span
                className={`badge ${
                  e.status === 'Approved'
                    ? 'bg-green-100 text-green-700'
                    : e.status === 'Pending'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {e.status}
              </span>
              <span
                className={`badge ${e.parent_verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                title={e.parent_verified ? 'Parent Verified' : 'Not Verified'}
              >
                {e.parent_verified ? <span className="flex items-center gap-1"><CheckCircle2 size={11} /> Verified</span> : <span className="flex items-center gap-1"><XCircle size={11} /> Not Verified</span>}
              </span>
              <div className="flex gap-1">
                <button onClick={() => setStatus(e, 'Approved')} className="btn-ghost !p-1.5" title="Approve">
                  <Check size={14} className="text-green-600" />
                </button>
                <button onClick={() => setStatus(e, 'Rejected')} className="btn-ghost !p-1.5" title="Reject">
                  <X size={14} className="text-red-600" />
                </button>
                <button onClick={() => delEntry(e)} className="btn-ghost !p-1.5" title="Delete">
                  <Trash2 size={14} className="text-slate-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="font-bold">Add Diary Entry</h3>
              <button onClick={() => { setShowAdd(false); setSelectedStudent(null); setBulkSelectedIds(new Set()); setRows([{ subject: 'Tamil', topic: '' }]); }}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 p-3 border-b">
              <button
                onClick={() => { setBulkMode(false); setSelectedStudent(null); setBulkSelectedIds(new Set()); }}
                className={`badge flex-1 justify-center ${!bulkMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                <User size={12} /> Single Student
              </button>
              <button
                onClick={() => { setBulkMode(true); setSelectedStudent(null); }}
                className={`badge flex-1 justify-center ${bulkMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                <Users size={12} /> Bulk (Multiple)
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Date — shared for both modes */}
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
              </div>

              {/* SINGLE MODE */}
              {!bulkMode && (
                <>
                  {!selectedStudent ? (
                    <div>
                      <label className="label">Enter Roll Number to find student</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            className="input pl-8"
                            placeholder="e.g. RT2026001"
                            value={rollSearch}
                            onChange={(e) => setRollSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && pickStudent()}
                          />
                        </div>
                        <button onClick={pickStudent} className="btn-primary">Find</button>
                      </div>
                      <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                        {students.slice(0, 50).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedStudent(s)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 text-sm"
                          >
                            {s.name} · {s.roll_no} · {s.class}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="card p-3 bg-blue-50 border-blue-200 flex items-center gap-3">
                      <img src={selectedStudent.photo_url || DEFAULT_AVATAR} className="w-10 h-10 rounded-lg object-cover" alt="" />
                      <div className="flex-1">
                        <div className="font-bold text-sm">{selectedStudent.name}</div>
                        <div className="text-xs text-slate-500">{selectedStudent.roll_no} · {selectedStudent.class}{selectedStudent.stream ? ` · ${selectedStudent.stream}` : ''}</div>
                      </div>
                      <button onClick={() => setSelectedStudent(null)} className="text-xs text-blue-600">Change</button>
                    </div>
                  )}
                </>
              )}

              {/* BULK MODE — Student selection */}
              {bulkMode && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Class</label>
                      <select className="input" value={bulkClass} onChange={(e) => { setBulkClass(e.target.value); setBulkSelectedIds(new Set()); }}>
                        {CLASSES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    {(bulkClass === '11th' || bulkClass === '12th') && (
                      <div>
                        <label className="label">Stream</label>
                        <select className="input" value={bulkStream} onChange={(e) => { setBulkStream(e.target.value); setBulkSelectedIds(new Set()); }}>
                          <option value="">All Streams</option>
                          {STREAMS.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input pl-8"
                      placeholder="Search by name or roll no"
                      value={bulkSearch}
                      onChange={(e) => setBulkSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={selectAllBulk} className="btn-ghost !py-1 text-xs">Select All</button>
                    <button onClick={clearBulkSelection} className="btn-ghost !py-1 text-xs">Clear</button>
                    <span className="text-slate-500 ml-auto">{bulkSelectedIds.size} selected</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                    {filteredBulkStudents.length === 0 ? (
                      <div className="p-3 text-center text-sm text-slate-400">No students found.</div>
                    ) : (
                      filteredBulkStudents.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => toggleBulkStudent(s.id)}
                          className={`w-full text-left px-3 py-2 border-b border-slate-100 text-sm flex items-center gap-2 ${bulkSelectedIds.has(s.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${bulkSelectedIds.has(s.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                            {bulkSelectedIds.has(s.id) && <Check size={10} className="text-white" />}
                          </div>
                          <span>{s.name} · {s.roll_no}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Subject rows — shared for both modes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label !mb-0">Subjects studied</label>
                  <button onClick={addRow} className="btn-ghost !py-1 text-xs">
                    <Plus size={12} /> Add subject
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="text-[11px] text-slate-400 self-center mr-1">Presets:</span>
                  {PRESET_HOMEWORK.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="badge bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 text-xs"
                    >
                      {p}...
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <select className="input w-32" value={r.subject} onChange={(e) => setRow(i, { subject: e.target.value })}>
                        {availableSubjects.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <input
                        className="input flex-1"
                        placeholder="Topic covered"
                        value={r.topic}
                        onChange={(e) => setRow(i, { topic: e.target.value })}
                      />
                      {rows.length > 1 && (
                        <button onClick={() => delRow(i)} className="btn-ghost !p-2">
                          <X size={14} className="text-red-500" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="sticky bottom-0 bg-white border-t p-4 flex gap-2">
              <button
                onClick={() => (bulkMode ? saveBulk() : saveSingle())}
                className="btn-primary flex-1"
                disabled={saving || (bulkMode ? bulkSelectedIds.size === 0 : !selectedStudent)}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : `Save & Approve${bulkMode ? ` (${bulkSelectedIds.size} students)` : ''}`}
              </button>
              <button onClick={() => { setShowAdd(false); setSelectedStudent(null); setBulkSelectedIds(new Set()); setRows([{ subject: 'Tamil', topic: '' }]); }} className="btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
