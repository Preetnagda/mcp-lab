"use client";

import { useChat } from "@ai-sdk/react";
import { useMemo, useState, useEffect } from "react";
import { Send } from "lucide-react";
import ChatConfiguration, {
	ChatConfigurationModelOption,
} from "@/components/chat/configuration";
import { Message } from "@/components/chat/message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DefaultChatTransport } from "ai";
import { McpTool } from "@/lib/mcp/types";
import { McpServer } from "@/db/schema";
import { cn } from "@/lib/utils";
import { models } from "@/lib/llm";

interface ChatProps {
	mcpServer: McpServer;
	tools: McpTool[];
	className?: string;
}

export default function Chat({ mcpServer, tools, className }: ChatProps) {
	const [input, setInput] = useState("");
	const [selectedTools, setSelectedTools] = useState<McpTool[]>(tools);
	const [selectedModel, setSelectedModel] =
		useState<ChatConfigurationModelOption>();
	const [modelOptions, setModelOptions] = useState<
		ChatConfigurationModelOption[]
	>([]);
	const [isResponding, setIsResponding] = useState(false);

	useEffect(() => {
		const fetchModelOptions = async () => {
			const options: ChatConfigurationModelOption[] = [];
			try {
				const response = await fetch("/api/api-keys");
				if (response.ok) {
					const keysData = await response.json();
					const availableProviders = new Set(
						keysData.map((key: any) => key.provider)
					);
					for (const provider in models) {
						if (!availableProviders.has(provider)) {
							continue;
						}
						for (const modelName of models[provider as keyof typeof models]) {
							options.push({
								value: modelName,
								label: modelName,
								provider: provider,
							});
						}
					}
					if (options.length > 0) setSelectedModel(options[0]);
					setModelOptions(options);
				} else {
					console.error("Failed to fetch API keys");
					setModelOptions([]);
				}
			} catch (error) {
				console.error("Error fetching API keys:", error);
				setModelOptions([]);
			}
		};

		fetchModelOptions();
	}, []);

	const { messages, sendMessage } = useChat({
		transport: new DefaultChatTransport({
			api: "/api/chat",
		}),
		onFinish: () => {
			setIsResponding(false);
		}
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
		if (!selectedModel) return;
		if (input.trim()) {
			setIsResponding(true);
			sendMessage(
				{ text: input },
				{
					body: {
						tools,
						model: selectedModel,
						mcpServerId: mcpServer.id,
					},
				}
			);
			setInput("");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (!isResponding && input.trim() && selectedModel) {
				handleSubmit(e);
			}
		}
	};

	return (
		<div className={cn("lg:grid h-full min-h-0 gap-8 lg:grid-cols-6", className)}>
			<ChatConfiguration
				className="col-span-2 flex h-full min-h-0 flex-col"
				tokensUsed={toolsTokens}
				selectedModel={selectedModel}
				onSelectedModelChange={setSelectedModel}
				allTools={tools}
				selectedTools={selectedTools}
				onSelectedToolsChange={setSelectedTools}
				models={modelOptions}
			/>
			<main className="col-span-4 flex min-h-[50%] flex-col rounded-2xl border bg-card lg:h-full">
				<div className="flex-1 overflow-y-auto px-4 py-6">
					<div className="space-y-4">
						{messages.map((message) => {
							if (!message.parts) return null;
							return (
								<Message
									key={message.id}
									parts={message.parts}
									isUser={message.role == "user"}
								/>
							);
						})}
					</div>
				</div>

				<div className="border-t px-4 py-4">
					<form onSubmit={handleSubmit} className="flex gap-2">
						<Textarea
							value={input}
							onChange={(e) => setInput(e.currentTarget.value)}
							onKeyDown={handleKeyDown}
							placeholder="Type your message..."
							className="flex-1 min-h-12 resize-none !shadow-none"
							rows={1}
						/>
						<Button
							type="submit"
							size="icon"
							disabled={!input.trim() || isResponding || !selectedModel}
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
