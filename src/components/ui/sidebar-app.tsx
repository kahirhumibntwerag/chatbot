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
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";
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
import { ThemeToggle } from "./themeToggle";

type Chat = {
  id: string;
  title: string;
  messages: { text: string; sender: "user" | "model" }[];
  timestamp: number;
};

type Store = {
  id: number;
  store_name: string;
  created_at: string;
};

type ChatGroups = {
  today: Chat[];
  last7Days: Chat[];
  older: Chat[];
};

const formatRelativeTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
};

async function logout() {
  await fetch("http://localhost:8000/logout", {
    method: "POST",
    credentials: "include",
  });
  window.location.href = "/login";
}

const groupChatsByDate = (chats: Chat[]): ChatGroups => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;

  return chats.reduce(
    (groups: ChatGroups, chat) => {
      const age = now - chat.timestamp;

      if (age < oneDayMs) {
        groups.today.push(chat);
      } else if (age < sevenDaysMs) {
        groups.last7Days.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    { today: [], last7Days: [], older: [] }
  );
};

export function AppSidebar() {
  const router = useRouter();
  const [savedChats, setSavedChats] = useState<Chat[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  const startNewChat = () => {
    const newChatId = `chat_${Date.now()}`;
    localStorage.setItem(newChatId, JSON.stringify([]));
    router.push("/chat");
  };

  useEffect(() => {
    const loadSavedChats = () => {
      const chats: Chat[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("chat_")) {
          try {
            const rawMessages = localStorage.getItem(key);
            if (rawMessages) {
              const messages = JSON.parse(rawMessages);
              if (Array.isArray(messages)) {
                const firstUserMessage = messages.find(
                  (m) => m.sender === "user"
                );
                const timestamp = parseInt(key.split("_")[1]) || Date.now();

                chats.push({
                  id: key.replace("chat_", ""),
                  title: firstUserMessage
                    ? firstUserMessage.text.slice(0, 30) +
                      (firstUserMessage.text.length > 30 ? "..." : "")
                    : "New Chat",
                  messages: messages,
                  timestamp: timestamp,
                });
              }
            }
          } catch (error) {
            console.error(`Error loading chat ${key}:`, error);
            localStorage.removeItem(key);
          }
        }
      }

      setSavedChats(chats.sort((a, b) => b.timestamp - a.timestamp));
    };

    loadSavedChats();
    window.addEventListener("storage", loadSavedChats);
    return () => window.removeEventListener("storage", loadSavedChats);
  }, []);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const cookies = document.cookie.split(";");
        const accessToken = cookies
          .find((cookie) => cookie.trim().startsWith("jwt="))
          ?.split("=")[1];

        if (!accessToken) {
          toast.error("Authentication required");
          return;
        }

        const response = await fetch("http://localhost:8000/stores", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setStores(data.stores);
      } catch (error) {
        console.error("Failed to fetch stores:", error);
        toast.error("Failed to load stores");
      }
    };

    fetchStores();
  }, []);

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <ThemeToggle />

          <Button
            variant="default"
            className="w-full justify-start mb-2"
            onClick={startNewChat}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>New Chat</span>
          </Button>

          <SidebarGroup className="mb-4">
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-accent rounded-lg">
                <div className="flex items-center">
                  <Database className="mr-2 h-4 w-4" />
                  <span>Stores</span>
                </div>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pl-4 mt-1">
                  {stores.map((store) => (
                    <Button
                      key={store.id}
                      variant="ghost"
                      className="w-full justify-start mb-1 text-sm"
                      onClick={() => {
                        localStorage.setItem("selectedStore", store.store_name);
                        window.dispatchEvent(new Event("storeSelected"));
                      }}
                    >
                      <span className="truncate">{store.store_name}</span>
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>

          <SidebarGroup className="flex-1">
            <div className="mb-2 px-2 text-sm font-medium">Chat History</div>
            <div className="space-y-4">
              {/* Today's Chats */}
              {groupChatsByDate(savedChats).today.length > 0 && (
                <div>
                  <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                    Today
                  </div>
                  <div className="space-y-1">
                    {groupChatsByDate(savedChats).today.map((chat) => (
                      <Button
                        key={chat.id}
                        variant="ghost"
                        className="w-full justify-start px-2 text-sm"
                        onClick={() => router.push(`/chat/${chat.id}`)}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        <span className="truncate items-start w-full">
                          {chat.title}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Last 7 Days Chats */}
              {groupChatsByDate(savedChats).last7Days.length > 0 && (
                <div>
                  <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                    Last 7 Days
                  </div>
                  <div className="space-y-1">
                    {groupChatsByDate(savedChats).last7Days.map((chat) => (
                      <Button
                        key={chat.id}
                        variant="ghost"
                        className="w-full justify-start px-2 text-sm"
                        onClick={() => router.push(`/chat/${chat.id}`)}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        <span className="truncate w-full">{chat.title}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Older Chats */}
              {groupChatsByDate(savedChats).older.length > 0 && (
                <div>
                  <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                    Older
                  </div>
                  <div className="space-y-1">
                    {groupChatsByDate(savedChats).older.map((chat) => (
                      <Button
                        key={chat.id}
                        variant="ghost"
                        className="w-full justify-start px-2 text-sm"
                        onClick={() => router.push(`/chat/${chat.id}`)}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        <span className="truncate w-full">{chat.title}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SidebarGroup>
        </SidebarGroup>
      </SidebarContent>
              <Button
          variant="secondary"
          className="w-full sticky bottom-2 justify-start mt-auto border-t"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </Button>
    </Sidebar>
  );
}
