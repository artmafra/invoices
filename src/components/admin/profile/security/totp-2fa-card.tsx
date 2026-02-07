"use client";

import { Info, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface Totp2FACardProps {
  isEnabled: boolean;
  isEmailVerified: boolean;
  onEnable: () => void;
  onDisable: () => void;
}

export function Totp2FACard({ isEnabled, isEmailVerified, onEnable, onDisable }: Totp2FACardProps) {
  const t = useTranslations("profile.security");
  const tc = useTranslations("common");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-space-md">
        <div className="flex items-center gap-space-md">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{t("twoFactor.totp.title")}</CardTitle>
        </div>
        {isEnabled && <Badge variant="success">{tc("status.configured")}</Badge>}
      </CardHeader>
      <CardFooter className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {!isEmailVerified ? (
            <span className="flex items-center gap-space-xs">
              <Info className="h-3 w-3" />
              {t("twoFactor.emailRequired")}
            </span>
          ) : (
            t("twoFactor.totp.enabledDescription")
          )}
        </span>
        <Button
          variant="outline"
          disabled={!isEmailVerified}
          onClick={isEnabled ? onDisable : onEnable}
        >
          {isEnabled ? tc("buttons.disable") : tc("buttons.configure")}
        </Button>
      </CardFooter>
    </Card>
  );
}
