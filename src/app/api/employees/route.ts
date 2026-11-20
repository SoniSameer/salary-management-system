import { createEmployeeSchema } from "@/server/employees/employee-schemas";
import { getEmployeeService } from "@/server/container";
import { parseBody, toErrorResponse } from "@/server/http/api-errors";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await parseBody(request, createEmployeeSchema);
    const employee = await getEmployeeService().create(input);
    return Response.json(employee, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
