import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, fromZodError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { serviceService } from "@/services/runtime/service";
import { importServicesFromTemplateSchema } from "@/validations/service.validations";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status } = await requirePermission("services", "create");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const body = await request.json();
  const validation = importServicesFromTemplateSchema.safeParse(body);

  if (!validation.success) {
    throw fromZodError(validation.error);
  }

  const result = await serviceService.importServicesFromTemplate(
    validation.data.companyId,
    validation.data.templateId,
  );

  return NextResponse.json(
    {
      success: true,
      created: result.created,
      updated: result.updated,
      total: result.created + result.updated,
    },
    { status: 200 },
  );
});
