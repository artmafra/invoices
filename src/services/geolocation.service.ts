import type { GeolocationResult } from "@/types/common/geolocation.types";
import { logger } from "@/lib/logger";

/**
 * Response shape from ip-api.com JSON endpoint
 */
interface IpApiResponse {
  status: "success" | "fail";
  message?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  regionName?: string;
}

/**
 * Check if an IP address is private/local (not routable on the internet)
 */
function isPrivateIp(ip: string): boolean {
  // IPv4 private ranges
  if (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.20.") ||
    ip.startsWith("172.21.") ||
    ip.startsWith("172.22.") ||
    ip.startsWith("172.23.") ||
    ip.startsWith("172.24.") ||
    ip.startsWith("172.25.") ||
    ip.startsWith("172.26.") ||
    ip.startsWith("172.27.") ||
    ip.startsWith("172.28.") ||
    ip.startsWith("172.29.") ||
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.")
  ) {
    return true;
  }

  // Localhost
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") {
    return true;
  }

  // IPv6 private ranges
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) {
    return true;
  }

  return false;
}

export class GeolocationService {
  private readonly baseUrl = "http://ip-api.com/json";
  private readonly timeout = 5000; // 5 seconds

  /**
   * Get geolocation data for an IP address using ip-api.com
   *
   * Free tier limits:
   * - 45 requests per minute
   * - HTTP only (HTTPS requires paid plan)
   *
   * @param ip - IPv4 or IPv6 address
   * @returns GeolocationResult or null for private IPs, returns "Localhost" values for local IPs
   */
  async getLocation(ip: string | null): Promise<GeolocationResult | null> {
    // Skip if no IP provided
    if (!ip) {
      return null;
    }

    // Return "Localhost" for private/local IPs
    if (isPrivateIp(ip)) {
      return {
        city: "Localhost",
        country: null,
        countryCode: null,
        region: null,
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Only request the fields we need to minimize response size
      const fields = "status,message,city,country,countryCode,regionName";
      const response = await fetch(`${this.baseUrl}/${ip}?fields=${fields}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.error(
          { ip, status: response.status, statusText: response.statusText },
          "Geolocation API error",
        );
        return null;
      }

      const data: IpApiResponse = await response.json();

      if (data.status === "fail") {
        // ip-api returns fail for reserved/private IPs or invalid queries
        logger.warn({ ip, message: data.message }, "Geolocation lookup failed");
        return null;
      }

      return {
        city: data.city ?? null,
        country: data.country ?? null,
        countryCode: data.countryCode ?? null,
        region: data.regionName ?? null,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.error({ ip, timeout: this.timeout }, "Geolocation lookup timed out");
      } else {
        logger.error({ error, ip }, "Geolocation lookup failed");
      }
      return null;
    }
  }
}
