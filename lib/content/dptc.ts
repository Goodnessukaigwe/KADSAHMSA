import { DEFAULT_PASS_MARK } from "@/lib/domain";

export type DptcModule = {
  index: number;
  slug: string;
  title: string;
  slides: number;
  minutes: number;
  quizzes: number;
};

export const dptcCourse = {
  slug: "dptc",
  title: "Sensitization on Drug Use, Dependence & Prevention (DPTC)",
  level: "Introductory",
  price: "Free",
  access: "Lifetime",
  certificate: "Included",
  durationHours: "6 hrs",
  audience: "Community",
  passMark: DEFAULT_PASS_MARK,
  enrolledCount: "2,140",
  hero: "/landing/hero-crystal.webp",
  playerPoster: "/landing/course-lightning.webp",
  description:
    "The UNODC/EU-supported DPTC curriculum equips law enforcement, health workers, and public officers to recognise dependence, understand treatment, and respond with dignity. Built from the 236-page trainer resource for use across Nigeria.",
} as const;

export const dptcModules: DptcModule[] = [
  {
    index: 1,
    slug: "introduction",
    title: "Course Introduction and Outline",
    slides: 23,
    minutes: 28,
    quizzes: 1,
  },
  {
    index: 2,
    slug: "drug-use-nigeria",
    title: "The Drug Use Situation in Nigeria",
    slides: 29,
    minutes: 32,
    quizzes: 1,
  },
  {
    index: 3,
    slug: "drugs-and-effects",
    title: "Drugs and Effects: Understanding Drug Dependency",
    slides: 16,
    minutes: 22,
    quizzes: 1,
  },
  {
    index: 4,
    slug: "causes-and-stigma",
    title: "Causes of Drug Use and Associated Stigma",
    slides: 22,
    minutes: 26,
    quizzes: 1,
  },
  {
    index: 5,
    slug: "supply-reduction",
    title: "Understanding the Concept of Supply Reduction",
    slides: 25,
    minutes: 28,
    quizzes: 1,
  },
  {
    index: 6,
    slug: "demand-harm-reduction",
    title: "Demand and Harm Reduction",
    slides: 19,
    minutes: 24,
    quizzes: 1,
  },
  {
    index: 7,
    slug: "drug-screening",
    title: "Drug Screening: Steps to Take",
    slides: 29,
    minutes: 32,
    quizzes: 1,
  },
  {
    index: 8,
    slug: "types-of-treatment",
    title: "Types of Drug Treatment",
    slides: 21,
    minutes: 25,
    quizzes: 1,
  },
  {
    index: 9,
    slug: "family-interventions",
    title: "Interventions and Responses to Drug Problems in the Family",
    slides: 23,
    minutes: 28,
    quizzes: 1,
  },
  {
    index: 10,
    slug: "special-populations",
    title: "Special Populations in Drug Care",
    slides: 28,
    minutes: 30,
    quizzes: 1,
  },
  {
    index: 11,
    slug: "human-rights",
    title: "Human Rights and Drug Users",
    slides: 29,
    minutes: 32,
    quizzes: 1,
  },
  {
    index: 12,
    slug: "law-enforcement",
    title: "Specific Issues for Law Enforcement",
    slides: 26,
    minutes: 28,
    quizzes: 1,
  },
  {
    index: 13,
    slug: "advocacy",
    title: "Understanding Advocacy and Steps to Achieve Success",
    slides: 22,
    minutes: 26,
    quizzes: 1,
  },
];

export const introHighlights = [
  { time: "00:00", label: "Introduction and outline", seconds: 0 },
  { time: "00:25", label: "Drug use situation in Nigeria", seconds: 25 },
  { time: "01:13", label: "Drugs and effects", seconds: 73 },
  { time: "02:45", label: "Causes of drug use", seconds: 165 },
] as const;

export const introDurationSeconds = 271;

