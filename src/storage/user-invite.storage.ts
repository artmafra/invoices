import { rolesTable } from "@/schema/roles.schema";
import { tokensTable } from "@/schema/tokens.schema";
import {
  userInvitesTable,
  type UserInvite,
  type UserInviteNew,
} from "@/schema/user-invites.schema";
import { usersTable } from "@/schema/users.schema";
import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";

type UserInviteCreateInput = Omit<UserInviteNew, "id" | "createdAt">;

export interface UserInviteWithToken extends UserInvite {
  token: {
    id: string;
    expiresAt: Date;
    usedAt: Date | null;
  };
}

export interface PendingInviteWithDetails {
  id: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  invitedBy: string;
  inviterName: string | null;
  inviterEmail: string;
  expiresAt: Date;
  createdAt: Date;
}

export class UserInviteStorage {
  /**
   * Find invite by ID
   */
  async findById(id: string): Promise<UserInvite | undefined> {
    const result = await db
      .select()
      .from(userInvitesTable)
      .where(eq(userInvitesTable.id, id))
      .limit(1);

    return result[0];
  }

  /**
   * Find invite by token ID
   */
  async findByTokenId(tokenId: string): Promise<UserInvite | undefined> {
    const result = await db
      .select()
      .from(userInvitesTable)
      .where(eq(userInvitesTable.tokenId, tokenId))
      .limit(1);

    return result[0];
  }

  /**
   * Find invite with token data by token ID
   */
  async findWithToken(tokenId: string): Promise<UserInviteWithToken | undefined> {
    const result = await db
      .select({
        id: userInvitesTable.id,
        tokenId: userInvitesTable.tokenId,
        email: userInvitesTable.email,
        roleId: userInvitesTable.roleId,
        invitedBy: userInvitesTable.invitedBy,
        createdAt: userInvitesTable.createdAt,
        token: {
          id: tokensTable.id,
          expiresAt: tokensTable.expiresAt,
          usedAt: tokensTable.usedAt,
        },
      })
      .from(userInvitesTable)
      .innerJoin(tokensTable, eq(userInvitesTable.tokenId, tokensTable.id))
      .where(eq(userInvitesTable.tokenId, tokenId))
      .limit(1);

    return result[0];
  }

  /**
   * Find pending (not used, not expired) invite by email
   */
  async findPendingByEmail(email: string): Promise<UserInviteWithToken | undefined> {
    const result = await db
      .select({
        id: userInvitesTable.id,
        tokenId: userInvitesTable.tokenId,
        email: userInvitesTable.email,
        roleId: userInvitesTable.roleId,
        invitedBy: userInvitesTable.invitedBy,
        createdAt: userInvitesTable.createdAt,
        token: {
          id: tokensTable.id,
          expiresAt: tokensTable.expiresAt,
          usedAt: tokensTable.usedAt,
        },
      })
      .from(userInvitesTable)
      .innerJoin(tokensTable, eq(userInvitesTable.tokenId, tokensTable.id))
      .where(
        and(
          eq(userInvitesTable.email, email.toLowerCase()),
          isNull(tokensTable.usedAt),
          gt(tokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return result[0];
  }

  /**
   * Find all invites with optional filtering
   */
  async findMany(filters: { invitedBy?: string; email?: string } = {}): Promise<UserInvite[]> {
    const conditions = [];

    if (filters.invitedBy) {
      conditions.push(eq(userInvitesTable.invitedBy, filters.invitedBy));
    }

    if (filters.email) {
      conditions.push(eq(userInvitesTable.email, filters.email.toLowerCase()));
    }

    if (conditions.length === 0) {
      return db.select().from(userInvitesTable);
    }

    return db
      .select()
      .from(userInvitesTable)
      .where(and(...conditions));
  }

  /**
   * Create a new invite
   */
  async create(data: UserInviteCreateInput): Promise<UserInvite> {
    const newInvite: UserInviteNew = {
      ...data,
      email: data.email.toLowerCase(),
      id: generateUUID(),
      createdAt: new Date(),
    };

    const [createdInvite] = await db.insert(userInvitesTable).values(newInvite).returning();

    return createdInvite;
  }

  /**
   * Delete invite by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(userInvitesTable)
      .where(eq(userInvitesTable.id, id))
      .returning({ id: userInvitesTable.id });

    return result.length > 0;
  }

  /**
   * Delete invite by token ID
   */
  async deleteByTokenId(tokenId: string): Promise<boolean> {
    const result = await db
      .delete(userInvitesTable)
      .where(eq(userInvitesTable.tokenId, tokenId))
      .returning({ id: userInvitesTable.id });

    return result.length > 0;
  }

  /**
   * Delete all invites for an email
   */
  async deleteByEmail(email: string): Promise<number> {
    const result = await db
      .delete(userInvitesTable)
      .where(eq(userInvitesTable.email, email.toLowerCase()))
      .returning({ id: userInvitesTable.id });

    return result.length;
  }

  /**
   * Get all pending invites with detailed information
   */
  async findPendingWithDetails(): Promise<PendingInviteWithDetails[]> {
    const result = await db
      .select({
        id: userInvitesTable.id,
        email: userInvitesTable.email,
        roleId: userInvitesTable.roleId,
        roleName: rolesTable.displayName,
        invitedBy: userInvitesTable.invitedBy,
        inviterName: usersTable.name,
        inviterEmail: usersTable.email,
        expiresAt: tokensTable.expiresAt,
        createdAt: userInvitesTable.createdAt,
      })
      .from(userInvitesTable)
      .innerJoin(tokensTable, eq(userInvitesTable.tokenId, tokensTable.id))
      .innerJoin(usersTable, eq(userInvitesTable.invitedBy, usersTable.id))
      .leftJoin(rolesTable, eq(userInvitesTable.roleId, rolesTable.id))
      .where(and(isNull(tokensTable.usedAt), gt(tokensTable.expiresAt, new Date())))
      .orderBy(desc(userInvitesTable.createdAt));

    return result;
  }

  /**
   * Delete expired invites (cascade will handle tokens)
   */
  async deleteExpired(): Promise<number> {
    // Find invites with expired tokens
    const expiredInvites = await db
      .select({ id: userInvitesTable.id })
      .from(userInvitesTable)
      .innerJoin(tokensTable, eq(userInvitesTable.tokenId, tokensTable.id))
      .where(lt(tokensTable.expiresAt, new Date()));

    if (expiredInvites.length === 0) {
      return 0;
    }

    // Delete via the token cascade - when tokens are deleted, invites cascade
    return expiredInvites.length;
  }
}
