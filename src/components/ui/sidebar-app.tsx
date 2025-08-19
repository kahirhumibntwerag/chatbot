"use client";

import {
  MessageCircle,
  LogOut,
  Plus,
  Database,
  ChevronDown,
  Loader2,
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
import { useChatSettings } from "@/providers/ChatSettingsProvider";
import { FileIcon, truncateFileName } from "@/components/ui/fileIcon";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

// Base URL (strip trailing slash)
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const api = (path: string) =>
  `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

// Types
type ChatMessage = { text: string; sender: "user" | "model" | "tool" };
type Chat = {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number; // last modified
};

//

function isChatMessageArray(v: unknown): v is ChatMessage[] {
  return Array.isArray(v) && v.every(
    (m) =>
      m &&
      typeof m === "object" &&
      typeof (m as any).text === "string" &&
      ((m as any).sender === "user" || (m as any).sender === "model" || (m as any).sender === "tool")
  );
}
function isRawCheckpoint(v: unknown): v is { thread_id: string; messages: ChatMessage[]; timestamp?: number | string } {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as any).thread_id === "string" &&
    isChatMessageArray((v as any).messages)
  );
}

function normalizeTimestamp(ts: unknown): number {
  if (typeof ts === "number" && Number.isFinite(ts)) return ts;
  if (typeof ts === "string") {
    const ms = Date.parse(ts);
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

function toChat(row: { thread_id: string; messages: ChatMessage[]; timestamp?: number | string }): Chat {
  const firstUser = row.messages.find((m) => m.sender === "user");
  const title = firstUser
    ? firstUser.text.slice(0, 30) + (firstUser.text.length > 30 ? "..." : "")
    : "New Chat";
  return {
    id: row.thread_id,
    title,
    messages: row.messages,
    // Use server-provided timestamp (number or ISO string), fallback to 0
    timestamp: normalizeTimestamp(row.timestamp),
  };
}

// Group chats into Today vs Older using local day boundary
function groupChatsByDate(chats: Chat[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startMs = startOfToday.getTime();
  return chats.reduce(
    (acc, c) => {
      if (c.timestamp >= startMs) acc.today.push(c);
      else acc.older.push(c);
      return acc;
    },
    { today: [] as Chat[], older: [] as Chat[] }
  );
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
  const mapped = raw
    .filter(isRawCheckpoint)
    .filter(r => r.messages.length > 0)
    .map((row, idx) => ({ chat: toChat(row), idx }));

  const hasTimestamps = mapped.some(({ chat }) => chat.timestamp > 0);
  if (hasTimestamps) {
    mapped.sort((a, b) => (b.chat.timestamp - a.chat.timestamp) || (a.idx - b.idx));
  }
  return mapped.map(m => m.chat);
}

// removed standalone logout in favor of component-scoped handler with loading state

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

  const {
    files,
    filesLoading,
    filesError,
    selectedFileNames,
    setSelectedFileNames,
    refreshFiles,
  } = useChatSettings();
  const [filesOpen, setFilesOpen] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [hiddenFileIds, setHiddenFileIds] = useState<Set<number>>(new Set());

  async function renameFile(fileId: number, oldName: string) {
    const newName = window.prompt("Rename file", oldName) ?? "";
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    try {
      const tokenMatch = document.cookie.match(/(?:^|;\s*)jwt=([^;]+)/);
      const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(api(`/files/${fileId}/rename?new_name=${encodeURIComponent(trimmed)}`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Failed to rename (${res.status})`);
      }
      setSelectedFileNames(prev => prev.map(n => (n === oldName ? trimmed : n)));
      toast.success("Renamed");
      // Optionally: dispatch a custom event to trigger a files refresh if provider listens
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rename failed");
    }
  }

  async function deleteFile(fileId: number, name: string) {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    // Optimistic hide
    setHiddenFileIds((prev) => {
      const next = new Set(prev);
      next.add(fileId);
      return next;
    });
    try {
      const tokenMatch = document.cookie.match(/(?:^|;\s*)jwt=([^;]+)/);
      const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(api(`/files/${fileId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Failed to delete (${res.status})`);
      }
      setSelectedFileNames(prev => prev.filter(n => n !== name));
      toast.success("Deleted");
      // Refresh list to reflect deletion from backend
      try { await (refreshFiles as any)?.(); } catch {}
    } catch (e) {
      // Revert optimistic hide on failure
      setHiddenFileIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

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

  // Last-modified ordering without full sort: move item to front only when new user message
  const updateChatMessages = useCallback((id: string, messages: ChatMessage[]) => {
    setChats(prev => {
      const idx = prev.findIndex(c => c.id === id);
      const now = Date.now();
      if (idx === -1) {
        if (!messages || messages.length === 0) return prev;
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

  // Listen for external chat updates
  useEffect(() => {
    const handler = (e: Event) => {
      if (!isChatUpdatedEvent(e)) return;
      updateChatMessages(e.detail.id, e.detail.messages);
    };
    window.addEventListener("chatUpdated", handler);
    return () => window.removeEventListener("chatUpdated", handler);
  }, [updateChatMessages]);

  //

  // Group (already ordered newest-first)
  const { today, older } = useMemo(() => groupChatsByDate(chats), [chats]);

  const filesState = filesLoading ? "Loading..." : filesError ? "Failed" : null;
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
          <Collapsible open={filesOpen} onOpenChange={setFilesOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-accent rounded-lg">
              <div className="flex items-center">
                <Database className="mr-2 h-4 w-4" />
                <span>Files</span>
              </div>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <AnimatePresence initial={false}>
                {filesOpen && (
                  <motion.div
                    key="files-list"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="pl-4 mt-1 overflow-hidden"
                  >
                    {filesState && (
                      <div className="text-xs text-muted-foreground mb-1">
                        {filesState}
                      </div>
                    )}
                    {!filesState &&
                      files.filter(f => !hiddenFileIds.has(f.id)).map((f) => {
                        const active = selectedFileNames.includes(f.file_name);
                        return (
                          <motion.div
                            key={f.id}
                            className="flex items-center gap-2 mb-1"
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Button
                              variant={active ? "secondary" : "ghost"}
                              className="justify-start text-sm flex-1 min-w-0"
                              onClick={() => {
                                setSelectedFileNames((prev) =>
                                  prev.includes(f.file_name)
                                    ? prev.filter((n) => n !== f.file_name)
                                    : [...prev, f.file_name]
                                );
                              }}
                              title={f.file_name}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <FileIcon fileName={f.file_name} />
                                <span className="truncate">{f.file_name}</span>
                              </span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => renameFile(f.id, f.file_name)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteFile(f.id, f.file_name)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </motion.div>
                        );
                      })}
                  </motion.div>
                )}
              </AnimatePresence>
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
        <Button
          variant="secondary"
          onClick={async () => {
            if (logoutLoading) return;
            setLogoutLoading(true);
            try {
              await fetch(api("/logout"), {
                method: "POST",
                credentials: "include",
              });
            } catch {}
            window.location.href = "/login";
          }}
          disabled={logoutLoading}
        >
          {logoutLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>{logoutLoading ? "Logging out..." : "Logout"}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );

  function startNewChat() {
    const id = crypto.randomUUID?.() || `chat_${Date.now()}`;
    router.push(`/chat/${id}`);
  }
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
                <span className="truncate w-fit">{chat.title}</span>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
