import { BRAND } from '@/lib/brand';
import { Phone, MessageCircle, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0F172A] text-white/70 mt-8">
      <div className="max-w-5xl mx-auto px-4 py-6 text-sm">
        <div className="font-bold text-white mb-2">{BRAND.name}</div>
        <div className="flex items-start gap-2 mb-1">
          <MapPin size={14} className="mt-0.5 shrink-0" />
          <span>{BRAND.address}</span>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <a
            href={`tel:${BRAND.phoneRaw}`}
            className="flex items-center gap-1.5 hover:text-white"
          >
            <Phone size={14} /> {BRAND.phone}
          </a>
          <a
            href={BRAND.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-white"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
        </div>
        <div className="text-xs text-white/40 mt-3">
          Est {BRAND.est} · {BRAND.years}+ years · {BRAND.students} students ·{' '}
          {BRAND.hours}
        </div>
      </div>
    </footer>
  );
}
