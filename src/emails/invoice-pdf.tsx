import { InvoicePdfDTO } from "@/dtos/invoice-pdf.dto";
import { ServicePdfDTO } from "@/dtos/service-pdf.dto";
import { SupplierPdfDTO } from "@/dtos/supplier-pdf.dto";

interface InvoicePdfTemplateProps {
  invoice: InvoicePdfDTO;
  supplier: SupplierPdfDTO;
  service: ServicePdfDTO;
}

export const InvoicePdfTemplate = ({ invoice, supplier, service }: InvoicePdfTemplateProps) => (
  <html>
    <head>
      <title>Invoice {invoice.invoiceNumber}</title>
    </head>
    <body style={{ fontFamily: "Arial, sans-serif" }}>
      <div style={{ padding: "20px" }}>
        {/* Header */}
        <h1>{supplier.name}</h1>
        <p>{supplier.cnpj}</p>
        <p>{service.code}</p>

        {/* Invoice Info */}
        <h2>Invoice #{invoice.invoiceNumber}</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tr>
            <td>Issue Date:</td>
            <td>{new Date(invoice.issueDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td>Due Date:</td>
            <td>{new Date(invoice.dueDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td>Amount:</td>
            <td>R$ {(invoice.valueCents / 100).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Tax:</td>
            <td>R$ {(invoice.materialDeductionCents / 100).toFixed(2)}</td>
          </tr>
          <tr style={{ fontWeight: "bold", borderTop: "2px solid #000" }}>
            <td>Net Amount:</td>
            <td>R$ {(invoice.netAmountCents / 100).toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </body>
  </html>
);
