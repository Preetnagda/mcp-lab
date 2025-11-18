import { EmailLoginForm } from "@/components/email-login-form"
import { auth } from "@/auth";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function LoginPage() {
	const session = await auth();
	if (session?.user) {
		redirect("/dashboard");
	}
	return (
		<div className="min-h-screen flex flex-col items-center justify-center">
			<Image src="/logo.png" alt="MCP Lab" width={300} height={300} className="mb-8" />
			<EmailLoginForm />
		</div>
	);
}
