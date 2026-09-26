import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND } from '@/lib/brand';
import { login, getSession } from '@/lib/auth';
import { linkUserToNotification, isIosNonStandalone } from '@/lib/onesignal';
import { GraduationCap, Phone, KeyRound, AlertCircle, Loader2, Smartphone } from 'lucide-react';

export default function LoginPage() {
  const nav = useNavigate();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const s = getSession();
    if (s) {
      const dest = s.role === 'admin' ? '/admin' : s.role === 'teacher' ? '/teacher' : s.role === 'parent' ? '/parent' : '/student';
      nav(dest, { replace: true });
    }
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const s = await login(id, pw);
      // Link OneSignal device to this user for targeted push notifications
      let notifId = '';
      if (s.role === 'parent') {
        // For parent, we need the parent_phone — login uses phone as identifier
        notifId = id.trim().match(/^\d{10}$/) ? id.trim() : '';
      } else if (s.role === 'student') {
        notifId = s.rollNo || id.trim();
      } else if (s.role === 'admin') {
        notifId = id.trim();
      } else if (s.role === 'teacher') {
        notifId = id.trim();
      }
      if (notifId) {
        await linkUserToNotification(notifId);
      }
      if (s.role === 'admin') nav('/admin');
      else if (s.role === 'teacher') nav('/teacher');
      else if (s.role === 'parent') nav('/parent');
      else nav('/student');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function addToHomeScreen() {
    const isIos = isIosNonStandalone();
    if (isIos) {
      alert(
        "To add this app to your home screen:\n\n1. Tap the Share button at the bottom of Safari\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add' to confirm\n\nThe app will then work like a native app with notifications.",
      );
      return;
    }

    // Android/Chrome — use the beforeinstallprompt event if available
    const deferredPrompt = (window as unknown as { deferredPrompt?: { prompt: () => Promise<void> } }).deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
    } else {
      alert(
        "To add this app to your home screen:\n\n1. Tap the menu (three dots) in your browser\n2. Tap 'Add to Home screen' or 'Install app'\n3. Confirm to install\n\nThe app will then work like a native app with notifications.",
      );
    }
  }

  // Capture the beforeinstallprompt event for Android
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      (window as unknown as { deferredPrompt?: Event }).deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

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
          <h2 className="text-lg font-bold text-slate-900 mb-1">Welcome</h2>
          <p className="text-sm text-slate-500 mb-4">
            Parents: use your registered phone number &middot; Students: use your roll number
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
                  placeholder="9876543210 or 26001"
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

          <button
            onClick={addToHomeScreen}
            className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
          >
            <Smartphone size={16} />
            Add to Home Screen
          </button>
        </div>

        <p className="text-center text-white/50 text-xs mt-4">
          {BRAND.address}
        </p>
      </div>
    </div>
  );
}
