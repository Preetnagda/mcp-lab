import { NextRequest, NextResponse } from 'next/server';
import * as oauth from 'oauth4webapi';
import { db } from '@/db';
import { mcpServers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { encrypt } from '@/lib/crypt';
import { getIssuerConfig, getOrRegisterClient } from '@/lib/mcp/auth';

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session || !session.user?.id) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

	// Get URL params
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
        return NextResponse.json({ error: 'Missing code or state parameter' }, { status: 400 });
    }

    try {
        // Decode state first to get mcpId for cookie lookup
        const stateJson = Buffer.from(state, 'base64').toString('utf8');
        const { mcpId, url: mcpUrl } = JSON.parse(stateJson);

        if (!mcpUrl) {
            throw new Error('Invalid state payload: missing URL');
        }

		// Construct dynamic cookie names
		const cookieSuffix = mcpId ? `_${mcpId}` : '';
		const stateCookieName = `mcp_auth_state${cookieSuffix}`;
		const verifierCookieName = `mcp_code_verifier${cookieSuffix}`;
		const nonceCookieName = `mcp_oidc_nonce${cookieSuffix}`;

		// Get cookies
		const storedState = request.cookies.get(stateCookieName)?.value;
		const codeVerifier = request.cookies.get(verifierCookieName)?.value;
		const nonce = request.cookies.get(nonceCookieName)?.value;

		if (!storedState || !codeVerifier || !nonce) {
			return NextResponse.json({ error: 'Missing state, code verifier, or nonce cookies' }, { status: 400 });
		}

		if (state !== storedState) {
			return NextResponse.json({ error: 'State mismatch' }, { status: 400 });
		}

        // Reconstruct AS and Client
        const as = await getIssuerConfig(mcpUrl);
        const client = await getOrRegisterClient(new URL(as.issuer), as);

        // Handle trailing slash inconsistency between discovery and callback
        if (searchParams.has('iss')) {
             const iss = searchParams.get('iss');
             if (iss && as.issuer !== iss && as.issuer.replace(/\/$/, '') === iss) {
                  console.log(`Normalizing issuer from ${as.issuer} to ${iss}`);
                  (as as any).issuer = iss;
             }
        }

        // Exchange code
        const params = oauth.validateAuthResponse(as, client, searchParams, storedState);
        if (params.has('error')) {
             throw new Error('OAuth2 Error: ' + params.get('error') + ' - ' + params.get('error_description'));
        }

        const clientAuth = client.client_secret 
            ? oauth.ClientSecretPost(client.client_secret as string) 
            : oauth.None();

        const response = await oauth.authorizationCodeGrantRequest(
            as,
            client,
            clientAuth,
            params,
            `${process.env.NEXTAUTH_URL}/api/auth/mcp/callback`,
            codeVerifier
        );

        const responseClone = response.clone();
        try {
            const responseText = await responseClone.text();
            console.log('OAuth2 Response Body:', responseText);
        } catch (e) {
            console.error('Failed to read response body for logging', e);
        }

        // processAuthorizationCodeResponse handles challenges by throwing if present
        const result = await oauth.processAuthorizationCodeResponse(as, client, response);

        if ('error' in result) {
            throw new Error('OAuth2 Token Error: ' + result.error + ' - ' + (result.error_description || ''));
        }

        const { access_token, expires_in, token_type } = result;

        // Encrypt tokens
        const encryptedAccessToken = encrypt(access_token);
        
        // Expiration
        const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : undefined;

        // Update DB
        if (mcpId) {
             // Update existing
             await db.update(mcpServers)
                .set({
                    encryptedAccessToken,
                    expiresAt,
                    tokenType: token_type || 'bearer',
                    updatedAt: new Date()
                })
                .where(and(eq(mcpServers.id, mcpId), eq(mcpServers.userId, userId)));
        } 
        // Cleanup cookies and redirect
        // Redirect to dashboard, or ideally the specific MCP page if we had the ID
        // If mcpId was present, we go to /dashboard/mcp
        // If it was a new creation, we go to /dashboard/mcp (list) or similar.
        // We can check if `mcpId` is valid, but the user just wants "return to the MCP Url" which I interpret as the dashboard for it.
        // Since I don't know the exact route for "view mcp server", I'll default to /dashboard
        const url = mcpId ? `/dashboard/mcp/${mcpId}?auto_connect=true` : '/dashboard/mcp';
        const res = NextResponse.redirect(new URL(url, request.url));
        res.cookies.delete(stateCookieName);
        res.cookies.delete(verifierCookieName);
        res.cookies.delete(nonceCookieName);
        return res;

    } catch (error: any) {
        console.error('Callback error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
