import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

const providerMap = new Map<string, CallableFunction>([
	['openai', createOpenAI],
	['anthropic', createAnthropic]
]);

export const models = {
	openai: ['gpt-4o-mini', 'gpt-4o'],
	anthropic: ['claude-4.5-sonnet', 'claude-opus']
};

export const getModel = (provider: keyof typeof models, modelName: string, apiKey: string) => {
	const providerFunc = providerMap.get(provider.toLowerCase());
	if (!providerFunc) {
		throw new Error("Invalid provider");
	}
	const providerInstance = providerFunc({
		apiKey: apiKey
	});
	return providerInstance(modelName);
}
