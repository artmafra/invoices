"use client";

import { useState } from "react";
import {
  Check,
  Cloud,
  Fingerprint,
  Key,
  MoreVertical,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { PasskeyResponse } from "@/types/auth/passkeys.types";
import {
  useDeletePasskey,
  usePasskeys,
  useRegisterPasskey,
  useRenamePasskey,
} from "@/hooks/public/use-passkey";
import { useStepUpAuth } from "@/hooks/public/use-step-up-auth";
import { useDateFormat } from "@/hooks/use-date-format";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorAlert } from "@/components/shared/error-alert";
import { LoadingButton } from "@/components/shared/loading-button";
import { LoadingState } from "@/components/shared/loading-state";
import { StepUpAuthDialog } from "@/components/shared/step-up-auth-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export interface PasskeyListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PasskeyListDialog({ open, onOpenChange, onSuccess }: PasskeyListDialogProps) {
  const t = useTranslations("profile.passkeys");
  const tc = useTranslations("common");
  const { data: passkeys, isLoading, error } = usePasskeys();
  const deleteMutation = useDeletePasskey();
  const renameMutation = useRenamePasskey();
  const registerMutation = useRegisterPasskey();

  // Step-up authentication
  const {
    isDialogOpen: isStepUpDialogOpen,
    closeDialog: closeStepUpDialog,
    handleStepUpSuccess,
    hasPassword,
    hasPasskeys: hasPasskeysForStepUp,
    withStepUp,
  } = useStepUpAuth();

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteMutation.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
      onSuccess?.();
    } catch {
      // Error handled by mutation
    }
  };

  const handleStartEdit = (passkey: PasskeyResponse) => {
    setEditingId(passkey.id);
    setEditName(passkey.name || "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    try {
      await renameMutation.mutateAsync({ id: editingId, name: editName.trim() });
      setEditingId(null);
      setEditName("");
    } catch {
      // Error handled by mutation
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleAddPasskey = async () => {
    try {
      await registerMutation.mutateAsync(undefined);
      onSuccess?.();
    } catch {
      // Error handled by mutation
    }
  };

  // Wrapped handlers with step-up auth
  const handleAddPasskeyWithStepUp = () => {
    withStepUp(handleAddPasskey);
  };

  const handleDeleteWithStepUp = (passkeyId: string) => {
    withStepUp(() => setDeleteConfirmId(passkeyId));
  };

  const { formatDate } = useDateFormat();

  const formatPasskeyDate = (dateString: string | null) => {
    if (!dateString) return tc("time.never");
    return formatDate(dateString);
  };

  const getDeviceIcon = (passkey: PasskeyResponse) => {
    if (passkey.backedUp) {
      return <Cloud className="h-4 w-4" />;
    }
    if (passkey.deviceType === "singleDevice") {
      return <Key className="h-4 w-4" />;
    }
    return <Smartphone className="h-4 w-4" />;
  };

  const getDeviceLabel = (passkey: PasskeyResponse) => {
    if (passkey.backedUp) {
      return t("synced");
    }
    if (passkey.deviceType === "singleDevice") {
      return t("deviceBound");
    }
    return t("passkey");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-space-sm">
              <Fingerprint className="h-5 w-5" />
              {t("title")}
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            <DialogDescription>{t("description")}</DialogDescription>
            {/* Loading state */}
            {isLoading && <LoadingState message={tc("loading.passkeys")} />}

            {/* Error state */}
            {error && <ErrorAlert message={t("errors.loadFailed")} />}

            {/* Passkey list */}
            {!isLoading && !error && passkeys && (
              <div className="space-y-space-sm">
                {passkeys.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-card text-center">
                    <Fingerprint className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-space-sm text-sm font-medium">{t("empty")}</p>
                    <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
                  </div>
                ) : (
                  passkeys.map((passkey) => (
                    <div
                      key={passkey.id}
                      className="flex items-center justify-between rounded-lg border p-space-md"
                    >
                      <div className="flex items-center gap-space-md">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          {getDeviceIcon(passkey)}
                        </div>
                        <div className="space-y-space-xs">
                          {editingId === passkey.id ? (
                            <div className="flex items-center gap-space-xs">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-7 text-sm px-input-x"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEdit();
                                  if (e.key === "Escape") handleCancelEdit();
                                }}
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="ml-space-xs h-7 w-7 shrink-0 text-primary hover:text-primary"
                                onClick={handleSaveEdit}
                                disabled={renameMutation.isPending || !editName.trim()}
                                title={tc("buttons.save")}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0"
                                onClick={handleCancelEdit}
                                title={tc("buttons.cancel")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-sm font-medium">{passkey.name || t("passkey")}</p>
                          )}
                          <div className="flex flex-col gap-space-xs text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-0.5">
                            <span>{getDeviceLabel(passkey)}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>
                              {tc("time.created")} {formatPasskeyDate(passkey.createdAt)}
                            </span>
                            {passkey.lastUsedAt && (
                              <>
                                <span className="hidden sm:inline">•</span>
                                <span>
                                  {tc("time.lastUsed")} {formatPasskeyDate(passkey.lastUsedAt)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {editingId !== passkey.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">{tc("table.actions")}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStartEdit(passkey)}>
                              <Pencil className="h-4 w-4" />
                              {t("rename")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteWithStepUp(passkey.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              {t("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <LoadingButton
              onClick={handleAddPasskeyWithStepUp}
              loading={registerMutation.isPending}
              loadingText={t("adding")}
            >
              <Plus className="h-4 w-4" />
              {t("addNew")}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        confirmText={tc("buttons.delete")}
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />

      {/* Step-up authentication dialog */}
      <StepUpAuthDialog
        open={isStepUpDialogOpen}
        onOpenChange={closeStepUpDialog}
        onSuccess={handleStepUpSuccess}
        hasPassword={hasPassword}
        hasPasskeys={hasPasskeysForStepUp}
      />
    </>
  );
}
