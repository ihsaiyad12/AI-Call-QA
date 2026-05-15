import type { Metadata } from "next";
import "./globals.css";

import NextAuthProvider from "@/components/NextAuthProvider";

export const metadata: Metadata = {
  title: "AI Call Quality Analyzer | x-engage",
  description: "Industry-standard AI-powered call analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NextAuthProvider>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}
