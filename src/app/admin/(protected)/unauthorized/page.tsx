"use client";

import { useTranslations } from "next-intl";
import { AdminHeader } from "@/components/admin/admin-header";
import { PageContainer } from "@/components/shared/page-container";
import { SidebarInset } from "@/components/ui/sidebar";

export default function UnauthorizedPage() {
  const t = useTranslations("system.unauthorized");

  return (
    <SidebarInset>
      <AdminHeader title={t("title")} />
      <PageContainer className="text-sm">
        <div>
          <p>{t("description")}</p>
          <p>{t("contactAdmin")}</p>
        </div>
      </PageContainer>
    </SidebarInset>
  );
}
