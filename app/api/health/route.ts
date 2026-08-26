export async function GET() {
  return Response.json({
    ok: true,
    service: "kadsamhsa-lms",
    stack: "nextjs-supabase",
  });
}
