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
    noAccount: "Don’t have an account?",
    registerLink: "Sign up",
    imageAlt:
      "KADSAMHSA training session with participants gathered together",
  },
  reset: {
    title: "Forgot password?",
    hint: "Log in first, then open Forgot password to choose a new one — or contact KADSAMHSA if you cannot access your account.",
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
  loginImage: "/Training/IMG_7634.jpg",
  registerImage: "/Training/IMG_7634.jpg",
  resetImage: "/Training/IMG_7625.jpg",
} as const;
