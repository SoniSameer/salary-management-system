import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoBanner } from "./demo-banner";

describe("DemoBanner", () => {
  it("says this is a demo with synthetic data", () => {
    render(<DemoBanner />);

    const banner = screen.getByRole("complementary", { name: "Demo notice" });
    expect(banner).toHaveTextContent(/demo/i);
    expect(banner).toHaveTextContent(/synthetic data/i);
  });

  it("warns that there is no login, so real salaries must not be entered", () => {
    render(<DemoBanner />);

    const banner = screen.getByRole("complementary", { name: "Demo notice" });
    expect(banner).toHaveTextContent(/no login/i);
    expect(banner).toHaveTextContent(/do not enter real employee/i);
  });

  it("is visible text, not hidden from assistive technology", () => {
    render(<DemoBanner />);

    expect(screen.getByRole("complementary", { name: "Demo notice" })).toBeVisible();
  });
});
