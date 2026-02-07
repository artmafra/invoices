import {
  emailChangeRequestsTable,
  type EmailChangeRequest,
  type EmailChangeRequestNew,
} from "@/schema/email-change-requests.schema";
import { tokensTable } from "@/schema/tokens.schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { generateUUID } from "@/lib/uuid";
import { db } from "@/db/postgres";

type EmailChangeRequestCreateInput = Omit<EmailChangeRequestNew, "id" | "createdAt">;

export interface EmailChangeRequestWithToken extends EmailChangeRequest {
  token: {
    id: string;
    userId: string;
    expiresAt: Date;
    usedAt: Date | null;
  };
}

export class EmailChangeRequestStorage {
  /**
   * Find request by ID
   */
  async findById(id: string): Promise<EmailChangeRequest | undefined> {
    const result = await db
      .select()
      .from(emailChangeRequestsTable)
      .where(eq(emailChangeRequestsTable.id, id))
      .limit(1);

    return result[0];
  }

  /**
   * Find request by token ID
   */
  async findByTokenId(tokenId: string): Promise<EmailChangeRequest | undefined> {
    const result = await db
      .select()
      .from(emailChangeRequestsTable)
      .where(eq(emailChangeRequestsTable.tokenId, tokenId))
      .limit(1);

    return result[0];
  }

  /**
   * Find request with token data by token ID
   */
  async findWithToken(tokenId: string): Promise<EmailChangeRequestWithToken | undefined> {
    const result = await db
      .select({
        id: emailChangeRequestsTable.id,
        tokenId: emailChangeRequestsTable.tokenId,
        newEmail: emailChangeRequestsTable.newEmail,
        createdAt: emailChangeRequestsTable.createdAt,
        token: {
          id: tokensTable.id,
          userId: tokensTable.userId,
          expiresAt: tokensTable.expiresAt,
          usedAt: tokensTable.usedAt,
        },
      })
      .from(emailChangeRequestsTable)
      .innerJoin(tokensTable, eq(emailChangeRequestsTable.tokenId, tokensTable.id))
      .where(eq(emailChangeRequestsTable.tokenId, tokenId))
      .limit(1);

    return result[0];
  }

  /**
   * Find pending (not used, not expired) request for a user
   */
  async findPendingByUserId(userId: string): Promise<EmailChangeRequestWithToken | undefined> {
    const result = await db
      .select({
        id: emailChangeRequestsTable.id,
        tokenId: emailChangeRequestsTable.tokenId,
        newEmail: emailChangeRequestsTable.newEmail,
        createdAt: emailChangeRequestsTable.createdAt,
        token: {
          id: tokensTable.id,
          userId: tokensTable.userId,
          expiresAt: tokensTable.expiresAt,
          usedAt: tokensTable.usedAt,
        },
      })
      .from(emailChangeRequestsTable)
      .innerJoin(tokensTable, eq(emailChangeRequestsTable.tokenId, tokensTable.id))
      .where(
        and(
          eq(tokensTable.userId, userId),
          isNull(tokensTable.usedAt),
          gt(tokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return result[0];
  }

  /**
   * Create a new email change request
   */
  async create(data: EmailChangeRequestCreateInput): Promise<EmailChangeRequest> {
    const newRequest: EmailChangeRequestNew = {
      ...data,
      id: generateUUID(),
      createdAt: new Date(),
    };

    const [createdRequest] = await db
      .insert(emailChangeRequestsTable)
      .values(newRequest)
      .returning();

    return createdRequest;
  }

  /**
   * Delete request by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(emailChangeRequestsTable)
      .where(eq(emailChangeRequestsTable.id, id))
      .returning({ id: emailChangeRequestsTable.id });

    return result.length > 0;
  }

  /**
   * Delete request by token ID
   */
  async deleteByTokenId(tokenId: string): Promise<boolean> {
    const result = await db
      .delete(emailChangeRequestsTable)
      .where(eq(emailChangeRequestsTable.tokenId, tokenId))
      .returning({ id: emailChangeRequestsTable.id });

    return result.length > 0;
  }
}
