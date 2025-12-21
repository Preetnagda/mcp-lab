'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    transportType: 'http'
  });
  const [headers, setHeaders] = useState<Header[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      const response = await fetch('/api/mcp-servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          headers: headersObject,
        }),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center mb-8">
        <Button variant="ghost" asChild className="mr-4">
          <Link href="/dashboard">
            ← Back to Registry
          </Link>
        </Button>
        <h1 className="text-4xl font-bold tracking-tight">Register MCP Server</h1>
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
                onValueChange={(value: 'http') => setFormData(prev => ({ ...prev, transportType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select transport type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP/HTTPS (Streamable HTTP)</SelectItem>
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
                {headers.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Skip authorization header to attempt to connect using OAuth
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Registering...' : 'Register Server'}
              </Button>
              
              <Button variant="outline" asChild>
                <Link href="/dashboard">
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