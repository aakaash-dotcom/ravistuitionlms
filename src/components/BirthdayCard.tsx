import type { Student } from '@/lib/types';
import { useLang } from '@/components/LanguageProvider';
import { t } from '@/lib/i18n';
import { BRAND } from '@/lib/brand';

export function isTodayBirthday(dob?: string | null): boolean {
  if (!dob) return false;
  const today = new Date();
  const d = new Date(dob);
  if (isNaN(d.getTime())) return false;
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
}

export default function BirthdayCard({ student }: { student: Student }) {
  const { lang } = useLang();
  if (!isTodayBirthday(student.dob)) return null;

  return (
    <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-amber-400 via-amber-500 to-[#0052FF] p-[2px] shadow-lg">
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-blue-50 p-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 text-6xl flex items-center justify-around pointer-events-none select-none">
          <span>🎉</span><span>🎂</span><span>✨</span><span>🎈</span>
        </div>
        <div className="relative">
          <div className="w-20 h-20 rounded-full mx-auto mb-3 ring-4 ring-amber-400 overflow-hidden bg-white">
            {student.photo_url ? (
              <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🎓</div>
            )}
          </div>
          <h3 className="font-bold text-lg text-slate-900">
            {lang === 'ta' ? t(lang, 'happyBirthday') : `Happy Birthday, ${student.name}!`} 🎂
          </h3>
          <p className="text-sm text-slate-600 mt-1 max-w-xs mx-auto">
            {t(lang, 'birthdayWish')}
          </p>
          <p className="text-xs text-slate-400 mt-2">— {BRAND.name}</p>
        </div>
      </div>
    </div>
  );
}
