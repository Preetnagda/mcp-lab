import { cn } from "@/lib/utils";

interface MessageProps {
	parts: any;
	isUser: boolean;
}

function formatToolValue(value: unknown) {
	if (typeof value === "string") {
		return value;
	}

	if (value === null || value === undefined) {
		return "";
	}

	try {
		return JSON.stringify(value, null, 2);
	} catch (_error) {
		return String(value);
	}
}

export function Message({ parts, isUser }: MessageProps) {
	return (
		<div
			className={cn(
				"flex w-full mb-4",
				isUser ? "justify-end" : "justify-start"
			)}
		>
			<div
				className={cn(
					"max-w-[80%] rounded-lg px-4 py-2 text-sm",
					isUser
						? "bg-primary text-primary-foreground ml-12"
						: "bg-card text-foreground mr-12"
				)}
			>
				{parts.map((part: any, index: number) => {
					if (part.type === "text") {
						return (
							<span key={index} className="block whitespace-pre-wrap leading-relaxed">
								{part.text}
							</span>
						);
					}

					if (typeof part.type === "string" && part.type.startsWith("tool")) {
						const rawName = part.name ?? part.type.slice(5);
						const toolName = rawName
							? String(rawName).replace(/^[\s:_-]+/, "") || "Tool"
							: "Tool";

						return (
							<details
								key={index}
								open
								className="my-3 overflow-hidden rounded-lg border border-border bg-muted/30 text-sm"
							>
								<summary className="flex cursor-pointer select-none items-center justify-between gap-2 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground">
									<span className="text-sm font-medium text-foreground">{toolName}</span>
									<span className="text-xs font-normal text-muted-foreground">Tool Call</span>
								</summary>
								<div className="space-y-3 border-t border-border/80 bg-background/80 px-3 py-3 text-foreground">
									<div>
										<div className="text-xs font-semibold uppercase text-muted-foreground">Input</div>
										<pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">
											{formatToolValue(part.input ?? "")}
										</pre>
									</div>
									{part.output !== undefined ? (
										<div>
											<div className="text-xs font-semibold uppercase text-muted-foreground">Output</div>
											<pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">
												{formatToolValue(part.output)}
											</pre>
										</div>
									) : null}
								</div>
							</details>
						);
					}

					return null;
				})}
			</div>
		</div>
	);
}
