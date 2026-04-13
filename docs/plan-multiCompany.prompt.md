# Plan: Multi-Company Support

## Decisions

- Companies = tomadores de serviço, cada um com CNPJ próprio
- Suppliers, services, invoices são isolados por empresa
- Todos os users veem todas as empresas
- UX: tela dedicada de seleção de empresa em `/admin/invoices/empresas`; sem dropdown no sidebar
- Sem empresa selecionada → redirect automático para a tela de seleção
- Sidebar (ContextSwitcher dropdown) adiciona link "Trocar empresa" quando app = invoices
- Dados existentes podem ser descartados (clean start)
- Padrão de referência: `selectedApp` em preferences → AppsProvider (replicar para `selectedCompanyId`)

## Fase 1: Schema (DB)

1. Criar `src/schema/companies.schema.ts` (id uuid, cnpj text unique, name, city, createdAt, updatedAt)
2. Modificar `src/schema/suppliers.schema.ts` → adicionar `companyId uuid NOT NULL FK companies.id`
3. Modificar `src/schema/services.schema.ts` → adicionar `companyId uuid NOT NULL FK companies.id`
4. Modificar `src/schema/invoices.schema.ts` → adicionar `companyId uuid NOT NULL FK companies.id`
5. Rodar `db:push` (clean start, dados descartados)

## Fase 2: Storage

6. Criar `src/storage/company.storage.ts`
7. Modificar `src/storage/suppliers.storage.ts` → filtrar por companyId em buildWhereConditions
8. Modificar `src/storage/services.storage.ts` → filtrar por companyId
9. Modificar `src/storage/invoices.storage.ts` → filtrar por companyId + getCollectionVersion

## Fase 3: Services + DTOs + Types

10. Criar `src/types/company.types.ts`
11. Criar `src/dtos/company.dto.ts`
12. Criar `src/services/company.service.ts`
13. Modificar `src/services/supplier.service.ts` → aceitar/passar companyId
14. Modificar `src/services/service.service.ts` → aceitar/passar companyId
15. Modificar `src/services/invoice.service.ts` → aceitar/passar companyId

## Fase 4: Validations + API Routes

16. Criar `src/validations/company.validations.ts`
17. Criar `src/app/api/admin/companies/route.ts` (GET + POST)
18. Criar `src/app/api/admin/companies/[companyId]/route.ts` (GET + PATCH + DELETE)
19. Modificar rotas de suppliers, services, invoices → aceitar companyId como query param no GET

## Fase 5: Preferences + Company Context

20. Modificar `src/lib/preferences/preferences.types.ts` → adicionar `selectedCompanyId: string | null`
21. Criar `src/contexts/company-context.tsx` → `CompanyProvider` + `useSelectedCompany()` hook
22. Modificar `src/app/admin/(protected)/layout.tsx` → ler `selectedCompanyId` das cookies, wrap com `<CompanyProvider>`
23. Modificar `src/app/admin/(protected)/invoices/layout.tsx` → guard: sem empresa selecionada → redirect para `/admin/invoices/empresas`
24. Criar `src/app/admin/(protected)/invoices/empresas/page.tsx` → tela de seleção (cards; clicar → setar cookie + redirect para `/admin/invoices`)
25. Modificar `src/components/admin/context-switcher.tsx` → quando `selectedApp.slug === "invoices"`, adicionar "Trocar empresa" no dropdown → navega para `/admin/invoices/empresas`

## Fase 6: Hooks

26. Criar `src/hooks/admin/companies.query-keys.ts`
27. Criar `src/hooks/admin/use-companies.ts` (incluir selectedCompanyId no QUERY_KEY)
28. Modificar `src/hooks/admin/use-invoices.ts` → adicionar companyId nos params e query keys
29. Modificar `src/hooks/admin/use-suppliers.ts` → companyId
30. Modificar `src/hooks/admin/use-services.ts` → companyId

## Fase 7: Admin UI

31. Criar `src/app/admin/(protected)/invoices/empresas/empresas-page-content.tsx`
32. Criar `src/components/admin/companies/company-form-dialog.tsx` (campos: CNPJ, nome, cidade)
33. Criar `src/components/admin/companies/company-delete-dialog.tsx`
34. Modificar invoices, suppliers, services pages → usar selectedCompanyId do context + passar para hooks

## Fase 8: i18n + Navegação

35. Adicionar strings em `src/locales/en-US/*.json` e `src/locales/pt-BR/*.json` (namespace `companies`)
36. Registrar commands em `src/config/commands.registry.ts` ("Gerenciar Empresas", "Trocar Empresa")
37. Atualizar `APP_NAV_CONFIG` no sidebar para incluir link `/admin/invoices/empresas`
