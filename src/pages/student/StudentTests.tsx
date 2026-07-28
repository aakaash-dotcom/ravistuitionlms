import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import BackBar from '@/components/BackBar';
import type { DailyTest, McqQuestion, McqQuiz, Student } from '@/lib/types';
import {
  HelpCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Award,
} from 'lucide-react';

export default function StudentTests() {
  const s = useSession();
  const sid = s?.studentId;
  const [student, setStudent] = useState<Student | null>(null);
  const [quizzes, setQuizzes] = useState<McqQuiz[]>([]);
  const [past, setPast] = useState<DailyTest[]>([]);
  const [loading, setLoading] = useState(true);

  // active quiz state
  const [active, setActive] = useState<McqQuiz | null>(null);
  const [questions, setQuestions] = useState<McqQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; pct: number } | null>(null);

  useEffect(() => {
    if (!sid) return;
    (async () => {
      const { data: stu } = await supabase.from('students').select('*').eq('id', sid).maybeSingle();
      setStudent(stu as Student);
      if (stu) {
        const st = stu as Student;
        const { data: qs } = await supabase
          .from('mcq_quizzes')
          .select('*')
          .eq('active', true)
          .eq('class', st.class)
          .order('created_at', { ascending: false });
        let quizList = (qs as McqQuiz[]) || [];
        if (st.stream) {
          quizList = quizList.filter((q) => !q.stream || q.stream === st.stream);
        }
        setQuizzes(quizList);
      }
      const { data: p } = await supabase
        .from('daily_tests')
        .select('*')
        .eq('student_id', sid)
        .order('created_at', { ascending: false });
      setPast((p as DailyTest[]) || []);
      setLoading(false);
    })();
  }, [sid]);

  async function startQuiz(q: McqQuiz) {
    setActive(q);
    setResult(null);
    setAnswers({});
    setCurrent(0);
    const { data } = await supabase.from('mcq_questions').select('*').eq('quiz_id', q.id).order('created_at');
    setQuestions((data as McqQuestion[]) || []);
  }

  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i]);

  async function submit() {
    if (!active || !student) return;
    setSubmitting(true);
    let score = 0;
    let total = 0;
    questions.forEach((q, i) => {
      total += Number(q.marks);
      if (answers[i] === q.answer) score += Number(q.marks);
    });
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    await supabase.from('daily_tests').insert({
      student_id: sid,
      quiz_id: active.id,
      subject: active.subject,
      score,
      total,
      percentage: pct,
      answers,
    });
    setResult({ score, total, pct });
    setSubmitting(false);
    // refresh past
    const { data: p } = await supabase
      .from('daily_tests')
      .select('*')
      .eq('student_id', sid)
      .order('created_at', { ascending: false });
    setPast((p as DailyTest[]) || []);
  }

  function gradeFor(pct: number) {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    return 'D';
  }

  if (loading)
    return (
      <div className="card p-8 text-center text-slate-500">
        <Loader2 size={20} className="animate-spin inline mr-2" /> Loading...
      </div>
    );

  // Result screen
  if (result && active) {
    return (
      <div className="space-y-4">
        <div className="card p-6 text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={result.pct >= 75 ? '#22c55e' : result.pct >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(result.pct / 100) * 264} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{result.pct}%</span>
              <Award size={20} className="text-amber-500" />
            </div>
          </div>
          <h3 className="font-bold text-lg">{active.title}</h3>
          <p className="text-slate-600">
            Score: {result.score} / {result.total}
          </p>
          <p className="text-sm text-slate-500 mb-4">Grade: {gradeFor(result.pct)}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => startQuiz(active)} className="btn-amber">
              <RotateCcw size={16} /> Retake
            </button>
            <button
              onClick={() => {
                setActive(null);
                setResult(null);
              }}
              className="btn-ghost"
            >
              Back to list
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz taking screen
  if (active) {
    const q = questions[current];
    if (!q)
      return (
        <div className="card p-8 text-center text-slate-500">
          No questions in this quiz.
        </div>
      );
    const opts = [
      { key: 'A', text: q.option_a },
      { key: 'B', text: q.option_b },
      { key: 'C', text: q.option_c },
      { key: 'D', text: q.option_d },
    ];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setActive(null)} className="btn-ghost">
            <ArrowLeft size={16} /> Exit
          </button>
          <span className="text-sm font-semibold text-slate-500">
            Question {current + 1} of {questions.length}
          </span>
        </div>

        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-base mb-4">{q.question_text}</h3>
          <div className="space-y-2">
            {opts.map((o) => (
              <button
                key={o.key}
                onClick={() => setAnswers({ ...answers, [current]: o.key })}
                className={`w-full text-left p-3 rounded-lg border-2 transition flex items-center gap-3 ${
                  answers[current] === o.key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    answers[current] === o.key ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {o.key}
                </span>
                <span className="text-sm">{o.text}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="btn-ghost flex-1"
          >
            <ArrowLeft size={16} /> Previous
          </button>
          {current < questions.length - 1 ? (
            <button onClick={() => setCurrent((c) => c + 1)} className="btn-primary flex-1">
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={submit} disabled={!allAnswered || submitting} className="btn-primary flex-1">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Submit
            </button>
          )}
        </div>
      </div>
    );
  }

  // Quiz list
  return (
    <div className="space-y-4">
      <BackBar to="/student" label="Back" />
      <h2 className="section-title">Daily Tests</h2>
      <div>
        <h3 className="font-bold text-sm mb-2">Available Quizzes</h3>
        {quizzes.length === 0 ? (
          <div className="card p-8 text-center text-slate-500 flex items-center justify-center gap-2">
            <HelpCircle size={18} /> No active quizzes for your class.
          </div>
        ) : (
          <div className="space-y-2">
            {quizzes.map((q) => (
              <div key={q.id} className="card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                  <HelpCircle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{q.title}</div>
                  <div className="text-xs text-slate-400">
                    {q.subject} · {q.duration} min · {q.total_marks} marks
                  </div>
                </div>
                <button onClick={() => startQuiz(q)} className="btn-primary !py-1.5">
                  Start
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-bold text-sm mb-2">Past Results</h3>
        {past.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500">No tests taken yet.</div>
        ) : (
          <div className="space-y-2">
            {past.map((t) => (
              <div key={t.id} className="card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{t.subject || 'Quiz'}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">
                    {t.score}/{t.total}
                  </div>
                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full ${t.percentage >= 75 ? 'bg-green-500' : t.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${t.percentage}%` }}
                    />
                  </div>
                </div>
                <span
                  className={`badge ${
                    t.percentage >= 90
                      ? 'bg-green-100 text-green-700'
                      : t.percentage >= 75
                        ? 'bg-blue-100 text-blue-700'
                        : t.percentage >= 50
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                  }`}
                >
                  {gradeFor(t.percentage)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
