import type { PasskeyCredential } from "@/schema/passkey-credentials.schema";
import type { PasskeyResponse, PasskeysListResponse } from "@/types/auth/passkeys.types";
import { serializeDate } from "./base-dto.helper";

/**
 * Passkey DTO
 * Transforms raw PasskeyCredential entities to API response shapes
 */
export class PasskeyDTO {
  /**
   * Transform raw PasskeyCredential entity to API response
   */
  static toResponse(passkey: PasskeyCredential): PasskeyResponse {
    return {
      id: passkey.id,
      name: passkey.name,
      deviceType: passkey.deviceType,
      backedUp: passkey.backedUp,
      createdAt: passkey.createdAt.toISOString(),
      lastUsedAt: serializeDate(passkey.lastUsedAt),
    };
  }

  /**
   * Transform array of PasskeyCredentials to list response
   */
  static toListResponse(passkeys: PasskeyCredential[]): PasskeysListResponse {
    return {
      passkeys: passkeys.map((passkey) => this.toResponse(passkey)),
    };
  }
}
