"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function CredentialsLoginForm() {
	const searchParams = useSearchParams();
	const error = searchParams.get("error");
	const [isLoading, setIsLoading] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);
		setFormError(null);

		const formData = new FormData(e.currentTarget);
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		try {
			const result = await signIn("credentials", {
				email,
				password,
				redirect: false,
			});

			if (result?.error) {
				setFormError("Invalid email or password");
			} else if (result?.ok) {
				window.location.href = "/dashboard";
			}
		} catch (err) {
			setFormError("An unexpected error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	const getErrorMessage = () => {
		if (formError) return formError;
		if (error === "CredentialsSignin") return "Invalid email or password";
		if (error) return "An error occurred during sign in";
		return null;
	};

	const errorMessage = getErrorMessage();

	return (
		<div className="max-w-xl min-w-md">
			<form
				onSubmit={handleSubmit}
				className="bg-white dark:bg-card shadow-md rounded-lg px-8 py-8 space-y-6"
			>
				{errorMessage && (
					<div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
						{errorMessage}
					</div>
				)}
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
						disabled={isLoading}
						className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
					>
						{isLoading ? "Signing in..." : "Login"}
					</button>
				</div>
				<div className="mt-2 w-full flex justify-center">
					<span className="text-muted-foreground text-sm">Don&apos;t have an account? <Link className="text-foreground" href="/auth/register">Register</Link></span>
				</div>
			</form>
		</div>
	)
}