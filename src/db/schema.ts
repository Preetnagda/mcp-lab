import { pgTable, serial, text, timestamp, jsonb, pgEnum, uuid, bigint, primaryKey, integer } from 'drizzle-orm/pg-core';

// Define transport type enum
export const providers = pgEnum('provider', ['openai', 'anthropic']);
export const transportTypeEnum = pgEnum('transport_type', ['stdio', 'http', 'sse']);

export const mcpServers = pgTable('mcp_servers', {
	userId: uuid('user_id').references(() => users.id).notNull(),
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	url: text('url').notNull(),
	transportType: transportTypeEnum('transport_type').default('http').notNull(),
	headers: jsonb('headers').default({}),
	encryptedAccessToken: text('encrypted_access_token'),
    expiresAt: timestamp('expires_at'),
    tokenType: text('token_type'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const oauthClients = pgTable('oauth_clients', {
	id: serial('id').primaryKey(),
	issuer: text('issuer').notNull().unique(),
	clientId: text('client_id').notNull(),
	clientSecret: text('client_secret'), // Should be encrypted in practice, but adhering to "stores client_id and secret" for now, maybe use helper when inserting
	registrationPayload: jsonb('registration_payload'), // Store full registration response just in case
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
	id: uuid('id').primaryKey(),
	name: text('name'),
	image: text('image'),
	email: text('email').unique().notNull(),
	emailVerified: timestamp('email_verified'),
});

export const accounts = pgTable('accounts', {
	userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	type: text('type').notNull(),
	provider: text('provider').notNull(),
	providerAccountId: text('provider_account_id').notNull(),
	refresh_token: text('refresh_token'),
	access_token: text('access_token'),
	expires_at: integer('expires_at'),
	token_type: text('token_type'),
	scope: text('scope'),
	id_token: text('id_token'),
	session_state: text('session_state'),
}, (account) => ({
	compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] })
}));

export const sessions = pgTable('sessions', {
	sessionToken: text('session_token').primaryKey(),
	userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
	identifier: text('identifier').notNull(),
	token: text('token').notNull(),
	expires: timestamp('expires').notNull(),
}, (vt) => ({
	compoundKey: primaryKey({ columns: [vt.identifier, vt.token] })
}));

export const apiKeys = pgTable('api_keys', {
	id: serial('id').primaryKey(),
	userId: uuid('user_id').references(() => users.id).notNull(),
	key: text('key').notNull(),
	provider: providers('provider').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export type McpServer = typeof mcpServers.$inferSelect;
export type NewMcpServer = typeof mcpServers.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
