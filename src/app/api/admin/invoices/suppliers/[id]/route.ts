import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { supplierService } from "@/services/runtime/supplier";
import { supplierIdParamSchema, updateSupplierSchema } from "@/validations/supplier.validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/invoices/suppliers/[id]
 * Get a single supplier by ID
 */
export const GET = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status } = await requirePermission("invoices", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { id: idParam } = await params;
  const { id } = supplierIdParamSchema.parse({ id: idParam });
  const supplier = await supplierService.getSupplierById(id);

  if (!supplier) {
    throw new NotFoundError("Supplier not found");
  }

  return NextResponse.json(supplier);
});

/**
 * PATCH /api/admin/invoices/suppliers/[id]
 * Update a supplier
 */
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("invoices", "edit");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { id: idParam } = await params;
  const { id } = supplierIdParamSchema.parse({ id: idParam });
  const existingSupplier = await supplierService.getSupplierById(id);

  if (!existingSupplier) {
    throw new NotFoundError("Supplier not found");
  }

  const body = await request.json();
  const validation = updateSupplierSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation failed", validation.error.flatten());
  }

  // Check for duplicate CNPJ if being changed
  if (validation.data.cnpj && validation.data.cnpj !== existingSupplier.cnpj) {
    const isCnpjAvailable = await supplierService.isSupplierCnpjAvailable(validation.data.cnpj, id);
    if (!isCnpjAvailable) {
      throw new ConflictError("A supplier with this CNPJ already exists");
    }
  }

  const supplier = await supplierService.updateSupplier(id, validation.data);

  // Build changes array for fields that changed
  const changes = [];
  if (validation.data.cnpj !== undefined && existingSupplier.cnpj !== supplier.cnpj) {
    changes.push({ field: "cnpj", from: existingSupplier.cnpj, to: supplier.cnpj });
  }
  if (validation.data.name !== undefined && existingSupplier.name !== supplier.name) {
    changes.push({ field: "name", from: existingSupplier.name, to: supplier.name });
  }
  if (validation.data.city !== undefined && existingSupplier.city !== supplier.city) {
    changes.push({ field: "city", from: existingSupplier.city, to: supplier.city });
  }
  if (
    validation.data.taxRegime !== undefined &&
    existingSupplier.taxRegime !== supplier.taxRegime
  ) {
    changes.push({
      field: "taxRegime",
      from: existingSupplier.taxRegime,
      to: supplier.taxRegime,
    });
  }
  // Only log if there are actual changes
  if (changes.length > 0) {
    await activityService.logUpdate(
      session,
      "invoice_suppliers",
      { type: "supplier", id: supplier.id.toString(), name: supplier.name },
      changes,
    );
  }

  return NextResponse.json(supplier);
});

/**
 * DELETE /api/admin/invoices/suppliers/[id]
 * Delete a supplier
 */
export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("invoices", "delete");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { id: idParam } = await params;
  const { id } = supplierIdParamSchema.parse({ id: idParam });
  const existingSupplier = await supplierService.getSupplierById(id);

  if (!existingSupplier) {
    throw new NotFoundError("Supplier not found");
  }

  try {
    await supplierService.deleteSupplier(id);
  } catch (err) {
    // PostgreSQL foreign key violation (23503): supplier is referenced by invoices
    const cause = (err as { cause?: { code?: string } })?.cause;
    if (cause?.code === "23503") {
      throw new ConflictError(
        "This supplier cannot be deleted because it has invoices associated with it.",
      );
    }
    throw err;
  }

  await activityService.logDelete(session, "invoice_suppliers", {
    type: "supplier",
    id: existingSupplier.id.toString(),
    name: existingSupplier.name,
  });

  return NextResponse.json({ success: true });
});
