import { accountsTable, type Account, type AccountNew } from "@/schema/accounts.schema";
import { and, eq } from "drizzle-orm";
import { decryptSecret, encryptSecret } from "@/lib/security";
import { db } from "@/db/postgres";
import type { BaseStorage } from "@/storage/types";

/** Token fields that are encrypted at rest */
const TOKEN_FIELDS = ["access_token", "refresh_token", "id_token"] as const;

/**
 * Encrypt token fields before storing in database
 */
function encryptTokenFields<T extends Partial<AccountNew>>(data: T): T {
  const result = { ...data };
  for (const field of TOKEN_FIELDS) {
    const value = result[field as keyof T];
    if (typeof value === "string" && value.length > 0) {
      (result as Record<string, unknown>)[field] = encryptSecret(value);
    }
  }
  return result;
}

/**
 * Decrypt token fields after reading from database
 */
function decryptTokenFields<T extends Account>(account: T): T {
  const result = { ...account };
  for (const field of TOKEN_FIELDS) {
    const value = result[field as keyof T];
    if (typeof value === "string" && value.length > 0) {
      (result as Record<string, unknown>)[field] = decryptSecret(value);
    }
  }
  return result;
}

/**
 * Note: Accounts use composite primary key (provider + providerAccountId).
 * The `findById` method uses the format "provider:providerAccountId" as the ID.
 */
export class AccountStorage implements BaseStorage<Account, AccountNew, Partial<AccountNew>> {
  /**
   * Find account by composite ID (format: "provider:providerAccountId")
   */
  async findById(id: string): Promise<Account | undefined> {
    const [provider, providerAccountId] = id.split(":");
    if (!provider || !providerAccountId) {
      return undefined;
    }
    return this.findByProviderAccount(provider, providerAccountId);
  }

  /**
   * Find all accounts with optional filtering
   */
  async findMany(filters: { userId?: string; provider?: string } = {}): Promise<Account[]> {
    let query = db.select().from(accountsTable);

    if (filters.userId && filters.provider) {
      query = query.where(
        and(eq(accountsTable.userId, filters.userId), eq(accountsTable.provider, filters.provider)),
      ) as typeof query;
    } else if (filters.userId) {
      query = query.where(eq(accountsTable.userId, filters.userId)) as typeof query;
    } else if (filters.provider) {
      query = query.where(eq(accountsTable.provider, filters.provider)) as typeof query;
    }

    const results = await query;
    return results.map(decryptTokenFields);
  }

  /**
   * Find account by provider and provider account ID
   */
  async findByProviderAccount(
    provider: string,
    providerAccountId: string,
  ): Promise<Account | undefined> {
    const result = await db
      .select()
      .from(accountsTable)
      .where(
        and(
          eq(accountsTable.provider, provider),
          eq(accountsTable.providerAccountId, providerAccountId),
        ),
      )
      .limit(1);

    return result[0] ? decryptTokenFields(result[0]) : undefined;
  }

  /**
   * Find all accounts for a user
   */
  async findByUserId(userId: string): Promise<Account[]> {
    const results = await db.select().from(accountsTable).where(eq(accountsTable.userId, userId));
    return results.map(decryptTokenFields);
  }

  /**
   * Find account by user ID and provider
   */
  async findByUserIdAndProvider(userId: string, provider: string): Promise<Account | undefined> {
    const result = await db
      .select()
      .from(accountsTable)
      .where(and(eq(accountsTable.userId, userId), eq(accountsTable.provider, provider)))
      .limit(1);

    return result[0] ? decryptTokenFields(result[0]) : undefined;
  }

  /**
   * Create a new account
   */
  async create(accountData: AccountNew): Promise<Account> {
    const encryptedData = encryptTokenFields(accountData);
    const [createdAccount] = await db.insert(accountsTable).values(encryptedData).returning();

    return decryptTokenFields(createdAccount);
  }

  /**
   * Update account tokens
   */
  async updateTokens(
    provider: string,
    providerAccountId: string,
    tokens: {
      access_token?: string | null;
      refresh_token?: string | null;
      expires_at?: number | null;
    },
  ): Promise<Account | undefined> {
    const encryptedTokens = encryptTokenFields(tokens);
    const [updatedAccount] = await db
      .update(accountsTable)
      .set(encryptedTokens)
      .where(
        and(
          eq(accountsTable.provider, provider),
          eq(accountsTable.providerAccountId, providerAccountId),
        ),
      )
      .returning();

    return updatedAccount ? decryptTokenFields(updatedAccount) : undefined;
  }

  /**
   * Update account by composite ID (format: "provider:providerAccountId")
   */
  async update(id: string, data: Partial<AccountNew>): Promise<Account> {
    const [provider, providerAccountId] = id.split(":");
    if (!provider || !providerAccountId) {
      throw new Error("Invalid account ID format. Expected 'provider:providerAccountId'");
    }

    const encryptedData = encryptTokenFields(data);
    const [updatedAccount] = await db
      .update(accountsTable)
      .set(encryptedData)
      .where(
        and(
          eq(accountsTable.provider, provider),
          eq(accountsTable.providerAccountId, providerAccountId),
        ),
      )
      .returning();

    if (!updatedAccount) {
      throw new Error(`Account with ID ${id} not found`);
    }

    return decryptTokenFields(updatedAccount);
  }

  /**
   * Delete account by composite ID (format: "provider:providerAccountId")
   */
  async delete(id: string): Promise<boolean> {
    const [provider, providerAccountId] = id.split(":");
    if (!provider || !providerAccountId) {
      return false;
    }
    return this.deleteByProviderAccount(provider, providerAccountId);
  }

  /**
   * Delete account by provider and provider account ID
   */
  async deleteByProviderAccount(provider: string, providerAccountId: string): Promise<boolean> {
    const result = await db
      .delete(accountsTable)
      .where(
        and(
          eq(accountsTable.provider, provider),
          eq(accountsTable.providerAccountId, providerAccountId),
        ),
      )
      .returning({ provider: accountsTable.provider });

    return result.length > 0;
  }

  /**
   * Delete all accounts for a user and provider
   */
  async deleteByUserIdAndProvider(userId: string, provider: string): Promise<boolean> {
    const result = await db
      .delete(accountsTable)
      .where(and(eq(accountsTable.userId, userId), eq(accountsTable.provider, provider)))
      .returning({ provider: accountsTable.provider });

    return result.length > 0;
  }

  /**
   * Check if user has account with provider
   */
  async hasProviderAccount(userId: string, provider: string): Promise<boolean> {
    const account = await this.findByUserIdAndProvider(userId, provider);
    return !!account;
  }

  /**
   * Check if provider account is already linked to another user
   */
  async isProviderAccountLinkedToOtherUser(
    provider: string,
    providerAccountId: string,
    userId: string,
  ): Promise<boolean> {
    const account = await this.findByProviderAccount(provider, providerAccountId);
    return !!account && account.userId !== userId;
  }
}
