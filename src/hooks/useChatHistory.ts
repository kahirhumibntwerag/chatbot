import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

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

// Derive a title from messages
function deriveTitle(messages: ChatMessage[], existingTitle?: string) {
  if (existingTitle && existingTitle !== "New Chat") return existingTitle;
  const firstUser = messages.find((m) => m.sender === "user");
  if (!firstUser) return existingTitle || "New Chat";
  return firstUser.text.length > 30
    ? firstUser.text.slice(0, 30) + "..."
    : firstUser.text;
}

// Fallback fetch (only if needed)
async function fetchAllChats(): Promise<Chat[]> {
  const tokenMatch = document.cookie.match(/(?:^|;\s*)jwt=([^;]+)/);
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;
  if (!token) return [];
  const res = await fetch("http://localhost:8000/checkpoints/messages", {
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

export const useChatHistory = (thread_id: string) => {
  const queryClient = useQueryClient();
  const [messages, setLocalMessages] = useState<ChatMessage[]>([]);
  const fetchedRef = useRef(false);

  // Sync local state from React Query cache
  useEffect(() => {
    const syncFromCache = () => {
      const chats = queryClient.getQueryData<Chat[]>(["chats"]) || [];
      const found = chats.find((c) => c.id === thread_id);
      if (found) {
        if (found.messages !== messages) {
          setLocalMessages(found.messages);
        }
      } else {
        // If switching to a thread that isn't in cache yet, clear immediately
        if (messages.length > 0) {
          setLocalMessages([]);
        }
      }
    };
    syncFromCache();

    // Subscribe to query cache changes for ["chats"]
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] === "chats") {
        syncFromCache();
      }
    });
    return () => unsub();
  }, [thread_id, queryClient, messages]);

  // Immediately reset messages when thread changes to avoid showing previous thread content
  useEffect(() => {
    setLocalMessages([]);
  }, [thread_id]);

  // Ensure an empty chat record exists immediately for the new thread id (optimistic seed)
  useEffect(() => {
    queryClient.setQueryData<Chat[]>(["chats"], (old = []) => {
      if (old.some((c) => c.id === thread_id)) return old;
      return [
        ...old,
        {
          id: thread_id,
          title: "New Chat",
          messages: [],
          timestamp: Date.now(),
        },
      ];
    });
  }, [thread_id, queryClient]);

  // If chat not in cache, fetch all chats once (fallback)
  useEffect(() => {
    const chats = queryClient.getQueryData<Chat[]>(["chats"]) || [];
    const exists = chats.some((c) => c.id === thread_id);
    if (!exists && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchAllChats().then((all) => {
        if (all.length) {
          queryClient.setQueryData<Chat[]>(["chats"], (old = []) => {
            // Merge, avoiding duplicates
            const mergedMap = new Map<string, Chat>();
            [...old, ...all].forEach((c) => mergedMap.set(c.id, c));
            return Array.from(mergedMap.values());
          });
        }
      });
    }
  }, [thread_id, queryClient]);

  // Setter that updates both local state and React Query cache
  const setMessages = (
    updater: React.SetStateAction<ChatMessage[]>
  ) => {
    setLocalMessages((prev) => {
      const next =
        typeof updater === "function" ? (updater as (p: ChatMessage[]) => ChatMessage[])(prev) : updater;

      queryClient.setQueryData<Chat[]>(["chats"], (old = []) => {
        const idx = old.findIndex((c) => c.id === thread_id);
        if (idx === -1) {
          return [
            ...old,
            {
              id: thread_id,
              title: deriveTitle(next) || "New Chat",
              messages: next,
              timestamp: Date.now(),
            },
          ];
        }
        const existing = old[idx];
        const updated: Chat = {
          ...existing,
            messages: next,
            title: deriveTitle(next, existing.title),
            // bump timestamp if a new user message appears
            timestamp:
              next.length > existing.messages.length &&
              next.slice(existing.messages.length).some((m) => m.sender === "user")
                ? Date.now()
                : existing.timestamp,
          };
        const copy = [...old];
        copy[idx] = updated;
        return copy;
      });

      // Backwards compatibility: dispatch event used elsewhere
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

  return [messages, setMessages] as const;
};