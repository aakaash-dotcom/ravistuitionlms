import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LanguageProvider } from '@/components/LanguageProvider';
import LanguageToggle from '@/components/LanguageToggle';
import { clearSession, getSession } from '@/lib/auth';
import { BRAND } from '@/lib/brand';

export default function ParentLayout() {
  const nav = useNavigate();
  const s = getSession();
  useEffect(() => {
    if (!s || s.role !== 'parent') nav('/');
  }, [s, nav]);

  function logout() {
    clearSession();
    nav('/');
  }

  return (
    <LanguageProvider>
      <div className="min-h-screen flex flex-col bg-slate-50" lang="ta">
        <Header
          title={`${BRAND.name}`}
          subtitle="Parent Portal"
          onLogout={logout}
          right={<LanguageToggle />}
        />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5">
          <Outlet />
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  );
}
