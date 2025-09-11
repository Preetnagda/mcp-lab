import { db } from '@/db';
import { mcpServers } from '@/db/schema';
import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteServerButton } from "@/app/components/delete-server-button";

export const dynamic = 'force-dynamic';

export const metadata = {
	title: 'MCP Server Tester',
	description: 'Test MCP servers',
}

export default async function HomePage() {
	const servers = await db.select().from(mcpServers).orderBy(desc(mcpServers.createdAt));

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-4xl font-bold tracking-tight">MCP Server Tester</h1>
				<Button asChild>
					<Link href="/register">
						Register New MCP Server
					</Link>
				</Button>
			</div>

			{servers.length === 0 ? (
				<Card className="text-center py-12">
					<CardContent className="pt-6">
						<div className="text-muted-foreground mb-4">
							<svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
							</svg>
						</div>
						<h3 className="text-lg font-semibold mb-2">No MCP servers registered</h3>
						<p className="text-muted-foreground mb-4">Get started by registering your first MCP server</p>
						<Button asChild>
							<Link href="/register">
								Register MCP Server
							</Link>
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{servers.map((server) => {
						const headers = server.headers as Record<string, string> | null;
						return (
							<Card key={server.id} className="overflow-hidden">
								<CardHeader className="pb-2">
									<div className="flex justify-between items-start">
										<CardTitle className="text-xl">{server.name}</CardTitle>
										<div className="flex items-center gap-2">
											<DeleteServerButton serverId={server.id} serverName={server.name} />
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										<div>
											<span className="text-sm font-medium text-muted-foreground">URL:</span>
											<p className="text-sm break-all">{server.url}</p>
										</div>

										<div>
											<span className="text-sm font-medium text-muted-foreground">Custom Headers:</span>
											<p className="text-sm">
												{headers && Object.keys(headers).length > 0 ? (
													<>{Object.keys(headers).length} header(s) configured</>
												) : <> - </>}
											</p>
										</div>
									</div>
								</CardContent>
								<CardFooter className="flex flex-col gap-2">
									<div className="text-xs text-muted-foreground w-full">
										Created: {new Date(server.createdAt).toLocaleDateString()}
									</div>
									<div className="flex gap-2 w-full">
										<Button asChild variant="default" className="flex-1">
											<Link href={`/mcp/${server.id}`}>
												Interact
											</Link>
										</Button>
										<Button asChild variant="secondary" className="flex-1">
											<Link href={`/edit/${server.id}`}>
												Edit
											</Link>
										</Button>
									</div>
								</CardFooter>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
