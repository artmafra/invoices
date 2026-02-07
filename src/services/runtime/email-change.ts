import { EmailChangeService } from "@/services/email-change.service";
import { emailQueueService } from "@/services/runtime/email-queue";
import { tokenService } from "@/services/runtime/token";
import { userSessionService } from "@/services/runtime/user-session";

export const emailChangeService = new EmailChangeService(
  emailQueueService,
  tokenService,
  userSessionService,
);
