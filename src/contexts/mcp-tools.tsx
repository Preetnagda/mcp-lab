"use client";

import { createContext, useState } from 'react';

interface McpTools {
	[key: string]: any;
}

interface McpToolsContextType {
	mcpTools: McpTools;
	setToolsForMcp: (mcpId: string, tools: any) => void;
}

export const McpToolsContext = createContext<McpToolsContextType | null>(null);

export function McpToolsProvider({ children }: { children: React.ReactNode }) {
	const [mcpTools, setMcpTools] = useState<McpTools>({});

	const setToolsForMcp = (mcpId: string, tools: any) => {
		setMcpTools((prev) => ({
			...prev,
			[mcpId]: tools,
		}));
	}

	const contextValue = {
		mcpTools,
		setToolsForMcp,
	};

	return (
		<McpToolsContext.Provider value={contextValue}>
			{children}
		</McpToolsContext.Provider>
	);
}
