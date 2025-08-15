"use client";
import {
  MessageCircle,
  LogOut,
  Plus,
  Database,
  ChevronDown,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "./button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ThemeToggle } from "./themeToggle";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// ------------------------------------------------------------------
// Types
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

// ------------------------------------------------------------------
// Module-level cache (persists across component unmounts)
// This prevents refetch on each navigation if the sidebar remounts.
// let chatCache: Chat[] = [];
// let chatsFetchedOnce = false;

// ------------------------------------------------------------------
const groupChatsByDate = (chats: Chat[]): ChatGroups => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;
  return chats.reduce(
    (groups: ChatGroups, chat) => {
      const age = now - chat.timestamp;
      if (age < oneDayMs) groups.today.push(chat);
      else if (age < sevenDaysMs) groups.last7Days.push(chat);
      else groups.older.push(chat);
      return groups;
    },
    { today: [], last7Days: [], older: [] }
  );
};

function messagesToChat(
  thread_id: string,
  messages: { text: string; sender: "user" | "model" }[],
  timestamp?: number
): Chat {
  const firstUserMessage = messages.find((x) => x.sender === "user");
  const title = firstUserMessage
    ? firstUserMessage.text.slice(0, 30) +
      (firstUserMessage.text.length > 30 ? "..." : "")
    : "New Chat";
  return {
    id: thread_id,
    title,
    messages,
    timestamp: timestamp || Date.now(),
  };
}

async function logout() {
  await fetch("http://localhost:8000/logout", {
    method: "POST",
    credentials: "include",
  });
  window.location.href = "/login";
}

