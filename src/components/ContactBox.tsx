import { BRAND } from '@/lib/brand';
import { Phone, MessageCircle } from 'lucide-react';

export default function ContactBox() {
  return (
    <div className="card p-4 bg-gradient-to-br from-blue-50 to-amber-50 border-blue-200">
      <h3 className="font-bold text-slate-900 mb-2">Need help?</h3>
      <p className="text-sm text-slate-600 mb-3">
        Contact {BRAND.name} for any queries.
      </p>
      <div className="flex gap-2">
        <a href={`tel:${BRAND.phoneRaw}`} className="btn-primary flex-1">
          <Phone size={16} /> Call
        </a>
        <a
          href={BRAND.whatsapp}
          target="_blank"
          rel="noreferrer"
          className="btn-wa flex-1"
        >
          <MessageCircle size={16} /> WhatsApp
        </a>
      </div>
    </div>
  );
}
