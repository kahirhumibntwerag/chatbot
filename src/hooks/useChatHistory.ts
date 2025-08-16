import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/apiConfig";

interface ChatMessage {
  text: string;
  sender: "user" | "model";
}

interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}

function deriveTitle(messages: ChatMessage[], existingTitle?: string) {
  if (existingTitle && existingTitle !== "New Chat") return existingTitle;
  const firstUser = messages.find((m) => m.sender === "user");
  if (!firstUser) return existingTitle || "New Chat";
  return firstUser.text.length > 30
    ? firstUser.text.slice(0, 30) + "..."
    : firstUser.text;
}

async function fetchAllChats(): Promise<Chat[]> {
  const tokenMatch = document.cookie.match(/(?:^|;\s*)jwt=([^;]+)/);
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
  if (!token) return [];
  const res = await fetch(`${API_BASE_URL}/checkpoints/messages`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (row: any) => Array.isArray(row?.messages) && row.messages.length > 0
    )
    .map((row: any) => {
      const msgs: ChatMessage[] = row.messages;
      return {
        id: row.thread_id,
        title: deriveTitle(msgs) || "New Chat",
        messages: msgs,
        timestamp: Date.now(),
      } as Chat;
    });
}

// Simple in‑memory cache (module singleton)
const chatCache: Map<string, Chat> = typeof window !== "undefined"
  ? (window as any).__chatCache || ((window as any).__chatCache = new Map())
  : new Map();

export const useChatHistory = (thread_id: string) => {
  const [messages, setLocalMessages] = useState<ChatMessage[]>([]);
  const fetchedRef = useRef(false);

  // Ensure record exists immediately
  useEffect(() => {
    if (!chatCache.has(thread_id)) {
      chatCache.set(thread_id, {
        id: thread_id,
        title: "New Chat",
        messages: [],
        timestamp: Date.now(),
      });
    }
    setLocalMessages(chatCache.get(thread_id)!.messages);
  }, [thread_id]);

  // Fallback fetch once if cache empty for this thread
  useEffect(() => {
    const current = chatCache.get(thread_id);
    if (current && current.messages.length === 0 && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchAllChats().then((all) => {
        if (!all.length) return;
        let needsSet = false;
        all.forEach((c) => {
          const existing = chatCache.get(c.id);
            if (!existing || existing.messages.length < c.messages.length) {
              chatCache.set(c.id, c);
              if (c.id === thread_id) needsSet = true;
            }
        });
        if (needsSet) setLocalMessages(chatCache.get(thread_id)!.messages);
      });
    }
  }, [thread_id]);

  // Listen for external updates
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ id: string; messages: ChatMessage[] }>;
      if (ce.detail?.id !== thread_id) return;
      const cached = chatCache.get(thread_id);
      if (!cached) return;
      // Only update if reference differs
      if (cached.messages !== messages) {
        setLocalMessages(cached.messages);
      }
    };
    window.addEventListener("chatUpdated", handler as EventListener);
    return () => window.removeEventListener("chatUpdated", handler as EventListener);
  }, [thread_id, messages]);

  // Setter
  const setMessages = (
    updater: React.SetStateAction<ChatMessage[]>
  ) => {
    setLocalMessages((prev) => {
      const next =
        typeof updater === "function"
          ? (updater as (p: ChatMessage[]) => ChatMessage[])(prev)
          : updater;

      const existing = chatCache.get(thread_id) || {
        id: thread_id,
        title: "New Chat",
        messages: [],
        timestamp: Date.now(),
      };

      const bumped =
        next.length > existing.messages.length &&
        next.slice(existing.messages.length).some((m) => m.sender === "user");

      const updated: Chat = {
        ...existing,
        messages: next,
        title: deriveTitle(next, existing.title),
        timestamp: bumped ? Date.now() : existing.timestamp,
      };

      chatCache.set(thread_id, updated);

      try {
        window.dispatchEvent(
          new CustomEvent("chatUpdated", {
            detail: { id: thread_id, messages: next },
          })
        );
      } catch {}
      return next;
    });
  };

    return [messages, setMessages];
  }