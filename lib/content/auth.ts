export const AUTH_FORM_DEFAULTS = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  acceptedPrivacy: false,
};

export const authCopy = {
  register: {
    title: "Create an account",
    fullName: "Full Name",
    fullNamePlaceholder: "Enter your full name",
    email: "Email Address",
    emailPlaceholder: "Enter your email address",
    password: "Create Password",
    passwordPlaceholder: "Create a password",
    submit: "Sign up",
    consentBefore: "I have read the",
    consentLink: "privacy notice",
    consentAfter:
      "and I consent to KADSAMHSA processing my account and learning data as described there.",
    haveAccount: "Already have an account?",
    loginLink: "Login",
    verifyTitle: "Check your email",
    verifyBody:
      "We sent a confirmation link to {email}. Open it to activate your account and start learning. The link can take a minute to arrive; check your spam folder too.",
    verifyResend: "Send the email again",
    verifyResent: "If that address needs confirming, we sent another email.",
    verifyWrongEmail: "Use a different email",
    imageAlt:
      "KADSAMHSA training session with participants learning together",
  },
  login: {
    title: "Welcome back",
    email: "Email Address",
    emailPlaceholder: "Enter your email address",
    password: "Password",
    passwordPlaceholder: "Enter password",
    submit: "Log in",
    forgot: "Forgot password?",
    unconfirmed:
      "Your email is not confirmed yet. Open the confirmation link we emailed you, or send it again.",
    resend: "Send the confirmation email again",
    resent: "If that address needs confirming, we sent another email.",
    noAccount: "Don’t have an account?",
    registerLink: "Sign up",
    confirmError:
      "That reset link is invalid or has expired. Request a new one from forgot password.",
    callbackError: "Could not complete sign-in. Try again.",
    imageAlt:
      "KADSAMHSA training session with participants gathered together",
  },
  reset: {
    title: "Forgot password?",
    hint: "Enter your email. If an account exists, we will send a reset link.",
    email: "Email Address",
    emailPlaceholder: "Enter your email address",
    submit: "Send reset link",
    sent: "If that email exists, we sent a link.",
    contact: "Contact KADSAMHSA",
    updateTitle: "Choose a new password",
    newPassword: "New password",
    newPasswordPlaceholder: "Enter a new password",
    updateSubmit: "Save new password",
    changePassword: "Change password",
    backToLogin: "Back to log in",
    imageAlt:
      "A miniature Japanese noodle stall at night, lit by lanterns — a pause before you return to learning",
  },
  loginImage: "/login/IMG_1633.jpg",
  registerImage: "/signin/IMG_1633.jpg",
  resetImage: "/Training/IMG_7625.jpg",
} as const;
