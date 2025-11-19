# MCP Lab

MCP Lab is a Next.js 15 dashboard for registering HTTP-based Model Context Protocol (MCP) servers, testing tools manually, or letting an LLM call those tools through a guided chat experience. Each user signs in via email, manages their own registry, and can store provider API keys that power the AI chat workflow.

## Highlights
- Magic-link authentication with NextAuth + Nodemailer; every feature lives behind `/auth/login`.
- Private MCP registry per user with create/edit/delete flows under `/dashboard/mcp`.
- Manual tool tester that renders JSON-schema forms, tracks call history, and lets you override saved headers before hitting `/api/mcp-call-tool`.
- AI chat runner that streams responses from OpenAI or Anthropic models using the stored API keys and live MCP tool calls.
- Credential vault at `/dashboard/credentials` for OpenAI/Anthropic API keys that the chat route reads before calling an LLM.
- PostgreSQL + Drizzle ORM schema with typed services, delivered via Next.js App Router and server actions.

## Architecture Overview
- **App shell**: `src/app` uses the App Router 100%; everything under `/dashboard/*` is wrapped with `SessionProvider` and the sidebar layout.
- **Authentication**: `src/auth.ts` wires NextAuth with the Drizzle adapter and a Nodemailer provider (EMAIL_SERVER/EMAIL_FROM secrets). Sessions expose `user.id` to the client components that call APIs.
- **Data layer**: `src/db/schema.ts` defines `mcp_servers`, `api_keys`, and the NextAuth tables. Drizzle queries live in `src/services/*`.
- **MCP integration**: `src/lib/mcp/manager.ts` instantiates `StreamableHTTPClientTransport` from the MCP SDK and exposes `connect` plus `callTool`, which power `/api/mcp-connect` and `/api/mcp-call-tool`.
- **Manual tester**: `src/components/mcp/manual-interaction.tsx` drives the tool list, JSON schema forms (via `@rjsf`), argument validation, and call history UI once a connection is established.
- **Chat workflow**: `src/components/chat/*` builds the configuration sidebar, message list, and composer. `/api/chat` streams UI messages using `ai`'s `streamText`, wiring selected MCP tools as callable tool definitions.

## Transport Support
Today the runtime only registers `http` transports (`StreamableHTTPClientTransport`). The database enum still includes `stdio` and `sse`, but the UI intentionally restricts the “Transport Type” selector to HTTP until additional transports ship. Attempting to save another type will be rejected on the backend because `McpConnectionManager` lacks the corresponding implementation.

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm (ships with Node)
- Docker (optional but recommended for running PostgreSQL locally)
- Access to an SMTP server for magic-link auth (any provider Nodemailer supports)

### Setup steps
1. **Clone & install**
   ```bash
   git clone <repo-url>
   cd mcp-tester
   npm install
   ```
2. **Start PostgreSQL**
   ```bash
   docker compose up -d postgres
   # or reuse an existing Postgres instance and create the mcp_registry database
   ```
3. **Configure environment**
   Create `.env.local` with the values the app reads directly:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mcp_registry
   NEXTAUTH_SECRET=replace-with-random-string
   NEXTAUTH_URL=http://localhost:3000
   AUTH_TRUST_HOST=http://localhost:3000
   EMAIL_SERVER=smtp://user:pass@smtp.yourhost.com:587
   EMAIL_FROM="MCP Lab <noreply@example.com>"
   ```
4. **Apply migrations**
   ```bash
   npm run db:migrate
   ```
   Run `npm run db:generate` only when you edit the Drizzle schema and need a new migration; it is not required for a fresh install.
5. **Launch the dev server**
   ```bash
   npm run dev
   ```
6. **Visit the dashboard**
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

## API Routes
- `GET/POST /api/mcp-servers` – list or create MCP servers for the authenticated user.
- `GET/PUT/DELETE /api/mcp-servers/[id]` – fetch, update, or remove a single server (authorization enforced per user).
- `POST /api/mcp-connect` – connect to a server and return tool metadata via the MCP SDK.
- `POST /api/mcp-call-tool` – execute a specific tool with JSON arguments and return the raw MCP result.
- `GET /api/api-keys` – expose stored provider keys to the chat configuration UI.
- `POST /api/chat` – stream responses from the selected LLM while allowing the model to invoke MCP tools.
- `api/auth/[...nextauth]` – handled by NextAuth for session management and email verification links.

## Database Schema
Drizzle migrations create the following key tables (simplified):

```sql
CREATE TYPE transport_type AS ENUM ('stdio', 'http', 'sse');

CREATE TABLE mcp_servers (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  transport_type transport_type NOT NULL DEFAULT 'http',
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE provider AS ENUM ('openai', 'anthropic');

CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  provider provider NOT NULL,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
NextAuth adds `users`, `accounts`, `sessions`, and `verification_tokens`, all defined in `src/db/schema.ts`.

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
- Add stdio/SSE transport implementations to `McpConnectionManager`.
- Surface MCP resources alongside tools inside the interaction UI.
- Support additional LLM providers and per-tool key selection.
- Bulk import/export for MCP server definitions and shared workspaces.
