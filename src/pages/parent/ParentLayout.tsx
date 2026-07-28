import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LanguageProvider, useLang } from '@/components/LanguageProvider';
import LanguageToggle from '@/components/LanguageToggle';
import { clearSession, getSession } from '@/lib/auth';
import { BRAND } from '@/lib/brand';

function ParentShell() {
  const nav = useNavigate();
  const { lang } = useLang();
  const s = getSession();
  useEffect(() => {
    if (!s || s.role !== 'parent') nav('/');
  }, [s, nav]);

  function logout() {
    clearSession();
    nav('/');
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" lang={lang}>
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
  );
}

export default function ParentLayout() {
  return (
    <LanguageProvider>
      <ParentShell />
    </LanguageProvider>
  );
}
