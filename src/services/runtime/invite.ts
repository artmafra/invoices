import { InviteService } from "@/services/invite.service";
import { emailQueueService } from "@/services/runtime/email-queue";
import { tokenService } from "@/services/runtime/token";
import { userService } from "@/services/runtime/user";

export const inviteService = new InviteService(emailQueueService, tokenService, userService);
