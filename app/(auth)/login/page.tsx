import { AuthSplit } from "@/components/auth/auth-split";
import { LoginForm } from "@/components/auth/login-form";
import { authCopy } from "@/lib/content/auth";

export const metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthSplit image={authCopy.stallImage} imageAlt={authCopy.login.imageAlt}>
      <LoginForm
        initialError={
          params.error === "callback"
            ? "Could not complete sign-in. Try again."
            : null
        }
        nextPath={params.next}
      />
    </AuthSplit>
  );
}
