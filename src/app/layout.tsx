import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { DemoBanner } from "@/components/demo-banner";
import { Logo } from "@/components/Logo";
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

export const viewport: Viewport = {
  themeColor: "#4747d6",
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
          className="bg-background focus:ring-ring sr-only z-50 rounded-md px-3 py-2 text-sm font-medium shadow-lg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-2"
        >
          Skip to main content
        </a>
        <DemoBanner />
        <header className="bg-background/90 sticky top-0 z-40 border-b backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link href="/employees" className="group flex items-center gap-2 font-semibold tracking-tight">
              <Logo size={32} className="text-primary transition-transform duration-150 group-hover:scale-105" />
              <span>Salary Management</span>
            </Link>
            <nav aria-label="Main" className="flex items-center gap-1 rounded-lg border bg-card/70 p-1 shadow-sm">
              <Link
                href="/employees"
                className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
              >
                Employees
              </Link>
              <Link
                href="/insights"
                className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
              >
                Insights
              </Link>
            </nav>
          </div>
        </header>
        <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
