import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import {
  ConflictError,
  ForbiddenError,
  fromZodError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { buildQueryParamsSeed, handleConditionalRequest } from "@/lib/http/etag";
import { requireAnyPermission, requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { serviceService } from "@/services/runtime/service";
import {
  createServiceRequestSchema,
  getServicesQuerySchema,
} from "@/validations/service.validations";

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Allow access if the user can manage services OR work with invoices.
  // This lets the invoice form autocomplete work even when the standalone
  // Serviços page is hidden (i.e. services.view permission removed).
  const { authorized, error, status } = await requireAnyPermission([
    { resource: "services", action: "view" },
    { resource: "invoices", action: "view" },
    { resource: "invoices", action: "create" },
    { resource: "invoices", action: "edit" },
  ]);

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

  const query = queryResult.data;

  const filters = {
    search: query.search,
    companyId: query.companyId,
  };

  const options = {
    page: query.page,
    limit: query.limit,
  };

  const queryParamsSeed = buildQueryParamsSeed({ ...filters, ...options });

  return handleConditionalRequest(
    request,
    async () => {
      const version = await serviceService.getCollectionVersion(filters);
      return `${version.maxUpdatedAt?.toISOString() ?? "empty"}:${version.count}:${queryParamsSeed}`;
    },
    async () => {
      return serviceService.getServicesPaginated(filters, options.page ?? 1, options.limit ?? 20);
    },
  );
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status, session } = await requirePermission("services", "create");

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
  const isCodeAvailable = await serviceService.isServiceCodeAvailable(
    validation.data.code,
    validation.data.companyId,
  );
  if (!isCodeAvailable) {
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
