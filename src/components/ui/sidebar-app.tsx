import {
  Calendar,
  Home,
  Inbox,
  Search,
  Settings,
  MessageCircle,
  LogOut,
  Plus,
  Database,
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from "sonner";

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { ThemeToggle } from "./themeToggle";

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

// Add Store type
type Store = {
  id: number;
  store_name: string;
  created_at: string;
};

export function AppSidebar() {
  const router = useRouter();
  const [savedChats, setSavedChats] = useState<Chat[]>([]);
  // Add stores state
  const [stores, setStores] = useState<Store[]>([]);

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

  // Add useEffect to fetch stores
  useEffect(() => {
    const fetchStores = async () => {
      try {
        // Get the JWT token from cookies
        const cookies = document.cookie.split(";");
        const accessToken = cookies
          .find((cookie) => cookie.trim().startsWith("jwt="))
          ?.split("=")[1];

        if (!accessToken) {
          toast.error("No authentication token found. Please login again.");
          return;
        }

        const response = await fetch("http://localhost:8000/stores", {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setStores(data.stores);
        } else if (response.status === 401) {
          toast.error("Session expired. Please login again.");
          router.push('/login');
        } else {
          throw new Error("Failed to fetch stores");
        }
      } catch (error) {
        console.error("Failed to fetch stores:", error);
        toast.error("Failed to load stores");
      }
    };

    fetchStores();
  }, [router]);

  const navigateToChat = (threadId: string) => {
    router.push(`/chat/${threadId}`);
  };

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <ThemeToggle />
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
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-2 px-4 hover:bg-gray-100/50 rounded-lg group">
                <SidebarGroupLabel>Stores</SidebarGroupLabel>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="transition-all duration-300 ease-in-out">
                <SidebarGroupContent className="data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                  <SidebarMenu>
                    {stores.map((store) => (
                      <SidebarMenuItem key={store.id}>
                        <SidebarMenuButton
                          onClick={() => {
                            localStorage.setItem('selectedStore', store.store_name);
                            window.dispatchEvent(new Event('storeSelected'));
                          }}
                          className="w-full cursor-pointer"
                        >
                          <Database className="mr-2 h-4 w-4" />
                          <span className="truncate">{store.store_name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>

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
