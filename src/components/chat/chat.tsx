'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Message } from '@/components/chat/message';
import { Send } from 'lucide-react';
import { McpServer } from '@/db/schema';
import { DefaultChatTransport } from 'ai';

interface ChatProps {
	mcpServers: McpServer[],
	model: string,
}

export default function Chat({ mcpServers, model }: ChatProps) {
	const [input, setInput] = useState('');
	const { messages, sendMessage } = useChat({
		transport: new DefaultChatTransport({
			api: '/api/chat',
			body: () => ({
				mcpServerIds: mcpServers.map(server => server.id),
				model
			}),

		})
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (input.trim()) {
			sendMessage({ text: input });
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
		<div className="flex flex-col h-screen max-w-4xl mx-auto">
			<div className="flex-1 overflow-y-auto px-4 py-8">
				<div className="space-y-4">
					{messages.map(message => {
						const content = message.parts
							.filter((part) => part.type === 'text')
							.map((part) => part.text)
							.join('');

						return (
							<Message
								key={message.id}
								content={content}
								isUser={message.role === 'user'}
							/>
						);
					})}
				</div>
			</div>

			<div className="sticky bottom-0 bg-card border-t px-4 py-6 md:w-[80%] md:mx-auto rounded-2xl">
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
		</div>
	);
}
