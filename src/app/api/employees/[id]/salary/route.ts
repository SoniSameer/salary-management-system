import { employeeIdSchema } from "@/server/employees/employee-schemas";
import { changeSalarySchema } from "@/server/employees/salary-schemas";
import { getSalaryService } from "@/server/container";
import { parseBody, toErrorResponse } from "@/server/http/api-errors";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/employees/[id]/salary">,
): Promise<Response> {
  try {
    const id = employeeIdSchema.parse((await ctx.params).id);
    const input = await parseBody(request, changeSalarySchema);
    const result = await getSalaryService().changeSalary(id, input);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
