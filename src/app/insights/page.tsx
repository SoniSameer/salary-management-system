import type { Metadata } from "next";
import { Suspense } from "react";
import { InsightsDashboard } from "@/features/insights/components/insights-dashboard";

export const metadata: Metadata = { title: "Insights" };

// The dashboard reads the currency from the URL, so it sits inside Suspense.
// The heading is prerendered, and the dashboard takes over in the browser.
export default function InsightsPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="space-y-1.5">
        <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">Compensation analytics</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-[32px]">Salary insights</h1>
        <p className="text-muted-foreground text-sm sm:text-[15px]">
          How the organization pays its people, one currency at a time.
        </p>
      </div>
      <Suspense
        fallback={
          <p role="status" className="text-muted-foreground text-sm">
            Loading insights…
          </p>
        }
      >
        <InsightsDashboard />
      </Suspense>
    </div>
  );
}
