/**
 * Parse user agent string to extract browser and OS info
 */
export function parseUserAgent(userAgent: string | null | undefined): {
  browser: string;
  os: string;
  deviceType: string;
} {
  if (!userAgent) {
    return { browser: "Unknown", os: "Unknown", deviceType: "unknown" };
  }

  let browser = "Unknown";
  let os = "Unknown";
  let deviceType = "desktop";

  // Detect device type
  if (/mobile/i.test(userAgent)) {
    deviceType = "mobile";
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = "tablet";
  }

  // Detect browser
  if (/edg/i.test(userAgent)) {
    browser = "Edge";
  } else if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) {
    browser = "Chrome";
  } else if (/firefox/i.test(userAgent)) {
    browser = "Firefox";
  } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    browser = "Safari";
  } else if (/opera|opr/i.test(userAgent)) {
    browser = "Opera";
  }

  // Detect OS
  if (/windows/i.test(userAgent)) {
    os = "Windows";
  } else if (/macintosh|mac os/i.test(userAgent)) {
    os = "macOS";
  } else if (/linux/i.test(userAgent) && !/android/i.test(userAgent)) {
    os = "Linux";
  } else if (/android/i.test(userAgent)) {
    os = "Android";
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    os = "iOS";
  }

  return { browser, os, deviceType };
}

/**
 * Format parsed user agent as a readable string
 * e.g., "Chrome on Windows"
 */
export function formatUserAgent(userAgent: string | null | undefined): string | null {
  const parsed = parseUserAgent(userAgent);
  if (parsed.browser === "Unknown" && parsed.os === "Unknown") {
    return null;
  }
  return `${parsed.browser} on ${parsed.os}`;
}
