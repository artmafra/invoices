import { LoginHistoryService } from "@/services/login-history.service";
import { activityService } from "@/services/runtime/activity";
import { geolocationService } from "@/services/runtime/geolocation";

export const loginHistoryService = new LoginHistoryService(activityService, geolocationService);
