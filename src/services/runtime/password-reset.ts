import { PasswordResetService } from "@/services/password-reset.service";
import { emailQueueService } from "@/services/runtime/email-queue";
import { tokenService } from "@/services/runtime/token";
import { userSessionService } from "@/services/runtime/user-session";

export const passwordResetService = new PasswordResetService(
  emailQueueService,
  tokenService,
  userSessionService,
);
