import { pgTable, serial, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Define transport type enum
export const providers = pgEnum('provider', ['openai', 'anthropic']);
export const transportTypeEnum = pgEnum('transport_type', ['stdio', 'http', 'sse']);

export const mcpServers = pgTable('mcp_servers', {
	userId: serial('user_id').references(() => users.id).notNull(),
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	url: text('url').notNull(),
	transportType: transportTypeEnum('transport_type').default('http').notNull(),
	headers: jsonb('headers').default({}),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	email: text('email').unique().notNull(),
	password: text('password').notNull(),
});

export const apiKeys = pgTable('api_keys', {
	id: serial('id').primaryKey(),
	userId: serial('user_id').references(() => users.id).notNull(),
	key: text('key').notNull(),
	provider: providers('provider').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export type McpServer = typeof mcpServers.$inferSelect;
export type NewMcpServer = typeof mcpServers.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
