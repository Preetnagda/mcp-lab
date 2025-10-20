// Import transport implementations
import { McpConnectionResult, McpToolCallResult } from '@/lib/mcp/types';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import ClientWrapper from '@/lib/mcp/client-wrapper';

export type TransportType = 'stdio' | 'http';
type TransportConstructor = new (...args: any[]) => Transport;

// Connection manager that delegates to appropriate transport implementations
export class McpConnectionManager {
	private static transports: Map<TransportType, TransportConstructor> = new Map([
		['http', StreamableHTTPClientTransport],
	]);

	private static getTransport(transportType: TransportType, url: string, headers: Record<string, string>): Transport {
		const TransportClass = this.transports.get(transportType);
		if (!TransportClass) {
			throw new Error(`Unsupported transport type: ${transportType}`);
		}
		const transport = new TransportClass(new URL(url), {
			requestInit: {
				headers
			}
		});

		return transport;
	}

	static async connect(
		url: string,
		transportType: TransportType,
		headers: Record<string, string> = {}
	): Promise<McpConnectionResult> {
		try {
			const transport = this.getTransport(transportType, url, headers);
			const clientWrapper = new ClientWrapper();
			const client = clientWrapper.getClient();
			await client.connect(transport);

			const toolsResult = await client.listTools();
			const tools = toolsResult.tools;

			return {
				tools,
				capabilities: {
					tools: { listChanged: true },
					resources: { subscribe: true, listChanged: true },
				},
			};

		} catch (error) {
			console.error('MCP connection error:', error);
			throw error;
		}
	}

	static async callTool(
		url: string,
		transportType: TransportType,
		toolName: string,
		toolArgs: { [x: string]: unknown } = {},
		headers: Record<string, string> = {}
	): Promise<McpToolCallResult> {
		try {
			const transport = this.getTransport(transportType, url, headers);
			const clientWrapper = new ClientWrapper();
			const client = clientWrapper.getClient();
			await client.connect(transport);
			console.log({
				toolName,
				toolArgs
			});
			return await client.callTool({
				name: toolName,
				arguments: toolArgs
			});
		} catch (error) {
			console.error('MCP tool call error:', error);
			throw error;
		}
	}

	// Method to get available transports
	static getAvailableTransports(): Map<TransportType, TransportConstructor> {
		return new Map(this.transports);
	}
} 
