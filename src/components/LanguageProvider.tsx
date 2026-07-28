import { useState, useCallback, type ReactNode } from 'react';
import type { Lang, TranslationKey } from '@/lib/i18n';
import { translations, t as translate } from '@/lib/i18n';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: TranslationKey) => string;
}

import { createContext, useContext } from 'react';

const LangContext = createContext<LangCtx>({
  lang: 'en',
  setLang: () => {},
  toggle: () => {},
  t: (k) => translations.en[k] || k,
});

export function useLang() {
  return useContext(LangContext);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  const toggle = useCallback(() => {
    setLang((l) => (l === 'en' ? 'ta' : 'en'));
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translate(lang, key),
    [lang],
  );

  return (
    <LangContext.Provider value={{ lang, setLang, toggle, t }}>
      <div lang={lang} className={lang === 'ta' ? 'font-tamil' : ''}>
        {children}
      </div>
    </LangContext.Provider>
  );
}
