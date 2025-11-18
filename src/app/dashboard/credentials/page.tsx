import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { providers, ApiKey } from "@/db/schema";
import {
  summarizeUserApiKeys,
  getUserApiKeys,
  createApiKey,
  deleteApiKey,
} from "@/services/key-service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Provider = (typeof providers.enumValues)[number];

const providerNames: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

async function upsertApiKeyAction(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const userId = session.user.id;
  const provider = formData.get("provider");
  const key = formData.get("key");

  if (typeof provider !== "string" || typeof key !== "string") {
    throw new Error("Invalid form submission");
  }

  const trimmedKey = key.trim();
  if (!trimmedKey) {
    throw new Error("API key is required");
  }

  const existingKeys = await getUserApiKeys(userId);
  const current = existingKeys.find((item) => item.provider === provider);
  if (current) {
    await deleteApiKey(userId, current.id);
  }

  await createApiKey({
    userId,
    provider: provider as ApiKey["provider"],
    key: trimmedKey,
  });

  revalidatePath("/dashboard/credentials");
}

async function removeApiKeyAction(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const userId = session.user.id;
  const apiKeyId = formData.get("apiKeyId");

  if (typeof apiKeyId !== "string" || apiKeyId.length === 0) {
    return;
  }

  const parsedId = Number(apiKeyId);
  if (Number.isNaN(parsedId)) {
    return;
  }

  await deleteApiKey(userId, parsedId);
  revalidatePath("/dashboard/credentials");
}

export default async function CredentialsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const userId = session.user.id;
  const [summary, existingKeys] = await Promise.all([
    summarizeUserApiKeys(userId),
    getUserApiKeys(userId),
  ]);

  const keysByProvider = existingKeys.reduce<Partial<Record<Provider, ApiKey>>>(
    (acc, entry) => {
      acc[entry.provider as Provider] = entry;
      return acc;
    },
    {},
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-6 md:grid-cols-2">
        {providers.enumValues.map((provider) => {
          const typedProvider = provider as Provider;
          const friendlyName = providerNames[typedProvider] ?? provider;
          const inputId = `${provider}-api-key`;
          const existingKey = summary[typedProvider];
          const existingRecord = keysByProvider[typedProvider];

          return (
            <Card key={provider}>
              <CardHeader>
                <CardTitle>{friendlyName}</CardTitle>
                <CardDescription>
                  {existingKey
                    ? "Update or remove your saved key."
                    : "Add an API key to use this provider."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={upsertApiKeyAction} className="space-y-4">
                  <input type="hidden" name="provider" value={provider} />
                  <div className="space-y-2">
                    <Label htmlFor={inputId}>API key</Label>
                    <Input
                      id={inputId}
                      name="key"
                      defaultValue={existingKey ?? ""}
                      placeholder={`Enter your ${friendlyName} API key`}
                      required
                    />
                  </div>
                  <Button type="submit">
                    {existingKey ? "Update key" : "Add key"}
                  </Button>
                </form>
                <form action={removeApiKeyAction}>
                  {existingRecord ? (
                    <input type="hidden" name="apiKeyId" value={existingRecord.id} />
                  ) : null}
                  <Button type="submit" variant="outline" disabled={!existingRecord}>
                    Delete key
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
