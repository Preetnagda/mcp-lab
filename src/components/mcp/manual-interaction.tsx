'use client';

import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import validator from '@rjsf/validator-ajv8';
import type { RJSFSchema } from '@rjsf/utils';
import SchemaForm from '@/components/mcp/schema-form';
import { McpTool } from '@/lib/mcp/types';
import { cn } from '@/lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

type ManualServer = {
	url: string;
	transportType: 'stdio' | 'http' | 'sse';
	id: number;
};

interface ToolCall {
	toolName: string;
	arguments: unknown;
	result?: unknown;
	error?: string;
	timestamp: Date;
}

interface ManualInteractionProps {
	server: ManualServer | null;
	tools: McpTool[];
	isConnected: boolean;
	getHeaders: () => Record<string, string>;
	className?: string;
}

const INITIAL_TOOL_ARGUMENTS = '{}';

export default function ManualInteraction({
	server,
	tools,
	isConnected,
	getHeaders,
	className,
}: ManualInteractionProps) {
	const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
	const [toolArguments, setToolArguments] = useState<string>(INITIAL_TOOL_ARGUMENTS);
	const [formData, setFormData] = useState<Record<string, unknown> | undefined>(undefined);
	const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
	const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
	const [showSchema, setShowSchema] = useState(false);
	const [toolCallInProgress, setToolCallInProgress] = useState(false);

	const supportsSchema = useMemo(() => {
		return Boolean(selectedTool?.inputSchema && typeof selectedTool.inputSchema === 'object');
	}, [selectedTool]);

	const handleSelectTool = (tool: McpTool) => {
		const toolHasSchema = Boolean(tool.inputSchema && typeof tool.inputSchema === 'object');
		setSelectedTool(tool);
		setToolArguments(JSON.stringify({}, null, 2));
		setFormData(toolHasSchema ? {} : undefined);
		setShowSchema(false);
	};

	const handleArgumentsChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
		setToolArguments(event.target.value);
	};

	const handleSchemaFormChange = (data: Record<string, unknown>) => {
		const normalized = data ?? {};
		setFormData(normalized);
		setToolArguments(JSON.stringify(normalized, null, 2));
	};

	const copyToClipboard = async (text: string, index: number) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedIndex(index);
			setTimeout(() => setCopiedIndex(null), 2000);
		} catch (error) {
			console.error('Failed to copy text:', error);
		}
	};

	const callTool = async () => {
		setToolCallInProgress(true);
		if (!selectedTool || !server) {
			setToolCallInProgress(false);
			return;
		}

		let parsedArgs: unknown;

		if (supportsSchema) {
			const schema = selectedTool.inputSchema;
			if (schema && typeof schema === 'object') {
				const validation = validator.validateFormData(formData ?? {}, schema as RJSFSchema);
				if (validation.errors.length > 0) {
					const message =
						validation.errors
							.map((error) => error.message)
							.filter((msg): msg is string => Boolean(msg))
							.join(', ') || 'Form validation failed';
					const failedCall: ToolCall = {
						toolName: selectedTool.name,
						arguments: formData ?? {},
						error: message,
						timestamp: new Date(),
					};
					setToolCalls((previous) => [failedCall, ...previous]);
					setToolCallInProgress(false);
					return;
				}

				parsedArgs = formData ?? {};
				setFormData(parsedArgs as Record<string, unknown>);
				setToolArguments(JSON.stringify(parsedArgs, null, 2));
			} else {
				parsedArgs = formData ?? {};
			}
		} else {
			try {
				parsedArgs = JSON.parse(toolArguments || '{}');
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Invalid JSON input';
				const failedCall: ToolCall = {
					toolName: selectedTool.name,
					arguments: toolArguments,
					error: `Invalid JSON: ${message}`,
					timestamp: new Date(),
				};
				setToolCalls((previous) => [failedCall, ...previous]);
				setToolCallInProgress(false);
				return;
			}
		}

		try {
			const response = await fetch('/api/mcp-call-tool', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					url: server.url,
					transportType: server.transportType,
					headers: getHeaders(),
					toolName: selectedTool.name,
					arguments: parsedArgs,
					id: server.id,
				}),
			});

			const data = await response.json();

			const newCall: ToolCall = {
				toolName: selectedTool.name,
				arguments: parsedArgs,
				timestamp: new Date(),
				...(response.ok ? { result: data } : { error: data.message || 'Failed to call tool' }),
			};

			setToolCalls((previous) => [newCall, ...previous]);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			const failedCall: ToolCall = {
				toolName: selectedTool.name,
				arguments: parsedArgs,
				error: message,
				timestamp: new Date(),
			};
			setToolCalls((previous) => [failedCall, ...previous]);
		}
		finally {
			setToolCallInProgress(false);
		}
	};

	if (!isConnected) {
		return null;
	}

	return (
		<div className={cn('grid h-full min-h-0 gap-8 lg:grid-cols-6', className)}>
			<div className="lg:col-span-2 min-h-0 space-y-4">
				<Card className="flex h-full flex-col overflow-hidden">
					<CardHeader>
						<CardTitle>Available Tools</CardTitle>
					</CardHeader>
					<CardContent className="flex-1 overflow-y-auto md:pr-2">
						<div className="space-y-4">
							{tools.map((tool) => {
								return (
									<div
										key={tool.name}
										className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedTool?.name === tool.name
											? 'border-primary bg-primary/5'
											: 'hover:border-primary/50'
											}`}
										onClick={() => handleSelectTool(tool)}
									>
										<h3 className="font-medium overflow-hidden overflow-ellipsis">{tool.name}</h3>
										{tool.description && (
											<p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
										)}
									</div>
								)
							})}
							{tools.length === 0 && (
								<p className="text-sm text-muted-foreground">No tools available.</p>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{selectedTool && (
				<Card className="lg:col-span-4 flex h-full flex-col overflow-hidden">
					<CardHeader>
						<CardTitle>Tool: {selectedTool.name}</CardTitle>
					</CardHeader>
					<CardContent className="flex h-full flex-col overflow-hidden">
						<div className="flex-1 space-y-4 overflow-y-auto pr-1">
							<div>
								<div className="flex justify-between items-center mb-2">
									<Label>Arguments</Label>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setShowSchema((visible) => !visible)}
										className="text-sm text-muted-foreground"
									>
										{showSchema ? (
											<>
												Hide Schema <ChevronUp className="ml-1 h-4 w-4" />
											</>
										) : (
											<>
												Show Schema <ChevronDown className="ml-1 h-4 w-4" />
											</>
										)}
									</Button>
								</div>

								{showSchema && (
									<Card className="mb-4">
										<CardContent>
											<div className="text-sm">
												<div className="font-medium mb-2">Input Schema:</div>
												<pre className="bg-muted p-2 rounded-md overflow-x-auto text-xs">
													{JSON.stringify(selectedTool.inputSchema, null, 2)}
												</pre>
											</div>
										</CardContent>
									</Card>
								)}

								{supportsSchema ? (
									<div className="space-y-4">
										<SchemaForm
											schema={selectedTool.inputSchema}
											formData={formData}
											onChange={handleSchemaFormChange}
										/>
										<div className="rounded-md border bg-muted/50 p-3">
											<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
												JSON Preview
											</p>
											<SyntaxHighlighter
												language="json"
												style={oneDark}
												wrapLongLines={true}
												customStyle={{ margin: 0, borderRadius: '0.375rem', fontSize: '0.75rem' }}
											>
												{toolArguments}
											</SyntaxHighlighter>
										</div>
									</div>
								) : (
									<div className="border rounded-md overflow-hidden">
										<textarea
											id="arguments"
											value={toolArguments}
											onChange={handleArgumentsChange}
											className="w-full h-32 p-2 font-mono text-sm resize-none focus:outline-none"
											placeholder="Enter tool arguments as JSON..."
										/>
									</div>
								)}
							</div>

							<Button onClick={callTool} className="w-full" disabled={toolCallInProgress}>
								Call Tool
							</Button>

							{toolCalls.length > 0 && (
								<div className="mt-6">
									<h3 className="font-medium mb-2">Recent Calls</h3>
									<div className="border rounded-lg overflow-hidden">
										<div className="max-h-[600px] overflow-y-auto">
											<div className="p-4 space-y-4">
												{toolCalls.map((call, index) => {
													const argumentPreview =
														typeof call.arguments === 'string'
															? call.arguments
															: JSON.stringify(call.arguments, null, 2);

													return (
														<Card key={index} className="border">
															<CardContent className="pt-6">
																<div className="space-y-2">
																	<div className="flex items-center justify-between">
																		<span className="font-medium">{call.toolName}</span>
																		<span className="text-sm text-muted-foreground">
																			{call.timestamp.toLocaleTimeString()}
																		</span>
																	</div>
																	<div className="text-sm">
																		<div className="font-medium mb-1">Arguments:</div>
																		<SyntaxHighlighter
																			language="json"
																			style={oneDark}
																			wrapLongLines={true}
																			customStyle={{ margin: 0, borderRadius: '0.375rem', fontSize: '0.875rem' }}
																		>
																			{argumentPreview}
																		</SyntaxHighlighter>
																	</div>
																	{call.error ? (
																		<div className="text-sm">
																			<div className="font-medium text-destructive mb-1">Error:</div>
																			<div className="relative">
																				<pre className="bg-destructive/10 text-destructive p-2 rounded-md overflow-x-auto">
																					{call.error}
																				</pre>
																				<Button
																					variant="ghost"
																					size="icon"
																					className="absolute top-2 right-2 h-6 w-6"
																					onClick={() => copyToClipboard(call.error ?? '', index)}
																				>
																					{copiedIndex === index ? (
																						<Check className="h-4 w-4" />
																					) : (
																						<Copy className="h-4 w-4" />
																					)}
																				</Button>
																			</div>
																		</div>
																	) : (
																		<div className="text-sm">
																			<div className="font-medium mb-1">Result:</div>
																			<div className="relative">
																				<SyntaxHighlighter
																					language="json"
																					style={oneDark}
																					wrapLongLines={true}
																					customStyle={{ margin: 0, borderRadius: '0.375rem', fontSize: '0.875rem' }}
																				>
																					{JSON.stringify(call.result, null, 2)}
																				</SyntaxHighlighter>
																				<Button
																					variant="ghost"
																					size="icon"
																					className="absolute top-2 right-2 h-6 w-6"
																					onClick={() =>
																						copyToClipboard(
																							JSON.stringify(call.result, null, 2),
																							index,
																						)
																					}
																				>
																					{copiedIndex === index ? (
																						<Check className="h-4 w-4" />
																					) : (
																						<Copy className="h-4 w-4" />
																					)}
																				</Button>
																			</div>
																		</div>
																	)}
																</div>
															</CardContent>
														</Card>
													);
												})}
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
