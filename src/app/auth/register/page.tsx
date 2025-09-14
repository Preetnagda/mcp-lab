import { createUser } from "@/services/user-service";
import { signUpSchema } from "@/lib/zod";
import { redirect } from "next/navigation";
import Link from "next/link";

async function registerAction(formData: FormData) {
  "use server";

  const data = Object.fromEntries(formData) as Record<string, string>;
  const parsed = await signUpSchema.safeParseAsync({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: data.password,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(message);
  }

  await createUser(parsed.data);
  redirect("/auth/login");
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <form action={registerAction} className="bg-white dark:bg-card shadow-md rounded-lg px-8 py-8 space-y-6 min-w-md max-w-xl w-full">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-muted-foreground mb-1">First name</label>
            <input id="firstName" name="firstName" required className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground" />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-muted-foreground mb-1">Last name</label>
            <input id="lastName" name="lastName" required className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground" />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground" />
        </div>
        <div>
          <button type="submit" className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 transition-colors">Register</button>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

