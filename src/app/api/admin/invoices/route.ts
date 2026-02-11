import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, fromZodError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { buildQueryParamsSeed, handleConditionalRequest } from "@/lib/http/etag";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { invoiceService } from "@/services/runtime/invoice";
import { createInvoiceSchema, getInvoicesQuerySchema } from "@/validations/invoice.validations";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status } = await requirePermission("invoice", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const queryResult = getInvoicesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!queryResult.success) {
    throw fromZodError(queryResult.error);
  }

  const query = queryResult.data;

  const filters = {
    search: query.search,
    status: query.status,
    supplierCnpj: query.supplierCnpj,
    serviceCode: query.serviceCode,
    dueDateFrom: query.dueDateFrom,
    dueDateTo: query.dueDateTo,
    issueDateFrom: query.issueDateFrom,
    issueDateTo: query.issueDateTo,
  };

  const options = {
    page: query.page,
    limit: query.limit,
  };

  const queryParamsSeed = buildQueryParamsSeed({ ...filters, ...options });

  return handleConditionalRequest(
    request,
    async () => {
      const version = await invoiceService.getCollectionVersion(filters);
      return `${version.maxUpdatedAt?.toISOString() ?? "empty"}:${version.count}:${queryParamsSeed}`;
    },
    async () => {},
  );
});
