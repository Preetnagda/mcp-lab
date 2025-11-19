import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export type User = {
	id: string,
	name: string | null,
	email: string,
}

export const getUserFromEmail = async (email: string): Promise<User | null> => {
	const foundUsers = await db.select().from(users).where(eq(users.email, email));
	if (foundUsers.length == 1) {
		return foundUsers[0];
	}

	return null;
} 

export type NewUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}
