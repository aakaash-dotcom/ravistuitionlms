export interface Student {
  id: string;
  roll_no: string;
  name: string;
  password: string;
  class: string;
  board: string;
  stream: string | null;
  commerce_elective: string | null;
  school: string | null;
  phone: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  photo_url: string | null;
  total_fee: number;
  fee_paid: number;
  status: string;
  created_at?: string;
}

export interface AdminUser {
  id: string;
  phone: string;
  password: string;
  name: string;
  role: string;
}

export interface AttendanceRow {
  id: string;
  student_id: string;
  date: string;
  status: string;
}

export interface TestReport {
  id: string;
  student_id: string;
  subject: string;
  marks: number;
  out_of: number;
  test_type: string;
  week: string | null;
  month: string | null;
  test_date: string;
  remark: string | null;
  created_at?: string;
}

export interface DailyTest {
  id: string;
  student_id: string;
  quiz_id: string | null;
  subject: string | null;
  score: number;
  total: number;
  percentage: number;
  answers: Record<string, string> | null;
  created_at: string;
}

export interface McqQuiz {
  id: string;
  title: string;
  topic: string | null;
  subject: string;
  class: string;
  stream: string | null;
  total_marks: number;
  duration: number;
  active: boolean;
  created_at?: string;
}

export interface McqQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: string;
  marks: number;
}

export interface DiaryEntry {
  id: string;
  student_id: string | null;
  subject: string;
  topic: string;
  entry_date: string;
  status: string;
  created_at?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  file_url: string | null;
  active: boolean;
  created_at?: string;
}

export interface StudyMaterial {
  id: string;
  title: string;
  type: string;
  subject: string | null;
  class: string | null;
  file_url: string;
  created_at?: string;
}

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  audience: string;
  active: boolean;
  created_at?: string;
}

export interface FeeRow {
  id: string;
  student_id: string;
  amount: number;
  payment_type: string;
  receipt_no: string | null;
  payment_date: string;
  remark: string | null;
  created_at?: string;
}

export type Role = 'admin' | 'parent' | 'student';

export interface Session {
  role: Role;
  // For admin: admin user id. For parent/student: student id(s).
  adminId?: string;
  adminName?: string;
  // For parent: linked student ids (could be multiple children).
  studentIds?: string[];
  // For student: single student id.
  studentId?: string;
  studentName?: string;
  rollNo?: string;
}
