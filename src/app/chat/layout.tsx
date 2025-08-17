"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/sidebar-app";
import { ChatSettingsProvider } from "@/providers/ChatSettingsProvider";
import { AuthProvider } from "@/providers/AuthProvider";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AuthProvider requireAuth>
        <ChatSettingsProvider>
          <AppSidebar />

              <SidebarTrigger />
            {children}
        </ChatSettingsProvider>
      </AuthProvider>
    </SidebarProvider>
  );
}