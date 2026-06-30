"use client";

import { useState } from "react";
import { FileText, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useImportServices } from "@/hooks/admin/use-services";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ServiceImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

export function ServiceImportDialog({ open, onOpenChange, companyId }: ServiceImportDialogProps) {
  const t = useTranslations("apps/services");
  const importMutation = useImportServices();
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const templates = [
    {
      id: "1" as const,
      name: t("import.template1Name"),
      description: t("import.template1Description"),
    },
    {
      id: "2" as const,
      name: t("import.template2Name"),
      description: t("import.template2Description"),
    },
    {
      id: "3" as const,
      name: t("import.template3Name"),
      description: t("import.template3Description"),
    },
  ];

  const handleImport = async (templateId: "1" | "2" | "3") => {
    setActiveTemplateId(templateId);
    try {
      await importMutation.mutateAsync({ templateId, companyId });
      onOpenChange(false);
    } finally {
      setActiveTemplateId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t("import.title")}
          </DialogTitle>
          <DialogDescription>{t("import.description")}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {importMutation.isPending ? (
            <LoadingState message={t("import.loading")} />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer transition-colors hover:border-primary"
                  onClick={() => !importMutation.isPending && handleImport(template.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-sm">{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={importMutation.isPending}
                    >
                      {activeTemplateId === template.id
                        ? t("import.importing")
                        : t("import.select")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
