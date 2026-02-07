import { LoginProtectionService } from "@/services/login-protection.service";
import { emailQueueService } from "@/services/runtime/email-queue";

export const loginProtectionService = new LoginProtectionService(emailQueueService);
