import { openai } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages } from 'ai';

export const maxDuration = 2 * 60 // 2 minutes

interface ChatRequest {
	model: string;
	mcpServerIds: string[];
	messages: UIMessage[];
}

export async function POST(req: Request) {
	const { messages, mcpServerIds, model }: ChatRequest = await req.json();

	const result = streamText({
		model: openai(model),
		messages: convertToModelMessages(messages),
	});

	return result.toUIMessageStreamResponse();
}
