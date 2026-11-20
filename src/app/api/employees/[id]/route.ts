import { employeeIdSchema, updateEmployeeSchema } from "@/server/employees/employee-schemas";
import { getEmployeeService } from "@/server/container";
import { parseBody, toErrorResponse } from "@/server/http/api-errors";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/employees/[id]">,
): Promise<Response> {
  try {
    const id = employeeIdSchema.parse((await ctx.params).id);
    return Response.json(await getEmployeeService().getDetails(id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/employees/[id]">,
): Promise<Response> {
  try {
    const id = employeeIdSchema.parse((await ctx.params).id);
    const patch = await parseBody(request, updateEmployeeSchema);
    const employee = await getEmployeeService().update(id, patch);
    return Response.json(employee);
  } catch (error) {
    return toErrorResponse(error);
  }
}
