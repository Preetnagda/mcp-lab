import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashWithSalt } from "@/lib/crypt";

export type User = {
	id: number,
	firstName: string,
	lastName: string,
	email: string,
	password: string
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

export const createUser = async (input: NewUserInput): Promise<User> => {
  const existing = await db.select().from(users).where(eq(users.email, input.email));
  if (existing.length > 0) {
    throw new Error("Email already registered");
  }

  const passwordHash = await hashWithSalt(input.password);
  const inserted = await db.insert(users)
    .values({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: passwordHash,
    })
    .returning();

  return inserted[0];
}
