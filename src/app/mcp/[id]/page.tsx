'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

interface McpServer {
  id: number;
  name: string;
  description: string | null;
  url: string;
  transportType: 'stdio' | 'http' | 'sse';
  headers: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

interface McpTool {
  name: string;
  description?: string;
  inputSchema: unknown;
}

interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

interface ToolCall {
  toolName: string;
  arguments: unknown;
  result?: unknown;
  error?: string;
  timestamp: Date;
}

export default function McpPage() {
  const params = useParams();
  const router = useRouter();
  const [server, setServer] = useState<McpServer | null>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [_resources, setResources] = useState<McpResource[]>([]);
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [toolArguments, setToolArguments] = useState<string>('{}');
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [headerOverrides, setHeaderOverrides] = useState<Record<string, string>>({});
  const [showHeaderOverrides, setShowHeaderOverrides] = useState(false);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showSchema, setShowSchema] = useState(false);

  const loadServer = useCallback(async () => {
    try {
      const response = await fetch(`/api/mcp-servers/${params.id}`);
      if (response.ok) {
        const serverData = await response.json();
        setServer(serverData);
      } else {
        router.push('/');
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
    if (server && server.headers) {
      setHeaderOverrides(server.headers);
    }
  }, [server]);

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

  const callTool = async () => {
    if (!selectedTool || !server) return;

    try {
      const args = JSON.parse(toolArguments);
      
      const response = await fetch('/api/mcp-call-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: server.url,
          transportType: server.transportType,
          headers: getEffectiveHeaders(),
          toolName: selectedTool.name,
          arguments: args,
        }),
      });

      const data = await response.json();
      
      const newCall: ToolCall = {
        toolName: selectedTool.name,
        arguments: args,
        timestamp: new Date(),
        ...(response.ok ? { result: data } : { error: data.message }),
      };

      setToolCalls(prev => [newCall, ...prev]);
    } catch (error) {
      const newCall: ToolCall = {
        toolName: selectedTool.name,
        arguments: JSON.parse(toolArguments),
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
      setToolCalls(prev => [newCall, ...prev]);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

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
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button variant="ghost" asChild className="mr-4">
            <Link href="/">
              ← Back to Registry
            </Link>
          </Button>
          <h1 className="text-4xl font-bold tracking-tight">{server.name}</h1>
        </div>
        <Button variant="secondary" asChild>
          <Link href={`/edit/${server.id}`}>
            Edit Server
          </Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Server Info & Connection */}
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Server Information</CardTitle>
            </CardHeader>
            <CardContent>
              {server.description && (
                <p className="text-muted-foreground mb-4">{server.description}</p>
              )}
              <div className="space-y-2">
                <div>
                  <span className="font-medium">URL:</span> <span>{server.url}</span>
                </div>
                <div>
                  <span className="font-medium">Transport:</span> <span>{
                    server.transportType === 'stdio' ? 'Local Process (stdio://)' :
                    server.transportType === 'http' ? 'Streamable HTTP' :
                    server.transportType === 'sse' ? 'Server-Sent Events' :
                    server.transportType
                  }</span>
                </div>
                {server.headers && Object.keys(server.headers).length > 0 && (
                  <div>
                    <span className="font-medium">Headers:</span> <span>{Object.keys(server.headers).length} configured</span>
                  </div>
                )}
              </div>

              {/* Header Overrides Section */}
              <div className="mt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowHeaderOverrides(!showHeaderOverrides)}
                  className="text-sm font-medium"
                >
                  {showHeaderOverrides ? '▼' : '▶'} Override Headers for This Session
                </Button>
                
                {showHeaderOverrides && (
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
              </div>

              <div className="mt-6">
                {!isConnected ? (
                  <Button
                    onClick={connectToMcp}
                    disabled={isConnecting}
                    className="w-full"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect to MCP Server'}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Connected</Badge>
                      <span className="text-sm text-muted-foreground">
                        {tools.length} tools available
                      </span>
                    </div>
                  </div>
                )}
                {connectionError && (
                  <p className="mt-2 text-sm text-destructive">{connectionError}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tools Section */}
          {isConnected && (
            <Card>
              <CardHeader>
                <CardTitle>Available Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tools.map((tool) => (
                    <div
                      key={tool.name}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedTool?.name === tool.name
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => {
                        setSelectedTool(tool);
                        setToolArguments('{}');
                      }}
                    >
                      <h3 className="font-medium">{tool.name}</h3>
                      {tool.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {tool.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tool Interaction */}
        {isConnected && selectedTool && (
          <Card>
            <CardHeader>
              <CardTitle>Tool: {selectedTool.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Arguments</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSchema(!showSchema)}
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
                      <CardContent className="">
                        <div className="text-sm">
                          <div className="font-medium mb-2">Input Schema:</div>
                          <pre className="bg-muted p-2 rounded-md overflow-x-auto text-xs">
                            {JSON.stringify(selectedTool.inputSchema, null, 2)}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="border rounded-md overflow-hidden">
                    <textarea
                      id="arguments"
                      value={toolArguments}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setToolArguments(e.target.value)}
                      className="w-full h-32 p-2 font-mono text-sm resize-none focus:outline-none"
                      placeholder="Enter tool arguments as JSON..."
                    />
                  </div>
                </div>

                <Button
                  onClick={callTool}
                  className="w-full"
                >
                  Call Tool
                </Button>

                {toolCalls.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-2">Recent Calls</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-[600px] overflow-y-auto">
                        <div className="p-4 space-y-4">
                          {toolCalls.map((call, index) => (
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
                                    <pre className="bg-muted p-2 rounded-md overflow-x-auto">
                                      {JSON.stringify(call.arguments, null, 2)}
                                    </pre>
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
                                          onClick={() => copyToClipboard(call.error || '', index)}
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
                                        <pre className="bg-muted p-2 rounded-md overflow-x-auto">
                                          {JSON.stringify(call.result, null, 2)}
                                        </pre>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="absolute top-2 right-2 h-6 w-6"
                                          onClick={() => copyToClipboard(JSON.stringify(call.result, null, 2), index)}
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
                          ))}
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
    </div>
  );
} 