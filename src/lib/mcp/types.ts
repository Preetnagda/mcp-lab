import { Client } from '@modelcontextprotocol/sdk/client';

type McpTools = Awaited<ReturnType<Client['listTools']>>['tools'];
export type McpTool = McpTools[number];

type McpResources = Awaited<ReturnType<Client['listResources']>>['resources'];
export type McpResource = McpResources[number];

export interface McpConnectionResult {
	tools: McpTools;
	resources?: McpResources;
	capabilities: Record<string, unknown>;
}

export type McpToolCallResult = Awaited<ReturnType<Client['callTool']>>;

