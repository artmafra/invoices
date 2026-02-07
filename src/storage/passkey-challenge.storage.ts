import {
  passkeyChallengesTable,
  type PasskeyChallenge,
  type PasskeyChallengeNew,
} from "@/schema/passkey-challenges.schema";
import { and, eq, lt } from "drizzle-orm";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";
import type { BaseStorage } from "@/storage/types";

// Challenge expiration time: 5 minutes
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;

export class PasskeyChallengeStorage implements BaseStorage<
  PasskeyChallenge,
  PasskeyChallengeNew,
  Partial<PasskeyChallengeNew>
> {
  /**
   * Find challenge by ID
   */
  async findById(id: string): Promise<PasskeyChallenge | undefined> {
    const result = await db
      .select()
      .from(passkeyChallengesTable)
      .where(eq(passkeyChallengesTable.id, id))
      .limit(1);

    return result[0];
  }

  /**
   * Find challenge by challenge string
   */
  async findByChallenge(challenge: string): Promise<PasskeyChallenge | undefined> {
    const result = await db
      .select()
      .from(passkeyChallengesTable)
      .where(eq(passkeyChallengesTable.challenge, challenge))
      .limit(1);

    return result[0];
  }

  /**
   * Find valid (non-expired) challenge
   */
  async findValidChallenge(challenge: string): Promise<PasskeyChallenge | undefined> {
    const now = new Date();
    const result = await db
      .select()
      .from(passkeyChallengesTable)
      .where(
        and(
          eq(passkeyChallengesTable.challenge, challenge),
          // Challenge must not be expired
        ),
      )
      .limit(1);

    // Check expiration manually for better clarity
    const found = result[0];
    if (found && found.expiresAt > now) {
      return found;
    }
    return undefined;
  }

  /**
   * Find all challenges with optional filtering
   */
  async findMany(filters: { userId?: string; type?: string } = {}): Promise<PasskeyChallenge[]> {
    if (filters.userId) {
      return db
        .select()
        .from(passkeyChallengesTable)
        .where(eq(passkeyChallengesTable.userId, filters.userId));
    }

    if (filters.type) {
      return db
        .select()
        .from(passkeyChallengesTable)
        .where(eq(passkeyChallengesTable.type, filters.type));
    }

    return db.select().from(passkeyChallengesTable);
  }

  /**
   * Create a new challenge
   */
  async create(
    data: Omit<PasskeyChallengeNew, "id" | "createdAt" | "expiresAt">,
  ): Promise<PasskeyChallenge> {
    const now = new Date();
    const newChallenge: PasskeyChallengeNew = {
      ...data,
      id: generateUUID(),
      createdAt: now,
      expiresAt: new Date(now.getTime() + CHALLENGE_EXPIRY_MS),
    };

    const [created] = await db.insert(passkeyChallengesTable).values(newChallenge).returning();

    return created;
  }

  /**
   * Update challenge by ID
   */
  async update(id: string, data: Partial<PasskeyChallengeNew>): Promise<PasskeyChallenge> {
    const [updated] = await db
      .update(passkeyChallengesTable)
      .set(data)
      .where(eq(passkeyChallengesTable.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete challenge by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(passkeyChallengesTable)
      .where(eq(passkeyChallengesTable.id, id))
      .returning({ id: passkeyChallengesTable.id });

    return result.length > 0;
  }

  /**
   * Delete challenge by challenge string (after use)
   */
  async deleteByChallenge(challenge: string): Promise<boolean> {
    const result = await db
      .delete(passkeyChallengesTable)
      .where(eq(passkeyChallengesTable.challenge, challenge))
      .returning({ id: passkeyChallengesTable.id });

    return result.length > 0;
  }

  /**
   * Clean up expired challenges
   */
  async deleteExpired(): Promise<number> {
    const result = await db
      .delete(passkeyChallengesTable)
      .where(lt(passkeyChallengesTable.expiresAt, new Date()))
      .returning({ id: passkeyChallengesTable.id });

    return result.length;
  }

  /**
   * Delete all challenges for a user
   */
  async deleteByUserId(userId: string): Promise<number> {
    const result = await db
      .delete(passkeyChallengesTable)
      .where(eq(passkeyChallengesTable.userId, userId))
      .returning({ id: passkeyChallengesTable.id });

    return result.length;
  }

  /**
   * Delete all challenges for a user with a specific type
   */
  async deleteByUserIdAndType(userId: string, type: string): Promise<number> {
    const result = await db
      .delete(passkeyChallengesTable)
      .where(and(eq(passkeyChallengesTable.userId, userId), eq(passkeyChallengesTable.type, type)))
      .returning({ id: passkeyChallengesTable.id });

    return result.length;
  }
}
