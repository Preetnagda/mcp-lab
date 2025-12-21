# MCP Lab

![MCP Lab Demo](./docs/mcp-lab-demo.gif)

MCP Lab is a Next.js 15 dashboard for registering HTTP-based Model Context Protocol (MCP) servers, testing tools manually, or letting an LLM call those tools through a guided chat experience. Each user signs in via email, manages their own registry, and can store provider API keys that power the AI chat workflow.

Access Live: [MCP Lab](https://mcp-lab.preetnagda.com)

## Highlights
- **Inspect Capabilities**: View available tools, read detailed descriptions, and analyze JSON input schemas for each tool.
- **OAuth Integration**: Built-in support for connecting to MCP servers that require OAuth authentication (requires Dynamic Client Registration, RFC 7591 support on the server).
- **Custom Headers**: Define and inject custom headers (e.g., API keys, auth tokens) for your MCP server requests.
- **Dual Interaction Modes**: Manually interact with MCP tools via generated forms or let an LLM orchestrate the interaction.
- **Context Awareness**: Check approximate context overhead and monitor token usage for each connected MCP server.

## Deployment Architecture
![Deployment Architecture](docs/opennext-serverless-simplified.png)

The application is deployed using **SST** on AWS, leveraging **[OpenNext](https://opennext.js.org/)** to adapt Next.js for a serverless environment. OpenNext transforms the Next.js build output into a format compatible with AWS Lambda and other serverless platforms.

For a deeper dive into how OpenNext structures the deployment, please refer to their [Architecture Documentation](https://opennext.js.org/aws/inner_workings/architecture).
- **Compute**: Runs on AWS Lambda, allowing for infinite scaling and zero idle costs.
- **CDN**: AWS CloudFront serves static assets and caches content at the edge for low latency.
- **Storage**: User data and configurations are stored in a managed PostgreSQL database.
- **Security**: Environment variables and secrets are securely managed via SST's secret management.

## Transport Support
Today the runtime only registers `http` transports (`StreamableHTTPClientTransport`). The database enum still includes `stdio` and `sse`, but the UI intentionally restricts the “Transport Type” selector to HTTP until additional transports ship. Attempting to save another type will be rejected on the backend because `McpConnectionManager` lacks the corresponding implementation.

## Getting Started

### Prerequisites
- Node.js 18 or higher
- AWS credentials configured locally (or utilize a profile)
- A PostgreSQL database URL (local or remote)

### Setup steps
1. **Clone & install**
   ```bash
   git clone <repo-url>
   cd mcp-tester
   npm install
   ```
2. **Configure Secrets**
   Initialize the required secrets using SST:
   ```bash
   npx sst secret set DATABASE_URL "postgresql://user:pass@host:5432/mcp_registry"
   npx sst secret set NEXTAUTH_SECRET "your-random-secret"
   npx sst secret set EMAIL_API_KEY "your-email-provider-api-key"
   npx sst secret set EMAIL_FROM "noreply@example.com"
   npx sst secret set ENCRYPTION_KEY "your-32-char-encryption-key"
   ```
3. **Apply migrations**
   ```bash
   npm run db:migrate
   ```
4. **Launch the dev server**
   ```bash
   npx sst dev
   ```
   This will start the local development environment and link it to your AWS sandbox.
5. **Visit the dashboard**
   Open `http://localhost:3000`, request a magic link, and you’ll be redirected to `/dashboard/mcp` after confirming the email.

### Helpful scripts
- `npm run build` – Next.js production build
- `npm run db:studio` – Launch Drizzle Studio against the configured database
- `npm run lint` – Next.js lint pipeline

## Core Workflows

### 1. Sign in & API keys
1. Go to `/auth/login` and request a magic link (Nodemailer sends via `EMAIL_SERVER`).
2. After signing in, open `/dashboard/credentials` to store provider keys. Only OpenAI (`openai`) and Anthropic (`anthropic`) are currently enumerated in `providers`.
3. Keys are encrypted at rest by PostgreSQL access controls; only the owning user can read/update/delete them through the server actions in `src/services/key-service.ts`.

### 2. Register or edit MCP servers
- `/dashboard/mcp` lists only the current user’s servers and shows call-to-action buttons for register/edit/delete.
- `/dashboard/register` accepts name, description, URL, HTTP headers, and (for now) forces the transport type to HTTP.
- `/dashboard/edit/[id]` reuses the same form, loading the record via `/api/mcp-servers/[id]`.
- Records are scoped to the user id at the API layer, so even crafted requests cannot touch another user’s servers.

### 3. Manual tool testing
1. Click **Interact** on a server to load `/dashboard/mcp/[id]`.
2. Hit **Connect to MCP Server**; the page calls `/api/mcp-connect`, which in turn uses `McpConnectionManager.connect` to list tools.
3. Select a tool to view its description, input schema, and auto-generated form. You can also toggle a raw JSON textarea if no schema is provided.
4. Every run hits `/api/mcp-call-tool` and logs results or errors in the **Recent Calls** list with one-click copy buttons.
5. Header overrides are editable after expanding **More info**, letting you temporarily swap tokens without saving them permanently.

### 4. AI chat runner
1. Switch the interaction mode to **Chat** after connecting; MCP Lab will surface the selected server’s tools inside the chat sidebar.
2. Choose the LLM provider/model combinations you have API keys for (models are defined in `src/lib/llm.ts`).
3. Messages stream through `/api/chat`, which limits tool-chaining to five steps per request (`stepCountIs(5)`). Tool definitions call back into `McpConnectionManager.callTool` using the saved server headers.
4. The chat UI shows all assistant/user messages, and it disables send while a response is pending to prevent duplicate tool executions.

### 5. OAuth Connection Flow
1. If an MCP server requires authentication (401 response) and supports Dynamic Client Registration (RFC 7591), the system initiates an OAuth 2.0 Authorization Code flow with PKCE.
2. You are redirected to the provider's login page to authorize the application.
3. Upon success, you are redirected back to the dashboard (`/api/auth/mcp/callback`), where the access token is securely encrypted and stored.
4. The dashboard automatically reconnects (`auto_connect=true`), now using the stored token for all subsequent requests.

## API Routes
- `GET/POST /api/mcp-servers` – list or create MCP servers for the authenticated user.
- `GET/PUT/DELETE /api/mcp-servers/[id]` – fetch, update, or remove a single server (authorization enforced per user).
- `POST /api/mcp-connect` – connect to a server and return tool metadata via the MCP SDK.
- `POST /api/mcp-call-tool` – execute a specific tool with JSON arguments and return the raw MCP result.
- `GET /api/api-keys` – expose stored provider keys to the chat configuration UI.
- `POST /api/chat` – stream responses from the selected LLM while allowing the model to invoke MCP tools.
- `api/auth/[...nextauth]` – handled by NextAuth for session management and email verification links.

## Tech Stack
- **Frontend**: Next.js 15 + React 19, App Router, Server Components, Tailwind 4 (via PostCSS) + shadcn/ui.
- **Auth**: NextAuth with magic links, Drizzle adapter, SST secrets for deployment.
- **Database**: PostgreSQL 15, Drizzle ORM, Drizzle Kit migrations.
- **MCP**: `@modelcontextprotocol/sdk` Streamable HTTP client, manual + chat tooling.
- **LLM SDK**: `ai` (Vercel AI SDK) with providers from `@ai-sdk/openai` and `@ai-sdk/anthropic`.
- **Dev tooling**: ESLint 9, TypeScript 5, Turbopack-powered `next dev`.

## Troubleshooting
- **Email login** – ensure `EMAIL_SERVER` is a valid Nodemailer connection string and that localhost is allowed as an auth host (`AUTH_TRUST_HOST` / `NEXTAUTH_URL`).
- **Database errors** – confirm Postgres is reachable at `DATABASE_URL` and that migrations ran; Drizzle errors usually cite missing tables.
- **MCP connection failures** – verify the remote endpoint supports Streamable HTTP (`@modelcontextprotocol/sdk` server transport) and that any required auth headers are present; CORS must allow `OPTIONS`, `POST`, and `GET`.
- **Chat shows “API key not found”** – add a matching provider key on `/dashboard/credentials`; the chat endpoint refuses to call models without it.
- **Tool call validation** – schemas are validated with `@rjsf/validator-ajv8`; malformed JSON or schema violations appear in the “Recent Calls” list with detailed errors.

## Roadmap
- Surface MCP resources alongside tools inside the interaction UI.
- Support additional LLM providers and per-tool key selection.
- Pre registered client_id and secret support for OAuth flow.