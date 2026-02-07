import { tokensTable, type Token, type TokenNew, type TokenType } from "@/schema/tokens.schema";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { hashVerificationToken } from "@/lib/security";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";
import type { BaseStorage } from "@/storage/types";

type TokenCreateInput = Omit<TokenNew, "id" | "createdAt" | "tokenHash"> & {
  token: string;
  /** Optional scope for hash (e.g., userId for scoped tokens like 2FA) */
  scope?: string;
};

export class TokenStorage implements BaseStorage<Token, TokenCreateInput, Partial<TokenNew>> {
  /**
   * Find token by ID
   */
  async findById(id: string): Promise<Token | undefined> {
    const result = await db.select().from(tokensTable).where(eq(tokensTable.id, id)).limit(1);

    return result[0];
  }

  /**
   * Find all tokens with optional filtering
   */
  async findMany(filters: { userId?: string; type?: TokenType } = {}): Promise<Token[]> {
    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(tokensTable.userId, filters.userId));
    }

    if (filters.type) {
      conditions.push(eq(tokensTable.type, filters.type));
    }

    if (conditions.length === 0) {
      return db.select().from(tokensTable);
    }

    return db
      .select()
      .from(tokensTable)
      .where(and(...conditions));
  }

  /**
   * Find token by hash (for non-scoped tokens like password_reset, invite)
   */
  async findByHash(type: TokenType, token: string): Promise<Token | undefined> {
    const tokenHash = hashVerificationToken(this.getHashPurpose(type), token);

    const result = await db
      .select()
      .from(tokensTable)
      .where(and(eq(tokensTable.type, type), eq(tokensTable.tokenHash, tokenHash)))
      .limit(1);

    return result[0];
  }

  /**
   * Find valid (not expired, not used) token by hash
   * For non-scoped tokens like password_reset, invite
   */
  async findValidByHash(type: TokenType, token: string): Promise<Token | undefined> {
    const tokenHash = hashVerificationToken(this.getHashPurpose(type), token);

    const result = await db
      .select()
      .from(tokensTable)
      .where(
        and(
          eq(tokensTable.type, type),
          eq(tokensTable.tokenHash, tokenHash),
          isNull(tokensTable.usedAt),
          gt(tokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return result[0];
  }

  /**
   * Find valid token for a specific user (for scoped tokens like 2FA, email_change)
   * The token hash is scoped to the userId for extra security
   */
  async findValidByUserAndToken(
    type: TokenType,
    userId: string,
    token: string,
  ): Promise<Token | undefined> {
    const tokenHash = hashVerificationToken(this.getHashPurpose(type), token, userId);

    const result = await db
      .select()
      .from(tokensTable)
      .where(
        and(
          eq(tokensTable.type, type),
          eq(tokensTable.userId, userId),
          eq(tokensTable.tokenHash, tokenHash),
          isNull(tokensTable.usedAt),
          gt(tokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return result[0];
  }

  /**
   * Create a new token
   */
  async create(tokenData: TokenCreateInput): Promise<Token> {
    const { token, scope, ...rest } = tokenData;

    const tokenHash = hashVerificationToken(this.getHashPurpose(rest.type), token, scope);

    const newToken: TokenNew = {
      ...rest,
      id: generateUUID(),
      createdAt: new Date(),
      tokenHash,
    };

    const [createdToken] = await db.insert(tokensTable).values(newToken).returning();

    return createdToken;
  }

  /**
   * Update a token
   */
  async update(id: string, data: Partial<TokenNew>): Promise<Token> {
    const [updatedToken] = await db
      .update(tokensTable)
      .set(data)
      .where(eq(tokensTable.id, id))
      .returning();

    return updatedToken;
  }

  /**
   * Delete a token by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(tokensTable)
      .where(eq(tokensTable.id, id))
      .returning({ id: tokensTable.id });

    return result.length > 0;
  }

  /**
   * Mark token as used
   */
  async markAsUsed(tokenId: string): Promise<boolean> {
    const result = await db
      .update(tokensTable)
      .set({ usedAt: new Date() })
      .where(eq(tokensTable.id, tokenId))
      .returning({ id: tokensTable.id });

    return result.length > 0;
  }

  /**
   * Delete all unused tokens for a user of a specific type
   */
  async deleteUnusedByUserAndType(userId: string, type: TokenType): Promise<number> {
    const result = await db
      .delete(tokensTable)
      .where(
        and(eq(tokensTable.userId, userId), eq(tokensTable.type, type), isNull(tokensTable.usedAt)),
      )
      .returning({ id: tokensTable.id });

    return result.length;
  }

  /**
   * Invalidate all tokens for a user of a specific type (mark as used)
   */
  async invalidateByUserAndType(userId: string, type: TokenType): Promise<number> {
    const result = await db
      .update(tokensTable)
      .set({ usedAt: new Date() })
      .where(
        and(eq(tokensTable.userId, userId), eq(tokensTable.type, type), isNull(tokensTable.usedAt)),
      )
      .returning({ id: tokensTable.id });

    return result.length;
  }

  /**
   * Delete expired tokens (for cleanup jobs)
   */
  async deleteExpired(): Promise<number> {
    const result = await db
      .delete(tokensTable)
      .where(lt(tokensTable.expiresAt, new Date()))
      .returning({ id: tokensTable.id });

    return result.length;
  }

  /**
   * Delete expired tokens of a specific type
   */
  async deleteExpiredByType(type: TokenType): Promise<number> {
    const result = await db
      .delete(tokensTable)
      .where(and(eq(tokensTable.type, type), lt(tokensTable.expiresAt, new Date())))
      .returning({ id: tokensTable.id });

    return result.length;
  }

  /**
   * Get the hash purpose string for a token type
   * Maps token types to the verification token purpose used in hashVerificationToken
   */
  private getHashPurpose(
    type: TokenType,
  ): "password_reset" | "invite" | "email_change" | "email_verification" | "two_factor_email" {
    const purposeMap: Record<
      TokenType,
      "password_reset" | "invite" | "email_change" | "email_verification" | "two_factor_email"
    > = {
      password_reset: "password_reset",
      user_invite: "invite",
      email_change: "email_change",
      email_verification: "email_verification",
      two_factor_email: "two_factor_email",
    };

    return purposeMap[type];
  }
}
