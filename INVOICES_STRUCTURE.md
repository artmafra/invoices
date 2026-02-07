# Estrutura de Arquivos para Invoices

Com base no padrão observado em `games/`, `tasks/` e `notes/`, aqui está a estrutura recomendada para o módulo `invoices/`:

## Estrutura de Diretórios

```
src/components/admin/invoices/
├── index.ts                          # Exportações públicas
├── invoice-card.tsx                  # Cartão individual de invoice
├── invoice-list-view.tsx             # Lista de invoices (com filtros, paginação, etc.)
├── invoice-form-dialog.tsx           # Dialog para criar/editar invoice
├── invoice-delete-dialog.tsx         # Dialog de confirmação para deletar
├── invoice-view-dialog.tsx           # Dialog para visualizar detalhes completos
├── invoice-details-sheet.tsx         # Sheet drawer com detalhes expandidos (mobile)
├── lazy-invoices-dialogs.tsx         # Lazy loading dos dialogs
├── invoices-filters.tsx              # Componente de filtros (status, data, valor, etc.)
├── invoice-pdf-preview.tsx           # Preview em PDF
└── invoice-status-badge.tsx          # Badge customizado para status
```

## Padrão de Arquivos (por função)

### 1. **index.ts** - Exportações públicas

```typescript
// Exporta todos os componentes e tipos
export { InvoiceCard } from "./invoice-card";
export type { InvoiceCardProps } from "./invoice-card";

export { InvoiceListView } from "./invoice-list-view";
export type { InvoiceListViewProps } from "./invoice-list-view";

export { InvoiceFormDialog } from "./invoice-form-dialog";
export type { InvoiceFormDialogProps } from "./invoice-form-dialog";

export { InvoiceDeleteDialog } from "./invoice-delete-dialog";
export type { InvoiceDeleteDialogProps } from "./invoice-delete-dialog";

export { InvoiceViewDialog } from "./invoice-view-dialog";
export type { InvoiceViewDialogProps } from "./invoice-view-dialog";

export { LazyInvoicesDialogs } from "./lazy-invoices-dialogs";
export { InvoicesFilters } from "./invoices-filters";
```

### 2. **invoice-card.tsx** - Cartão individual

Mostra um resumo de uma invoice em um card clicável com ações.

- Status visual (badge)
- Número da invoice
- Cliente
- Valor total
- Data de emissão/vencimento
- Menu de ações (editar, deletar, visualizar PDF, etc.)

### 3. **invoice-list-view.tsx** - Lista com filtros e paginação

Componente principal que exibe a tabela/grid de invoices.

- Integração com `useInvoices` hook (React Query)
- Filtros por status, período, valor, cliente
- Paginação/virtualization
- Estados: loading, error, empty, success
- Integração com `SearchFilterBar`

### 4. **invoice-form-dialog.tsx** - Criar/Editar invoice

Dialog modal para criar ou editar uma invoice.

- Usa `useForm` com `react-hook-form` + Zod
- Campos: cliente, itens, notas, descontos, impostos
- Salva via mutation hook
- Loading e error states

### 5. **invoice-delete-dialog.tsx** - Confirmação de exclusão

Dialog simples de confirmação com ações de deletar/cancelar.

- Mostra número e cliente da invoice
- Botão de deletar com loading state
- Integração com `useMutationDeleteInvoice`

### 6. **invoice-view-dialog.tsx** - Visualizar completo

Dialog para ver todos os detalhes de uma invoice.

- Renderiza invoice-details-sheet internamente (em mobile)
- Botões de ação: editar, deletar, enviar, gerar PDF
- Informações do cliente, itens, pagamento

### 7. **invoice-details-sheet.tsx** - Drawer (mobile)

Sheet/drawer com detalhes da invoice.

- Versão responsiva do view-dialog
- Otimizado para telas pequenas
- Mesmo conteúdo expandido

### 8. **lazy-invoices-dialogs.tsx** - Code splitting

Carregamento lazy dos dialogs para melhor performance.

```typescript
const LazyInvoiceFormDialog = dynamic(() =>
  import("./invoice-form-dialog").then(m => ({ default: m.InvoiceFormDialog })),
  { loading: () => <Skeleton /> }
);
```

### 9. **invoices-filters.tsx** - Componente de filtros

Filtros reutilizáveis independentes.

- Status (draft, sent, paid, overdue, cancelled)
- Período (data início/fim)
- Valor (mín/máx)
- Cliente (busca/select)

### 10. **invoice-pdf-preview.tsx** - Preview/download PDF

Renderiza ou faz preview da invoice em PDF.

- Usa biblioteca como `@react-pdf/renderer` ou similar
- Botão de download

### 11. **invoice-status-badge.tsx** - Badge de status

Badge semântico com cores e ícones.

```typescript
const STATUS_CONFIG = {
  draft: { variant: "default", icon: FileText },
  sent: { variant: "info", icon: Send },
  paid: { variant: "success", icon: CheckCircle },
  overdue: { variant: "destructive", icon: AlertCircle },
  cancelled: { variant: "secondary", icon: X },
};
```

## Estrutura de Dados Esperada

### Hooks (em `src/hooks/admin/`)

```typescript
// use-invoices.ts
export function useInvoices(options: QueryOptions) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.list(options.page),
    queryFn: () => fetchInvoices(options),
  });
}

export function useInvoiceDetail(id: string) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.detail(id),
    queryFn: () => fetchInvoice(id),
  });
}

export function useCreateInvoice() {
  return useMutation({
    mutationFn: (data) => createInvoice(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all }),
  });
}

export function useUpdateInvoice() {
  return useMutation({
    mutationFn: ({ id, data }) => updateInvoice(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all }),
  });
}

export function useDeleteInvoice() {
  return useMutation({
    mutationFn: (id) => deleteInvoice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all }),
  });
}
```

