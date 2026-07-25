import { supabase } from './supabase';
import type { Session, Student, AdminUser } from './types';

const SESSION_KEY = 'rtc_session';

export function saveSession(s: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Login flow:
// 1. If input matches a 10-digit phone, try admin first, then parent (by parent_phone).
// 2. Otherwise (or if admin/parent fails), try student by roll_no.
// Returns a Session or throws an Error with a message.
export async function login(identifier: string, password: string): Promise<Session> {
  const id = identifier.trim();
  const isPhone = /^\d{10}$/.test(id);

  if (isPhone) {
    // Admin
    const { data: admin } = await supabase
      .from('users')
      .select('*')
      .eq('phone', id)
      .maybeSingle();
    if (admin && (admin as AdminUser).password === password) {
      const a = admin as AdminUser;
      const s: Session = { role: 'admin', adminId: a.id, adminName: a.name };
      saveSession(s);
      return s;
    }

    // Parent: find students by parent_phone
    const { data: kids } = await supabase
      .from('students')
      .select('*')
      .eq('parent_phone', id)
      .eq('status', 'Active');
    if (kids && kids.length > 0) {
      // password must match any child's password (parents share the student password)
      const match = (kids as Student[]).find((k) => k.password === password);
      if (match) {
        const s: Session = {
          role: 'parent',
          studentIds: (kids as Student[]).map((k) => k.id),
        };
        saveSession(s);
        return s;
      }
      throw new Error('Wrong password for this parent phone number.');
    }
    throw new Error('No admin or parent found for this phone number.');
  }

  // Student by roll number
  const { data: stu } = await supabase
    .from('students')
    .select('*')
    .eq('roll_no', id)
    .maybeSingle();
  if (stu) {
    const s = stu as Student;
    if (s.password === password) {
      const sess: Session = {
        role: 'student',
        studentId: s.id,
        studentName: s.name,
        rollNo: s.roll_no,
      };
      saveSession(sess);
      return sess;
    }
    throw new Error('Wrong password for this roll number.');
  }
  throw new Error('No student found with this roll number.');
}

export async function checkSetup(): Promise<boolean> {
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  return (count ?? 0) > 0;
}
