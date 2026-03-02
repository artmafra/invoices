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
import { supplierCnpjParamSchema, updateSupplierSchema } from "@/validations/supplier.validations";

interface RouteParams {
  params: Promise<{ supplierId: string }>;
}

/**
 * GET /api/admin/invoices/suppliers/[supplierId]
 * Get a single supplier by CNPJ
 */
export const GET = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status } = await requirePermission("invoices", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { supplierId } = await params;
  const { cnpj } = supplierCnpjParamSchema.parse({ cnpj: supplierId });
  const supplier = await supplierService.getSupplierByCnpj(cnpj);

  if (!supplier) {
    throw new NotFoundError("Supplier not found");
  }

  return NextResponse.json(supplier);
});

/**
 * PATCH /api/admin/invoices/suppliers/[supplierId]
 * Update a supplier
 */
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("suppliers", "edit");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { supplierId } = await params;
  const { cnpj } = supplierCnpjParamSchema.parse({ cnpj: supplierId });
  const existingSupplier = await supplierService.getSupplierByCnpj(cnpj);

  if (!existingSupplier) {
    throw new NotFoundError("Supplier not found");
  }

  const body = await request.json();
  const validation = updateSupplierSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation failed", validation.error.flatten());
  }

  const updateData: Parameters<typeof supplierService.updateSupplier>[1] = {};

  if (validation.data.name !== undefined) updateData.name = validation.data.name;
  if (validation.data.city !== undefined) updateData.city = validation.data.city;
  if (validation.data.taxRegime !== undefined) updateData.taxRegime = validation.data.taxRegime;
  if (validation.data.obs !== undefined) updateData.obs = validation.data.obs;

  // Check for duplicate supplier name if being changed
  if (validation.data.name && validation.data.name !== existingSupplier.name) {
    const allSuppliers = await supplierService.getAllSuppliers();
    const isDuplicate = allSuppliers.some(
      (s) => s.name.toLowerCase() === validation.data.name!.toLowerCase() && s.cnpj !== cnpj,
    );
    if (isDuplicate) {
      throw new ConflictError("A supplier with this name already exists");
    }
  }

  const supplier = await supplierService.updateSupplier(cnpj, updateData);

  // Build changes array for fields that changed
  const changes = [];
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
  if (validation.data.obs !== undefined && existingSupplier.obs !== supplier.obs) {
    changes.push({ field: "obs", from: existingSupplier.obs, to: supplier.obs });
  }

  // Only log if there are actual changes
  if (changes.length > 0) {
    await activityService.logUpdate(
      session,
      "invoices",
      { type: "supplier", id: supplier.cnpj, name: supplier.name },
      changes,
    );
  }

  return NextResponse.json(supplier);
});

/**
 * DELETE /api/admin/invoices/suppliers/[supplierId]
 * Delete a supplier
 */
export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("invoices", "delete");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { supplierId } = await params;
  const { cnpj } = supplierCnpjParamSchema.parse({ cnpj: supplierId });
  const existingSupplier = await supplierService.getSupplierByCnpj(cnpj);

  if (!existingSupplier) {
    throw new NotFoundError("Supplier not found");
  }

  await supplierService.deleteSupplier(cnpj);

  await activityService.logDelete(session, "invoices", {
    type: "supplier",
    id: existingSupplier.cnpj,
    name: existingSupplier.name,
  });

  return NextResponse.json({ success: true });
});
