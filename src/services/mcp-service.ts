import { Session } from "next-auth";
import { db } from "@/db";
import { mcpServers } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

interface GetMCPServersParams {
	ids?: number[];
}

export const getMCPServers = async (session: Session, params?: GetMCPServersParams) => {
	if (!session.user) {
		return [];
	}

	const andConditions = [eq(mcpServers.userId, session.user.id)];
	if (params) {
		if (params.ids && params.ids.length > 0) {
			andConditions.push(inArray(mcpServers.id, params.ids));
		}
	}

	const queryResults = await db.select().from(mcpServers)
		.where(and(...andConditions))
		.orderBy(desc(mcpServers.createdAt));

	return queryResults;
}

export const getMcpServerForUser = async (session: Session, id: number) => {
	if (!session.user) {
		return null;
	}
	const queryResults = await db.select().from(mcpServers)
		.where(and(eq(mcpServers.userId, session.user.id), eq(mcpServers.id, id)));
	return queryResults[0];
}