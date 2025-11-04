import { auth } from "@/auth";
import { getUserApiKeys } from "@/services/key-service";
import { NextResponse } from "next/server";

export async function GET() {
	const session = await auth();
	if (!session || !session.user) {
		return new Response('Unauthorized', { status: 401 });
	}
	const userId = session.user.id;
	const userApiKeys = await getUserApiKeys(userId);

	return NextResponse.json(userApiKeys);
}
