'use client';

import { useCallback, useMemo } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

import Link from 'next/link'
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { McpTool } from '@/lib/mcp/types';

interface ModelOption {
	value: string;
	label?: string;
	provider: string;
}

interface ChatConfigurationProps {
	className?: string;
	tokensUsed?: number;
	selectedModel: ModelOption | undefined;
	allTools: McpTool[];
	selectedTools: McpTool[];
	onSelectedToolsChange: (tools: McpTool[]) => void;
	onSelectedModelChange: (value: ModelOption) => void;
	models: ModelOption[];
}

export type { ModelOption as ChatConfigurationModelOption };

export default function ChatConfiguration({
	className,
	selectedModel,
	onSelectedModelChange,
	selectedTools,
	onSelectedToolsChange,
	allTools,
	models,
	tokensUsed,
}: ChatConfigurationProps) {

	const selectedToolNames = useMemo(() => new Set(selectedTools.map(tool => tool.name)), [selectedTools]);
	const hasTools = allTools.length > 0;
	const allToolsSelected = hasTools && allTools.every(tool => selectedToolNames.has(tool.name));
	const selectedToolsCountLabel = hasTools ? `${selectedTools.length}/${allTools.length}` : '0/0';
	const enableAllDisabled = !hasTools || allToolsSelected;
	const clearDisabled = selectedTools.length === 0;

	const handleToggleTool = useCallback(
		(tool: McpTool) => {
			const isSelected = selectedToolNames.has(tool.name);
			if (isSelected) {
				onSelectedToolsChange(selectedTools.filter(selected => selected.name !== tool.name));
			} else {
				onSelectedToolsChange([...selectedTools, tool]);
			}
		},
		[onSelectedToolsChange, selectedToolNames, selectedTools],
	);

	const handleEnableAll = useCallback(() => {
		onSelectedToolsChange([...allTools]);
	}, [allTools, onSelectedToolsChange]);

	const handleClearTools = useCallback(() => {
		onSelectedToolsChange([]);
	}, [onSelectedToolsChange]);

	return (
		<aside className={cn('flex w-full max-w-md flex-col gap-2', className)}>
			<Card className="flex h-full flex-col">
				<CardHeader>
					<CardTitle className="text-base">Configuration</CardTitle>
					<CardDescription>Select a LLM model and tools from the MCP to test.</CardDescription>
				</CardHeader>
				<CardContent className="flex h-full flex-col gap-4 overflow-hidden">
					<section>
						<div className="flex items-center justify-between gap-2">
							<span className="text-sm font-medium text-muted-foreground tracking-wide">Tokens used by tools</span>
							{tokensUsed ? (
								<span className="">{tokensUsed}</span>
							) : null}
						</div>
					</section>
					<section className="space-y-3">
						<div className="flex items-center justify-between gap-2">
							<span className="text-sm font-medium text-muted-foreground tracking-wide">Model</span>
							{models.length === 0 ? (
								<span className="text-sm text-muted-foreground"><Link href='/dashboard/credentials'>Add API keys</Link></span>
							) :
								<Select
									value={selectedModel ? selectedModel.value: undefined}
									onValueChange={value => {
										const model = models.find(m => m.value === value);
										if (model) {
											onSelectedModelChange(model);
										}
									}}
								>
									<SelectTrigger className="w-[180px]">
										<SelectValue placeholder="Select model" />
									</SelectTrigger>
									<SelectContent>
										{models.map(model => (
											<SelectItem key={model.value} value={model.value}>
												{model.label || model.value}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							}
						</div>
					</section>

					<section className="flex h-full min-h-0 flex-col gap-3">
						<div className="flex items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								<span className="text-sm font-medium text-muted-foreground tracking-wide">Tools</span>
								<Badge variant="outline">{selectedToolsCountLabel}</Badge>
							</div>
							<div className="flex items-center gap-1">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={handleEnableAll}
									disabled={enableAllDisabled}
								>
									Enable all
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={handleClearTools}
									disabled={clearDisabled}
								>
									Clear
								</Button>
							</div>
						</div>
						<ScrollArea className="flex-1 overflow-hidden rounded-lg border">
							<div className="divide-y">
								{allTools.length === 0 ? (
									<div className="p-4 text-sm text-muted-foreground">No tools available.</div>
								) : (
									allTools.map(tool => {
										const isSelected = selectedToolNames.has(tool.name);
										return (
											<button
												key={tool.name}
												type="button"
												onClick={() => handleToggleTool(tool)}
												className={cn(
													'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
													isSelected ? 'bg-muted/60' : 'hover:bg-muted/40',
												)}
											>
												<span className="mt-0.5">
													{isSelected ? (
														<CheckCircle2 className="h-4 w-4 text-primary" />
													) : (
														<Circle className="h-4 w-4 text-muted-foreground" />
													)}
												</span>
												<div className="flex flex-1 flex-col gap-1">
													<span className="text-sm font-medium leading-none">{tool.name}</span>
													{tool.description ? (
														<span className="text-xs text-muted-foreground">{tool.description}</span>
													) : null}
												</div>
											</button>
										);
									})
								)}
							</div>
						</ScrollArea>
					</section>
				</CardContent>
			</Card>
		</aside>
	);
}
