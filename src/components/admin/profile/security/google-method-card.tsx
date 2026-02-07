"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface GoogleMethodCardProps {
  isLinked: boolean;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function GoogleMethodCard({
  isLinked,
  isLoading,
  onConnect,
  onDisconnect,
}: GoogleMethodCardProps) {
  const t = useTranslations("profile.security");
  const tc = useTranslations("common");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-space-md">
        <div className="flex items-center gap-space-md">
          <Image src="/images/brands/google-color.svg" alt="Google" width={20} height={20} />
          <CardTitle>{t("google.title")}</CardTitle>
        </div>
        {isLinked && <Badge variant="success">{tc("status.connected")}</Badge>}
      </CardHeader>
      <CardFooter className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {isLinked ? t("google.connectedDescription") : t("google.disconnectedDescription")}
        </span>
        <Button
          variant="outline"
          disabled={isLoading}
          onClick={isLinked ? onDisconnect : onConnect}
        >
          {isLoading
            ? tc("buttons.processing")
            : isLinked
              ? t("google.disconnectButton")
              : t("google.connectButton")}
        </Button>
      </CardFooter>
    </Card>
  );
}
