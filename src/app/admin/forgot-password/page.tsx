"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Redirect to login page - forgot password is now integrated there
export default function ForgotPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/login?view=forgot-password");
  }, [router]);

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
