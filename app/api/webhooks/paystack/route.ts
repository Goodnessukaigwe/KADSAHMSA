export async function POST() {
  return Response.json(
    { error: "Paystack webhook is not implemented yet (Phase 4)." },
    { status: 501 }
  );
}
