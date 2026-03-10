import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { serviceService } from "@/services/runtime/service";
import { serviceCodeParamSchema, updateServiceSchema } from "@/validations/service.validations";

interface RouteParams {
  params: Promise<{ code: string }>;
}

/**
 * GET /api/admin/services/[code]
 * Get a single service by code
 */
export const GET = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status } = await requirePermission("invoices", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { code: codeParam } = await params;
  const { code } = serviceCodeParamSchema.parse({ code: codeParam });
  const service = await serviceService.getServiceByCode(code);

  if (!service) {
    throw new NotFoundError("Service not found");
  }

  return NextResponse.json(service);
});

/**
 * PATCH /api/admin/services/[code]
 * Update a service
 */
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("invoices", "edit");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { code: codeParam } = await params;
  const { code } = serviceCodeParamSchema.parse({ code: codeParam });
  const existingService = await serviceService.getServiceByCode(code);

  if (!existingService) {
    throw new NotFoundError("Service not found");
  }

  const body = await request.json();
  const validation = updateServiceSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation failed", validation.error.flatten());
  }

  const service = await serviceService.updateService(code, validation.data);

  // Build changes array for fields that changed
  const changes = [];
  if (
    validation.data.description !== undefined &&
    existingService.description !== service.description
  ) {
    changes.push({
      field: "description",
      from: existingService.description,
      to: service.description,
    });
  }
  if (validation.data.debit !== undefined && existingService.debit !== service.debit) {
    changes.push({ field: "debit", from: existingService.debit, to: service.debit });
  }
  if (validation.data.sn !== undefined) {
    changes.push({ field: "sn", from: existingService.sn, to: service.sn });
  }
  if (validation.data.n !== undefined) {
    changes.push({ field: "n", from: existingService.n, to: service.n });
  }
  if (validation.data.mei !== undefined) {
    changes.push({ field: "mei", from: existingService.mei, to: service.mei });
  }
  if (validation.data.obs !== undefined && existingService.obs !== service.obs) {
    changes.push({ field: "obs", from: existingService.obs, to: service.obs });
  }

  // Only log if there are actual changes
  if (changes.length > 0) {
    await activityService.logUpdate(
      session,
      "invoices",
      { type: "service", id: service.code, name: service.description },
      changes,
    );
  }

  return NextResponse.json(service);
});

/**
 * DELETE /api/admin/services/[code]
 * Delete a service
 */
export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("invoices", "delete");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { code: codeParam } = await params;
  const { code } = serviceCodeParamSchema.parse({ code: codeParam });
  const existingService = await serviceService.getServiceByCode(code);

  if (!existingService) {
    throw new NotFoundError("Service not found");
  }

  await serviceService.deleteService(code);

  await activityService.logDelete(session, "invoices", {
    type: "service",
    id: existingService.code,
    name: existingService.description,
  });

  return NextResponse.json({ success: true }, { status: 200 });
});