export const nigeriaLesson = {
  moduleIndex: 2,
  slug: "drug-use-nigeria",
  kicker: "Lesson 1 — National context and statistics",
  readTime: "5 min read",
  title: "The drug use situation in Nigeria",
  sections: [
    {
      id: "estimates",
      title: "National use estimates",
      body: "Nigeria’s last nationally representative drug-use survey found that about 14.3 million people aged 15–64 had used a psychoactive substance (other than tobacco and alcohol) in the previous year — roughly 14.4% of that age group. Cannabis is the most commonly used substance, followed by opioids, including non-medical use of prescription opioids and cough syrups. These figures sit well above the West African average and are the starting point for every DPTC module that follows.",
    },
    {
      id: "undercount",
      title: "Why the numbers likely undercount the problem",
      body: "Household surveys miss people who are homeless, in custody, in treatment, or who will not disclose use because of stigma and criminalisation. Kaduna State data from treatment and law-enforcement partners consistently show a heavier burden than survey snapshots imply — especially among young men and among women who use in private. Treat published prevalence as a floor, not a ceiling.",
    },
    {
      id: "role",
      title: "What this means for your role",
      body: "Whether you work in policing, health, social welfare, or community leadership, the scale of use means you will meet people who use drugs. DPTC asks you to replace guesswork with screening, to distinguish use from dependence, and to route people toward treatment rather than punishment wherever the law allows. The next modules turn this national picture into practical steps.",
    },
  ],
  keyTerm: {
    title: "Key term",
    body: "“Non-medical use” means using a substance without a prescription, in larger amounts than prescribed, or for a purpose other than the one it was prescribed for — including sharing leftover medicines.",
  },
} as const;

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
};

export const module1Quiz: QuizQuestion[] = [
  {
    id: "q1",
    prompt:
      "Which is the BEST first step when a family member suspects drug dependence in a loved one?",
    options: [
      "Confront them publicly to shame them into stopping.",
      "Approach them calmly and encourage professional help.",
      "Ignore it — it will resolve on its own.",
      "Report them to law enforcement immediately.",
    ],
    correctIndex: 1,
  },
  {
    id: "q2",
    prompt:
      "About how many Nigerians aged 15–64 reported using a psychoactive substance (other than tobacco and alcohol) in the previous year in the last national survey?",
    options: [
      "About 1.4 million",
      "About 14.3 million",
      "About 40 million",
      "The survey found almost no use outside Lagos.",
    ],
    correctIndex: 1,
  },
  {
    id: "q3",
    prompt: "Which substance is the most commonly used in Nigeria after alcohol and tobacco?",
    options: ["Cocaine", "Cannabis", "Heroin", "Methamphetamine"],
    correctIndex: 1,
  },
  {
    id: "q4",
    prompt: "Why do household drug-use surveys often undercount the true burden?",
    options: [
      "They only interview children.",
      "They miss people who are homeless, in custody, or who will not disclose use.",
      "They only count alcohol.",
      "UNODC forbids asking about opioids.",
    ],
    correctIndex: 1,
  },
  {
    id: "q5",
    prompt: "What does “non-medical use” of a medicine mean in DPTC?",
    options: [
      "Using a medicine exactly as a doctor prescribed it.",
      "Using a substance without a prescription, in larger amounts, or for another purpose.",
      "Any use of herbal remedies.",
      "Refusing all medication.",
    ],
    correctIndex: 1,
  },
  {
    id: "q6",
    prompt: "The DPTC curriculum was developed with support from:",
    options: [
      "Only the Kaduna State Government",
      "UNODC and the European Union",
      "WHO and UNICEF only",
      "Private pharmaceutical companies",
    ],
    correctIndex: 1,
  },
  {
    id: "q7",
    prompt: "What pass mark is required on the certificate-qualifying assessment?",
    options: ["50%", "60%", "70%", "90%"],
    correctIndex: 2,
  },
  {
    id: "q8",
    prompt:
      "For a frontline officer, the most useful response to someone who may be dependent is to:",
    options: [
      "Treat every case as a criminal matter first.",
      "Screen, distinguish use from dependence, and route people toward treatment where possible.",
      "Wait until a court orders treatment.",
      "Share their name publicly as a deterrent.",
    ],
    correctIndex: 1,
  },
];

export const quizMeta = {
  title: "Module 1 Quiz",
  seconds: 30 * 60,
  maxAttempts: 3,
  passMark: DEFAULT_PASS_MARK,
} as const;

