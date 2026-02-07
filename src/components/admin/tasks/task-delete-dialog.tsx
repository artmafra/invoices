"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface TaskDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function TaskDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: TaskDeleteDialogProps) {
  const t = useTranslations("apps/tasks");
  const tc = useTranslations("common");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteTitle")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>{t("deleteDescription")}</DialogDescription>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("buttons.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? tc("buttons.processing") : tc("buttons.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
