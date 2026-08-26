import { AuthSplit } from "@/components/auth/auth-split";
import { LoginForm } from "@/components/auth/login-form";
import { authCopy } from "@/lib/content/auth";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthSplit image={authCopy.stallImage} imageAlt={authCopy.login.imageAlt}>
      <LoginForm />
    </AuthSplit>
  );
}
