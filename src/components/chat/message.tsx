import { cn } from "@/lib/utils";

interface MessageProps {
	content: string;
	isUser: boolean;
}

export function Message({ content, isUser }: MessageProps) {
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
				<div className="whitespace-pre-wrap">{content}</div>
			</div>
		</div>
	);
}
