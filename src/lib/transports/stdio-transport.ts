import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { BaseMcpTransport, McpConnectionResult, McpToolCallResult } from '@/lib/transports/base-transport';

// Stdio transport implementation
export class StdioMcpTransport extends BaseMcpTransport {
  supportsProtocol(url: string): boolean {
    return url.startsWith('stdio://');
  }

  async connect(url: string, _headers?: Record<string, string>): Promise<McpConnectionResult> {
    try {
      const command = url.replace('stdio://', '');
      const parts = command.split(' ');
      const executable = parts[0];
      const args = parts.slice(1);

      const transport = new StdioClientTransport({
        command: executable,
        args: args,
      });

      const client = await this.createClient();
      await client.connect(transport);

      try {
        const [toolsResult, resourcesResult] = await Promise.all([
          this.safeListTools(client),
          this.safeListResources(client),
        ]);

        return {
          tools: toolsResult,
          resources: resourcesResult,
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: true, listChanged: true },
          },
        };
      } finally {
        await client.close();
      }
    } catch (error) {
      throw this.createConnectionError(error);
    }
  }

async callTool(url: string, toolName: string, toolArgs: {[x:string]: unknown}, _headers?: Record<string, string>): Promise<McpToolCallResult> {
    try {
      const command = url.replace('stdio://', '');
      const parts = command.split(' ');
      const executable = parts[0];
      const args = parts.slice(1);

      const transport = new StdioClientTransport({
        command: executable,
        args: args,
      });

      const client = await this.createClient();
      await client.connect(transport);

      try {
        const result = await client.callTool({
          name: toolName,
          arguments: toolArgs,
        });

        return result as McpToolCallResult;
      } finally {
        await client.close();
      }
    } catch (error) {
      throw this.createToolCallError(error, toolName);
    }
  }
} 