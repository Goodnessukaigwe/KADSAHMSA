export const FEEDBACK_CATEGORIES = [
  "broken",
  "access",
  "quiz_cert",
  "other",
] as const;

export const feedbackCopy = {
  button: "Submit a ticket",
  title: "What’s getting in the way?",
  subcopy: "Describe what’s broken or confusing. A short note is enough.",
  messageLabel: "What happened?",
  messagePlaceholder: "Tell us what you were trying to do and what went wrong.",
  categoryLabel: "What’s this about?",
  categories: {
    broken: "Something’s broken",
    access: "Can’t access a course",
    quiz_cert: "Quiz or certificate",
    other: "Something else",
  },
  anonymous: "Anonymous",
  sendingAsPrefix: "Sending as",
  submit: "Send ticket",
  sending: "Sending…",
  successTitle: "Ticket sent",
  successBody: "Thanks — the team will look at this.",
  close: "Close",
  tooShort: "Write at least 20 characters so we can help.",
  tooLong: "Keep it under 2000 characters.",
  pickCategory: "Choose a category.",
  cooldown: "Please wait a minute before sending another ticket.",
  genericError: "Could not send that ticket. Try again.",
  applySchema: "Apply supabase/apply-feedback.sql in the Supabase SQL editor.",
  inboxTitle: "Feedback",
  inboxSubcopy:
    "Tickets from learners and visitors. Open a row to mark it read. Resolve when it is handled.",
  filters: {
    all: "All",
    new: "New",
    open: "Open",
    resolved: "Resolved",
  },
  columns: {
    from: "From",
    page: "Page",
    message: "Message",
    time: "Time",
    status: "Status",
  },
  empty: "No tickets in this view.",
  markResolved: "Mark resolved",
  resolving: "Resolving…",
  resolved: "Resolved",
  open: "Open",
  newBadge: "New",
  detailCategory: "Category",
  detailEmail: "Email",
  detailPage: "Page",
  detailOpened: "Opened",
  detailRead: "Read",
  detailResolved: "Resolved",
  unreadNav: "unread",
} as const;

export function sendingAsLabel(name: string | null) {
  return `${feedbackCopy.sendingAsPrefix} ${name?.trim() || feedbackCopy.anonymous}`;
}
