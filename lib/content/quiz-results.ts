export type QuizResultStatus = "Active" | "Fail";

export type QuizResultRow = {
  id: string;
  course: string;
  assessment: string;
  score: number;
  attemptsUsed: number;
  maxAttempts: number;
  date: string;
  status: QuizResultStatus;
  href: string;
};

export const quizResultsCopy = {
  title: "Quiz results",
  subtitle: "Your module and final assessments, across every course.",
} as const;

export const returningQuizStats = {
  taken: 9,
  passed: 7,
  retry: 2,
  average: 78,
} as const;

export const returningQuizResults: QuizResultRow[] = [
  {
    id: "dptc-m1",
    course: "DPTC Sensitization",
    assessment: "Module 1 Quiz",
    score: 88,
    attemptsUsed: 1,
    maxAttempts: 3,
    date: "4 July 2026",
    status: "Active",
    href: "/learn/dptc/quiz",
  },
  {
    id: "dptc-m2",
    course: "DPTC Sensitization",
    assessment: "Module 2 Quiz",
    score: 86,
    attemptsUsed: 1,
    maxAttempts: 3,
    date: "11 July 2026",
    status: "Active",
    href: "/learn/dptc/quiz",
  },
  {
    id: "dptc-m3",
    course: "DPTC Sensitization",
    assessment: "Module 3 Quiz",
    score: 80,
    attemptsUsed: 2,
    maxAttempts: 3,
    date: "18 July 2026",
    status: "Active",
    href: "/learn/dptc/quiz",
  },
  {
    id: "dptc-m4",
    course: "DPTC Sensitization",
    assessment: "Module 4 Quiz",
    score: 75,
    attemptsUsed: 1,
    maxAttempts: 3,
    date: "25 July 2026",
    status: "Active",
    href: "/learn/dptc/quiz",
  },
  {
    id: "dptc-m5",
    course: "DPTC Sensitization",
    assessment: "Module 5 Quiz",
    score: 82,
    attemptsUsed: 1,
    maxAttempts: 3,
    date: "1 Aug 2026",
    status: "Active",
    href: "/learn/dptc/quiz",
  },
  {
    id: "dptc-m6",
    course: "DPTC Sensitization",
    assessment: "Module 6 Quiz",
    score: 58,
    attemptsUsed: 2,
    maxAttempts: 3,
    date: "8 Aug 2026",
    status: "Fail",
    href: "/learn/dptc/quiz",
  },
  {
    id: "dptc-m7",
    course: "DPTC Sensitization",
    assessment: "Module 7 Quiz",
    score: 86,
    attemptsUsed: 1,
    maxAttempts: 3,
    date: "15 Aug 2026",
    status: "Active",
    href: "/learn/dptc/quiz",
  },
  {
    id: "dptc-m8",
    course: "DPTC Sensitization",
    assessment: "Module 8 Quiz",
    score: 55,
    attemptsUsed: 3,
    maxAttempts: 3,
    date: "22 Aug 2026",
    status: "Fail",
    href: "/learn/dptc/quiz",
  },
  {
    id: "hr-m1",
    course: "Human Rights Frameworks",
    assessment: "Module 1 Quiz",
    score: 92,
    attemptsUsed: 1,
    maxAttempts: 3,
    date: "29 Aug 2026",
    status: "Active",
    href: "/learn/human-rights-law-enforcement",
  },
];
