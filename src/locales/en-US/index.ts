/**
 * English (en) locale - aggregated translations
 *
 * This file imports and combines all translation namespaces.
 */

import admin from "./admin.json";
import invoices from "./apps/invoices.json";
import services from "./apps/services.json";
import suppliers from "./apps/suppliers.json";
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
  "apps/suppliers": suppliers,
  "apps/invoices": invoices,
  "apps/services": services,
} as const;

export default messages;
