import {
  Calendar,
  Home,
  Inbox,
  Search,
  Settings,
  MessageCircle,
  LogOut,
  Plus,
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "./button";
async function logout() {
  await fetch("http://localhost:8000/logout", {
    method: "POST",
    credentials: "include", // include cookies in request
  });

  window.location.href = "/login";
}

// Menu items.
const items = [
  {
    title: "Home",
    url: "#",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
];

type Chat = {
  id: string;
  title: string;
  messages: { text: string; sender: "user" | "model" }[];
};

export function AppSidebar() {
  const router = useRouter();
  const [savedChats, setSavedChats] = useState<Chat[]>([]);

  const startNewChat = () => {
    router.push('/chat');
  };

  useEffect(() => {
    // Load saved chats from localStorage
    const loadSavedChats = () => {
      const chats: Chat[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('chat_')) {
          const threadId = key.replace('chat_', '');
          const messages = JSON.parse(localStorage.getItem(key) || '[]');
          // Use the first user message as the chat title
          const firstUserMessage = messages.find((m: any) => m.sender === 'user');
          const title = firstUserMessage ? 
            (firstUserMessage.text.slice(0, 30) + '...') : 
            'New Chat';
          
          chats.push({
            id: threadId,
            title,
            messages
          });
        }
      }
      setSavedChats(chats);
    };

    loadSavedChats();
    // Add event listener for localStorage changes
    window.addEventListener('storage', loadSavedChats);
    return () => window.removeEventListener('storage', loadSavedChats);
  }, []);

  const navigateToChat = (threadId: string) => {
    router.push(`/chat/${threadId}`);
  };

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <Button
            variant="default"
            className="w-full justify-start mb-2 hover:cursor-pointer"
            onClick={startNewChat}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>New Chat</span>
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start hover:cursor-pointer border-2"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </Button>

          <SidebarGroup>
            <SidebarGroupLabel>Past Chats</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {savedChats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      onClick={() => navigateToChat(chat.id)}
                      className="w-full cursor-pointer"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      <span className="truncate">{chat.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
