import { pgTable, serial, text, jsonb, timestamp, unique, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const transportType = pgEnum("transport_type", ['stdio', 'http', 'sse'])


export const mcpServers = pgTable("mcp_servers", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	url: text().notNull(),
	headers: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	transportType: transportType("transport_type").default('http').notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	email: text().notNull(),
	password: text().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);
