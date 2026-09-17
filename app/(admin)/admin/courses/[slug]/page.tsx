import { redirect } from "next/navigation";

export default async function AdminCourseBuilderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/admin/courses?edit=${encodeURIComponent(slug)}`);
}
