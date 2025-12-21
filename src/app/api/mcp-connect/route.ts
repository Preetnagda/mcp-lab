import { NextRequest, NextResponse } from 'next/server';
import { McpConnectionManager, TransportType } from '@/lib/mcp/manager';
import { McpAuthRequiredError } from '@/lib/mcp/auth';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
	try {
		const session = await auth(); 
		if(!session?.user?.id){
			return NextResponse.json(
				{ message: 'User not authenticated' },
				{ status: 401 }
			);
		}
		const body = await request.json();
		const { url, transportType, headers, id } = body;

		if (!url) {
			return NextResponse.json(
				{ message: 'Server URL is required' },
				{ status: 400 }
			);
		}

		const result = await McpConnectionManager.connect(url, transportType as TransportType, headers || {}, id, session)

		return NextResponse.json(result);

	} catch (error) {
        if (error instanceof McpAuthRequiredError) {
            const response = NextResponse.json({ redirectUrl: error.authorizationUrl }, { status: 401 });
            response.cookies.set('mcp_auth_state', error.state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });
            response.cookies.set('mcp_code_verifier', error.codeVerifier, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });
            response.cookies.set('mcp_oidc_nonce', error.nonce, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });
            return response;
        }

		console.error('Error in MCP connect route:', error);
		return NextResponse.json(
			{ message: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
}
