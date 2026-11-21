import { connection } from "next/server";
import { getInsightsService } from "@/server/container";
import { toErrorResponse } from "@/server/http/api-errors";

export async function GET(): Promise<Response> {
  // This handler reads nothing from the request, so Next.js would otherwise try to
  // prerender it during `next build` and open database connections there.
  await connection();

  try {
    return Response.json({ currencies: await getInsightsService().getCurrencies() });
  } catch (error) {
    return toErrorResponse(error);
  }
}
