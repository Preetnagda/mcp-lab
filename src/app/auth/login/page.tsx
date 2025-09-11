import { CredentialsLoginForm } from "@/components/credentials-login-form"

export default function LoginPage() {
	return <div className="min-h-screen flex items-center justify-center">
		<CredentialsLoginForm submitUrl="/api/auth" />
	</div>
}
