import { getInsightsService } from "@/server/container";
import { toErrorResponse } from "@/server/http/api-errors";
import { insightsQuerySchema } from "@/server/insights/insights-schemas";

export async function GET(request: Request): Promise<Response> {
  try {
    const { currency } = insightsQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return Response.json(await getInsightsService().getInsights(currency));
  } catch (error) {
    return toErrorResponse(error);
  }
}
