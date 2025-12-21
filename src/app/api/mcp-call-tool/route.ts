import { NextRequest, NextResponse } from 'next/server';
import { McpConnectionManager, TransportType } from '@/lib/mcp/manager';
import { auth } from '@/auth';
import { Session } from 'next-auth';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const session = await auth();
		const { url, transportType, headers, toolName, arguments: toolArgs, id } = body;

		if (!url || !toolName || !id) {
			return NextResponse.json(
				{ message: 'Server URL, tool name and MCP ID are required' },
				{ status: 400 }
			);
		}

		const result = await McpConnectionManager.callTool(
			url,
			transportType as TransportType,
			toolName,
			toolArgs || {},
			headers || {},
			id,
			session as Session
		)

		return NextResponse.json(result);

	} catch (error) {
		console.error('Error in MCP tool call route:', error);
		return NextResponse.json(
			{ message: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
} 
