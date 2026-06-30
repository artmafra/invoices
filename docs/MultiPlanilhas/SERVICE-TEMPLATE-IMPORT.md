# Service Template Import - Passo a Passo

Implementação da funcionalidade de importação de serviços a partir de templates CSV pré-definidos.

## Visão Geral

Adicionar um botão "Exportar Serviço" na página de serviços que abre um modal com 3 templates de serviços. Ao selecionar um template, todos os serviços são importados/atualizados automaticamente para a empresa atualmente selecionada.

### Requisitos

- 3 arquivos CSV com os mesmos serviços mas taxas diferentes
- Modal com seleção de templates
- Importação automática ao selecionar template
- Upsert: atualiza serviços existentes (por código) ou cria novos
- Escopo: empresa selecionada
- Permissão: `services:create`

---

## Passo 1: Criar Templates CSV

**Objetivo:** Criar 3 arquivos CSV estáticos em `public/templates/`

### 1.1 Criar pasta de templates

```bash
mkdir -p public/templates
```

### 1.2 Criar arquivos CSV

Criar os seguintes arquivos baseados em `scripts/db/services.csv`:

- `public/templates/services-template-1.csv`
- `public/templates/services-template-2.csv`
- `public/templates/services-template-3.csv`

**Estrutura esperada:**

```csv
,CADASTRO DE SERVIÇOS,,,,,,,,,,,,,,,,,
,,,,,,,,,,,,,,,,,,
,,,SN,,,,N,,,,MEI,,,,,,,
,CÓDIGO DO SERVIÇO,DESCRIÇÃO DO SERVIÇO,ISSQN,INSS,CS,IRRF,ISSQN,INSS,CS,IRRF,ISSQN,INSS,CS,IRRF,,,,
,101M,Análise e desenvolvimento de sistemas.,"1,00%",NT,NT,NT,"5,00%",NT,"4,65%","1,50%",NT,NT,NT,NT,,,,
```

**Nota:** Cada template deve ter os mesmos códigos e descrições, mas taxas diferentes nas colunas SN, N e MEI.

---

## Passo 2: Adicionar Método Upsert no Storage

**Arquivo:** `src/storage/services.storage.ts`

### 2.1 Adicionar método `upsertMany`

```typescript
import { sql } from "drizzle-orm";

export class ServicesStorage extends BaseStorage<typeof tableServices, Service> {
  // ... métodos existentes ...

  /**
   * Bulk upsert services for a company
   * Updates existing services (by code) or inserts new ones
   * @returns Object with counts of created and updated records
   */
  async upsertMany(
    companyId: string,
    services: Array<{
      code: string;
      description: string;
      sn: TaxRates;
      n: TaxRates;
      mei: TaxRates;
      obs: string | null;
    }>,
  ): Promise<{ created: number; updated: number }> {
    if (services.length === 0) {
      return { created: 0, updated: 0 };
    }

    // Get existing service codes for this company
    const existingCodes = await this.db
      .select({ code: tableServices.code })
      .from(tableServices)
      .where(eq(tableServices.companyId, companyId));

    const existingCodesSet = new Set(existingCodes.map((s) => s.code));

    // Prepare data for insert
    const dataToInsert = services.map((service) => ({
      id: sql`gen_random_uuid()`,
      companyId,
      code: service.code,
      description: service.description,
      sn: service.sn,
      n: service.n,
      mei: service.mei,
      obs: service.obs,
      createdAt: sql`now()`,
    }));

    // Perform upsert
    await this.db
      .insert(tableServices)
      .values(dataToInsert)
      .onConflictDoUpdate({
        target: [tableServices.code, tableServices.companyId],
        set: {
          description: sql`EXCLUDED.description`,
          sn: sql`EXCLUDED.sn`,
          n: sql`EXCLUDED.n`,
          mei: sql`EXCLUDED.mei`,
          obs: sql`EXCLUDED.obs`,
        },
      });

    // Calculate counts
    const newServices = services.filter((s) => !existingCodesSet.has(s.code));
    const updatedServices = services.filter((s) => existingCodesSet.has(s.code));

    return {
      created: newServices.length,
      updated: updatedServices.length,
    };
  }
}
```

---

## Passo 3: Criar Método de Importação no Service Layer

