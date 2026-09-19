import { AuthSplit } from "@/components/auth/auth-split";
import {
  ForgotPasswordForm,
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
    <AuthSplit
      image={user ? authCopy.resetImage : undefined}
      imageAlt={user ? authCopy.reset.imageAlt : undefined}
    >
      {user ? <ResetPasswordForm /> : <ForgotPasswordForm />}
    </AuthSplit>
  );
}
