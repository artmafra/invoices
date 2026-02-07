import {
  passkeyCredentialsTable,
  type PasskeyCredential,
  type PasskeyCredentialNew,
} from "@/schema/passkey-credentials.schema";
import { and, desc, eq } from "drizzle-orm";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";
import type { BaseStorage } from "@/storage/types";

export class PasskeyCredentialStorage implements BaseStorage<
  PasskeyCredential,
  PasskeyCredentialNew,
  Partial<PasskeyCredentialNew>
> {
  /**
   * Find passkey credential by ID
   */
  async findById(id: string): Promise<PasskeyCredential | undefined> {
    const result = await db
      .select()
      .from(passkeyCredentialsTable)
      .where(eq(passkeyCredentialsTable.id, id))
      .limit(1);

    return result[0];
  }

  /**
   * Find passkey credential by credential ID (from WebAuthn)
   */
  async findByCredentialId(credentialId: string): Promise<PasskeyCredential | undefined> {
    const result = await db
      .select()
      .from(passkeyCredentialsTable)
      .where(eq(passkeyCredentialsTable.credentialId, credentialId))
      .limit(1);

    return result[0];
  }

  /**
   * Find all passkey credentials with optional filtering
   */
  async findMany(filters: { userId?: string } = {}): Promise<PasskeyCredential[]> {
    if (filters.userId) {
      return db
        .select()
        .from(passkeyCredentialsTable)
        .where(eq(passkeyCredentialsTable.userId, filters.userId))
        .orderBy(desc(passkeyCredentialsTable.createdAt));
    }

    return db
      .select()
      .from(passkeyCredentialsTable)
      .orderBy(desc(passkeyCredentialsTable.createdAt));
  }

  /**
   * Find all passkey credentials for a user
   */
  async findByUserId(userId: string): Promise<PasskeyCredential[]> {
    return db
      .select()
      .from(passkeyCredentialsTable)
      .where(eq(passkeyCredentialsTable.userId, userId))
      .orderBy(desc(passkeyCredentialsTable.createdAt));
  }

  /**
   * Count passkeys for a user
   */
  async countByUserId(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(passkeyCredentialsTable)
      .where(eq(passkeyCredentialsTable.userId, userId));

    return result.length;
  }

  /**
   * Check if user has any passkeys
   */
  async userHasPasskeys(userId: string): Promise<boolean> {
    const count = await this.countByUserId(userId);
    return count > 0;
  }

  /**
   * Create a new passkey credential
   */
  async create(data: Omit<PasskeyCredentialNew, "id" | "createdAt">): Promise<PasskeyCredential> {
    const newCredential: PasskeyCredentialNew = {
      ...data,
      id: generateUUID(),
      createdAt: new Date(),
    };

    const [created] = await db.insert(passkeyCredentialsTable).values(newCredential).returning();

    return created;
  }

  /**
   * Update passkey credential by ID
   */
  async update(id: string, data: Partial<PasskeyCredentialNew>): Promise<PasskeyCredential> {
    const [updated] = await db
      .update(passkeyCredentialsTable)
      .set(data)
      .where(eq(passkeyCredentialsTable.id, id))
      .returning();

    return updated;
  }

  /**
   * Update passkey credential by credential ID
   */
  async updateByCredentialId(
    credentialId: string,
    data: Partial<PasskeyCredentialNew>,
  ): Promise<PasskeyCredential> {
    const [updated] = await db
      .update(passkeyCredentialsTable)
      .set(data)
      .where(eq(passkeyCredentialsTable.credentialId, credentialId))
      .returning();

    return updated;
  }

  /**
   * Update counter after successful authentication
   */
  async updateCounter(credentialId: string, newCounter: number): Promise<void> {
    await db
      .update(passkeyCredentialsTable)
      .set({
        counter: newCounter,
        lastUsedAt: new Date(),
      })
      .where(eq(passkeyCredentialsTable.credentialId, credentialId));
  }

  /**
   * Delete passkey credential by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(passkeyCredentialsTable)
      .where(eq(passkeyCredentialsTable.id, id))
      .returning({ id: passkeyCredentialsTable.id });

    return result.length > 0;
  }

  /**
   * Delete passkey credential by ID and user ID (for security)
   */
  async deleteByIdAndUserId(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(passkeyCredentialsTable)
      .where(and(eq(passkeyCredentialsTable.id, id), eq(passkeyCredentialsTable.userId, userId)))
      .returning({ id: passkeyCredentialsTable.id });

    return result.length > 0;
  }

  /**
   * Delete all passkeys for a user
   */
  async deleteAllByUserId(userId: string): Promise<number> {
    const result = await db
      .delete(passkeyCredentialsTable)
      .where(eq(passkeyCredentialsTable.userId, userId))
      .returning({ id: passkeyCredentialsTable.id });

    return result.length;
  }
}
