import { getEmployeeService } from "@/server/container";
import { toErrorResponse } from "@/server/http/api-errors";

export async function GET(): Promise<Response> {
  try {
    return Response.json(await getEmployeeService().getFilterOptions());
  } catch (error) {
    return toErrorResponse(error);
  }
}
