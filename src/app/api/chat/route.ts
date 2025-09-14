import { openai } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages } from 'ai';

export const maxDuration = 2 * 60 // 2 minutes

export async function POST(req: Request) {
	const { messages }: { messages: UIMessage[] } = await req.json();

	const result = streamText({
		model: openai('gpt-4o'),
		messages: convertToModelMessages(messages),
	});

	return result.toUIMessageStreamResponse();
}
