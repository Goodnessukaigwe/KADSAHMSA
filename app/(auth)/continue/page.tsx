export const metadata = { title: "Continue" };

const COPY: Record<string, { title: string; body: string; button: string }> = {
  recovery: {
    title: "Reset your password",
    body: "Press the button to choose a new password for your account.",
    button: "Continue to reset password",
  },
  signup: {
    title: "Confirm your email",
    body: "Press the button to confirm your email address and finish creating your account.",
    button: "Confirm my email",
  },
  email: {
    title: "Confirm your email",
    body: "Press the button to confirm your email address.",
    button: "Confirm my email",
  },
  magiclink: {
    title: "Sign in",
    body: "Press the button to sign in to your account.",
    button: "Sign in",
  },
};

export default async function ContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash, type, next } = await searchParams;
  const copy = COPY[type ?? ""] ?? {
    title: "Continue",
    body: "Press the button to continue.",
    button: "Continue",
  };

  if (!token_hash || !type) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-3xl font-bold tracking-tight">This link is not valid</h1>
        <p className="mt-3 text-sm text-neutral-500">
          Request a new link from the sign-in page and open it straight from your email.
        </p>
        <a
          href="/login"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-neutral-950 px-8 text-sm font-semibold text-white"
        >
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight">{copy.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-500">{copy.body}</p>
      <form method="post" action="/auth/confirm" className="mt-8">
        <input type="hidden" name="token_hash" value={token_hash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next ?? ""} />
        <button
          type="submit"
          className="h-12 rounded-full bg-neutral-950 px-8 text-sm font-semibold text-white"
        >
          {copy.button}
        </button>
      </form>
    </div>
  );
}
