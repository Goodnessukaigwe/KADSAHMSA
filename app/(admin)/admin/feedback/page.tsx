import { AdminFeedback } from "@/components/admin/admin-feedback";
import { listFeedbackTickets } from "@/lib/feedback/queries";

export const metadata = { title: "Feedback" };

export default async function AdminFeedbackPage() {
  const tickets = await listFeedbackTickets();
  return <AdminFeedback tickets={tickets} />;
}
