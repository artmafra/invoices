import { emailService } from "@/services/runtime/email";
import { emailQueueService } from "@/services/runtime/email-queue";
import { userSessionService } from "@/services/runtime/user-session";
import { UserService } from "@/services/user.service";

export const userService = new UserService(emailService, emailQueueService, userSessionService);
