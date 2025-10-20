'use client';

import { useChat } from '@ai-sdk/react';
import { useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import ChatConfiguration, { ChatConfigurationModelOption } from '@/components/chat/configuration';
import { Message } from '@/components/chat/message';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DefaultChatTransport } from 'ai';
import { McpTool } from '@/lib/mcp/types';
import { McpServer } from '@/db/schema';
import { cn } from '@/lib/utils';

interface ChatProps {
	mcpServer: McpServer
	tools: McpTool[]
	className?: string;
}

export default function Chat({ mcpServer, tools, className }: ChatProps) {
	const [input, setInput] = useState('');
	const [selectedTools, setSelectedTools] = useState<McpTool[]>(tools);
	const [selectedModel, setSelectedModel] = useState<ChatConfigurationModelOption>({
		value: 'gpt-4o-mini',
		provider: 'OpenAI',
	});

	const { messages, sendMessage } = useChat({
		transport: new DefaultChatTransport({
			api: '/api/chat',
		})
	});

	const { toolsTokens } = useMemo(() => {
		let total = 0;
		for (const tool of selectedTools) {
			// Rough estimate: 1 token per 4 characters in the tool description
			const toolText = JSON.stringify(tool);
			total += Math.ceil(toolText.length / 4);
		}
		return { toolsTokens: total };
	}, [selectedTools]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		console.log('Submitting message:', input);
		if (input.trim()) {
			sendMessage(
				{ text: input },
				{
					body: {
						tools,
						model: selectedModel,
						mcpServerId: mcpServer.id
					}
				}
			);
			setInput('');
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	return (
		<div className={cn('grid h-full min-h-0 gap-8 lg:grid-cols-6', className)}>
			<ChatConfiguration
				className="col-span-2 flex h-full min-h-0 flex-col"
				tokensUsed={toolsTokens}
				selectedModel={selectedModel}
				onSelectedModelChange={setSelectedModel}
				allTools={tools}
				selectedTools={selectedTools}
				onSelectedToolsChange={setSelectedTools}
			/>
			<main className="col-span-4 flex h-full min-h-0 flex-col rounded-2xl border bg-card">
				<div className="flex-1 overflow-y-auto px-4 py-6">
					<div className="space-y-4">
						{messages.map(message => {
							if (!message.parts) return null;
							return (
								<Message key={message.id} parts={message.parts} isUser={message.role == 'user'} />
							)
						})}
					</div>
				</div>

				<div className="border-t px-4 py-4">
					<form onSubmit={handleSubmit} className="flex gap-2">
						<Textarea
							value={input}
							onChange={e => setInput(e.currentTarget.value)}
							onKeyDown={handleKeyDown}
							placeholder="Type your message..."
							className="flex-1 min-h-12 resize-none !shadow-none"
							rows={1}
						/>
						<Button
							type="submit"
							size="icon"
							disabled={!input.trim()}
							className="h-12 w-12 shrink-0"
						>
							<Send className="h-4 w-4" />
						</Button>
					</form>
				</div>
			</main>
		</div>
	);
}
