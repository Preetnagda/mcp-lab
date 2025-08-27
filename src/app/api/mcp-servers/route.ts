import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mcpServers } from '@/db/schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, url, transportType, headers } = body;

    if (!name || !url) {
      return NextResponse.json(
        { message: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // Validate transport type
    const validTransportTypes = ['stdio', 'http', 'sse'];
    if (transportType && !validTransportTypes.includes(transportType)) {
      return NextResponse.json(
        { message: 'Invalid transport type. Must be one of: stdio, http, sse' },
        { status: 400 }
      );
    }

    const newServer = await db
      .insert(mcpServers)
      .values({
        name,
        description: description || null,
        url,
        transportType: transportType || 'http',
        headers: headers || {},
      })
      .returning();

    return NextResponse.json(newServer[0], { status: 201 });
  } catch (error) {
    console.error('Error creating MCP server:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const servers = await db.select().from(mcpServers);
    return NextResponse.json(servers);
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 