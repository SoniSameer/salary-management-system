import { getInsightsService } from "@/server/container";
import { toErrorResponse } from "@/server/http/api-errors";

export async function GET(): Promise<Response> {
  try {
    return Response.json({ currencies: await getInsightsService().getCurrencies() });
  } catch (error) {
    return toErrorResponse(error);
  }
}
