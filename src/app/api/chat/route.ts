import { openai } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages, ToolSet, jsonSchema, stepCountIs } from 'ai';
import { auth } from '@/auth';
import { getMCPServers } from '@/services/mcp-service';
import { ChatConfigurationModelOption } from '@/components/chat/configuration';
import { McpTool } from '@/lib/mcp/types';
import { McpConnectionManager } from '@/lib/mcp/manager';
import { TransportType } from '@/lib/mcp/manager';

export const maxDuration = 2 * 60 // 2 minutes

interface ChatRequest {
	model: ChatConfigurationModelOption;
	tools: McpTool[];
	messages: UIMessage[];
	mcpServerId: number;
}

export async function POST(req: Request) {
	const session = await auth();
	if (!session) {
		return new Response('Unauthorized', { status: 401 });
	}
	const { messages, mcpServerId, tools, model }: ChatRequest = await req.json();

	const servers = await getMCPServers(session, { ids: [mcpServerId] });
	if (servers.length === 0) {
		return new Response('MCP Server not found', { status: 404 });
	}
	const server = servers[0];

	const { url, headers, transportType } = server;

	let allTools: ToolSet = {};
	tools.map(tool => {
		allTools[tool.name] = {
			...tool,
			inputSchema: jsonSchema(tool.inputSchema as any),
			execute: async (toolArgs: any) => {
				return await McpConnectionManager.callTool(
					url,
					transportType as TransportType,
					tool.name,
					toolArgs,
					headers as Record<string, string>
				)
			}
		} as any
	});

	console.log(allTools);
	const result = streamText({
		model: openai(model.value),
		tools: allTools,
		messages: convertToModelMessages(messages),
		stopWhen: stepCountIs(5)
	});

	return result.toUIMessageStreamResponse();
}
