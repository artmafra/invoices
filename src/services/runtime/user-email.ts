import { emailQueueService } from "@/services/runtime/email-queue";
import { tokenService } from "@/services/runtime/token";
import { userSessionService } from "@/services/runtime/user-session";
import { UserEmailService } from "@/services/user-email.service";

export const userEmailService = new UserEmailService(
  emailQueueService,
  tokenService,
  userSessionService,
);
