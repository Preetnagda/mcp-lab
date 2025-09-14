import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { signInSchema } from "@/lib/zod"
import { getUserFromEmail } from "./services/user-service"
import { compareWithHash } from "@/lib/crypt";
import type { Provider } from "next-auth/providers"

const providers: Provider[] = [
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
			// Compare provided password with stored password hash
			if (!await compareWithHash(password, user.password)) {
				throw new Error("Invalid credentials.")
			}
			return {
				id: user.id,
				email: user.email,
				name: user.firstName + " " + user.lastName
			};
		},
	})
]

export const providerMap = providers
	.map((provider) => {
		if (typeof provider === "function") {
			const providerData = provider()
			return { id: providerData.id, name: providerData.name }
		} else {
			return { id: provider.id, name: provider.name }
		}
	})
	.filter((provider) => provider.id !== "credentials")

export const { handlers, auth, signIn, signOut } = NextAuth({
	providers,
	pages: {
		signIn: "/auth/login",
	},
	callbacks: {
		session: ({ session, token }) => {
			//@ts-ignore
			session.user.id = Number(token.sub)
			return session
		}
	}
})
