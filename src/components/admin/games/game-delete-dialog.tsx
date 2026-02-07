import type { useTranslations } from "next-intl";
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

export interface GameDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  t: ReturnType<typeof useTranslations<"apps/games">>;
  tc: ReturnType<typeof useTranslations<"common">>;
}

/**
 * Confirmation dialog for deleting a game
 */
export function GameDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  t,
  tc,
}: GameDeleteDialogProps) {
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
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
