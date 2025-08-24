"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/sidebar-app";
import { ChatSettingsProvider } from "@/providers/ChatSettingsProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThreadProvider } from "@/context/ThreadContext";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AuthProvider requireAuth>
        <ChatSettingsProvider>
          <ThreadProvider>
            <AppSidebar />

            <div className="relative w-full">
              <SidebarTrigger className="absolute left-2 top-2 z-20 sm:left-4 sm:top-4" />
              {children}
            </div>
          </ThreadProvider>
        </ChatSettingsProvider>
      </AuthProvider>
    </SidebarProvider>
  );
}