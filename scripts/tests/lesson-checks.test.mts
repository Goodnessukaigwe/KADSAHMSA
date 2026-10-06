import { splitChecks } from "../../lib/courses/checks";
import { buildAccess } from "../../lib/learning/gating";

let failures = 0;
const check = (name: string, ok: boolean) => {
  console.log(ok ? "PASS" : "FAIL", name);
  if (!ok) failures++;
};

// Pre-test: several questions, answers on their own line.
const pre = `Pre-Test — Check Your Starting Point (not graded)

Q1. ASSIST stands for:
A. One
B. Two
Answer: B
Q2. Second?
A. x
B. y
C. z
Answer: C`;
const a = splitChecks(pre);
check("pre-test gives text then two checks", a.length === 3 && a[0].type === "text" && a[1].type === "check");
check("pre-test answers read", a[1].type === "check" && a[1].check.answer === 1 && a[2].type === "check" && a[2].check.answer === 2);
check("Q prefix removed", a[1].type === "check" && a[1].check.prompt === "ASSIST stands for:");

// Knowledge check: answer after a blank line, with an explanation, text continues after it.
const kc = `Knowledge Check

One in how many?
A. Two
B. Five
C. Twenty

Answer: B — about 80,000 of 376,000.

Alternative Development

Illicit crops give quick returns.`;
const b = splitChecks(kc);
check("knowledge check is interactive", b.some((s) => s.type === "check"));
const kcCheck = b.find((s) => s.type === "check");
check("explanation kept", kcCheck?.type === "check" && kcCheck.check.explanation === "about 80,000 of 376,000." && kcCheck.check.answer === 1);
check("later text survives", b[b.length - 1].type === "text" && (b[b.length - 1] as { text: string }).text.includes("Illicit crops"));
check("answer line is not left in text", !b.some((s) => s.type === "text" && s.text.includes("Answer:")));

// Plain prose with a list is not a check.
check("plain text untouched", splitChecks("Step 1\nA. not a list of options\n").every((s) => s.type === "text"));

// Gating
const outline = [
  { slug: "m1", title: "M1", position: 1, durationLabel: "", hasQuiz: true, lessons: [1, 2, 3].map((n) => ({ slug: `m1-${n}`, title: "", href: "" })) },
  { slug: "m2", title: "M2", position: 2, durationLabel: "", hasQuiz: false, lessons: [1, 2].map((n) => ({ slug: `m2-${n}`, title: "", href: "" })) },
];
// A stale resume point in a later module must not mark early pages complete.
const stale = buildAccess(outline, { currentModule: 2, completed: [], playerSeconds: 0, resumeLessonSlug: "m2-2" });
check("stale resume in a locked module: page 1 not done, page 2 locked", !stale.lessonDone("m1-1") && stale.lessonOpen("m1-1") && !stale.lessonOpen("m1-2"));
const doneOne = buildAccess(outline, { currentModule: 1, completed: [], playerSeconds: 0, resumeLessonSlug: "m1-1" });
check("page 1 done opens page 2", doneOne.lessonDone("m1-1") && doneOne.lessonOpen("m1-2") && !doneOne.lessonDone("m1-2"));

const fresh = buildAccess(outline, { currentModule: 1, completed: [], playerSeconds: 0, resumeLessonSlug: null });
check("new learner: first page only", fresh.lessonOpen("m1-1") && !fresh.lessonOpen("m1-2"));
check("new learner: module 2 locked", !fresh.moduleOpen(2) && !fresh.lessonOpen("m2-1"));
const mid = buildAccess(outline, { currentModule: 1, completed: [], playerSeconds: 0, resumeLessonSlug: "m1-2" });
check("on page 2: page 3 opens, not the quiz", mid.lessonOpen("m1-3") && !mid.moduleReached(1));
const end = buildAccess(outline, { currentModule: 1, completed: [], playerSeconds: 0, resumeLessonSlug: "m1-3" });
check("last page reached: quiz may open, module 2 still locked", end.moduleReached(1) && !end.moduleOpen(2));
const passed = buildAccess(outline, { currentModule: 2, completed: [1], playerSeconds: 0, resumeLessonSlug: "m1-3" });
check("module 1 passed: module 2 opens at its first page", passed.moduleOpen(2) && passed.lessonOpen("m2-1") && !passed.lessonOpen("m2-2"));
check("passed module stays open for review", passed.lessonOpen("m1-1") && passed.lessonOpen("m1-3"));
check("staff bypass", buildAccess(outline, { currentModule: 1, completed: [], playerSeconds: 0, resumeLessonSlug: null }, true).lessonOpen("m2-2"));
if (failures) process.exit(1);