// Fetch helpers
async function fetchStores(): Promise<Store[]> {
  const tokenMatch = document.cookie.match(/(?:^|;\s*)jwt=([^;]+)/);
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
  if (!token) throw new Error("No auth");
  const res = await fetch("http://localhost:8000/stores", {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed stores");
  const data = await res.json();
  return data.stores ?? [];
}

async function fetchChats(): Promise<Chat[]> {
  const tokenMatch = document.cookie.match(/(?:^|;\s*)jwt=([^;]+)/);
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
  if (!token) return [];
  const res = await fetch("http://localhost:8000/checkpoints/messages", {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed chats");
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  const chats = data
    .filter(
      (row: any) => Array.isArray(row?.messages) && row.messages.length > 0
    )
    .map((row: any) => messagesToChat(row.thread_id, row.messages));
  return chats.sort((a, b) => b.timestamp - a.timestamp);
}

// ------------------------------------------------------------------
export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const activeChatId = useMemo(() => {
    const match = pathname?.match(/\/chat\/([^\/?#]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  // React Query: chats
  const {
    data: chats = [],
    isLoading: chatsLoading,
    isError: chatsError,
  } = useQuery({
    queryKey: ["chats"],
    queryFn: fetchChats,
    // initialData can keep previously injected values
  });

  // React Query: stores
  const {
    data: stores = [],
    isLoading: storesLoading,
    isError: storesError,
  } = useQuery({
    queryKey: ["stores"],
    queryFn: fetchStores,
  });

  // Utility
  const sortChats = (list: Chat[]) =>
    [...list].sort((a, b) => b.timestamp - a.timestamp);

  // Update (merge) chat messages in cache
  const updateChatMessages = (id: string, messages: Chat["messages"]) => {
    queryClient.setQueryData<Chat[]>(["chats"], (old = []) => {
      const idx = old.findIndex((c) => c.id === id);
      if (idx === -1) {
        const created = messagesToChat(id, messages);
        return sortChats([...old, created]);
      }
      const existing = old[idx];
      const oldLen = existing.messages.length;
      const newLen = messages.length;
      let bump = false;
      if (newLen > oldLen) {
        const newly = messages.slice(oldLen);
        bump = newly.some((m) => m.sender === "user");
      }
      const updated: Chat = {
        ...existing,
        messages,
        timestamp: bump ? Date.now() : existing.timestamp,
        title:
          existing.title === "New Chat" && messages.length
            ? (
                messages.find((m) => m.sender === "user")?.text ||
                existing.title
              ).slice(0, 30)
            : existing.title,
      };
      const next = [...old];
      next[idx] = updated;
      return sortChats(next);
    });
  };

  // New chat
  const startNewChat = () => {
    const id = crypto.randomUUID?.() || `chat_${Date.now()}`;
    queryClient.setQueryData<Chat[]>(["chats"], (old = []) => {
      if (old.some((c) => c.id === id)) return old;
      const newChat: Chat = {
        id,
        title: "New Chat",
        messages: [],
        timestamp: Date.now(),
      };
      return sortChats([newChat, ...old]);
    });
    router.push(`/chat/${id}`);
  };

  // Listen for external updates
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.id || !Array.isArray(detail?.messages)) return;
      updateChatMessages(detail.id, detail.messages);
    };
    window.addEventListener("chatUpdated", handler as EventListener);
    return () =>
      window.removeEventListener("chatUpdated", handler as EventListener);
  }, []);

  // Expose thread ids globally
  useEffect(() => {
    try {
      (window as any).__chatThreads = chats.map((c) => c.id);
      window.dispatchEvent(new Event("chatThreadsUpdated"));
    } catch {}
  }, [chats]);

  const grouped = useMemo(() => groupChatsByDate(chats), [chats]);
  const todayReversed = useMemo(
    () => [...grouped.today].reverse(),
    [grouped.today]
  );
  const last7Reversed = useMemo(
    () => [...grouped.last7Days].reverse(),
    [grouped.last7Days]
  );
  const olderReversed = useMemo(
    () => [...grouped.older].reverse(),
    [grouped.older]
  );

  // Basic load / error UI (optional terse indicators)
  const storesState = storesLoading
    ? "Loading..."
    : storesError
    ? "Failed"
    : null;
  const chatsState = chatsLoading ? "Loading..." : chatsError ? "Failed" : null;

  return (
    <Sidebar variant='sidebar' collapsible="offcanvas" >
      <SidebarHeader>
        {" "}
        <ThemeToggle />
        <Button
          variant="default"
          className="w-full justify-start mb-2"
          onClick={startNewChat}
        >
          <Plus className="mr-2 h-4 w-4" />
          <span>New Chat</span>
        </Button>
      </SidebarHeader>

      <SidebarContent className="">
        <SidebarGroup>
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
                  {storesState && (
                    <div className="text-xs text-muted-foreground mb-1">
                      {storesState}
                    </div>
                  )}
                  {!storesState &&
                    stores.map((store) => (
                      <Button
                        key={store.id}
                        variant="ghost"
                        className="w-full justify-start mb-1 text-sm"
                        onClick={() => {
                          try {
                            localStorage.setItem(
                              "selectedStore",
                              store.store_name
                            );
                          } catch {}
                          window.dispatchEvent(
                            new CustomEvent("storeSelected", {
                              detail: store.store_name,
                            })
                          );
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
            {chatsState && (
              <div className="px-2 text-xs text-muted-foreground">
                {chatsState}
              </div>
            )}
            {!chatsState && (
              <div className="space-y-4">
                {todayReversed.length > 0 && (
                  <div>
                    <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                      Today
                    </div>
                    <div className="space-y-1">
                      {todayReversed.map((chat) => (
                        <Button
                          key={chat.id}
                          variant="ghost"
                          aria-current={
                            activeChatId === chat.id ? "page" : undefined
                          }
                          className={`w-full justify-start px-2 text-sm ${
                            activeChatId === chat.id
                              ? "bg-accent text-accent-foreground"
                              : ""
                          }`}
                          onClick={() => {
                            router.push(`/chat/${chat.id}`);
                          }}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          <span className="truncate w-full">{chat.title}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {last7Reversed.length > 0 && (
                  <div>
                    <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                      Last 7 Days
                    </div>
                    <div className="space-y-1">
                      {last7Reversed.map((chat) => (
                        <Button
                          key={chat.id}
                          variant="ghost"
                          aria-current={
                            activeChatId === chat.id ? "page" : undefined
                          }
                          className={`w-full justify-start px-2 text-sm ${
                            activeChatId === chat.id
                              ? "bg-accent text-accent-foreground"
                              : ""
                          }`}
                          onClick={() => {
                            router.push(`/chat/${chat.id}`);
                          }}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          <span className="truncate w-full">{chat.title}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {olderReversed.length > 0 && (
                  <div>
                    <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                      Older
                    </div>
                    <div className="space-y-1">
                      {olderReversed.map((chat) => (
                        <Button
                          key={chat.id}
                          variant="ghost"
                          aria-current={
                            activeChatId === chat.id ? "page" : undefined
                          }
                          className={`w-full justify-start px-2 text-sm ${
                            activeChatId === chat.id
                              ? "bg-accent text-accent-foreground"
                              : ""
                          }`}
                          onClick={() => {
                            router.push(`/chat/${chat.id}`);
                          }}
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          <span className="truncate w-full">{chat.title}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </SidebarGroup>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="secondary" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
