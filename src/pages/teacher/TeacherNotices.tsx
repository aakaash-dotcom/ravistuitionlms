import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Notice } from '@/lib/types';
import BackBar from '@/components/BackBar';
import { Loader2, Bell, FileText, Download } from 'lucide-react';

export default function TeacherNotices() {
  const [rows, setRows] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('notices').select('*').eq('active', true).order('created_at', { ascending: false });
      setRows((data as Notice[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <BackBar to="/teacher" label="Back" />
      <h2 className="section-title">Notices</h2>
      <p className="text-xs text-slate-500 -mt-2">Read-only — notices are managed by the admin.</p>
      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <Bell size={18} /> No active notices.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <div key={n.id} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell size={16} className="text-rose-500" />
                <span className="font-bold">{n.title}</span>
              </div>
              <p className="text-sm text-slate-600">{n.content}</p>
              {n.file_url && n.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                <a href={n.file_url} target="_blank" rel="noreferrer" className="block mt-2">
                  <img src={n.file_url} alt={n.title} className="w-full max-h-64 object-cover rounded-lg" />
                </a>
              )}
              <div className="text-xs text-slate-400 mt-2">
                {new Date(n.created_at || '').toLocaleDateString()}
              </div>
              {n.file_url && (
                <a href={n.file_url} target="_blank" rel="noreferrer" download className="btn-ghost mt-3 !py-1.5 text-xs">
                  <Download size={14} /> Download
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
