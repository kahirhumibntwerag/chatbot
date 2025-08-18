"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

type ChatMessage = { sender: "user" | "model" | "tool"; text: string };
interface Chat { id: string; messages: ChatMessage[]; title: string; timestamp: number }

interface ChatContextValue {
  chats: Record<string, Chat>;
  setMessages: (id: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  ensureChat: (id: string) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ initialChats = [], children }:{
  initialChats?: Chat[];
  children: ReactNode;
}) {
  const [chats, setChats] = useState<Record<string, Chat>>(
    () =>
      initialChats.reduce((acc, c) => {
        acc[c.id] = c;
        return acc;
      }, {} as Record<string, Chat>)
  );

  const ensureChat = (id: string) => {
    setChats(c => {
      if (c[id]) return c;
      return {
        ...c,
        [id]: { id, messages: [], title: "New Chat", timestamp: Date.now() }
      };
    });
  };

  const setMessages = (id: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setChats(cs => {
      const existing = cs[id] || { id, messages: [], title: "New Chat", timestamp: Date.now() };
      const nextMsgs = updater(existing.messages);
      return {
        ...cs,
        [id]: {
          ...existing,
          messages: nextMsgs,
          title:
            existing.title !== "New Chat" && existing.title
              ? existing.title
              : (nextMsgs.find(m => m.sender === "user")?.text || "New Chat").slice(0, 30),
          timestamp:
            nextMsgs.length > existing.messages.length &&
            nextMsgs.slice(existing.messages.length).some(m => m.sender === "user")
              ? Date.now()
              : existing.timestamp
        }
      };
    });
  };

  return (
    <ChatContext.Provider value={{ chats, setMessages, ensureChat }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatHistory(threadId: string): [ChatMessage[], (u: (p: ChatMessage[]) => ChatMessage[]) => void] {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("ChatProvider missing");
  const { chats, ensureChat, setMessages } = ctx;
  if (!chats[threadId]) ensureChat(threadId);
  return [
    chats[threadId]?.messages || [],
    (updater) => setMessages(threadId, updater),
  ];
}