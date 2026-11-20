import { employeeIdSchema } from "@/server/employees/employee-schemas";
import { getEmployeeService } from "@/server/container";
import { toErrorResponse } from "@/server/http/api-errors";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/employees/[id]/deactivate">,
): Promise<Response> {
  try {
    const id = employeeIdSchema.parse((await ctx.params).id);
    const employee = await getEmployeeService().deactivate(id);
    return Response.json(employee);
  } catch (error) {
    return toErrorResponse(error);
  }
}
