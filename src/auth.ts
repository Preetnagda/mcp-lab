import { DrizzleAdapter } from "@auth/drizzle-adapter"
import NextAuth from "next-auth"
import Nodemailer from "next-auth/providers/nodemailer"
import type { Provider } from "next-auth/providers"
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

const providers: Provider[] = [
	Nodemailer({
		server: process.env.EMAIL_SERVER,
		from: process.env.EMAIL_FROM
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
