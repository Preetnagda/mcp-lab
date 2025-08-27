import { NextRequest, NextResponse } from 'next/server';
import { McpConnectionManager, TransportType } from '@/lib/mcp-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, transportType, headers, toolName, arguments: toolArgs } = body;

    if (!url || !toolName) {
      return NextResponse.json(
        { message: 'Server URL and tool name are required' },
        { status: 400 }
      );
    }

    const result = await McpConnectionManager.callTool(
          url, 
          transportType as TransportType,
          toolName, 
          toolArgs || {}, 
          headers || {}
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