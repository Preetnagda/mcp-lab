import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
							<div
								key={index}
								className="prose dark:prose-invert max-w-none break-words leading-relaxed"
							>
								<ReactMarkdown
									remarkPlugins={[remarkGfm]}
									components={{
									ol: ({ children }) => (
										<ol className="list-decimal pl-4 mb-2 last:mb-0">{children}</ol>
									),
									ul: ({ children }) => (
										<ul className="list-disc pl-4 mb-2 last:mb-0">{children}</ul>
									),
									li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
									a: ({ children, href }) => (
										<a
											href={href}
											className={cn(
												"underline font-medium",
												isUser
													? "text-primary-foreground hover:text-primary-foreground/80"
													: "text-primary hover:text-primary/80"
											)}
											target="_blank"
											rel="noopener noreferrer"
										>
											{children}
										</a>
									),
									p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
									h1: ({ children }) => (
										<h1 className="text-xl font-bold mb-2">{children}</h1>
									),
									h2: ({ children }) => (
										<h2 className="text-lg font-bold mb-2">{children}</h2>
									),
									h3: ({ children }) => (
										<h3 className="text-base font-bold mb-2">{children}</h3>
									),
									blockquote: ({ children }) => (
										<blockquote
											className={cn(
												"border-l-2 pl-4 italic my-2",
												isUser ? "border-primary-foreground/50" : "border-primary/50"
											)}
										>
											{children}
										</blockquote>
									),
									pre: ({ children }) => (
										<pre
											className={cn(
												"p-3 rounded-lg overflow-x-auto my-2 border [&>code]:bg-transparent [&>code]:p-0",
												isUser
													? "bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"
													: "bg-muted border-border text-foreground"
											)}
										>
											{children}
										</pre>
									),
									code: ({ className, children, ...props }: any) => (
										<code
											className={cn(
												"px-1 py-0.5 rounded font-mono text-sm",
												isUser
													? "bg-primary-foreground/20 text-primary-foreground"
													: "bg-muted text-foreground",
												className
											)}
											{...props}
										>
											{children}
										</code>
									),
								}}
							>
								{part.text}
							</ReactMarkdown>
							</div>
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
