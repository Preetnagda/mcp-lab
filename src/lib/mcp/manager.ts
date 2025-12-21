// Import transport implementations
import { McpConnectionResult, McpToolCallResult } from '@/lib/mcp/types';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import ClientWrapper from '@/lib/mcp/client-wrapper';
import { initiateAuthFlow, McpAuthRequiredError } from '@/lib/mcp/auth';
import { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import { Session } from 'next-auth';
import { getMcpServerForUser } from '@/services/mcp-service';
import { decrypt } from '../crypt';

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
		headers: Record<string, string> = {},
		mcpId: number,
		session: Session,
	): Promise<McpConnectionResult> {
		const oauthTokens = await this.getServerOAuthTokens(mcpId, session);
		const { headers: updatedHeaders, hasAuthHeader } = this.buildHeaders(headers, oauthTokens ?? undefined);
		return this.connectToMcp(url, transportType, updatedHeaders)
			.catch(async (error) => {
				if ('code' in error && error.code === 401) {
					if (!hasAuthHeader) {
						try {
							const authFlow = await initiateAuthFlow(url, mcpId);
							throw new McpAuthRequiredError(
								authFlow.authorizationUrl,
								authFlow.state,
								authFlow.codeVerifier,
								authFlow.nonce,
								url,
								mcpId
							);
						} catch (authError) {
							if (authError instanceof McpAuthRequiredError) {
								throw authError;
							}
							console.error('Failed to initiate auth flow:', authError);
							// Fall through to throw original unauthorized error
						}
					}
					throw new Error('Unauthorized: Invalid credentials provided for MCP connection.');
				}
				throw new Error("Unable to connect to MCP");
			});
	}

	static async callTool(
		url: string,
		transportType: TransportType,
		toolName: string,
		toolArgs: { [x: string]: unknown } = {},
		headers: Record<string, string> = {},
		mcpId: number,
		session: Session,
	): Promise<McpToolCallResult> {
		try {
			const oauthTokens = await this.getServerOAuthTokens(mcpId, session);
			const { headers: updatedHeaders } = this.buildHeaders(headers, oauthTokens ?? undefined);
			const transport = this.getTransport(transportType, url, updatedHeaders);
			const clientWrapper = new ClientWrapper();
			const client = clientWrapper.getClient();
			await client.connect(transport);
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

	static async connectToMcp(
		url: string,
		transportType: TransportType,
		headers: Record<string, string> = {}
	): Promise<McpConnectionResult> {
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
	}

	private static buildHeaders(headers: Record<string, string> = {}, oauthTokens?: OAuthTokens) {
		const hasAuthHeader = Object.keys(headers).some(k => k.toLowerCase() === 'authorization');
		const hasOAuthTokens = !!oauthTokens;
		const usingOAuth = !hasAuthHeader && hasOAuthTokens;
		console.log('oauthtokens', oauthTokens);
		if(usingOAuth){
			if(oauthTokens.token_type.toLowerCase() === 'bearer'){
				headers['Authorization'] = `Bearer ${oauthTokens.access_token}`;
			}
		}
		return {headers, hasAuthHeader, usingOAuth};
	}

	private static async getServerOAuthTokens(id: number, session: Session): Promise<OAuthTokens | null> {
		if(!session.user?.id){
			return null;
		}

		const mcpServer = await getMcpServerForUser(session, id);
		if(!mcpServer){
			return null;
		}
		if(mcpServer.encryptedAccessToken && mcpServer.tokenType) {
			const oAuthTokens: OAuthTokens = {
				access_token: decrypt(mcpServer.encryptedAccessToken),
				token_type: mcpServer.tokenType
			}
			return oAuthTokens;
		}
		return null;
	}
} 