**Arquivo:** `src/services/services.service.ts`

### 3.1 Adicionar imports necessários

```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
```

### 3.2 Adicionar funções helper de parse (adaptar de seed-services.ts)

```typescript
/**
 * Parse a tax rate cell value into a number or null
 */
function parseTaxRate(value: string): number | null {
  const trimmed = value.trim().toUpperCase();

  if (!trimmed || trimmed === "NT" || trimmed.startsWith("ART")) {
    return null;
  }

  const cleaned = trimmed.replace("%", "").replace(",", ".").trim();
  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    return null;
  }

  return num;
}

/**
 * Parse a CSV line respecting quoted fields
 */
function parseCsvLine(line: string, separator: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}
```

### 3.3 Adicionar método `importServicesFromTemplate`

```typescript
export class ServiceService {
  // ... métodos existentes ...

  /**
   * Import services from a predefined CSV template
   * @param companyId - Target company ID
   * @param templateId - Template identifier ("1", "2", or "3")
   * @returns Counts of created and updated services
   */
  async importServicesFromTemplate(
    companyId: string,
    templateId: "1" | "2" | "3",
  ): Promise<{ created: number; updated: number }> {
    // Read CSV file
    const csvPath = resolve(process.cwd(), `public/templates/services-template-${templateId}.csv`);

    let content: string;
    try {
      content = readFileSync(csvPath, "utf-8");
    } catch (error) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Parse CSV
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      throw new Error("Invalid CSV format");
    }

    const headerLine = lines[0];
    const separator = headerLine.includes(";") ? ";" : ",";

    // Skip header rows and parse data
    const dataLines = lines.slice(1).filter((line) => {
      const fields = parseCsvLine(line, separator);
      const codeCell = fields[1]?.trim();
      return (
        codeCell &&
        !codeCell.toUpperCase().startsWith("CÓDIGO") &&
        !codeCell.toUpperCase().startsWith("CADASTRO")
      );
    });

    const services: Array<{
      code: string;
      description: string;
      sn: TaxRates;
      n: TaxRates;
      mei: TaxRates;
      obs: string | null;
    }> = [];

    for (const line of dataLines) {
      const fields = parseCsvLine(line, separator);

      // CSV structure: [empty], code, description, SN (4 cols), N (4 cols), MEI (4 cols), obs...
      const code = fields[1]?.trim();
      const description = fields[2]?.trim();

      if (!code || !description) continue;

      // Parse tax rates for each regime
      const sn: TaxRates = {
        issqn: parseTaxRate(fields[3] || ""),
        inss: parseTaxRate(fields[4] || ""),
        cs: parseTaxRate(fields[5] || ""),
        irrf: parseTaxRate(fields[6] || ""),
      };

      const n: TaxRates = {
        issqn: parseTaxRate(fields[7] || ""),
        inss: parseTaxRate(fields[8] || ""),
        cs: parseTaxRate(fields[9] || ""),
        irrf: parseTaxRate(fields[10] || ""),
      };

      const mei: TaxRates = {
        issqn: parseTaxRate(fields[11] || ""),
        inss: parseTaxRate(fields[12] || ""),
        cs: parseTaxRate(fields[13] || ""),
        irrf: parseTaxRate(fields[14] || ""),
      };

      const obs = fields[15]?.trim() || null;

      services.push({ code, description, sn, n, mei, obs });
    }

    // Perform bulk upsert
    const result = await this.storage.upsertMany(companyId, services);

    // Log activity
    await this.activityService.logCreate({
      resource: "services",
      resourceId: companyId,
      resourceName: `Template ${templateId}`,
      details: {
        templateId,
        created: result.created,
        updated: result.updated,
        total: services.length,
      },
    });

    return result;
  }
}
```

---

## Passo 4: Criar API Endpoint

**Arquivo:** `src/app/api/admin/invoices/services/import/route.ts`

### 4.1 Criar o arquivo e implementar POST handler

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/api/error-handler";
import { requirePermission } from "@/lib/auth/require-permission";
import { ValidationError } from "@/lib/errors/api-errors";
import { serviceService } from "@/services/services.service";

