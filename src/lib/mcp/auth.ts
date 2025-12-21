import { Resource } from 'sst';
import * as oauth from 'oauth4webapi';
import { db } from '@/db';
import { oauthClients, mcpServers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import { encrypt } from '@/lib/crypt';

export class McpAuthRequiredError extends Error {
	constructor(
		public authorizationUrl: string,
		public state: string,
		public codeVerifier: string,
		public nonce: string,
		public mcpServerUrl: string,
		public mcpId?: number
	) {
		super('MCP Server requires authentication');
		this.name = 'McpAuthRequiredError';
	}
}
export async function getIssuerConfig(baseUrl: string) {
	const issuer = new URL(baseUrl);

	// Helper to try discovery at a specific URL
	const tryDiscovery = async (url: URL) => {
		try {
			const response = await oauth.discoveryRequest(url, { algorithm: 'oauth2' });
			if (!response.ok) throw new Error('OAuth2 endpoint not found');

			const clone = response.clone();
			try {
				return await oauth.processDiscoveryResponse(url, response);
			} catch (e) {
				console.warn('Strict OAuth discovery validation failed, attempting manual parsing:', e);
				const json = (await clone.json()) as oauth.AuthorizationServer;
				if (json.issuer) return json;
				throw e;
			}
		} catch (e) {
			console.log('OAuth2 discovery failed, trying OIDC:', e);
			// Fallback to OIDC
		}

		try {
			const response = await oauth.discoveryRequest(url);
			if (!response.ok) throw new Error('OIDC endpoint not found');

			const clone = response.clone();
			try {
				return await oauth.processDiscoveryResponse(url, response);
			} catch (e) {
				console.warn('Strict OIDC discovery validation failed, attempting manual parsing:', e);
				const json = (await clone.json()) as oauth.AuthorizationServer;
				if (json.issuer) return json;
				throw e;
			}
		} catch (e) {
			throw e;
		}
	};

	let as;
	try {
		as = await tryDiscovery(issuer);
	} catch (e) {
		// Try root if the path was not root
		if (issuer.pathname !== '/' && issuer.pathname !== '') {
			const rootIssuer = new URL(issuer.origin);
			try {
				as = await tryDiscovery(rootIssuer);
			} catch (e2) {
				throw new Error(`Failed to discover OAuth/OIDC configuration for ${baseUrl} (and root): ${e2}`);
			}
		} else {
			throw new Error(`Failed to discover OAuth/OIDC configuration for ${baseUrl}: ${e}`);
		}
	}
	return as;
}

export async function getOrRegisterClient(issuer: URL, as: oauth.AuthorizationServer) {
	const issuerString = issuer.toString();

	// Check DB
	const existing = await db.select().from(oauthClients).where(eq(oauthClients.issuer, issuerString)).limit(1);
	if (existing.length > 0) {
		return {
			client_id: existing[0].clientId,
			client_secret: existing[0].clientSecret,
			token_endpoint_auth_method: 'client_secret_post' // Default assumption or store in DB
		} as oauth.Client;
	}

	// Dynamic Registration
	if (!as.registration_endpoint) {
		throw new Error('Authorization server does not support dynamic registration and no client found.');
	}

	const registrationResponse = await oauth.dynamicClientRegistrationRequest(as, {
		client_name: `${Resource.App.name}-${Resource.App.stage}`,
		redirect_uris: [`${process.env.NEXTAUTH_URL}/api/auth/mcp/callback`],
		grant_types: ['authorization_code'],
		response_types: ['code'],
		scope: ''
	});

	const responseClone = registrationResponse.clone();
	console.log('Oauth registeration response ', responseClone);
	let clientResult;
	try {
		clientResult = await oauth.processDynamicClientRegistrationResponse(registrationResponse);
	} catch (e) {
		console.warn('Strict registration processing failed, attempting manual parsing:', e);
		if (responseClone.ok) {
			clientResult = await responseClone.json();
		} else {
			throw e;
		}
	}

	// Store in DB
	if (!clientResult.client_id) {
		throw new Error('Registration failed to return client_id');
	}

	await db.insert(oauthClients).values({
		issuer: issuerString,
		clientId: clientResult.client_id as string,
		clientSecret: (clientResult.client_secret as string) || null,
		registrationPayload: clientResult as any
	});

	return clientResult;
}

export async function initiateAuthFlow(mcpUrl: string, mcpId?: number) {

	const as = await getIssuerConfig(mcpUrl);
	const client = await getOrRegisterClient(new URL(as.issuer), as);
	const code_verifier = oauth.generateRandomCodeVerifier();
	const code_challenge = await oauth.calculatePKCECodeChallenge(code_verifier);
	const nonce = oauth.generateRandomNonce();
	const randomState = oauth.generateRandomState();
	const statePayload = JSON.stringify({
		originalState: randomState,
		mcpId,
		url: mcpUrl
	});
	const state = Buffer.from(statePayload).toString('base64');
	if (!as.authorization_endpoint) {
		throw new Error('No authorization endpoint found');
	}
	const authorizationUrl = new URL(as.authorization_endpoint);
	authorizationUrl.searchParams.set('client_id', client.client_id);
	authorizationUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/auth/mcp/callback`);
	authorizationUrl.searchParams.set('response_type', 'code');
	// authorizationUrl.searchParams.set('scope', 'offline_access'); // Adjust scopes as needed
	authorizationUrl.searchParams.set('code_challenge', code_challenge);
	authorizationUrl.searchParams.set('code_challenge_method', 'S256');
	authorizationUrl.searchParams.set('nonce', nonce);
	authorizationUrl.searchParams.set('state', state);

	return {
		authorizationUrl: authorizationUrl.toString(),
		codeVerifier: code_verifier,
		nonce,
		state, // This is the base64 encoded state sent to the server
		mcpServerUrl: mcpUrl
	};
}
