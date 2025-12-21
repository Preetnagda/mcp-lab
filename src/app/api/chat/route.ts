import { streamText, UIMessage, convertToModelMessages, ToolSet, jsonSchema, stepCountIs } from 'ai';
import { auth } from '@/auth';
import { getMCPServers } from '@/services/mcp-service';
import { ChatConfigurationModelOption } from '@/components/chat/configuration';
import { McpTool } from '@/lib/mcp/types';
import { McpConnectionManager } from '@/lib/mcp/manager';
import { TransportType } from '@/lib/mcp/manager';
import { getModel } from '@/lib/llm';
import { ApiKey } from '@/db/schema';
import { getUserApiKeys } from '@/services/key-service';

export const maxDuration = 120 // 2 minutes

interface ChatRequest {
	model: ChatConfigurationModelOption;
	tools: McpTool[];
	messages: UIMessage[];
	mcpServerId: number;
}

export async function POST(req: Request) {
	const session = await auth();
	if (!session || !session.user) {
		return new Response('Unauthorized', { status: 401 });
	}
	const { messages, mcpServerId, tools, model }: ChatRequest = await req.json();

	const servers = await getMCPServers(session, { ids: [mcpServerId] });
	const apiKeys = await getUserApiKeys(session.user.id);
	if (servers.length === 0) {
		return new Response('MCP Server not found', { status: 404 });
	}
	const server = servers[0];
	let apiKeyToUse = '';
	for (const apiKey of apiKeys) {
		if (apiKey.provider === model.provider) {
			apiKeyToUse = apiKey.key;
			break;
		}
	}
	if (!apiKeyToUse) {
		return new Response('API key for selected model provider not found', { status: 400 });
	}

	const { url, headers, transportType, id } = server;

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
					headers as Record<string, string>,
					id,
					session
				)
			}
		} as any
	});

	const provider = model.provider;

	const result = streamText({
		model: getModel(provider as ApiKey['provider'], model.value, apiKeyToUse),
		tools: allTools,
		messages: convertToModelMessages(messages),
		stopWhen: stepCountIs(5)
	});

	return result.toUIMessageStreamResponse();
}