export const finalQuiz: QuizQuestion[] = [
  {
    id: "f1",
    prompt: "Use and dependence are not the same. Dependence is best described as:",
    options: [
      "Any first-time use of a controlled substance.",
      "A pattern of compulsion, tolerance, and withdrawal that needs a clinical and social response.",
      "A moral failure that only punishment can correct.",
      "Intoxication that lasts more than one hour.",
    ],
    correctIndex: 1,
  },
  {
    id: "f2",
    prompt: "Why does stigma at the first contact make DPTC work harder?",
    options: [
      "It makes household surveys more accurate.",
      "It is required by the NDLEA Act.",
      "Shame and harsh language keep people from screening and treatment, so they present late.",
      "It only affects people who traffic drugs.",
    ],
    correctIndex: 2,
  },
  {
    id: "f3",
    prompt: "A balanced drug-control approach uses which three legs together?",
    options: [
      "Arrest, detention, and public naming.",
      "Supply reduction, demand reduction, and harm reduction.",
      "Seizures, fines, and school parades only.",
      "Counselling, herbal medicine, and prayer only.",
    ],
    correctIndex: 1,
  },
  {
    id: "f4",
    prompt: "What is screening in DPTC practice?",
    options: [
      "A full medical diagnosis that replaces a clinic.",
      "A brief, structured check for possible drug use or dependence — not a trap and not a diagnosis.",
      "A urine test announced to the whole station.",
      "An immediate arrest for personal possession.",
    ],
    correctIndex: 1,
  },
  {
    id: "f5",
    prompt: "Medically assisted treatment for opioid dependence means:",
    options: [
      "Prescribed medicines with psychosocial support.",
      "A single dose of naloxone and no follow-up.",
      "Forced detox in a cell without a clinician.",
      "Any herbal tonic sold as a cure.",
    ],
    correctIndex: 0,
  },
  {
    id: "f6",
    prompt: "The first family conversation about suspected dependence should:",
    options: [
      "Happen in public so neighbours can shame the person into stopping.",
      "Threaten immediate arrest if they do not confess.",
      "Take place calmly, in private, and encourage professional help.",
      "Wait until a court orders the family to act.",
    ],
    correctIndex: 2,
  },
  {
    id: "f7",
    prompt: "Women who use drugs often need a different path because they:",
    options: [
      "Never become dependent.",
      "Often use in private, face custody loss, and avoid male-dominated facilities.",
      "Are excluded from DPTC by UNODC policy.",
      "Only need longer lectures than men.",
    ],
    correctIndex: 1,
  },
  {
    id: "f8",
    prompt: "Withdrawal in a police cell is:",
    options: [
      "A useful interrogation tool.",
      "A medical emergency. Denial of treatment is abuse, not investigation.",
      "Proof the person is trafficking.",
      "Something officers should ignore until court.",
    ],
    correctIndex: 1,
  },
  {
    id: "f9",
    prompt: "Where the law allows diversion or caution for personal use, DPTC asks officers to:",
    options: [
      "Use it, record the referral, and treat a path to care as a professional outcome.",
      "Ignore it and charge every case as trafficking.",
      "Publish the person’s name as a deterrent.",
      "Wait for a federal circular before referring anyone.",
    ],
    correctIndex: 0,
  },
  {
    id: "f10",
    prompt: "Advocacy in this curriculum means:",
    options: [
      "A slogan on a banner at a one-day rally.",
      "Planned work — with data and a specific ask — to change a practice, budget, or by-law so prevention and treatment can run.",
      "Replacing enforcement with social media posts.",
      "Asking UNODC to write Kaduna’s laws.",
    ],
    correctIndex: 1,
  },
];

export const finalQuizMeta = {
  title: "DPTC final assessment",
  seconds: 30 * 60,
  maxAttempts: 3,
  passMark: DEFAULT_PASS_MARK,
} as const;

export type PublicQuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

export function toPublicQuestions(questions: QuizQuestion[]): PublicQuizQuestion[] {
  return questions.map(({ id, prompt, options }) => ({ id, prompt, options }));
}

export function getDptcModule(slug: string) {
  return dptcModules.find((item) => item.slug === slug) ?? dptcModules[0];
}

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type LessonContent = {
  slug: string;
  kicker: string;
  readTime: string;
  title: string;
  sections: { id: string; title: string; body: string }[];
  keyTerm: { title: string; body: string };
};

