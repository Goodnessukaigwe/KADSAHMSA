export async function POST() {
  return Response.json(
    { error: "Certificate issuance is not implemented yet (Phase 3)." },
    { status: 501 }
  );
}
