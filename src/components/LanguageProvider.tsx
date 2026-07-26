import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Lang } from '@/lib/i18n';

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'en',
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  return (
    <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>
  );
}

export function useLang() {
  return useContext(LangCtx);
}
