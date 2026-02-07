/**
 * Activity log constants and mappings
 */

/**
 * Entity type to translation key mapping
 */
export const entityTypeMap: Record<string, string> = {
  user: "user",
  users: "user",
  role: "role",
  roles: "role",
  session: "session",
  sessions: "session",
  setting: "setting",
  settings: "setting",
  note: "note",
  notes: "note",
  task: "task",
  tasks: "task",
  task_list: "task_list",
  task_lists: "task_list",
  invitation: "invitation",
  invitations: "invitation",
  integration: "integration",
  integrations: "integration",
  file: "file",
  cloud_storage: "file",
  passkey: "passkey",
  passkeys: "passkey",
};

/**
 * Quick verification limit options
 */
export const QUICK_VERIFY_LIMITS = [50, 100, 500, 1000] as const;
