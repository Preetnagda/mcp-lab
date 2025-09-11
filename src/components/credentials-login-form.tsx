"use client"

import Link from "next/link";

interface CredentialsLoginFormProps {
	submitUrl: string
}

export function CredentialsLoginForm({ submitUrl }: CredentialsLoginFormProps) {

	return (
		<div className="max-w-xl min-w-md">
			<form action={submitUrl} method="POST" className="bg-white dark:bg-card shadow-md rounded-lg px-8 py-8 space-y-6">
				<div>
					<label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						autoComplete="email"
						required
						className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
					/>
				</div>
				<div>
					<label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						autoComplete="current-password"
						required
						className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
					/>
				</div>
				<div>
					<button
						type="submit"
						className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 transition-colors"
					>
						Login
					</button>
					<span className="text-muted-foreground text-sm w-full mt-4">Don't have an account? <Link className="text-foreground" href="/auth/register">Register</Link></span>
				</div>
			</form>
		</div>
	)
}
