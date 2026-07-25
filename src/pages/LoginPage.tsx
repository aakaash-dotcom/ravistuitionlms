import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND } from '@/lib/brand';
import { login } from '@/lib/auth';
import { GraduationCap, Phone, KeyRound, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const nav = useNavigate();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const s = await login(id, pw);
      if (s.role === 'admin') nav('/admin');
      else if (s.role === 'parent') nav('/parent');
      else nav('/student');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#003ECC] to-[#0052FF] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-white">
          <img
            src={BRAND.logo}
            alt="logo"
            className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover bg-white/10"
          />
          <h1 className="text-2xl font-bold">{BRAND.name}</h1>
          <p className="text-white/70 text-sm">{BRAND.tagline}</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Login</h2>
          <p className="text-sm text-slate-500 mb-4">
            Parents & Admin: use phone number · Students: use roll number
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Mobile Number or Roll Number</label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="input pl-9"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="8610653352 or RT2026001"
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <KeyRound
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  className="input pl-9"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {err && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{err}</span>
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Checking...
                </>
              ) : (
                <>
                  <GraduationCap size={16} /> Login
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <p>
              <strong>Demo Admin:</strong> 8610653352 / ravi1234
            </p>
            <p>
              <strong>Demo Parent:</strong> 9000000001 / AV92UC
            </p>
            <p>
              <strong>Demo Student:</strong> RT2026001 / AV92UC
            </p>
          </div>
        </div>

        <p className="text-center text-white/50 text-xs mt-4">
          {BRAND.address}
        </p>
      </div>
    </div>
  );
}
