# Multi-Company Support

**Contexto**: O sistema foi construído para uma única empresa. O cliente opera dezenas de empresas (tomadores de serviço, cada uma com CNPJ próprio). Esta mudança adiciona uma tabela `companies` e escopa suppliers, services e invoices por empresa.

**Decisões tomadas**:

- Suppliers, services e invoices são **isolados por empresa**
- Todos os usuários veem todas as empresas (sem restrição por usuário)
- A empresa ativa é salva em **cookie de preferência** — padrão idêntico ao `selectedApp` já existente
- A troca de empresa invalida automaticamente todas as queries React Query (via `companyId` nos QUERY_KEYS)
- Dados existentes descartados — banco limpo na nova estrutura

---

## Fase 1 — Schema (DB)

> Todas as alterações de schema são paralelas. Rodar `db:push` ao final.

1. Criar `src/schema/companies.schema.ts`
   - `id uuid PK`
   - `cnpj text UNIQUE NOT NULL` — CNPJ do tomador
   - `name text NOT NULL`
   - `city text NOT NULL`
   - `createdAt`, `updatedAt`

2. Modificar `src/schema/suppliers.schema.ts`
   - Adicionar `companyId uuid NOT NULL REFERENCES companies(id)`

3. Modificar `src/schema/services.schema.ts`
   - Adicionar `companyId uuid NOT NULL REFERENCES companies(id)`

4. Modificar `src/schema/invoices.schema.ts`
   - Adicionar `companyId uuid NOT NULL REFERENCES companies(id)`

5. Rodar `npm run db:push` (banco limpo, dados descartados)

---

## Fase 2 — Storage

> Depende da Fase 1.

6. Criar `src/storage/company.storage.ts`
   - Implementar `BaseStorage<Company>`
   - `findMany()`, `findById()`, `findByCnpj()`, `create()`, `update()`, `delete()`

7. Modificar `src/storage/suppliers.storage.ts`
   - Adicionar `companyId` em `SupplierFilterOptions`
   - Adicionar `eq(suppliers.companyId, filters.companyId)` em `buildWhereConditions()`
   - Incluir `companyId` em `getCollectionVersion()`

8. Modificar `src/storage/services.storage.ts`
   - Idem: adicionar `companyId` em filtros e `buildWhereConditions()`

9. Modificar `src/storage/invoices.storage.ts`
   - Idem: adicionar `companyId` em filtros e `buildWhereConditions()`

---

## Fase 3 — Services + DTOs + Types

> Depende da Fase 2.

10. Criar `src/types/company.types.ts`
    - `AdminCompanyResponse`, `AdminCompaniesListResponse`

11. Criar `src/dtos/company.dto.ts`
    - `CompanyDTO.toAdminResponse()`, `toPaginatedResponse()`

12. Criar `src/services/company.service.ts`
    - `getPaginated()`, `getById()`, `getByCnpj()`, `create()`, `update()`, `delete()`

13. Modificar `src/services/supplier.service.ts`
    - Todos os métodos passam a aceitar e repassar `companyId` ao storage

14. Modificar `src/services/service.service.ts`
    - Idem

15. Modificar `src/services/invoice.service.ts`
    - Idem

---

## Fase 4 — Validations + API Routes

> Depende da Fase 3.

16. Criar `src/validations/company.validations.ts`
    - `createCompanySchema`, `updateCompanySchema`, `companyIdParamSchema`

17. Criar `src/app/api/admin/companies/route.ts`
    - `GET` — listar com ETag + `requirePermission("companies", "view")`
    - `POST` — criar com `requirePermission("companies", "create")` + `activityService.logCreate()`

18. Criar `src/app/api/admin/companies/[companyId]/route.ts`
    - `GET`, `PUT`, `DELETE` com permissões e activity log

19. Modificar `src/app/api/admin/suppliers/route.ts`
    - Aceitar `companyId` como query param obrigatório no GET; no body do POST

20. Modificar `src/app/api/admin/services/route.ts`
    - Idem

21. Modificar `src/app/api/admin/invoices/route.ts`
    - Idem

---

## Fase 5 — Contexto da Empresa Ativa

> Paralela à Fase 4.

22. Modificar `src/lib/preferences/preferences.types.ts`
    - Adicionar `selectedCompanyId?: string`

23. Criar `src/contexts/company-context.tsx`
    - `CompanyProvider` com estado `selectedCompany`
    - `useSelectedCompany()` hook
    - Padrão idêntico ao `AppsProvider`

