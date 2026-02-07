import { PasskeyService } from "@/services/passkey.service";
import { emailService } from "@/services/runtime/email";
import { emailQueueService } from "@/services/runtime/email-queue";

export const passkeyService = new PasskeyService(emailService, emailQueueService);
