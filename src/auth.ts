import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { signInSchema } from "@/lib/zod"
import { getUserFromEmail } from "./services/user-service"
import { compareWithHash } from "@/lib/crypt";

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [
		Credentials({
			credentials: {
				email: {},
				password: {}
			},
			authorize: async (credentials) => {
				const { email, password } = await signInSchema.parseAsync(credentials)
				const user = await getUserFromEmail(email);
				if (!user) {
					throw new Error("User not found");
				}
				if (!await compareWithHash(password, user.email)) {
					throw new Error("Invalid credentials.")
				}
				return user;
			}
		})
	],
})
