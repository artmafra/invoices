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
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { companyService } from "@/services/runtime/company";
import { createCompanySchema, getCompaniesQuerySchema } from "@/validations/company.validations";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status } = await requirePermission("companies", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const queryResult = getCompaniesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!queryResult.success) {
    throw fromZodError(queryResult.error);
  }

  const query = queryResult.data;

  const filters = {
    search: query.search,
    city: query.city,
    cnpj: query.cnpj,
    name: query.name,
  };

  const options = {
    page: query.page,
    limit: query.limit,
  };

  const queryParamsSeed = buildQueryParamsSeed({ ...filters, ...options });

  return handleConditionalRequest(
    request,
    async () => {
      const version = await companyService.getCollectionVersion(filters);
      return `${version.maxUpdatedAt?.toISOString() ?? "empty"}:${version.count}:${queryParamsSeed}`;
    },
    async () => {
      return companyService.getPaginated(filters, options);
    },
  );
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { session, authorized, status, error } = await requirePermission("companies", "create");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const body = await request.json();
  const validation = createCompanySchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation Failed", validation.error.flatten());
  }

  const isCnpjAvailable = await companyService.isCompanyCnpjAvailable(validation.data.cnpj);
  if (!isCnpjAvailable) {
    throw new ConflictError("A company with this cnpj already exists");
  }

  const company = await companyService.createCompany({
    cnpj: validation.data.cnpj,
    name: validation.data.name,
    city: validation.data.city,
  });

  await activityService.logCreate(
    session,
    "companies",
    { type: "companies", id: company.id, name: company.name },
    {
      metadata: {
        cnpj: company.cnpj,
        name: company.name,
        city: company.city,
      },
    },
  );

  return NextResponse.json(company, { status: 201 });
});