const extraLessons: Record<string, Omit<LessonContent, "slug" | "kicker" | "readTime" | "title">> = {
  introduction: {
    sections: [
      {
        id: "purpose",
        title: "What DPTC is for",
        body: "This curriculum turns the UNODC/EU trainer resource into a path any Kaduna officer, health worker, or community leader can finish. You will learn to recognise use and dependence, screen with dignity, and know when treatment — not punishment — is the right next step.",
      },
      {
        id: "path",
        title: "How the 13 modules fit",
        body: "Modules move from the national picture, through biology and stigma, into supply, demand and harm reduction, screening, treatment, families, special populations, rights, law enforcement, and advocacy. Each module has a short quiz. The certificate assessment needs 70%.",
      },
      {
        id: "how",
        title: "How to use this course",
        body: "Watch or read at your own pace. Download the trainer PDF if you will facilitate others. Come back from My courses — progress is saved to this account.",
      },
    ],
    keyTerm: {
      title: "Key term",
      body: "DPTC means Drug Prevention, Treatment and Care — the UNODC package this LMS was built to deliver in Kaduna State.",
    },
  },
  "drugs-and-effects": {
    sections: [
      {
        id: "use-vs-dependence",
        title: "Use is not the same as dependence",
        body: "Many people use a substance without becoming dependent. Dependence is a pattern of compulsion, tolerance, and withdrawal that needs a clinical and social response — not a moral verdict.",
      },
      {
        id: "brain",
        title: "What substances do in the body",
        body: "Depressants, stimulants, opioids, and cannabis act on different systems. Knowing the class helps you recognise overdose risk, agitation, and when to call medical help.",
      },
      {
        id: "practice",
        title: "What this means on duty",
        body: "Do not assume criminal intent from intoxication. Stabilise, screen, and refer. Stigma at the first contact is why people hide use and present late.",
      },
    ],
    keyTerm: {
      title: "Key term",
      body: "Dependence is a chronic, relapsing condition — not a one-off choice — and it responds to treatment.",
    },
  },
  "causes-and-stigma": {
    sections: [
      {
        id: "drivers",
        title: "Why people use",
        body: "Use is driven by availability, poverty, trauma, peer networks, untreated mental illness, and sometimes prescribed medicines that slip into non-medical use. No single cause explains Kaduna’s caseload.",
      },
      {
        id: "stigma",
        title: "How stigma blocks care",
        body: "Shame, police harassment, and family rejection keep people away from screening and treatment. Language such as “addict” or “junkie” in a station or clinic is itself a barrier.",
      },
      {
        id: "response",
        title: "A rights-based first response",
        body: "Treat the person as a rights-holder. Confidentiality, calm contact, and a clear path to help reduce harm more than public confrontation.",
      },
    ],
    keyTerm: {
      title: "Key term",
      body: "Stigma is social marking that reduces a person to their drug use and justifies exclusion from health and justice services.",
    },
  },
  "supply-reduction": {
    sections: [
      {
        id: "supply",
        title: "What supply reduction is",
        body: "Supply reduction targets production, trafficking, and diversion of controlled substances. It is one leg of a balanced approach — alongside demand and harm reduction.",
      },
      {
        id: "limits",
        title: "What seizures cannot do alone",
        body: "Enforcement without treatment recycles the same people through cells. DPTC asks officers to pair supply work with screening and referral, especially for possession for personal use.",
      },
      {
        id: "kaduna",
        title: "Working in Kaduna",
        body: "State and federal partners share borders, precursor routes, and pharmaceutical diversion. Coordination with KADSAMHSA and health facilities is part of the job, not an extra.",
      },
    ],
    keyTerm: {
      title: "Key term",
      body: "A balanced approach uses supply, demand, and harm reduction together rather than enforcement only.",
    },
  },
  "demand-harm-reduction": {
    sections: [
      {
        id: "demand",
        title: "Demand reduction",
        body: "Prevention, education, and treatment reduce the number of people who start or continue harmful use. Schools, families, and workplaces are prevention settings — not only police parades.",
      },
      {
        id: "harm",
        title: "Harm reduction",
        body: "Harm reduction keeps people alive and in contact with services even if they are not ready to stop. Overdose response, sterile equipment where policy allows, and non-punitive first contact are examples.",
      },
      {
        id: "together",
        title: "Not a contradiction",
        body: "You can enforce trafficking laws and still treat a dependent person as a patient. DPTC expects both instincts in the same officer.",
      },
    ],
    keyTerm: {
      title: "Key term",
      body: "Harm reduction means policies and practices that reduce the negative health and social effects of drug use without requiring abstinence first.",
    },
  },
  "drug-screening": {
    sections: [
      {
        id: "when",
        title: "When to screen",
        body: "Screen when use is disclosed, suspected after an incident, or when a family or commander asks for help. Screening is a conversation with a purpose — not a trap.",
      },
      {
        id: "how",
        title: "How to screen",
        body: "Use short, validated questions, private space, and plain language. Record only what your protocol requires. Do not announce results to a crowd.",
      },
      {
        id: "next",
        title: "After a positive screen",
        body: "Distinguish hazardous use from dependence, explain options, and refer to treatment. Immediate arrest for personal use is not the DPTC default.",
      },
    ],
    keyTerm: {
      title: "Key term",
      body: "Screening is a brief, structured check for possible drug use or dependence — it is not a full diagnosis.",
    },
  },
  "types-of-treatment": {
    sections: [
      {
        id: "range",
        title: "The treatment range",
        body: "Treatment includes counselling, outpatient programmes, inpatient care, medically assisted treatment for opioids, and recovery support. One size does not fit Kaduna’s caseload.",
      },
      {
        id: "match",
        title: "Matching the person to care",
        body: "Severity, other illnesses, pregnancy, age, and whether the person is in custody all change the right setting. Refer rather than invent a programme in the station.",
      },
      {
        id: "relapse",
        title: "Relapse is part of the condition",
        body: "A return to use is a reason to re-engage, not to close the file. DPTC treats relapse as a clinical event.",
      },
    ],
    keyTerm: {
      title: "Key term",
      body: "Medically assisted treatment uses prescribed medicines, with psychosocial support, to treat opioid dependence.",
    },
  },
  "family-interventions": {
    sections: [
      {
        id: "family",
        title: "Families are part of care",
        body: "Families notice change first. They can also punish, hide, or enable. DPTC trains you to bring them in without using shame as a tool.",
      },
      {
        id: "first-step",
        title: "The first conversation",
        body: "Approach calmly, in private, and encourage professional help. Public confrontation and threats of immediate arrest make disclosure less likely.",
      },
      {
        id: "safety",
        title: "When there is violence or a child at risk",
        body: "Safety comes first. Follow child-protection and domestic-violence protocols alongside the drug-care path — they are not optional extras.",
      },
    ],
    keyTerm: {
      title: "Key term",
      body: "Family intervention means structured support so relatives help a person enter and stay in treatment without humiliation.",
    },
  },
  "special-populations": {
    sections: [
      {
        id: "who",
        title: "Who needs a different path",
        body: "Women, pregnant people, young users, and people who inject drugs face extra stigma, extra legal risk, and extra health harm. Generic male-adult protocols miss them.",
      },
      {
        id: "women",
        title: "Women and girls",
        body: "Women often use in private, face custody loss, and avoid male-dominated facilities. Offer female staff, confidentiality, and links to reproductive health.",
      },
      {
        id: "young",
        title: "Young users",
        body: "Age-appropriate language, family involvement where safe, and schooling matter as much as the substance. Do not treat a 16-year-old as a trafficking suspect by default.",
      },
    ],
    keyTerm: {
      title: "Key term",
      body: "Special populations are groups whose legal, health, or social situation requires adapted DPTC practice — not a lighter version of the same lecture.",
    },
  },
  "human-rights": {
    sections: [
      {
        id: "rights",
        title: "Drug use does not cancel rights",
        body: "People who use drugs keep the right to health, due process, and freedom from torture. DPTC includes the death-penalty supplement because some drug offences still carry capital risk in law.",
      },
      {
        id: "custody",
        title: "In custody",
        body: "Withdrawal in a cell is a medical emergency. Denial of treatment, public stripping, or coerced confession is abuse — not investigation.",
      },
      {
        id: "practice",
        title: "Rights-based practice",
        body: "Document, refer, and escalate. A rights-based officer is still an officer — they just refuse shortcuts that destroy evidence and people.",
      },
    ],
    keyTerm: {
      title: "Key term",
      body: "A rights-based approach treats the person who uses drugs as a rights-holder first, including in arrest and detention.",
    },
  },
  "law-enforcement": {
    sections: [
      {
        id: "role",
        title: "The officer’s dual role",
        body: "You interrupt trafficking and you are often the first state face a dependent person meets. DPTC asks you to hold both without collapsing them into one punishment.",
      },
      {
        id: "discretion",
        title: "Discretion and referral",
        body: "Where the law allows diversion or caution for personal use, use it. Record the referral. A quiet path to KADSAMHSA or a clinic is still a professional outcome.",
      },
      {
        id: "safety",
        title: "Officer safety",
        body: "Intoxication, needles, and agitated withdrawal are operational risks. PPE, backup, and medical call-out are part of DPTC, not a sign of softness.",
      },
    ],
    keyTerm: {
      title: "Key term",
      body: "Diversion sends a person toward treatment or social support instead of — or alongside — a criminal file, where the law allows.",
    },
  },
  advocacy: {
    sections: [
      {
        id: "what",
        title: "What advocacy is here",
        body: "Advocacy in DPTC is planned work to change a practice, a budget, or a by-law so prevention and treatment can actually run — not a slogan on a banner.",
      },
      {
        id: "steps",
        title: "Steps that work",
        body: "Name the problem with data, identify who can change it, propose a specific ask, and follow up. Kaduna examples include clinic hours, female-only days, and station referral cards.",
      },
      {
        id: "you",
        title: "Your next ask",
        body: "Finish the remaining modules, pass the assessment, and take one concrete change back to your unit. The certificate is evidence you completed the curriculum — the work is what you change on Monday.",
      },
    ],
    keyTerm: {
      title: "Key term",
      body: "Advocacy is organised influence toward a specific policy or practice change, backed by evidence from this curriculum.",
    },
  },
};

