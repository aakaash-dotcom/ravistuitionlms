// Central subject configuration per your specs.
// All streams have 6 subjects (Tamil included in every stream).
// Classes 8th-10th have the 5 core subjects + Tamil = 6 subjects.

export const CORE_SUBJECTS = [
  'Tamil',
  'English',
  'Maths',
  'Science',
  'Social',
];

export const STREAM_SUBJECTS: Record<string, string[]> = {
  'Bio-Maths': ['Tamil', 'English', 'Physics', 'Chemistry', 'Maths', 'Biology'],
  'Computer Science': [
    'Tamil',
    'English',
    'Physics',
    'Chemistry',
    'Maths',
    'Computer Science',
  ],
  Commerce: [
    'Tamil',
    'English',
    'Accountancy',
    'Economics',
    'Commerce',
    'Computer Application', // or Business Maths — chosen per student via commerce_elective
  ],
};

export const COMMERCE_ELECTIVE_SUBJECTS: Record<string, string> = {
  'Computer Application': 'Computer Application',
  'Business Maths': 'Business Maths',
};

export function getSubjectsForClass(
  grade: string,
  stream?: string | null,
  commerceElective?: string | null,
): string[] {
  if (grade === '11th' || grade === '12th') {
    if (!stream) return CORE_SUBJECTS;
    const base = STREAM_SUBJECTS[stream] || CORE_SUBJECTS;
    if (stream === 'Commerce' && commerceElective === 'Business Maths') {
      return [
        'Tamil',
        'English',
        'Accountancy',
        'Economics',
        'Commerce',
        'Business Maths',
      ];
    }
    return base;
  }
  return CORE_SUBJECTS;
}

export const ALL_SUBJECTS = Array.from(
  new Set([
    ...CORE_SUBJECTS,
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'Accountancy',
    'Economics',
    'Commerce',
    'Computer Application',
    'Business Maths',
  ]),
);
