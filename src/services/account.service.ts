import type { Account, AccountNew } from "@/schema/accounts.schema";
import { accountStorage } from "@/storage/runtime/account";

/**
 * Service layer for account operations.
 * Provides business logic abstraction over account storage.
 */
export class AccountService {
  /**
   * Get account by user ID and provider
   */
  async getAccountByUserAndProvider(userId: string, provider: string): Promise<Account | null> {
    const account = await accountStorage.findByUserIdAndProvider(userId, provider);
    return account ?? null;
  }

  /**
   * Get all accounts for a user
   */
  async getAccountsByUserId(userId: string): Promise<Account[]> {
    return accountStorage.findByUserId(userId);
  }

  /**
   * Get account by provider and provider account ID
   */
  async getAccountByProviderAccount(
    provider: string,
    providerAccountId: string,
  ): Promise<Account | null> {
    const account = await accountStorage.findByProviderAccount(provider, providerAccountId);
    return account ?? null;
  }

  /**
   * Check if user has a provider account linked
   */
  async hasProviderLinked(userId: string, provider: string): Promise<boolean> {
    return accountStorage.hasProviderAccount(userId, provider);
  }

  /**
   * Check if a provider account is linked to a different user
   */
  async isProviderLinkedToOtherUser(
    provider: string,
    providerAccountId: string,
    currentUserId: string,
  ): Promise<boolean> {
    return accountStorage.isProviderAccountLinkedToOtherUser(
      provider,
      providerAccountId,
      currentUserId,
    );
  }

  /**
   * Create a new account (link provider to user)
   */
  async createAccount(accountData: AccountNew): Promise<Account> {
    return accountStorage.create(accountData);
  }

  /**
   * Update account tokens
   */
  async updateAccountTokens(
    provider: string,
    providerAccountId: string,
    tokens: {
      access_token?: string | null;
      refresh_token?: string | null;
      expires_at?: number | null;
    },
  ): Promise<Account | null> {
    const account = await accountStorage.updateTokens(provider, providerAccountId, tokens);
    return account ?? null;
  }

  /**
   * Delete account by user ID and provider
   */
  async deleteAccountByUserAndProvider(userId: string, provider: string): Promise<boolean> {
    return accountStorage.deleteByUserIdAndProvider(userId, provider);
  }

  /**
   * Delete account by provider account ID
   */
  async deleteAccountByProviderAccount(
    provider: string,
    providerAccountId: string,
  ): Promise<boolean> {
    return accountStorage.deleteByProviderAccount(provider, providerAccountId);
  }
}
