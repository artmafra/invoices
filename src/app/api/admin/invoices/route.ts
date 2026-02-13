import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
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
    async () => {
      return invoiceService.getPaginated(filters, options);
    },
  );
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status, session } = await requirePermission("invoices", "create");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const body = await request.json();
  const validation = createInvoiceSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation Failed", validation.error.flatten());
  }

  // Check for duplicate number
  const isNumberAvailable = await invoiceService.isNumberAvailable(validation.data.invoiceNumber);
  if (!isNumberAvailable) {
    throw new ConflictError("A invoice with this number already exists");
  }

  const invoice = await invoiceService.createInvoice({
    supplierCnpj: validation.data.supplierCnpj,
    serviceCode: validation.data.serviceCode,
    issueDate: validation.data.issueDate,
    dueDate: validation.data.dueDate,
    valueCents: validation.data.valueCents,
    invoiceNumber: validation.data.invoiceNumber,
    status: validation.data.status,
    materialDeductionCents: validation.data.materialDeductionCents,
    entryDate: validation.data.entryDate
      ? validation.data.entryDate
      : new Date(validation.data.entryDate),
    inssPercent: validation.data.inssPercent,
    csPercent: validation.data.csPercent,
    issqnPercent: validation.data.issqnPercent,
  });

  await activityService.logCreate(
    session,
    "invoices",
    { type: "invoice", id: invoice.id, number: invoice.invoiceNumber },
    {
      metadata: {
        supplierCnpj: invoice.supplierCnpj,
        serviceCode: invoice.serviceCode,

        status: invoice.status,

        valueCents: invoice.valueCents,
        netAmountCents: invoice.netAmountCents,
        materialDeductionCents: invoice.materialDeductionCents,

        dates: {
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          entryDate: invoice.entryDate,
        },

        taxes: {
          inssPercent: validation.data.inssPercent ?? null,
          csPercent: validation.data.csPercent ?? null,
          issqnPercent: validation.data.issqnPercent ?? null,
        },
      },
    },
  );

  return NextResponse.json(invoice, { status: 201 });
});
