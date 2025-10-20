import { Lock, Server, Settings, MessageSquare } from "lucide-react"

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { NavUser } from "./nav-user"
import { signOut } from "@/auth"

// Menu items.
const items = [
	{
		title: "MCP Servers",
		url: "/dashboard/mcp",
		icon: Server,
	},
	{
		title: "Credentials",
		url: "/dashboard/credentials",
		icon: Lock,
	},
]

export function AppSidebar() {
	const logout = async () => {
		"use server"
		await signOut()
	}

	return (
		<Sidebar>
			<SidebarHeader>
				<SidebarHeader>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton size="lg" asChild>
								<a href="/dashboard/mcp">
									<div className="flex flex-col gap-0.5 leading-none">
										<span className="font-medium text-xl">MCP Lab</span>
									</div>
								</a>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild>
										<a href={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</a>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild>
							<form action={logout} className="w-full">
								<button type="submit" className="cursor-pointer w-full text-left"><span>Logout</span></button>
							</form>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
				<NavUser user={{ "email": "preetnagda34@gmail.com", "name": "Preet Nagda" }} />
			</SidebarFooter>
		</Sidebar>
	)
}