export function getLesson(slug: string): LessonContent {
  if (slug === nigeriaLesson.slug) {
    return {
      slug: nigeriaLesson.slug,
      kicker: nigeriaLesson.kicker,
      readTime: nigeriaLesson.readTime,
      title: nigeriaLesson.title,
      sections: [...nigeriaLesson.sections],
      keyTerm: nigeriaLesson.keyTerm,
    };
  }
  const mod = getDptcModule(slug);
  const extra = extraLessons[mod.slug];
  const fallback = extraLessons.introduction;
  const body = extra ?? fallback;
  return {
    slug: mod.slug,
    kicker: `Lesson ${mod.index} — ${mod.title}`,
    readTime: `${Math.max(4, Math.round(mod.minutes / 6))} min read`,
    title: mod.title,
    sections: body.sections,
    keyTerm: body.keyTerm,
  };
}

export function moduleNav(slug: string) {
  const index = dptcModules.findIndex((item) => item.slug === slug);
  const current = dptcModules[Math.max(0, index)];
  const previous = index > 0 ? dptcModules[index - 1] : null;
  const next = index >= 0 && index < dptcModules.length - 1 ? dptcModules[index + 1] : null;
  return { current, previous, next, position: Math.max(1, index + 1), total: dptcModules.length };
}

export function moduleHref(courseSlug: string, moduleSlug: string) {
  if (moduleSlug === dptcModules[0].slug) {
    return `/learn/${courseSlug}/play`;
  }
  return `/learn/${courseSlug}/lessons/${moduleSlug}`;
}

export function adjacentHrefs(courseSlug: string, moduleSlug: string) {
  const { previous, next, position, total } = moduleNav(moduleSlug);
  return {
    previousHref: previous ? moduleHref(courseSlug, previous.slug) : undefined,
    nextHref: next ? moduleHref(courseSlug, next.slug) : `/learn/${courseSlug}/final`,
    nextLabel: next ? `Next (${position + 1}/${total})` : "Final assessment",
    previousLabel: "Previous module",
    position,
    total,
  };
}
