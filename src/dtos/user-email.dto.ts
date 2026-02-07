import type { UserEmail } from "@/schema/user-emails.schema";
import type { UserEmailResponse, UserEmailsListResponse } from "@/types/users/user-emails.types";
import { serializeDate } from "./base-dto.helper";

/**
 * User Email DTO
 * Transforms raw UserEmail entities to API response shapes
 */
export class UserEmailDTO {
  /**
   * Transform raw UserEmail entity to API response
   */
  static toResponse(email: UserEmail): UserEmailResponse {
    return {
      id: email.id,
      email: email.email,
      isPrimary: email.isPrimary,
      isVerified: email.verifiedAt !== null,
      verifiedAt: serializeDate(email.verifiedAt),
      createdAt: email.createdAt.toISOString(),
    };
  }

  /**
   * Transform array of UserEmails to list response
   */
  static toListResponse(emails: UserEmail[]): UserEmailsListResponse {
    return {
      emails: emails.map((email) => this.toResponse(email)),
    };
  }
}
