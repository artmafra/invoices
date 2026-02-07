"use client";

import { useState } from "react";
import { Fingerprint } from "lucide-react";
import { useRegisterPasskey } from "@/hooks/public/use-passkey";
import { ErrorAlert } from "@/components/shared/error-alert";
import { LoadingButton } from "@/components/shared/loading-button";
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

export interface PasskeySetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PasskeySetupDialog({ open, onOpenChange, onSuccess }: PasskeySetupDialogProps) {
  const [error, setError] = useState("");
  const registerMutation = useRegisterPasskey();

  const handleRegister = async () => {
    setError("");

    try {
      await registerMutation.mutateAsync(undefined);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      // Don't show error for user cancellation
      if (err instanceof Error && err.name !== "NotAllowedError") {
        setError(err.message || "Failed to register passkey");
      }
    }
  };

  const handleClose = () => {
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-space-sm">
            <Fingerprint className="h-5 w-5" />
            Add a passkey
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <DialogDescription>
            Passkeys are a secure and convenient way to sign in without a password.
          </DialogDescription>

          {/* Info section */}
          <div className="space-y-space-md rounded-lg bg-muted/50 p-card text-sm">
            <div className="flex items-start gap-space-md">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-medium text-primary">1</span>
              </div>
              <div>
                <p className="font-medium">Device authentication</p>
                <p className="text-muted-foreground">Use your fingerprint, face, or screen lock</p>
              </div>
            </div>
            <div className="flex items-start gap-space-md">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-medium text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">Synced passkeys</p>
                <p className="text-muted-foreground">
                  May sync across your devices via iCloud, Google, or password manager
                </p>
              </div>
            </div>
            <div className="flex items-start gap-space-md">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-medium text-primary">3</span>
              </div>
              <div>
                <p className="font-medium">No password needed</p>
                <p className="text-muted-foreground">
                  Sign in faster and more securely without typing a password
                </p>
              </div>
            </div>
          </div>

          {/* Error display */}
          {error && <ErrorAlert message={error} />}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <LoadingButton onClick={handleRegister} loading={registerMutation.isPending}>
            <Fingerprint className="h-4 w-4" />
            Add passkey
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
