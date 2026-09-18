export const aboutPage = {
  badge: "About KADSAMHSA Academy",
  title: "An online academy for training staff, partners, and communities.",
  lead: "KADSAMHSA Academy is the official training platform of the Kaduna State Bureau for Substance Abuse Prevention and Treatment. It exists so people can complete evidence-based drug prevention, treatment, and care courses online — then prove they finished.",
  heroCta: "Browse courses",
  heroCtaHref: "/courses",
  purpose: [
    {
      label: "What this is",
      text: "A learning platform where individuals and organisations enrol in courses, sit assessments, and earn certificates. Training that used to live in workshop rooms now lives here, on a phone or a computer, at the learner's own pace.",
    },
    {
      label: "Who we train",
      text: "KADSAMHSA staff, partner agencies, health workers, law enforcement, educators, community professionals, and members of the public. Organisations can enrol a whole team and see who has completed the work.",
    },
  ],
  why: {
    badge: "Why it exists",
    title: "Training used to stop at the people in the room.",
    body: "The Bureau's curricula were delivered as slide decks and manuals in in-person workshops. This platform is how that changes.",
    points: [
      "Only people who could attend in person were trained.",
      "Completion was hard to track, and hard to prove.",
      "Partner organisations had no way to enrol their own staff and report who had finished.",
    ],
  },
  outcomes: {
    badge: "What it is built to do",
    title: "The goal is simple: train more people, to a standard you can show.",
    items: [
      {
        title: "Learn on your own time",
        text: "Anyone can register, take a published course, pause when they need to, and pick up where they left off — including on a phone.",
      },
      {
        title: "Train a whole organisation",
        text: "Partner agencies enrol staff in bulk, follow progress from one dashboard, and export completion reports for management or funders.",
      },
      {
        title: "Prove the training happened",
        text: "Quizzes and a final assessment stand behind every certificate. Each certificate has a unique ID that anyone can check.",
      },
      {
        title: "Start with DPTC sensitisation",
        text: "The launch course is Sensitization on Drug Use, Drug Dependence and Drug Prevention, Treatment and Care — the UNODC/EU curriculum already used to train law enforcement and the public in Nigeria.",
      },
    ],
  },
  audiences: {
    title: "Built for the people who need this training",
    items: [
      {
        title: "Individual learners",
        text: "Register free, complete a course at your own pace, and download a certificate you can share with an employer.",
      },
      {
        title: "Partner organisations",
        text: "Enrol staff as a cohort, track who is in progress, and show that the training was completed to a standard.",
      },
      {
        title: "Communities and the public",
        text: "Take the same evidence-based sensitisation without travelling to a workshop or waiting for the next training cycle.",
      },
    ],
  },
  faqTitle: "Common questions we've been asked",
  faqPill: "Frequently asked questions",
  faqs: [
    {
      question: "What is KADSAMHSA Academy?",
      answer:
        "It is the Bureau's official online training platform. Individuals and partner organisations enrol in courses on drug prevention, treatment, and care, complete assessments, and earn certificates that can be verified.",
    },
    {
      question: "Is this course really free?",
      answer:
        "Launch courses such as DPTC sensitisation are free to enrol. Paid courses and organisation seat packs are labelled clearly in the catalogue.",
    },
    {
      question: "Do I need any experience to start?",
      answer:
        "No. The course is written for first-time online learners, with no prior training required. You can pause and resume on your phone.",
    },
    {
      question: "Will I get a certificate?",
      answer:
        "Yes. Complete required modules and pass the final assessment (default 70%) to receive a PDF certificate with a public verification ID.",
    },
    {
      question: "Can my organization enroll multiple staff?",
      answer:
        "Yes. Organisation admins can invite staff, track progress, and export reports for compliance from one dashboard.",
    },
  ],
  org: {
    title: "Training your whole team? We'll set it up for you.",
    body: "Bulk-enrol staff, track completion, and export reports for compliance — all from one organisation dashboard.",
    cta: "Register your organization",
    href: "/register",
  },
} as const;
