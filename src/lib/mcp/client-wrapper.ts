import { Client as SdkClient } from '@modelcontextprotocol/sdk/client';

export default class ClientWrapper {
	private client: SdkClient

	constructor() {
		this.client = new SdkClient({
			name: 'mcp-lab-client',
			version: '1.0.0',
		}, {
			capabilities: {},
		});
	}

	getClient(): SdkClient {
		return this.client;
	}
}
