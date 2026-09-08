export const site = {
  name: "KADSAMHSA",
  fullName:
    "Kaduna State Bureau for Substance Abuse Prevention and Treatment",
  email: "info@kadsamhsa.org",
  phone: "+234 803 808 6191",
  location: "Kaduna State",
  year: new Date().getFullYear(),
} as const;

export const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About us" },
  { href: "/courses", label: "Courses" },
  { href: "/#plans", label: "Pricing" },
] as const;

export const hero = {
  badge: "KADSAMHSA Training",
  title: "Evidence-Based Drug Prevention, Treatment, and Care Training",
  subtitle:
    "Empowering individuals and communities through evidence-based drug prevention, treatment, and care training. Let's work together for a healthier, safer community.",
  cta: "Browse courses",
} as const;

export const about = {
  badge: "Our story",
  title: "We turned a 236-page manual into training anyone can finish.",
  body: "The UNODC/EU DPTC curriculum used to live as PowerPoint decks and a 236-page trainer resource. KADSAMHSA now delivers it as self-paced modules, quizzes, and a verifiable certificate — built for low-bandwidth access across Nigeria.",
  cta: "Read our story",
} as const;

export const stats = [
  { value: "Self-paced", label: "Learn on any device" },
  { value: "14", label: "DPTC modules in the curriculum" },
  { value: "Verify", label: "Certificates anyone can check" },
] as const;

export const featured = {
  title: "Featured Courses",
  subtitle: "Published courses appear here when staff add a live lesson or media.",
} as const;

export const plans = {
  title: "Simple, Flexible Plans",
  subtitle: "Learn on your own, or equip your organisation with seats and progress reporting.",
  highlights: [
    {
      title: "Flexible payments",
      body: "Published courses are free to request. An administrator enrols you when a seat is ready.",
    },
    {
      title: "Complete feedback delivery",
      body: "Module quizzes and a final exam with a 70% pass mark, retries, and clear scores.",
    },
    {
      title: "Get your certificate",
      body: "Pass the assessment and download a PDF with a unique ID anyone can verify publicly.",
    },
  ],
  free: {
    name: "Learner",
    price: "$0",
    blurb: "Self-register and complete free courses at your own pace.",
    cta: "Sign up for free",
    href: "/register",
    features: [
      "Browse the public catalogue",
      "Request enrolment in a published course",
      "Resume on any device, including phones",
      "Module quizzes and final assessment",
      "Verifiable PDF certificate",
    ],
  },
  org: {
    name: "Organisation",
    price: "Custom",
    blurb: "Bulk-enrol staff, track completion, and report to funders.",
    cta: "Talk to us",
    href: "mailto:info@kadsamhsa.org?subject=Organisation%20training",
    features: [
      "Seat packs for partner agencies",
      "Invite staff by list or link",
      "Organisation progress dashboard",
      "CSV completion reports",
      "Dedicated onboarding for your cohort",
    ],
  },
} as const;

export const faqs = [
  {
    question: "Is this course for me?",
    answer:
      "Yes. DPTC is built for health workers, law enforcement, educators, and community professionals — and for anyone in the general public who wants evidence-based training. No prior qualification is required.",
  },
  {
    question: "Do I need any previous knowledge?",
    answer:
      "No. Modules start from the drug-use situation in Nigeria and build toward screening, treatment, human rights, and advocacy. You can pause and resume on your phone.",
  },
  {
    question: "Is the DPTC course free?",
    answer:
      "Yes. The launch course is free to enrol. Paid courses and organisation seat packs will be labelled clearly in the catalogue.",
  },
  {
    question: "Will I get a certificate?",
    answer:
      "Complete the required modules and pass the final assessment (default 70%) to receive a PDF certificate with a public verification ID.",
  },
  {
    question: "Can my organisation enrol staff in bulk?",
    answer:
      "Yes. Organisation admins can invite staff, track progress, and export reports. Share your agency details and we will set the cohort up.",
  },
] as const;

export const teamCta = {
  title: "Training your whole team? We'll set it up for you.",
  body: "Register your organisation for seat packs, progress tracking, and certificate reporting across your staff cohort.",
  placeholder: "Work email",
  submit: "Send",
} as const;

export const footer = {
  product: {
    title: "Product",
    links: [
      { href: "/courses", label: "Course catalogue" },
      { href: "/verify", label: "Certificate verification" },
      { href: "/privacy", label: "Privacy notice" },
      { href: "/about", label: "About us" },
    ],
  },
  resources: {
    title: "Resources",
    links: [
      { href: "https://www.unodc.org", label: "UNODC framework" },
      { href: "/courses", label: "Trainer resources" },
      { href: "/about#faq", label: "FAQs" },
    ],
  },
} as const;
