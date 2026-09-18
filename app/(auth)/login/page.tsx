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
  const initialError =
    params.error === "confirm"
      ? authCopy.login.confirmError
      : params.error === "callback"
        ? authCopy.login.callbackError
        : null;

  return (
    <AuthSplit image={authCopy.loginImage} imageAlt={authCopy.login.imageAlt}>
      <LoginForm initialError={initialError} nextPath={params.next} />
    </AuthSplit>
  );
}
