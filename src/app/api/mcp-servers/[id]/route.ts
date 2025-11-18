import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { mcpServers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const session = await auth();
	try {
		const { id } = await params;
		const idNumber = parseInt(id);

		if (isNaN(idNumber)) {
			return NextResponse.json(
				{ message: 'Invalid server ID' },
				{ status: 400 }
			);
		}

		const queryFilters = [
			eq(mcpServers.id, idNumber),
			eq(mcpServers.userId, session?.user?.id || '')
		];

		const server = await
			db.select()
				.from(mcpServers)
				.where(and(...queryFilters))
				.limit(1);

		if (server.length === 0) {
			return NextResponse.json(
				{ message: 'Server not found' },
				{ status: 404 }
			);
		}

		return NextResponse.json(server[0]);
	} catch (error) {
		console.error('Error fetching MCP server:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth();
		if (!session?.user) {
			return NextResponse.json(
				{ message: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const { id } = await params;
		const idNumber = parseInt(id);

		if (isNaN(idNumber)) {
			return NextResponse.json(
				{ message: 'Invalid server ID' },
				{ status: 400 }
			);
		}

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

		const updatedServer = await db
			.update(mcpServers)
			.set({
				name,
				description: description || null,
				url,
				transportType: transportType || 'http',
				headers: headers || {},
				updatedAt: new Date(),
			})
			.where(and(
				eq(mcpServers.id, idNumber),
				eq(mcpServers.userId, session.user.id)
			))
			.returning();

		if (updatedServer.length === 0) {
			return NextResponse.json(
				{ message: 'Server not found' },
				{ status: 404 }
			);
		}

		return NextResponse.json(updatedServer[0]);
	} catch (error) {
		console.error('Error updating MCP server:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth();
		if (!session?.user) {
			return NextResponse.json(
				{ message: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const { id } = await params;
		const idNumber = parseInt(id);

		if (isNaN(idNumber)) {
			return NextResponse.json(
				{ message: 'Invalid server ID' },
				{ status: 400 }
			);
		}

		const server = await db.query.mcpServers.findFirst({
			where: and(
				eq(mcpServers.id, idNumber),
				eq(mcpServers.userId, session.user.id)
			),
		});

		if (!server) {
			return NextResponse.json({ message: 'Server not found or unauthorized' }, { status: 404 });
		}

		await db
			.delete(mcpServers)
			.where(and(
				eq(mcpServers.id, idNumber),
				eq(mcpServers.userId, session.user.id)
			));

		return NextResponse.json({ message: 'Server deleted successfully' });
	} catch (error) {
		console.error('Error deleting MCP server:', error);
		return NextResponse.json(
			{ message: 'Internal server error' },
			{ status: 500 }
		);
	}
} 
