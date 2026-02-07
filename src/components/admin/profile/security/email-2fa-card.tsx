"use client";

import { Info, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface Email2FACardProps {
  isEnabled: boolean;
  isEmailVerified: boolean;
  onEnable: () => void;
  onDisable: () => void;
}

export function Email2FACard({
  isEnabled,
  isEmailVerified,
  onEnable,
  onDisable,
}: Email2FACardProps) {
  const t = useTranslations("profile.security");
  const tc = useTranslations("common");

  const isDisabled = !isEmailVerified && !isEnabled;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-space-md">
        <div className="flex items-center gap-space-md">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{t("twoFactor.email.title")}</CardTitle>
        </div>
        {isEnabled && <Badge variant="success">{tc("status.configured")}</Badge>}
      </CardHeader>
      <CardFooter className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {!isEmailVerified && !isEnabled ? (
            <span className="flex items-center gap-space-xs">
              <Info className="h-3 w-3" />
              {t("twoFactor.emailRequired")}
            </span>
          ) : isEnabled ? (
            t("twoFactor.email.enabledDescription")
          ) : (
            t("twoFactor.email.disabledDescription")
          )}
        </span>
        <Button variant="outline" disabled={isDisabled} onClick={isEnabled ? onDisable : onEnable}>
          {isEnabled ? tc("buttons.disable") : tc("buttons.configure")}
        </Button>
      </CardFooter>
    </Card>
  );
}
