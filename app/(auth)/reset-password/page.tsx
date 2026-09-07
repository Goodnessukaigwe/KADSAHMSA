import { AuthSplit } from "@/components/auth/auth-split";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { authCopy } from "@/lib/content/auth";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <AuthSplit image={authCopy.stallImage} imageAlt={authCopy.reset.imageAlt}>
      <ResetPasswordForm />
    </AuthSplit>
  );
}
