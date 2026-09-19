import type { Metadata } from "next";
import { Suspense } from "react";
import { Fraunces, JetBrains_Mono, Outfit } from "next/font/google";

import { FeedbackHost } from "@/components/feedback/feedback-host";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KADSAMHSA LMS",
    template: "%s · KADSAMHSA LMS",
  },
  description:
    "Learning platform for Drug Prevention, Treatment and Care training in Nigeria.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${fraunces.variable} ${jetbrainsMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <Suspense fallback={null}>
          <FeedbackHost />
        </Suspense>
      </body>
    </html>
  );
}
