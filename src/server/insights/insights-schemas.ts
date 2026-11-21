import { z } from "zod";

/**
 * Query for the insights endpoints. The currency is required: every figure is
 * for one currency, because amounts in different currencies cannot be combined.
 */
export const insightsQuerySchema = z.object({
  currency: z
    .string("Choose a currency")
    .trim()
    .toUpperCase()
    .min(1, "Choose a currency")
    .regex(/^[A-Z]{3}$/, "Use a 3-letter ISO currency code, for example USD"),
});

export type InsightsQuery = z.infer<typeof insightsQuerySchema>;
