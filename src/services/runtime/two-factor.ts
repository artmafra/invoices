import { emailQueueService } from "@/services/runtime/email-queue";
import { tokenService } from "@/services/runtime/token";
import { TwoFactorService } from "@/services/two-factor.service";

export const twoFactorService = new TwoFactorService(emailQueueService, tokenService);
