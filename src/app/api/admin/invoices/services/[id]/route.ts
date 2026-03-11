import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { serviceService } from "@/services/runtime/service";
import { serviceIdParamSchema, updateServiceSchema } from "@/validations/service.validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/services/[id]
 * Get a single service by id
 */
export const GET = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status } = await requirePermission("invoices", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { id: idParam } = await params;
  const { id } = serviceIdParamSchema.parse({ id: idParam });
  const service = await serviceService.getServiceById(id);

  if (!service) {
    throw new NotFoundError("Service not found");
  }

  return NextResponse.json(service);
});

/**
 * PATCH /api/admin/services/[id]
 * Update a service
 */
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("invoices", "edit");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { id: idParam } = await params;
  const { id } = serviceIdParamSchema.parse({ id: idParam });
  const existingService = await serviceService.getServiceById(id);

  if (!existingService) {
    throw new NotFoundError("Service not found");
  }

  const body = await request.json();
  const validation = updateServiceSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation failed", validation.error.flatten());
  }

  // Check if code is being changed and if the new code already exists
  if (validation.data.code && validation.data.code !== existingService.code) {
    const serviceWithCode = await serviceService.getServiceByCode(validation.data.code);
    if (serviceWithCode && serviceWithCode.id !== id) {
      throw new ValidationError("Code already exists", {
        fieldErrors: { code: ["A service with this code already exists"] },
      });
    }
  }

  const service = await serviceService.updateService(id, validation.data);

  // Build changes array for fields that changed
  const changes = [];
  if (validation.data.code !== undefined && existingService.code !== service.code) {
    changes.push({
      field: "code",
      from: existingService.code,
      to: service.code,
    });
  }
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
      { type: "service", id: service.id, name: service.description },
      changes,
    );
  }

  return NextResponse.json(service);
});

/**
 * DELETE /api/admin/services/[id]
 * Delete a service
 */
export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("invoices", "delete");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { id: idParam } = await params;
  const { id } = serviceIdParamSchema.parse({ id: idParam });
  const existingService = await serviceService.getServiceById(id);

  if (!existingService) {
    throw new NotFoundError("Service not found");
  }

  await serviceService.deleteService(id);

  await activityService.logDelete(session, "invoices", {
    type: "service",
    id: existingService.id,
    name: existingService.description,
  });

  return NextResponse.json({ success: true }, { status: 200 });
});
