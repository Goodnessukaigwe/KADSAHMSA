import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { getSessionProfile } from "@/lib/permissions";

export async function FeedbackHost() {
  const profile = await getSessionProfile();
  return <FeedbackWidget submitterName={profile?.name ?? null} />;
}
