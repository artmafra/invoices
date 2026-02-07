"use client";

import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface EmailMethodCardProps {
  email: string;
  isVerified: boolean;
  additionalEmailCount: number;
  hasUnverifiedEmails: boolean;
  onManage: () => void;
}

export function EmailMethodCard({
  email,
  isVerified,
  additionalEmailCount,
  hasUnverifiedEmails,
  onManage,
}: EmailMethodCardProps) {
  const t = useTranslations("profile.security");
  const tc = useTranslations("common");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-space-md">
        <div className="flex items-center gap-space-md">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{t("email.title")}</CardTitle>
        </div>

        <div className="flex items-center">
          {isVerified ? (
            <Badge variant="success">{tc("status.verified")}</Badge>
          ) : (
            <Badge variant="destructive">{tc("status.unverified")}</Badge>
          )}
        </div>
      </CardHeader>
      <CardFooter className="flex items-center justify-between">
        <div className="flex flex-col text-sm text-muted-foreground">
          <div>{email}</div>
          {additionalEmailCount > 0 && (
            <div className={hasUnverifiedEmails ? "text-warning" : ""}>
              {hasUnverifiedEmails
                ? t("emails.summary.additionalUnverified", {
                    count: additionalEmailCount,
                  })
                : t("emails.summary.additional", {
                    count: additionalEmailCount,
                  })}
            </div>
          )}
        </div>
        <Button variant="outline" onClick={onManage}>
          {tc("buttons.manage")}
        </Button>
      </CardFooter>
    </Card>
  );
}
