import { DrizzleAdapter } from "@auth/drizzle-adapter"
import NextAuth from "next-auth"
import Mailgun from "next-auth/providers/mailgun"
import type { Provider } from "next-auth/providers"
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { Resource } from "sst";

const providers: Provider[] = [
	Mailgun({
		apiKey: Resource.EMAIL_API_KEY.value,
		from: Resource.EMAIL_FROM.value 
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
	adapter: DrizzleAdapter(db, {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
		verificationTokensTable: verificationTokens,
	}),
	providers,
	pages: {
		signIn: "/auth/login",
	},
	callbacks: {
		session: ({ session, user }) => {
			if (user) {
				session.user.id = user.id;
			}
			return session;
		}
	}
})
