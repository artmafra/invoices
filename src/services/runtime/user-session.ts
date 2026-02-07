import { emailService } from "@/services/runtime/email";
import { emailQueueService } from "@/services/runtime/email-queue";
import { geolocationService } from "@/services/runtime/geolocation";
import { UserSessionService } from "@/services/user-session.service";

export const userSessionService = new UserSessionService(
  emailService,
  geolocationService,
  emailQueueService,
);
