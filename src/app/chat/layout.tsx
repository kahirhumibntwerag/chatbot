"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/sidebar-app";
import { ChatSettingsProvider } from "@/providers/ChatSettingsProvider";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ChatSettingsProvider>
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <div className="fixed top-2 left-2 z-50 md:relative md:top-0 md:left-0 md:z-auto">
            <SidebarTrigger />
          </div>
          {children}
        </div>
      </ChatSettingsProvider>
    </SidebarProvider>
  );
}