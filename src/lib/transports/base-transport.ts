import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: unknown;
}

export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface McpConnectionResult {
  tools: McpTool[];
  resources: McpResource[];
  capabilities: Record<string, unknown>;
}

export interface McpToolCallResult {
  content: Array<{
    type: string;
    text?: string;
    data?: unknown;
  }>;
}

// Base interface for all MCP transport implementations
export interface IMcpTransport {
  connect(url: string, headers?: Record<string, string>): Promise<McpConnectionResult>;
  callTool(url: string, toolName: string, toolArgs: {[x:string]: unknown}, headers?: Record<string, string>): Promise<McpToolCallResult>;
  supportsProtocol(url: string): boolean;
}

// Abstract base class with common functionality
export abstract class BaseMcpTransport implements IMcpTransport {
  protected async createClient(): Promise<Client> {
    return new Client(
      {
        name: 'mcp-tester-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  protected async safeListTools(client: Client): Promise<McpTool[]> {
    try {
      const result = await client.listTools();
      return result.tools.map((tool: Record<string, unknown>) => ({
        name: tool.name as string,
        description: tool.description as string | undefined,
        inputSchema: tool.inputSchema as unknown,
      }));
    } catch (error) {
      console.error('Error listing tools:', error);
      return [];
    }
  }

  protected async safeListResources(client: Client): Promise<McpResource[]> {
    try {
      const result = await client.listResources();
      return result.resources.map((resource: Record<string, unknown>) => ({
        uri: resource.uri as string,
        name: resource.name as string | undefined,
        description: resource.description as string | undefined,
        mimeType: resource.mimeType as string | undefined,
      }));
    } catch (error) {
      console.error('Error listing resources:', error);
      return [];
    }
  }

  protected createConnectionError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        return new Error('MCP server executable not found. Please check the server path.');
      } else if (error.message.includes('spawn')) {
        return new Error('Failed to start MCP server process. Please verify the command.');
      } else if (error.message.includes('ECONNREFUSED')) {
        return new Error('Connection refused. Please verify the server URL and ensure the server is running.');
      } else if (error.message.includes('fetch')) {
        return new Error('HTTP connection failed. Please check the URL and network connectivity.');
      } else {
        return new Error(`Connection failed: ${error.message}`);
      }
    }
    return new Error('Unknown connection error occurred.');
  }

  protected createToolCallError(error: unknown, toolName: string): Error {
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        return new Error('MCP server executable not found. Please check the server path.');
      } else if (error.message.includes('Tool not found')) {
        return new Error(`Tool "${toolName}" not found on the MCP server.`);
      } else if (error.message.includes('Invalid arguments')) {
        return new Error(`Invalid arguments provided for tool "${toolName}".`);
      } else {
        return new Error(`Tool call failed: ${error.message}`);
      }
    }
    return new Error(`Failed to call tool "${toolName}".`);
  }

  abstract connect(url: string, headers?: Record<string, string>): Promise<McpConnectionResult>;
  abstract callTool(url: string, toolName: string, toolArgs: {[x:string]: unknown}, headers?: Record<string, string>): Promise<McpToolCallResult>;
  abstract supportsProtocol(url: string): boolean;
} 