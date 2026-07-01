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
import { supplierService } from "@/services/runtime/supplier";
import { createSupplierSchema, getSuppliersQuerySchema } from "@/validations/supplier.validations";

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Allow access if the user can manage suppliers OR work with invoices.
  // This lets the invoice form autocomplete work even when the standalone
  // Fornecedores page is hidden (i.e. suppliers.view permission removed).
  const { authorized, error, status } = await requireAnyPermission([
    { resource: "suppliers", action: "view" },
    { resource: "invoices", action: "view" },
    { resource: "invoices", action: "create" },
    { resource: "invoices", action: "edit" },
  ]);

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const queryResult = getSuppliersQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!queryResult.success) {
    throw fromZodError(queryResult.error);
  }

  const query = queryResult.data;

  const filters = {
    search: query.search,
    city: query.city,
    taxRegime: query.taxRegime,
    name: query.name,
    cnpj: query.cnpj,
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
      const version = await supplierService.getCollectionVersion(filters);
      return `${version.maxUpdatedAt?.toISOString() ?? "empty"}:${version.count}:${queryParamsSeed}`;
    },
    async () => {
      return supplierService.getPaginated(filters, options);
    },
  );
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status, session } = await requirePermission("suppliers", "create");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const body = await request.json();
  const validation = createSupplierSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation Failed", validation.error.flatten());
  }

  // Check for duplicate supplier CNPJ
  const isCnpjAvailable = await supplierService.isSupplierCnpjAvailable(
    validation.data.cnpj,
    validation.data.companyId,
  );
  if (!isCnpjAvailable) {
    throw new ConflictError("A supplier with this CNPJ already exists");
  }

  const supplier = await supplierService.createSupplier({
    companyId: validation.data.companyId,
    taxRegime: validation.data.taxRegime,
    cnpj: validation.data.cnpj,
    name: validation.data.name,
    city: validation.data.city,
  });

  await activityService.logCreate(
    session,
    "invoice_suppliers",
    { type: "supplier", id: supplier.id.toString(), name: supplier.cnpj },
    {
      metadata: {
        name: supplier.name,
        cnpj: supplier.cnpj,
        city: supplier.city,
        taxRegime: supplier.taxRegime,
      },
    },
  );

  return NextResponse.json(supplier, { status: 201 });
});
