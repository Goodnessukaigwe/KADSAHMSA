import { site } from "@/lib/content/landing";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy";

export const privacyCopy = {
  badge: "Draft notice",
  title: "Privacy notice",
  versionLabel: `Version ${PRIVACY_POLICY_VERSION}`,
  draftBanner:
    "This is a working draft for the KADSAMHSA learning platform. It describes what the product actually stores today. It is not a signed Nigeria Data Protection Act (NDPA 2023) policy, and no compliance owner has been named yet. Legal review is still outstanding.",
  intro: `KADSAMHSA (${site.fullName}) runs this learning site so people and organisations can take courses, sit quizzes, and receive verifiable certificates.`,
  sections: [
    {
      heading: "What we collect",
      body: [
        "Account details you type at signup: full name, email address, and a password (the password is stored by Supabase Auth, not in course tables).",
        "A consent record when you accept this notice: which policy version you accepted, and when.",
        "Learning records: which courses you enrol on, lesson progress, quiz answers and scores, and certificates we issue.",
        "Organisation records if a partner agency invites you: membership, role, and progress your organisation admin can see.",
        "Files staff attach to lessons, and certificate PDFs, in private storage. We do not put card numbers on this platform (Paystack is not wired yet).",
      ],
    },
    {
      heading: "Why we use it",
      body: [
        "To create your account and let you sign in.",
        "To deliver courses, mark progress, score quizzes, and issue or revoke certificates.",
        "To let KADSAMHSA staff administer users, courses, and reports, and to let organisation admins see only their own staff.",
        "To record that you consented to this processing at signup.",
      ],
    },
    {
      heading: "Public certificate checks",
      body: [
        "Anyone with a certificate ID can use the public verify page. That page shows only whether the certificate is valid or revoked, the learner’s name, the course title, and the issue date. It does not show email, quiz scores, or a file download link.",
      ],
    },
    {
      heading: "How to ask for deletion",
      body: [
        `Email ${site.email} and say you want your learning account erased. Staff can then review and delete the account and related rows. There is not yet an in-app “download my data” or self-serve delete button.`,
        "If you joined through an organisation, that organisation may also need to be told so their roster stays accurate.",
      ],
    },
    {
      heading: "What this draft does not claim",
      body: [
        "It does not name a Data Protection Officer or an official NDPA compliance owner — that is still an open question for KADSAMHSA legal.",
        "It is not a substitute for a lawyer-approved privacy policy, a data-processing agreement, or a retention schedule.",
        "Cookie and analytics tools beyond the login session are not part of this build.",
      ],
    },
  ],
  contactLead: "Questions about this draft, or a deletion request:",
  contactEmail: site.email,
} as const;
