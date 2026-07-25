import { BRAND } from '@/lib/brand';
import { GraduationCap, Phone, MessageCircle, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  onLogout?: () => void;
  right?: ReactNode;
}

export default function Header({ title, subtitle, onLogout, right }: Props) {
  return (
    <header className="bg-[#0F172A] text-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <img
          src={BRAND.logo}
          alt="logo"
          className="w-10 h-10 rounded-lg object-cover bg-white/10"
        />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-white/60 truncate">{subtitle}</p>
          )}
        </div>
        {right}
        {onLogout && (
          <button
            onClick={onLogout}
            className="btn-ghost !bg-white/10 !border-white/20 !text-white hover:!bg-white/20 !py-1.5 !px-3"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}
      </div>
      <div className="bg-[#0052FF] text-white text-xs">
        <div className="max-w-5xl mx-auto px-4 py-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <GraduationCap size={12} /> {BRAND.tagline}
          </span>
          <span className="hidden sm:flex items-center gap-3">
            <a href={`tel:${BRAND.phoneRaw}`} className="flex items-center gap-1 hover:underline">
              <Phone size={12} /> {BRAND.phone}
            </a>
            <a
              href={BRAND.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              <MessageCircle size={12} /> WhatsApp
            </a>
          </span>
        </div>
      </div>
    </header>
  );
}
