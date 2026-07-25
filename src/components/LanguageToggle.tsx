import { useLang } from './LanguageProvider';
import { BRAND } from '@/lib/brand';
import { Languages } from 'lucide-react';

export default function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === 'ta' ? 'en' : 'ta')}
      className="btn-ghost !py-1.5 !px-3 text-xs"
      aria-label="Toggle language"
    >
      <Languages size={14} />
      {lang === 'ta' ? 'English' : 'தமிழ்'}
    </button>
  );
}
