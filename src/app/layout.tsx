import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { DemoBanner } from "@/components/demo-banner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Salary Management", template: "%s · Salary Management" },
  description:
    "Manage employee salaries and see how the organization pays its people.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="bg-background focus:ring-ring sr-only z-50 rounded px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-2"
        >
          Skip to main content
        </a>
        <DemoBanner />
        <header className="border-b">
          <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-3">
            <Link href="/employees" className="font-semibold tracking-tight">
              Salary Management
            </Link>
            <nav aria-label="Main" className="flex gap-4 text-sm">
              <Link href="/employees" className="hover:underline">
                Employees
              </Link>
              <Link href="/insights" className="hover:underline">
                Insights
              </Link>
            </nav>
          </div>
        </header>
        <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
