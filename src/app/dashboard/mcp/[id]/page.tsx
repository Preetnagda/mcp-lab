'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';
import ManualInteraction from '@/components/mcp/manual-interaction';
import Chat from '@/components/chat/chat';
import { McpTool, McpResource } from '@/lib/mcp/types';
import { McpServer } from '@/db/schema';
import { useSession } from 'next-auth/react';

const isStringRecord = (value: unknown): value is Record<string, string> => {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return false;
	}

	return Object.values(value).every((item) => typeof item === 'string');
};

export default function McpPage() {
	const params = useParams();
	const router = useRouter();
	const { data: session } = useSession();
	const [interactionType, setInteractionType] = useState<'manual' | 'chat'>('manual');
	const [server, setServer] = useState<McpServer | null>(null);
	const [tools, setTools] = useState<McpTool[]>([]);
	const [_resources, setResources] = useState<McpResource[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isConnected, setIsConnected] = useState(false);
	const [connectionError, setConnectionError] = useState<string | null>(null);
	const [headerOverrides, setHeaderOverrides] = useState<Record<string, string>>({});
	const [showServerInfo, setShowServerInfo] = useState(false);

	const loadServer = useCallback(async () => {
		try {
			const response = await fetch(`/api/mcp-servers/${params.id}`);
			if (response.ok) {
				const serverData = await response.json();
				setServer(serverData);
			} else {
				router.push('/dashboard');
			}
		} catch (error) {
			console.error('Error loading server:', error);
			router.push('/');
		} finally {
			setIsLoading(false);
		}
	}, [params.id, router]);

	useEffect(() => {
		loadServer();
	}, [loadServer]);

	useEffect(() => {
		// Initialize header overrides when server loads
		if (server && isStringRecord(server.headers)) {
			setHeaderOverrides(server.headers);
		} else {
			setHeaderOverrides({});
		}
	}, [server]);

	const userId = session?.user?.id;

	useEffect(() => {
		if (session && !userId) {
			router.replace('/auth/login');
		}
	}, [session, userId, router]);

	if (session === undefined) {
		return null; // TODO: handle this before this component is rendered
	}

	if (session && !userId) {
		return null;
	}
	const getEffectiveHeaders = () => {
		return { ...headerOverrides };
	};

	const updateHeaderOverride = (key: string, value: string) => {
		setHeaderOverrides(prev => ({ ...prev, [key]: value }));
	};

	const connectToMcp = async () => {
		if (!server) return;

		setIsConnecting(true);
		setConnectionError(null);

		try {
			const response = await fetch('/api/mcp-connect', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					url: server.url,
					transportType: server.transportType,
					headers: getEffectiveHeaders(),
				}),
			});

			const data = await response.json();

			if (response.ok) {
				setTools(data.tools || []);
				setResources(data.resources || []);
				setIsConnected(true);
			} else {
				setConnectionError(data.message || 'Failed to connect to MCP server');
			}
		} catch (error) {
			setConnectionError(error instanceof Error ? error.message : 'Unknown error');
		} finally {
			setIsConnecting(false);
		}
	};

	const rawHeaders = server?.headers;
	const serverHeaders = isStringRecord(rawHeaders) ? rawHeaders : null;
	const hasServerHeaders = !!serverHeaders && Object.keys(serverHeaders).length > 0;
	const interactionDisabled = !isConnected;
	const tabBaseClasses = 'rounded-none text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-60';
	const tabActiveClasses = 'bg-primary text-primary-foreground hover:bg-primary';
	const tabInactiveClasses = 'bg-background text-muted-foreground hover:bg-muted';
	const tabDisabledClasses = 'bg-muted text-muted-foreground hover:bg-muted';


	if (isLoading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="text-center text-muted-foreground">Loading...</div>
			</div>
		);
	}

	if (!server) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="text-center text-destructive">Server not found</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto flex h-full flex-col px-4 py-4 md:h-screen md:overflow-hidden">
			{/* Server Details Card */}
			<Card className="mb-4">
				<CardContent>
					<div className="flex flex-col gap-2">
						<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
							<div className="flex flex-col">
								{server.description ? (
									<>
										<span className="text-lg font-semibold">{server.name}</span>
										<span className="text-sm text-muted-foreground">{server.description}</span>
									</>
								) : (
									<span className="text-lg font-semibold">{server.name}</span>
								)}
							</div>
							<div className="flex flex-col items-start gap-2 md:items-end md:text-right">
								<div className="flex items-center gap-2">
									<span
										className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
									/>
									<span className="text-sm font-medium">
										{isConnected ? 'Connected' : 'Disconnected'}
									</span>
								</div>
								{!isConnected ? (
									<Button
										onClick={connectToMcp}
										disabled={isConnecting}
										className="w-full md:w-auto"
									>
										{isConnecting ? 'Connecting...' : 'Connect to MCP Server'}
									</Button>
								) : (
									<span className="text-sm text-muted-foreground">
										{tools.length} tools available
									</span>
								)}
								{connectionError && (
									<p className="text-sm text-destructive">
										{connectionError}
									</p>
								)}
							</div>
						</div>

						<div className="space-y-2">
							<Button
								variant="ghost"
								onClick={() => setShowServerInfo(!showServerInfo)}
								className="text-sm font-medium px-0"
							>
								{showServerInfo ? '▼' : '▶'} More info
							</Button>
							{(showServerInfo && (<div className='px-2'>
								<div>
									<span className="font-medium">URL:</span> <span>{server.url}</span>
								</div>
								<div>
									<span className="font-medium">Transport:</span> <span>{
										server.transportType === 'stdio' ? 'Local Process (stdio://)' :
											server.transportType === 'http' ? 'Streamable HTTP' :
												server.transportType === 'sse' ? 'Server-Sent Events' :
													server.transportType
									}
									</span>
								</div>
								{hasServerHeaders && (
									<Card className="mt-3">
										<CardContent className="">
											{Object.keys(headerOverrides).length === 0 ? (
												<p className="text-muted-foreground text-sm">No headers configured</p>
											) : (
												<div className="space-y-2">
													{Object.entries(headerOverrides).map(([key, value]) => (
														<div key={key} className="flex items-center space-x-2">
															<Input
																type="text"
																value={key}
																disabled
																className="flex-1 bg-muted"
															/>
															<Input
																type="text"
																value={value}
																onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateHeaderOverride(key, e.target.value)}
																className="flex-1"
															/>
														</div>
													))}
												</div>
											)}
										</CardContent>
									</Card>
								)}
							</div>))}
						</div>

						<div>
							<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
								<span className="text-sm font-medium text-muted-foreground">Interaction Mode</span>
								<div className="inline-flex overflow-hidden rounded-md border border-input max-w-fit">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setInteractionType('manual')}
										type="button"
										aria-pressed={interactionType === 'manual'}
										disabled={interactionDisabled}
										className={cn(
											tabBaseClasses,
											interactionDisabled
												? tabDisabledClasses
												: interactionType === 'manual'
													? tabActiveClasses
													: tabInactiveClasses
										)}
									>
										Manual
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setInteractionType('chat')}
										type="button"
										aria-pressed={interactionType === 'chat'}
										disabled={interactionDisabled}
										className={cn(
											tabBaseClasses,
											interactionDisabled
												? tabDisabledClasses
												: interactionType === 'chat'
													? tabActiveClasses
													: tabInactiveClasses
										)}
									>
										Chat
									</Button>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="flex-1 md:min-h-0 md:overflow-hidden">
				{interactionType === 'manual' && (
					<ManualInteraction
						server={server ? { url: server.url, transportType: server.transportType } : null}
						tools={tools}
						isConnected={isConnected}
						getHeaders={getEffectiveHeaders}
						className="h-full"
					/>
				)}
				{interactionType === 'chat' && server && (
					<Chat
						mcpServer={server}
						tools={tools}
						className="h-full"
					/>
				)}
			</div>
		</div>
	);
}
