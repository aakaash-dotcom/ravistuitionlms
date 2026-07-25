import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackBar({ to, label }: { to: string; label: string }) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav(to)}
      className="btn-ghost !py-1.5 !px-3 text-sm mb-3"
    >
      <ArrowLeft size={16} /> {label}
    </button>
  );
}
