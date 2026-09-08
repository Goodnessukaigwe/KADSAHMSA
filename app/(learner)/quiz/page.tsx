import { QuizResults } from "@/components/learner/quiz-results";
import { listMyQuizAttempts } from "@/lib/quiz/queries";

export const metadata = { title: "Quiz results" };

export default async function QuizPage() {
  const view = await listMyQuizAttempts();
  return <QuizResults view={view} />;
}
