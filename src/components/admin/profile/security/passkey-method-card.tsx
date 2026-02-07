"use client";

import { Fingerprint } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface PasskeyMethodCardProps {
  passkeyCount: number;
  onManage: () => void;
}

export function PasskeyMethodCard({ passkeyCount, onManage }: PasskeyMethodCardProps) {
  const t = useTranslations("profile.security");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-space-md">
        <div className="flex items-center gap-space-md">
          <Fingerprint className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{t("passkeys.title")}</CardTitle>
        </div>
        {passkeyCount > 0 && (
          <Badge variant="success">{t("passkeys.configured", { count: passkeyCount })}</Badge>
        )}
      </CardHeader>
      <CardFooter className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {passkeyCount > 0
            ? t("passkeys.connectedDescription")
            : t("passkeys.disconnectedDescription")}
        </span>
        <Button variant="outline" onClick={onManage}>
          {t("passkeys.manageButton")}
        </Button>
      </CardFooter>
    </Card>
  );
}
