import { pgTable, serial, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Define transport type enum
export const transportTypeEnum = pgEnum('transport_type', ['stdio', 'http', 'sse']);

export const mcpServers = pgTable('mcp_servers', {
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

export type McpServer = typeof mcpServers.$inferSelect;
export type NewMcpServer = typeof mcpServers.$inferInsert; 
