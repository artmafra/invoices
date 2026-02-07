import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { userService } from "@/services/runtime/user";

/**
 * Refreshes the user session with the latest data from the database
 * Useful for ensuring session data is up-to-date after profile changes
 */
export async function refreshUserSession() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    // Get fresh user data from database with role name
    const user = await userService.getUserByIdWithRole(session.user.id);

    if (!user) {
      return null;
    }

    // Return updated user data that can be used to update the session
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      roleId: user.roleId,
      roleName: user.roleName,
    };
  } catch (error) {
    logger.error({ error, userId: session.user.id }, "[Auth] Error refreshing user session");
    return null;
  }
}
