"use client";

import {
  MessageCircle,
  LogOut,
  Plus,
  Database,
  ChevronDown,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
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
import Link from "next/link";

// Base URL (strip trailing slash)
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const api = (path: string) =>
  `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

// Types
type ChatMessage = { text: string; sender: "user" | "model" };
type Chat = {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number; // last modified
};
type Store = { id: number; store_name: string; created_at: string };
interface StoresResponse { stores?: Store[] }
interface RawCheckpoint {
  thread_id: string;
  messages: ChatMessage[];
  timestamp?: number;
}

declare global {
  interface Window {
    __chatThreads?: string[];
  }
}

function isChatMessageArray(v: unknown): v is ChatMessage[] {
  return Array.isArray(v) && v.every(
    (m) =>
      m &&
      typeof m === "object" &&
      typeof (m as any).text === "string" &&
      ((m as any).sender === "user" || (m as any).sender === "model")
  );
}
function isRawCheckpoint(v: unknown): v is RawCheckpoint {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as any).thread_id === "string" &&
    isChatMessageArray((v as any).messages)
  );
}

function toChat(row: RawCheckpoint): Chat {
  const firstUser = row.messages.find((m) => m.sender === "user");
  const title = firstUser
    ? firstUser.text.slice(0, 30) + (firstUser.text.length > 30 ? "..." : "")
    : "New Chat";
  return {
    id: row.thread_id,
    title,
    messages: row.messages,
    // If backend provides a timestamp use it, else now
    timestamp: typeof row.timestamp === "number" ? row.timestamp : Date.now(),
  };
}

// Group by recency (based on last modified timestamp)
function groupChatsByDate(chats: Chat[]) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;
  return chats.reduce(
    (acc, c) => {
      const age = now - c.timestamp;
      if (age < oneDay) acc.today.push(c);
      else if (age < sevenDays) acc.last7Days.push(c);
      else acc.older.push(c);
      return acc;
    },
    { today: [] as Chat[], last7Days: [] as Chat[], older: [] as Chat[] }
  );
}

// Data fetch
async function fetchStores(): Promise<Store[]> {
  const tokenMatch = document.cookie.match(/(?:^|;\s*)jwt=([^;]+)/);
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
  if (!token) return [];
  const res = await fetch(api("/stores"), {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) return [];
  const data: StoresResponse = await res.json();
  return Array.isArray(data.stores) ? data.stores : [];
}

async function fetchChats(): Promise<Chat[]> {
  const tokenMatch = document.cookie.match(/(?:^|;\s*)jwt=([^;]+)/);
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
  if (!token) return [];
  const res = await fetch(api("/checkpoints/messages"), {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) return [];
  const raw = await res.json();
  if (!Array.isArray(raw)) return [];
  const chats = raw.filter(isRawCheckpoint).filter(r => r.messages.length > 0).map(toChat);
  // Initial ordering: newest (largest timestamp) first
  chats.sort((a, b) => a.timestamp - b.timestamp);
  return chats;
}

async function logout() {
  await fetch(api("/logout"), {
    method: "POST",
    credentials: "include",
  });
  window.location.href = "/login";
}

// Narrow custom event
function isChatUpdatedEvent(
  e: Event
): e is CustomEvent<{ id: string; messages: ChatMessage[] }> {
  return !!(e as any)?.detail?.id && Array.isArray((e as any)?.detail?.messages);
}

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [chatsError, setChatsError] = useState(false);

  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState(false);

  // Active chat id
  const activeChatId = useMemo(() => {
    const match = pathname?.match(/\/chat\/([^\/?#]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  // Initial chats
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setChatsLoading(true);
      setChatsError(false);
      try {
        const data = await fetchChats();
        if (!cancelled) setChats(data);
      } catch {
        if (!cancelled) setChatsError(true);
      } finally {
        if (!cancelled) setChatsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Stores
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStoresLoading(true);
      setStoresError(false);
      try {
        const data = await fetchStores();
        if (!cancelled) setStores(data);
      } catch {
        if (!cancelled) setStoresError(true);
      } finally {
        if (!cancelled) setStoresLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Last-modified ordering without full sort: move item to front only when new user message
  const updateChatMessages = useCallback((id: string, messages: ChatMessage[]) => {
    setChats(prev => {
      const idx = prev.findIndex(c => c.id === id);
      const now = Date.now();
      if (idx === -1) {
        // New thread from elsewhere
        const created: Chat = {
          id,
            title: (() => {
              const u = messages.find(m => m.sender === "user");
              if (!u) return "New Chat";
              return u.text.length > 30 ? u.text.slice(0, 30) + "..." : u.text;
            })(),
          messages,
          timestamp: now
        };
        return [created, ...prev];
      }
      const existing = prev[idx];
      const had = existing.messages.length;
      const has = messages.length;
      const newUserMsg =
        has > had && messages.slice(had).some(m => m.sender === "user");
      const newTitle =
        existing.title === "New Chat"
          ? (() => {
              const u = messages.find(m => m.sender === "user");
              if (!u) return existing.title;
              return u.text.length > 30 ? u.text.slice(0, 30) + "..." : u.text;
            })()
          : existing.title;

      const updated: Chat = {
        ...existing,
        messages,
        timestamp: newUserMsg ? now : existing.timestamp,
        title: newTitle,
      };

      if (newUserMsg) {
        // Move to front
        const rest = prev.filter(c => c.id !== id);
        return [updated, ...rest];
      }
      // Replace in place (keep order)
      const clone = [...prev];
      clone[idx] = updated;
      return clone;
    });
  }, []);

  const startNewChat = () => {
    const id = crypto.randomUUID?.() || `chat_${Date.now()}`;
    setChats(prev => {
      if (prev.some(c => c.id === id)) return prev;
      const newChat: Chat = {
        id,
        title: "New Chat",
        messages: [],
        timestamp: Date.now(),
      };
      return [newChat, ...prev];
    });
    router.push(`/chat/${id}`);
  };

  // Listen for external chat updates
  useEffect(() => {
    const handler = (e: Event) => {
      if (!isChatUpdatedEvent(e)) return;
      updateChatMessages(e.detail.id, e.detail.messages);
    };
    window.addEventListener("chatUpdated", handler);
    return () => window.removeEventListener("chatUpdated", handler);
  }, [updateChatMessages]);

  // Expose thread ids globally (if used elsewhere)
  useEffect(() => {
    try {
      window.__chatThreads = chats.map(c => c.id);
      window.dispatchEvent(new Event("chatThreadsUpdated"));
    } catch {}
  }, [chats]);

  // Group (already ordered newest-first)
  const { today, last7Days, older } = useMemo(() => groupChatsByDate(chats), [chats]);

  const storesState = storesLoading ? "Loading..." : storesError ? "Failed" : null;
  const chatsState = chatsLoading ? "Loading..." : chatsError ? "Failed" : null;

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas">
      <SidebarHeader>
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

      <SidebarContent>
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
                          localStorage.setItem("selectedStore", store.store_name);
                        } catch {}
                        window.dispatchEvent(
                          new CustomEvent<string>("storeSelected", {
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
            <div className="px-2 text-xs text-muted-foreground">{chatsState}</div>
          )}
          {!chatsState && (
            <div className="space-y-4">
              {today.length > 0 && (
                <ChatSection
                  label="Today"
                  chats={today}
                  activeChatId={activeChatId}
                />
              )}
              {last7Days.length > 0 && (
                <ChatSection
                  label="Last 7 Days"
                  chats={last7Days}
                  activeChatId={activeChatId}
                />
              )}
              {older.length > 0 && (
                <ChatSection
                  label="Older"
                  chats={older}
                  activeChatId={activeChatId}
                />
              )}
            </div>
          )}
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

// Extracted section to avoid re-rendering unrelated parts when only active id changes
function ChatSection({
  label,
  chats,
  activeChatId,
}: {
  label: string;
  chats: Chat[];
  activeChatId: string | null;
}) {
  return (
    <div>
      <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <div className="space-y-1">
        {chats.map((chat) => (
          <Link key={chat.id} href={`/chat/${chat.id}`} prefetch>
            <Button
              variant="ghost"
              aria-current={activeChatId === chat.id ? "page" : undefined}
              className={`w-full justify-start px-2 text-sm ${
                activeChatId === chat.id
                  ? "bg-accent text-accent-foreground"
                  : ""
              }`}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              <span className="truncate w-full">{chat.title}</span>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