const importServicesSchema = z.object({
  templateId: z.enum(["1", "2", "3"]),
  companyId: z.string().uuid(),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Check permission
  await requirePermission("services", "create");

  // Parse and validate request
  const body = await req.json();
  const validatedData = importServicesSchema.parse(body);

  // Import services
  const result = await serviceService.importServicesFromTemplate(
    validatedData.companyId,
    validatedData.templateId,
  );

  return NextResponse.json(
    {
      success: true,
      created: result.created,
      updated: result.updated,
      total: result.created + result.updated,
    },
    { status: 200 },
  );
});
```

### 4.2 Adicionar validação ao arquivo de validations

**Arquivo:** `src/validations/service.validations.ts`

```typescript
export const importServicesSchema = z.object({
  templateId: z.enum(["1", "2", "3"]),
  companyId: z.string().uuid(),
});
```

---

## Passo 5: Criar Hook de Importação

**Arquivo:** `src/hooks/admin/use-services.ts`

### 5.1 Adicionar interface para response

```typescript
interface ImportServicesResponse {
  success: boolean;
  created: number;
  updated: number;
  total: number;
}
```

### 5.2 Adicionar mutation hook

```typescript
export function useImportServices() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const t = useTranslations("services");

  return useMutation({
    mutationFn: async (data: { templateId: "1" | "2" | "3"; companyId: string }) => {
      const response = await fetch("/api/admin/invoices/services/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to import services");
      }

      return response.json() as Promise<ImportServicesResponse>;
    },
    onSuccess: (data) => {
      // Invalidate all service queries
      queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEYS.all });

      // Show success toast
      toast({
        title: t("importSuccess"),
        description: t("importSuccessDescription", {
          created: data.created,
          updated: data.updated,
        }),
      });
    },
    onError: (error) => {
      toast({
        title: t("importError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
```

---

## Passo 6: Criar Componente Modal de Importação

**Arquivo:** `src/components/admin/services/service-import-dialog.tsx`

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useImportServices } from "@/hooks/admin/use-services";
import { LoadingState } from "@/components/shared/loading-state";

interface ServiceImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

export function ServiceImportDialog({
  open,
  onOpenChange,
  companyId,
}: ServiceImportDialogProps) {
  const t = useTranslations("services");
  const importMutation = useImportServices();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const templates = [
    {
      id: "1" as const,
      name: t("template1Name"),
      description: t("template1Description"),
      icon: FileText,
    },
    {
      id: "2" as const,
      name: t("template2Name"),
      description: t("template2Description"),
      icon: FileText,
    },
    {
      id: "3" as const,
      name: t("template3Name"),
      description: t("template3Description"),
      icon: FileText,
    },
  ];

  const handleImport = async (templateId: "1" | "2" | "3") => {
    setSelectedTemplate(templateId);
    await importMutation.mutateAsync({ templateId, companyId });
    setSelectedTemplate(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-space-sm">
            <Upload className="h-5 w-5" />
            {t("importTitle")}
          </DialogTitle>
          <DialogDescription>{t("importDescription")}</DialogDescription>
        </DialogHeader>

        {importMutation.isPending ? (
          <LoadingState message={t("importingServices")} />
        ) : (
          <div className="grid gap-space-md md:grid-cols-3">
            {templates.map((template) => {
              const Icon = template.icon;
              const isLoading = selectedTemplate === template.id;

              return (
                <Card
                  key={template.id}
                  className="cursor-pointer transition-colors hover:border-primary"
                  onClick={() => !isLoading && handleImport(template.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-space-sm text-base">
                      <Icon className="h-4 w-4" />
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? t("importing") : t("selectTemplate")}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## Passo 7: Adicionar Botão na Página de Serviços

**Arquivo:** `src/app/admin/(protected)/invoices/(empresa-required)/services/page.tsx`

### 7.1 Importar componente e adicionar estado

```typescript
import { Upload } from "lucide-react";
import { ServiceImportDialog } from "@/components/admin/services/service-import-dialog";

// Dentro do componente ServicesPageContent
const [showImportDialog, setShowImportDialog] = useState(false);
```

### 7.2 Adicionar botão no AdminHeader

```typescript
<AdminHeader
  title={t("title")}
  actions={
    <>
      {canCreate && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4" />
            {t("importButton")}
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4" />
            {t("createButton")}
          </Button>
        </>
      )}
    </>
  }
/>
```

### 7.3 Adicionar o dialog no JSX

```typescript
<ServiceImportDialog
  open={showImportDialog}
  onOpenChange={setShowImportDialog}
  companyId={selectedCompany.id}
/>
```

---

## Passo 8: Adicionar Traduções

### 8.1 Arquivo `src/locales/pt-BR/services.json`

```json
{
  "importButton": "Importar Serviços",
  "importTitle": "Importar Template de Serviços",
  "importDescription": "Selecione um template para importar todos os serviços. Serviços existentes serão atualizados.",
  "template1Name": "Template 1",
  "template1Description": "Conjunto de serviços com taxas padrão tipo 1",
  "template2Name": "Template 2",
  "template2Description": "Conjunto de serviços com taxas padrão tipo 2",
  "template3Name": "Template 3",
  "template3Description": "Conjunto de serviços com taxas padrão tipo 3",
  "selectTemplate": "Selecionar",
  "importing": "Importando...",
  "importingServices": "Importando serviços, por favor aguarde...",
  "importSuccess": "Serviços importados com sucesso",
  "importSuccessDescription": "{created} serviços criados, {updated} atualizados",
  "importError": "Erro ao importar serviços"
}
```

### 8.2 Arquivo `src/locales/en-US/services.json`

```json
{
  "importButton": "Import Services",
  "importTitle": "Import Service Template",
  "importDescription": "Select a template to import all services. Existing services will be updated.",
  "template1Name": "Template 1",
  "template1Description": "Service set with standard rates type 1",
  "template2Name": "Template 2",
  "template2Description": "Service set with standard rates type 2",
  "template3Name": "Template 3",
  "template3Description": "Service set with standard rates type 3",
  "selectTemplate": "Select",
  "importing": "Importing...",
  "importingServices": "Importing services, please wait...",
  "importSuccess": "Services imported successfully",
  "importSuccessDescription": "{created} services created, {updated} updated",
  "importError": "Error importing services"
}
```

---

## Verificação e Testes

### 1. Verificação de código

```bash
npm run check:types
npm run check:lint
npm run check:format
```

### 2. Testes funcionais

1. **Fluxo básico:**
   - Acessar página de serviços
   - Clicar em "Importar Serviços"
   - Selecionar Template 1
   - Verificar que serviços foram importados

2. **Teste de upsert:**
   - Importar Template 1 novamente
   - Verificar que mensagem mostra "0 criados, N atualizados"

3. **Teste de permissões:**
   - Remover permissão `services:create`
   - Verificar que botão não aparece

4. **Teste de log de atividade:**
   - Importar template
   - Verificar que activity log registrou a ação

5. **Teste de traduções:**
   - Mudar idioma para inglês
   - Verificar que todas as strings estão traduzidas

### 3. Testes de banco de dados

```sql
-- Verificar serviços importados
SELECT code, description, sn, n, mei
FROM services
WHERE company_id = '<company-uuid>'
LIMIT 10;

-- Verificar activity log
SELECT * FROM activity_logs
WHERE resource = 'services'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Troubleshooting

### Erro: Template not found

**Causa:** Arquivo CSV não existe em `public/templates/`

**Solução:** Verificar que os 3 arquivos CSV foram criados corretamente

### Erro: Invalid CSV format

**Causa:** Estrutura do CSV não corresponde ao esperado

**Solução:** Verificar que CSV tem headers corretos e pelo menos uma linha de dados

### Erro: Permission denied

**Causa:** Usuário não tem permissão `services:create`

**Solução:** Adicionar permissão no painel de roles

### Import não invalida lista

**Causa:** Query keys não estão corretas

**Solução:** Verificar que `SERVICES_QUERY_KEYS.all` está sendo usado corretamente

---

## Considerações Futuras

1. **Nomes editáveis:** Permitir admin configurar nomes/descrições dos templates em settings
2. **Preview:** Adicionar step de confirmação mostrando serviços que serão importados
3. **Validação de CSV:** Validar estrutura antes de importar
4. **Upload customizado:** Permitir usuário fazer upload de seus próprios templates
5. **Agendamento:** Permitir importação automática periódica
6. **Rollback:** Adicionar funcionalidade para desfazer importação
