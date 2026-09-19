import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";

import { FeedbackHost } from "@/components/feedback/feedback-host";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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
        className={`${inter.variable} ${inter.className} ${jetbrainsMono.variable} antialiased`}
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
