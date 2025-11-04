import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, ApiKey, providers } from "@/db/schema";

export type CreateApiKeyInput = {
  userId: number;
  key: string;
  provider: ApiKey["provider"];
};

type Provider = (typeof providers.enumValues)[number];
export type ApiKeySummary = Record<Provider, string | null>;

export const createApiKey = async (input: CreateApiKeyInput): Promise<ApiKey> => {
  const [inserted] = await db
    .insert(apiKeys)
    .values({
      userId: input.userId,
      key: input.key,
      provider: input.provider,
    })
    .returning();

  if (!inserted) {
    throw new Error("Failed to create API key");
  }

  return inserted;
};

export const getUserApiKeys = async (userId: number): Promise<ApiKey[]> => {
  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));

  return keys;
};

export const summarizeUserApiKeys = async (userId: number): Promise<ApiKeySummary> => {
  const keys = await getUserApiKeys(userId);

  const summary = providers.enumValues.reduce<ApiKeySummary>((acc, provider) => {
    acc[provider] = null;
    return acc;
  }, {} as ApiKeySummary);

  keys.forEach((record) => {
    summary[record.provider] = record.key;
  });

  return summary;
};

export const deleteApiKey = async (userId: number, apiKeyId: number): Promise<boolean> => {
  const deleted = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, apiKeyId), eq(apiKeys.userId, userId)))
    .returning({ id: apiKeys.id });

  return deleted.length > 0;
};
