import { userEmailsTable, type UserEmail, type UserEmailNew } from "@/schema/user-emails.schema";
import { usersTable } from "@/schema/users.schema";
import { and, eq } from "drizzle-orm";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";

type UserEmailCreateInput = Omit<UserEmailNew, "id" | "createdAt">;

export class UserEmailStorage {
  /**
   * Find email record by ID
   */
  async findById(id: string): Promise<UserEmail | undefined> {
    const result = await db
      .select()
      .from(userEmailsTable)
      .where(eq(userEmailsTable.id, id))
      .limit(1);

    return result[0];
  }

  /**
   * Find email record by email address (case-insensitive)
   */
  async findByEmail(email: string): Promise<UserEmail | undefined> {
    const result = await db
      .select()
      .from(userEmailsTable)
      .where(eq(userEmailsTable.email, email.toLowerCase()))
      .limit(1);

    return result[0];
  }

  /**
   * Find all email records for a user
   */
  async findAllByUserId(userId: string): Promise<UserEmail[]> {
    return db
      .select()
      .from(userEmailsTable)
      .where(eq(userEmailsTable.userId, userId))
      .orderBy(userEmailsTable.createdAt);
  }

  /**
   * Get primary email for a user
   */
  async getPrimaryByUserId(userId: string): Promise<UserEmail | undefined> {
    const result = await db
      .select()
      .from(userEmailsTable)
      .where(and(eq(userEmailsTable.userId, userId), eq(userEmailsTable.isPrimary, true)))
      .limit(1);

    return result[0];
  }

  /**
   * Count emails for a user
   */
  async countByUserId(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(userEmailsTable)
      .where(eq(userEmailsTable.userId, userId));

    return result.length;
  }

  /**
   * Create a new email record
   */
  async create(data: UserEmailCreateInput): Promise<UserEmail> {
    const id = generateUUID();

    const result = await db
      .insert(userEmailsTable)
      .values({
        id,
        userId: data.userId,
        email: data.email.toLowerCase(),
        isPrimary: data.isPrimary ?? false,
        verifiedAt: data.verifiedAt,
      })
      .returning();

    return result[0];
  }

  /**
   * Mark an email as verified
   */
  async markVerified(id: string): Promise<UserEmail | undefined> {
    const result = await db
      .update(userEmailsTable)
      .set({ verifiedAt: new Date() })
      .where(eq(userEmailsTable.id, id))
      .returning();

    return result[0];
  }

  /**
   * Set an email as primary.
   * This is a transaction that:
   * 1. Unsets isPrimary on all other emails for the user
   * 2. Sets isPrimary on the target email
   * 3. Updates users.email to keep it in sync
   */
  async setAsPrimary(id: string, userId: string): Promise<UserEmail | undefined> {
    return db.transaction(async (tx) => {
      // Get the email record first
      const emailRecord = await tx
        .select()
        .from(userEmailsTable)
        .where(eq(userEmailsTable.id, id))
        .limit(1);

      if (!emailRecord[0]) {
        return undefined;
      }

      // Unset isPrimary on all user's emails
      await tx
        .update(userEmailsTable)
        .set({ isPrimary: false })
        .where(eq(userEmailsTable.userId, userId));

      // Set isPrimary on the target email
      const result = await tx
        .update(userEmailsTable)
        .set({ isPrimary: true })
        .where(eq(userEmailsTable.id, id))
        .returning();

      // Sync to users.email for backward compatibility
      await tx
        .update(usersTable)
        .set({
          email: emailRecord[0].email,
          emailVerified: emailRecord[0].verifiedAt,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, userId));

      return result[0];
    });
  }

  /**
   * Delete an email record
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(userEmailsTable).where(eq(userEmailsTable.id, id)).returning();

    return result.length > 0;
  }

  /**
   * Delete all emails for a user (used when deleting user)
   */
  async deleteAllByUserId(userId: string): Promise<number> {
    const result = await db
      .delete(userEmailsTable)
      .where(eq(userEmailsTable.userId, userId))
      .returning();

    return result.length;
  }

  /**
   * Find a verified email for login purposes
   */
  async findVerifiedByEmail(
    email: string,
  ): Promise<(UserEmail & { user: { id: string } }) | undefined> {
    const result = await db
      .select({
        id: userEmailsTable.id,
        userId: userEmailsTable.userId,
        email: userEmailsTable.email,
        isPrimary: userEmailsTable.isPrimary,
        verifiedAt: userEmailsTable.verifiedAt,
        createdAt: userEmailsTable.createdAt,
        user: {
          id: usersTable.id,
        },
      })
      .from(userEmailsTable)
      .innerJoin(usersTable, eq(userEmailsTable.userId, usersTable.id))
      .where(
        and(
          eq(userEmailsTable.email, email.toLowerCase()),
          // Only allow login with verified emails
          // verifiedAt is NOT NULL
          eq(userEmailsTable.verifiedAt, userEmailsTable.verifiedAt), // This is a trick to check NOT NULL
        ),
      )
      .limit(1);

    // Filter out unverified emails manually since SQL trick might not work
    const found = result[0];
    if (found && found.verifiedAt !== null) {
      return found;
    }

    return undefined;
  }
}
