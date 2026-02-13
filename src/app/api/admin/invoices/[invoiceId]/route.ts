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
import { invoiceService } from "@/services/runtime/invoice";
import { invoiceIdParamSchema, updateInvoiceSchema } from "@/validations/invoice.validations";

interface RouteParams {
  params: Promise<{ invoiceId: string }>;
}

/**
 * GET /api/admin/invoices/[invoiceId]
 * Get a single invoice by ID
 */
export const GET = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status } = await requirePermission("invoices", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { invoiceId } = invoiceIdParamSchema.parse(await params);
  const invoice = await invoiceService.getInvoiceById(invoiceId);

  if (!invoice) {
    throw new NotFoundError("Invoice not found");
  }

  return NextResponse.json(invoice);
});

/**
 * PATCH /api/admin/invoices/[invoiceId]
 * Update an invoice
 */
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("invoices", "edit");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { invoiceId } = invoiceIdParamSchema.parse(await params);
  const existingInvoice = await invoiceService.getInvoiceById(invoiceId);

  if (!existingInvoice) {
    throw new NotFoundError("Invoice not found");
  }

  const body = await request.json();
  const validation = updateInvoiceSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation failed", validation.error.flatten());
  }

  const updateData: Parameters<typeof invoiceService.updateInvoice>[1] = {};

  if (validation.data.supplierCnpj !== undefined)
    updateData.supplierCnpj = validation.data.supplierCnpj;
  if (validation.data.serviceCode !== undefined)
    updateData.serviceCode = validation.data.serviceCode;
  if (validation.data.status !== undefined) updateData.status = validation.data.status;
  if (validation.data.issueDate !== undefined) updateData.issueDate = validation.data.issueDate;
  if (validation.data.dueDate !== undefined) {
    updateData.dueDate = validation.data.dueDate ? new Date(validation.data.dueDate) : undefined;
  }
  if (validation.data.valueCents !== undefined) updateData.valueCents = validation.data.valueCents;
  if (validation.data.invoiceNumber !== undefined)
    updateData.invoiceNumber = validation.data.invoiceNumber;
  if (validation.data.materialDeductionCents !== undefined)
    updateData.materialDeductionCents = validation.data.materialDeductionCents;
  // Check for duplicate invoice number if being changed
  if (
    validation.data.invoiceNumber &&
    validation.data.invoiceNumber !== existingInvoice.invoiceNumber
  ) {
    const isNumberAvailable = await invoiceService.isNumberAvailable(
      validation.data.invoiceNumber,
      invoiceId,
    );
    if (!isNumberAvailable) {
      throw new ConflictError("An invoice with this number already exists");
    }
  }

  const invoice = await invoiceService.updateInvoice(invoiceId, updateData);

  // Build changes array for fields that changed
  const changes = [];
  if (
    validation.data.invoiceNumber !== undefined &&
    existingInvoice.invoiceNumber !== invoice.invoiceNumber
  ) {
    changes.push({
      field: "invoiceNumber",
      from: existingInvoice.invoiceNumber,
      to: invoice.invoiceNumber,
    });
  }
  if (validation.data.status !== undefined && existingInvoice.status !== invoice.status) {
    changes.push({ field: "status", from: existingInvoice.status, to: invoice.status });
  }
  if (
    validation.data.valueCents !== undefined &&
    existingInvoice.valueCents !== invoice.valueCents
  ) {
    changes.push({ field: "valueCents", from: existingInvoice.valueCents, to: invoice.valueCents });
  }
  if (
    validation.data.supplierCnpj !== undefined &&
    existingInvoice.supplierCnpj !== invoice.supplierCnpj
  ) {
    changes.push({
      field: "supplierCnpj",
      from: existingInvoice.supplierCnpj,
      to: invoice.supplierCnpj,
    });
  }
  if (
    validation.data.serviceCode !== undefined &&
    existingInvoice.serviceCode !== invoice.serviceCode
  ) {
    changes.push({
      field: "serviceCode",
      from: existingInvoice.serviceCode,
      to: invoice.serviceCode,
    });
  }
  if (validation.data.issueDate !== undefined && existingInvoice.issueDate !== invoice.issueDate) {
    changes.push({ field: "issueDate", from: existingInvoice.issueDate, to: invoice.issueDate });
  }
  if (validation.data.dueDate !== undefined && existingInvoice.dueDate !== invoice.dueDate) {
    changes.push({ field: "dueDate", from: existingInvoice.dueDate, to: invoice.dueDate });
  }
  if (
    validation.data.materialDeductionCents !== undefined &&
    existingInvoice.materialDeductionCents !== invoice.materialDeductionCents
  ) {
    changes.push({
      field: "materialDeductionCents",
      from: existingInvoice.materialDeductionCents,
      to: invoice.materialDeductionCents,
    });
  }

  // Only log if there are actual changes
  if (changes.length > 0) {
    await activityService.logUpdate(
      session,
      "invoices",
      { type: "invoice", id: invoice.id, number: invoice.invoiceNumber },
      changes,
    );
  }

  return NextResponse.json(invoice);
});

/**
 * DELETE /api/admin/invoices/[invoiceId]
 * Delete an invoice
 */
export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("invoices", "delete");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { invoiceId } = invoiceIdParamSchema.parse(await params);
  const existingInvoice = await invoiceService.getInvoiceById(invoiceId);

  if (!existingInvoice) {
    throw new NotFoundError("Invoice not found");
  }

  await invoiceService.deleteInvoice(invoiceId);

  await activityService.logDelete(session, "invoices", {
    type: "invoice",
    id: existingInvoice.id,
    number: existingInvoice.invoiceNumber,
  });

  return NextResponse.json({ success: true });
});
