import { createElement } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";

/**
 * Returns the appropriate device icon based on device type
 */
export function getDeviceIcon(deviceType: string | null, className = "h-4 w-4") {
  switch (deviceType) {
    case "mobile":
      return createElement(Smartphone, { className });
    case "tablet":
      return createElement(Tablet, { className });
    default:
      return createElement(Monitor, { className });
  }
}

/**
 * Base session fields shared between admin and profile session types
 */
export interface BaseSessionFields {
  id: string;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  city: string | null;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  createdAt: string;
  lastActivityAt: string;
}

/**
 * Format location string from session fields
 */
export function formatLocation(session: BaseSessionFields): string | null {
  const parts: string[] = [];

  if (session.city) parts.push(session.city);
  if (session.region && session.region !== session.city) parts.push(session.region);
  if (session.countryCode) parts.push(session.countryCode);

  return parts.length > 0 ? parts.join(", ") : null;
}
