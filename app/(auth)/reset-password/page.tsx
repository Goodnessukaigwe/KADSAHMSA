import { AuthSplit } from "@/components/auth/auth-split";
import {
  ForgotPasswordNotice,
  ResetPasswordForm,
} from "@/components/auth/reset-password-form";
import { authCopy } from "@/lib/content/auth";
import { getAuthUser } from "@/lib/permissions";

export async function generateMetadata() {
  const user = await getAuthUser();
  return {
    title: user ? "Change password" : "Forgot password",
  };
}

export default async function ResetPasswordPage() {
  const user = await getAuthUser();

  return (
    <AuthSplit image={authCopy.stallImage} imageAlt={authCopy.reset.imageAlt}>
      {user ? <ResetPasswordForm /> : <ForgotPasswordNotice />}
    </AuthSplit>
  );
}
