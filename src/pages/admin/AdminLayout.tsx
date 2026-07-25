import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { clearSession, getSession } from '@/lib/auth';
import { useEffect } from 'react';
import { BRAND } from '@/lib/brand';
import { LayoutDashboard } from 'lucide-react';

export default function AdminLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const s = getSession();
  useEffect(() => {
    if (!s || s.role !== 'admin') nav('/');
  }, [s, nav]);

  function logout() {
    clearSession();
    nav('/');
  }

  const onDashboard = loc.pathname === '/admin';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header
        title={`${BRAND.name} · Admin`}
        subtitle={`Welcome ${s?.adminName || 'Admin'}`}
        onLogout={logout}
        right={
          !onDashboard && (
            <button
              onClick={() => nav('/admin')}
              className="btn-ghost !bg-white/10 !border-white/20 !text-white hover:!bg-white/20 !py-1.5 !px-3"
            >
              <LayoutDashboard size={14} />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )
        }
      />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