24. Criar `src/components/admin/company-selector.tsx`
    - Dropdown no sidebar (acima da navegação de apps)
    - `updatePreference("selectedCompanyId", id)` ao trocar
    - `queryClient.invalidateQueries()` após troca

25. Modificar `src/app/admin/(protected)/layout.tsx`
    - Ler `selectedCompanyId` das cookies via `getPreferencesFromCookies()`
    - Envolver com `<CompanyProvider initialSelectedCompanyId={selectedCompanyId}>`

---

## Fase 6 — Hooks React Query

> Depende das Fases 4 e 5.

26. Criar `src/hooks/admin/companies.query-keys.ts`

    ```ts
    export const COMPANIES_QUERY_KEYS = {
      all: ["admin", "companies"] as const,
      lists: () => [...COMPANIES_QUERY_KEYS.all, "list"] as const,
      list: (page: number) => [...COMPANIES_QUERY_KEYS.lists(), page] as const,
      detail: (id: string) => [...COMPANIES_QUERY_KEYS.all, id] as const,
    };
    ```

27. Criar `src/hooks/admin/use-companies.ts`
    - `useCompanies()`, `useCompany(id)`, `useCreateCompany()`, `useUpdateCompany()`, `useDeleteCompany()`

28. Modificar `src/hooks/admin/use-invoices.ts`
    - Adicionar `companyId` nos params e incluí-lo em `INVOICES_QUERY_KEYS.list()`
    - Passa `companyId` como query param nas chamadas fetch

29. Modificar `src/hooks/admin/use-suppliers.ts` — idem

30. Modificar `src/hooks/admin/use-services.ts` — idem

---

## Fase 7 — Admin UI

> Depende da Fase 6.

31. Criar `src/app/admin/(protected)/empresas/page.tsx`

32. Criar `src/app/admin/(protected)/empresas/empresas-page-content.tsx`
    - Padrão: `SidebarInset → AdminHeader → PageContainer → SearchFilterBar + lista`

33. Criar `src/components/admin/companies/company-form-dialog.tsx`
    - Campos: CNPJ, nome, cidade

34. Criar `src/components/admin/companies/company-delete-dialog.tsx`

35. Modificar `src/app/admin/(protected)/invoices/invoices-page-content.tsx`
    - Ler `companyId` via `useSelectedCompany()`
    - Mostrar `EmptyState` quando nenhuma empresa selecionada
    - Passar `companyId` ao hook `useInvoices()`

36. Modificar `src/app/admin/(protected)/invoices/suppliers/` — idem

37. Modificar `src/app/admin/(protected)/invoices/services/` — idem

---

## Fase 8 — i18n + Navegação

> Depende da Fase 7.

38. Adicionar strings em `src/locales/pt-BR/*.json` e `src/locales/en-US/*.json`
    - Namespace `companies` com chaves: `title`, `description`, `fields.*`, `actions.*`, `empty.*`

39. Registrar "companies" em `src/config/apps.registry.ts`
    - Permissões: `view`, `create`, `edit`, `delete`

40. Registrar commands em `src/config/commands.registry.ts`
    - "Gerenciar Empresas", "Nova Empresa"

41. Atualizar sidebar para incluir link `/admin/empresas`

---

## Verificação Final

```bash
npm run check:types   # zero erros TypeScript
npm run check:lint    # zero warnings ESLint
npm run check:format  # formatação ok
```

**Testes manuais**:

1. Acessar `/admin/empresas` → criar uma empresa → verificar que aparece no seletor do sidebar
2. Trocar de empresa → verificar que as listas de suppliers, services e invoices filtram corretamente
3. Criar uma nota para a Empresa A → trocar para Empresa B → nota não deve aparecer
4. Deletar empresa → verificar que o seletor volta para estado "nenhuma selecionada"

---

## Arquivos de referência

| Arquivo                                    | Por quê consultar                                                |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `src/app/admin/(protected)/layout.tsx`     | Padrão para injetar `selectedCompanyId` (igual ao `selectedApp`) |
| `src/components/apps-provider.tsx`         | Padrão para criar `CompanyProvider`                              |
| `src/lib/preferences/preferences.types.ts` | Adicionar novo campo de preferência                              |
| `src/hooks/admin/invoices.query-keys.ts`   | Padrão de QUERY_KEYS a replicar em companies                     |
| `src/hooks/admin/use-invoices.ts`          | Padrão de hook a modificar nos demais                            |
| `src/config/apps.registry.ts`              | Padrão para registrar o app "companies"                          |
