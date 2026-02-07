"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface PasswordMethodCardProps {
  onChangePassword: () => void;
}

export function PasswordMethodCard({ onChangePassword }: PasswordMethodCardProps) {
  const t = useTranslations("profile.security");
  const tc = useTranslations("common");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-space-md">
        <div className="flex items-center gap-space-md">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{t("password.title")}</CardTitle>
        </div>
      </CardHeader>
      <CardFooter className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{t("password.description")}</span>
        <Button variant="outline" onClick={onChangePassword}>
          {tc("buttons.change")}
        </Button>
      </CardFooter>
    </Card>
  );
}
