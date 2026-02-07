"use client";

import { Key } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface RecoveryCodesCardProps {
  onRegenerate: () => void;
}

export function RecoveryCodesCard({ onRegenerate }: RecoveryCodesCardProps) {
  const t = useTranslations("profile.security");
  const tc = useTranslations("common");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-space-md">
        <div className="flex items-center gap-space-md">
          <Key className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{t("recoveryCodes.title")}</CardTitle>
        </div>
        <Badge variant="success">{tc("status.configured")}</Badge>
      </CardHeader>
      <CardFooter className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{t("recoveryCodes.description")}</span>
        <Button variant="outline" onClick={onRegenerate}>
          {t("recoveryCodes.regenerateButton")}
        </Button>
      </CardFooter>
    </Card>
  );
}