### Query Keys (em `src/hooks/admin/use-invoices.ts`)

```typescript
export const INVOICE_QUERY_KEYS = {
  all: ["admin", "invoices"] as const,
  lists: () => [...INVOICE_QUERY_KEYS.all, "list"] as const,
  list: (page: number) => [...INVOICE_QUERY_KEYS.lists(), page] as const,
  detail: (id: string) => [...INVOICE_QUERY_KEYS.all, "detail", id] as const,
} as const;
```

### Schemas (em `src/schema/`)

```typescript
// invoices.schema.ts - Drizzle schema
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  clientId: uuid("client_id").references(() => clients.id),
  status: text("status", { enum: ["draft", "sent", "paid", "overdue", "cancelled"] }),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }),
  issueDate: timestamp("issue_date"),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdById: uuid("created_by_id").references(() => users.id),
});
```

### Validações (em `src/validations/`)

```typescript
// invoice.validations.ts - Zod schemas
export const createInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  items: z.array(invoiceItemSchema).min(1),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  dueDate: z.date(),
  notes: z.string().optional(),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
});
```

### Storage Layer (em `src/storage/`)

```typescript
// invoices.storage.ts
export class InvoicesStorage extends BaseStorage<Invoice> {
  async findAll(options?: QueryOptions) {
    // Retorna invoices brutos do banco
  }

  async findById(id: string) {
    // Retorna uma invoice específica
  }

  async create(data: CreateInvoiceInput) {
    // Cria e retorna
  }

  async update(id: string, data: UpdateInvoiceInput) {
    // Atualiza
  }

  async delete(id: string) {
    // Deleta
  }
}
```

### Service Layer (em `src/services/`)

```typescript
// invoice.service.ts
export class InvoiceService {
  constructor(private storage = invoicesStorage) {}

  async getInvoices(options?: QueryOptions) {
    // Lógica de negócio, filtros, etc.
    // Retorna DTOs
  }

  async getInvoiceDetail(id: string) {
    // Carrega cliente, itens, pagamentos relacionados
    // Retorna DTO completo
  }

  async createInvoice(input: CreateInvoiceInput, userId: string) {
    // Validações, lógica de geração de número
    // Log de atividade
  }

  async updateInvoice(id: string, input: UpdateInvoiceInput) {
    // Validações, log de atividade
  }

  async deleteInvoice(id: string) {
    // Validações, log de atividade
  }

  async sendInvoice(id: string) {
    // Envia para cliente via email
    // Log de atividade
  }

  async generatePDF(id: string) {
    // Gera PDF da invoice
  }
}
```

### API Routes (em `src/app/api/admin/invoices/`)

```typescript
// route.ts
export async function GET(request: Request) {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");

    const invoices = await invoiceService.getInvoices({ page });
    return Response.json(invoices);
  });
}

export async function POST(request: Request) {
  return withErrorHandler(async () => {
    await requirePermission("create_invoices");

    const body = await request.json();
    const input = createInvoiceSchema.parse(body);

    const invoice = await invoiceService.createInvoice(input, session.user.id);
    await activityService.logCreate("invoice", invoice.id);

    return Response.json(invoice, { status: 201 });
  });
}

// [id]/route.ts
export async function PATCH(request: Request, { params }) {
  return withErrorHandler(async () => {
    await requirePermission("update_invoices");

    const body = await request.json();
    const input = updateInvoiceSchema.parse(body);

    const invoice = await invoiceService.updateInvoice(params.id, input);
    await activityService.logUpdate("invoice", params.id);

    return Response.json(invoice);
  });
}

export async function DELETE(request: Request, { params }) {
  return withErrorHandler(async () => {
    await requirePermission("delete_invoices");

    await invoiceService.deleteInvoice(params.id);
    await activityService.logDelete("invoice", params.id);

    return Response.json({ success: true });
  });
}
```

## Padrão de Uso nos Componentes

### Em um Page/Layout

```typescript
import { InvoiceListView, LazyInvoicesDialogs } from "@/components/admin/invoices";
import { useInvoices } from "@/hooks/admin/use-invoices";

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInvoices({ page });

  return (
    <>
      <InvoiceListView data={data} isLoading={isLoading} onPageChange={setPage} />
      <LazyInvoicesDialogs />
    </>
  );
}
```

### Em um Dialog

```typescript
"use client";

export function InvoiceFormDialog({ open, onOpenChange, invoiceId }) {
  const { data: invoice } = useInvoiceDetail(invoiceId || "");
  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <InvoiceForm
          defaultValues={invoice}
          onSubmit={(data) =>
            invoiceId
              ? updateMutation.mutate({ id: invoiceId, data })
              : createMutation.mutate(data)
          }
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
```

## Checklist de Implementação

- [ ] Criar schemas em `src/schema/invoices.schema.ts`
- [ ] Criar validações em `src/validations/invoice.validations.ts`
- [ ] Criar storage layer em `src/storage/invoices.storage.ts`
- [ ] Criar service layer em `src/services/invoice.service.ts`
- [ ] Criar hooks em `src/hooks/admin/use-invoices.ts`
- [ ] Criar API routes em `src/app/api/admin/invoices/`
- [ ] Criar DTOs em `src/dtos/invoice.dto.ts`
- [ ] Criar componentes UI em `src/components/admin/invoices/`
- [ ] Adicionar routes no painel admin
- [ ] Adicionar permissões (RBAC)
- [ ] Adicionar i18n strings
- [ ] Adicionar testes
- [ ] Registrar ações no command palette (se aplicável)
