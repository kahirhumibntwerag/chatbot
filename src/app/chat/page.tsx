"use client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/sidebar-app"
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { useThread } from "@/context/ThreadContext";



export default function ChatLanding() {
  const { navigateToThread } = useThread();

  useEffect(() => {
    // Generate a new thread ID and redirect
    const thread_id = uuidv4();
    navigateToThread(thread_id);
  }, [navigateToThread]);

  // Show a loading state while redirecting
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="fixed top-2 left-2 z-50 md:relative md:top-0 md:left-0 md:z-auto">
        <SidebarTrigger />
      </div>
      <div className="flex h-svh items-center justify-center w-full pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
          <span>Creating new chat...</span>
        </div>
      </div>
    </SidebarProvider>
  );
}
