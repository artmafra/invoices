import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import {
  ConflictError,
  ForbiddenError,
  fromZodError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { serviceService } from "@/services/runtime/service";
import {
  createServiceRequestSchema,
  getServicesQuerySchema,
} from "@/validations/service.validations";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status } = await requirePermission("invoices", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const queryResult = getServicesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!queryResult.success) {
    throw fromZodError(queryResult.error);
  }

  const services = await serviceService.getServicesPaginated(
    { search: queryResult.data.search },
    queryResult.data.page ?? 1,
    queryResult.data.limit ?? 20,
  );

  return NextResponse.json(services);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status, session } = await requirePermission("invoices", "create");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const body = await request.json();
  const validation = createServiceRequestSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation Failed", validation.error.flatten());
  }

  // Check for duplicate service code
  const existingService = await serviceService.getServiceByCode(validation.data.code);
  if (existingService) {
    throw new ConflictError("A service with this code already exists");
  }

  const service = await serviceService.createService(validation.data);

  await activityService.logCreate(
    session,
    "invoice_services",
    { type: "service", id: service.id, name: service.code },
    {
      metadata: {
        description: service.description,
        obs: service.obs,
      },
    },
  );

  return NextResponse.json(service, { status: 201 });
});
