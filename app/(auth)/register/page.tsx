import { AuthSplit } from "@/components/auth/auth-split";
import { RegisterForm } from "@/components/auth/register-form";
import { authCopy } from "@/lib/content/auth";

export const metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <AuthSplit image={authCopy.registerImage} imageAlt={authCopy.register.imageAlt}>
      <RegisterForm />
    </AuthSplit>
  );
}
