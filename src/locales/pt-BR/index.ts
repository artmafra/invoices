/**
 * Portuguese (Brazil) locale - aggregated translations
 *
 * This file imports and combines all translation namespaces.
 * TODO: Translate all files from English to Portuguese
 */

import admin from "./admin.json";
import games from "./apps/games.json";
import notes from "./apps/notes.json";
import tasks from "./apps/tasks.json";
import auth from "./auth.json";
import common from "./common.json";
import emails from "./emails.json";
import errors from "./errors.json";
import profile from "./profile.json";
import system from "./system.json";

const messages = {
  common,
  auth,
  admin,
  profile,
  system,
  errors,
  emails,
  "apps/games": games,
  "apps/notes": notes,
  "apps/tasks": tasks,
} as const;

export default messages;
