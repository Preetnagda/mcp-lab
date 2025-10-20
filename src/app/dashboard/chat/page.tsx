import { auth } from '@/auth';
import Chat from '@/components/chat/chat';
import { getMCPServers } from '@/services/mcp-service';
import { redirect } from 'next/navigation';

export default async function ChatPage() {
	const session = await auth();

	if (!session) {
		redirect('/auth/login');
	}

	const mcpServers = await getMCPServers(session);

	return <>
		<Chat mcpServers={mcpServers} />
		<div>
		</div>
	</>
} 
