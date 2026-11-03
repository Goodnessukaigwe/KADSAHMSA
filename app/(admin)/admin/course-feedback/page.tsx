import { listCourseFeedback } from "@/lib/admin/course-feedback";

export const metadata = { title: "Learner survey" };

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const one = (value: number) => value.toFixed(1);

export default async function CourseFeedbackPage() {
  const { rows, summary, ready } = await listCourseFeedback();

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Learner survey</h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-500">
            What learners said about the academy before downloading their certificate. Ratings are out of 5.
            The score is a net promoter score from -100 to 100.
          </p>
        </div>
        <a
          href="/api/admin/export?kind=course_feedback"
          className="inline-flex h-11 items-center rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white"
        >
          Download CSV
        </a>
      </div>

      {!ready ? (
        <p className="mt-8 max-w-xl rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900">
          The survey table is not set up yet. Run the learner survey database update first.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-white px-5 py-10 text-center text-sm text-neutral-500">
          No responses yet. They appear here as learners finish a course and complete the form.
        </p>
      ) : (
        <>
          <div className="mt-8 overflow-x-auto rounded-2xl bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-[11px] tracking-[0.12em] text-neutral-400 uppercase">
                <tr>
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Responses</th>
                  <th className="px-5 py-3">Overall</th>
                  <th className="px-5 py-3">Ease of use</th>
                  <th className="px-5 py-3">Content</th>
                  <th className="px-5 py-3">Mobile</th>
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3">Problems</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.course} className="border-t border-neutral-100">
                    <td className="px-5 py-3 font-medium">{row.course}</td>
                    <td className="px-5 py-3">{row.responses}</td>
                    <td className="px-5 py-3">{one(row.overall)}</td>
                    <td className="px-5 py-3">{one(row.easeOfUse)}</td>
                    <td className="px-5 py-3">{one(row.contentQuality)}</td>
                    <td className="px-5 py-3">{one(row.mobileExperience)}</td>
                    <td className="px-5 py-3">{row.nps}</td>
                    <td className="px-5 py-3">{row.withProblems}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-10 text-lg font-bold">Comments</h2>
          <ul className="mt-3 space-y-3">
            {rows.map((row, index) => (
              <li key={index} className="rounded-2xl bg-white px-5 py-4 text-sm">
                <p className="text-xs text-neutral-500">
                  {when.format(new Date(row.createdAt))} · {row.learnerName || "Learner"} · {row.course} ·{" "}
                  {row.overall}/5 · recommend {row.recommend}/10
                </p>
                {row.enjoyed ? (
                  <p className="mt-2">
                    <strong>Worked well:</strong> {row.enjoyed}
                  </p>
                ) : null}
                {row.improve ? (
                  <p className="mt-1">
                    <strong>Improve:</strong> {row.improve}
                  </p>
                ) : null}
                {row.hadProblems ? (
                  <p className="mt-1 text-red-700">
                    <strong>Problem:</strong> {row.problems || "(no details given)"}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
