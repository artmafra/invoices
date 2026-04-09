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
import { companyService } from "@/services/runtime/company";
import { companyIdParamSchema, updateCompanySchema } from "@/validations/company.validations";

interface RouteParams {
  params: Promise<{ companyId: string }>;
}

export const GET = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, status, error } = await requirePermission("invoices", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { companyId: companyIdParam } = await params;
  const { companyId } = companyIdParamSchema.parse({ companyId: companyIdParam });
  const company = await companyService.getCompanyById(companyId);

  if (!company) {
    throw new NotFoundError("Company not found");
  }

  return NextResponse.json(company);
});

export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, status, error, session } = await requirePermission("invoices", "edit");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { companyId: companyIdParam } = await params;
  const { companyId } = companyIdParamSchema.parse({ companyId: companyIdParam });
  const existingCompany = await companyService.getCompanyById(companyId);

  if (!existingCompany) {
    throw new NotFoundError("Company not found");
  }

  const body = await request.json();
  const validation = updateCompanySchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation failed", validation.error.flatten());
  }

  if (validation.data.cnpj && validation.data.cnpj !== existingCompany.cnpj) {
    const isCnpjAvailable = await companyService.isCompanyCnpjAvailable(validation.data.cnpj);
    if (!isCnpjAvailable) {
      throw new ConflictError("A company with this CNPJ already exists");
    }
  }

  const company = await companyService.updateCompany(companyId, validation.data);

  const changes = [
    { field: "cnpj", from: existingCompany.cnpj, to: company.cnpj },
    { field: "name", from: existingCompany.name, to: company.name },
    { field: "city", from: existingCompany.city, to: company.city },
  ];

  await activityService.logUpdate(
    session,
    "companies",
    {
      type: "company",
      id: company.id,
      name: company.name,
    },
    changes,
  );

  return NextResponse.json(company);
});

export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, status, error, session } = await requirePermission("invoices", "delete");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { companyId: companyIdParam } = await params;
  const { companyId } = companyIdParamSchema.parse({ companyId: companyIdParam });
  const company = await companyService.getCompanyById(companyId);

  if (!company) {
    throw new NotFoundError("Company not found");
  }

  await companyService.deleteCompany(companyId);

  await activityService.logDelete(session, "companies", {
    type: "company",
    id: company.id,
    name: company.name,
  });

  return NextResponse.json({ success: true });
});
