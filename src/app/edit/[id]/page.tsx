'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Header {
  key: string;
  value: string;
}

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

export default function EditPage() {
  const params = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    transportType: 'http' as 'stdio' | 'http' | 'sse',
  });
  const [headers, setHeaders] = useState<Header[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServer = useCallback(async () => {
    try {
      const response = await fetch(`/api/mcp-servers/${params.id}`);
      if (response.ok) {
        const server: McpServer = await response.json();
        setFormData({
          name: server.name,
          description: server.description || '',
          url: server.url,
          transportType: server.transportType || 'http',
        });
        
        // Convert headers object to array format
        if (server.headers) {
          const headersArray = Object.entries(server.headers).map(([key, value]) => ({
            key,
            value,
          }));
          setHeaders(headersArray);
        }
      } else {
        setError('Server not found');
      }
    } catch {
      setError('Failed to load server data');
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadServer();
  }, [loadServer]);

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const updatedHeaders = [...headers];
    updatedHeaders[index][field] = value;
    setHeaders(updatedHeaders);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const headersObject = headers.reduce((acc, header) => {
        if (header.key && header.value) {
          acc[header.key] = header.value;
        }
        return acc;
      }, {} as Record<string, string>);

      const response = await fetch(`/api/mcp-servers/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          headers: headersObject,
        }),
      });

      if (response.ok) {
        router.push('/');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center text-muted-foreground">Loading server data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center">
          <div className="text-destructive mb-4">{error}</div>
          <Button variant="ghost" asChild>
            <Link href="/">
              ← Back to Registry
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center mb-8">
        <Button variant="ghost" asChild className="mr-4">
          <Link href="/">
            ← Back to Registry
          </Link>
        </Button>
        <h1 className="text-4xl font-bold tracking-tight">Edit MCP Server</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Server Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Server Name *</Label>
              <Input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My MCP Server"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this MCP server does..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transportType">Transport Type *</Label>
              <Select
                value={formData.transportType}
                onValueChange={(value: 'stdio' | 'http' | 'sse') => setFormData(prev => ({ ...prev, transportType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select transport type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP/HTTPS (Streamable HTTP)</SelectItem>
                  <SelectItem value="sse">HTTP/HTTPS (Server-Sent Events)</SelectItem>
                  <SelectItem value="stdio">Local Process (stdio://)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {formData.transportType === 'stdio' && 'For local MCP servers that run as processes (e.g., stdio://node server.js)'}
                {formData.transportType === 'http' && 'For remote MCP servers using modern Streamable HTTP transport'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Server URL *</Label>
              <Input
                type="text"
                id="url"
                required
                value={formData.url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder={
                  formData.transportType === 'stdio' 
                    ? 'stdio://node /path/to/server.js' 
                    : 'https://example.com/mcp'
                }
              />
              <p className="text-sm text-muted-foreground">
                {formData.transportType === 'stdio' && 'Use stdio:// protocol with command and arguments'}
                {(formData.transportType === 'http' || formData.transportType === 'sse') && 'Use https:// or http:// URL to your MCP server endpoint'}
              </p>
            </div>

            {(formData.transportType === 'http' || formData.transportType === 'sse') && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Custom Headers</Label>
                  <Button type="button" variant="outline" onClick={addHeader}>
                    Add Header
                  </Button>
                </div>
                
                {headers.map((header, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Header name"
                      value={header.key}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateHeader(index, 'key', e.target.value)}
                    />
                    <Input
                      type="text"
                      placeholder="Header value"
                      value={header.value}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateHeader(index, 'value', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => removeHeader(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
              
              <Button variant="outline" asChild>
                <Link href="/">
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 