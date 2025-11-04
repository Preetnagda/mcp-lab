import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SessionProvider } from "next-auth/react"

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<SessionProvider>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					{children}
				</SidebarInset>
			</SidebarProvider>
		</SessionProvider>
	)
}
