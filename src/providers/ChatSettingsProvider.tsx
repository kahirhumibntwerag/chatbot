"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useStoreManagement } from "@/hooks/useStoreManagement";
import type { Store } from "@/types/store";

type ChatSettingsContextValue = {
  model: string | null;
  setModel: (model: string | null) => void;
  selectedToolIds: string[];
  setSelectedToolIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleTool: (id: string) => void;
  stores: Store[];
  storeName: string | null;
  setStoreName: (name: string | null) => void;
  storesLoading: boolean;
  storesError: string | null;
  createStore: (name: string) => Promise<boolean>;
  isCreateStoreOpen: boolean;
  setIsCreateStoreOpen: (open: boolean) => void;
};

const ChatSettingsContext = createContext<ChatSettingsContextValue | null>(null);

const STORAGE_KEY = "chat_settings";

export function ChatSettingsProvider({ children }: { children: React.ReactNode }) {
  const [model, setModel] = useState<string | null>('gpt-5-nano');
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);

  const {
    stores,
    storeName,
    setStoreName,
    isLoading: storesLoading,
    error: storesError,
    createStore,
    isCreateStoreOpen,
    setIsCreateStoreOpen,
  } = useStoreManagement();

  // Load persisted settings
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ChatSettingsContextValue>;
        if (typeof parsed.model === "string" || parsed.model === null) {
          setModel(parsed.model ?? null);
        }
        if (Array.isArray(parsed.selectedToolIds)) {
          setSelectedToolIds(parsed.selectedToolIds.filter((t): t is string => typeof t === "string"));
        }
      } else {
        setModel("gpt-5-mini");
      }
    } catch {
      setModel("gpt-5-mini");
    }
  }, []);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ model, selectedToolIds })
      );
    } catch {}
  }, [model, selectedToolIds]);

  const toggleTool = (id: string) => {
    setSelectedToolIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const value = useMemo<ChatSettingsContextValue>(
    () => ({
      model,
      setModel,
      selectedToolIds,
      setSelectedToolIds,
      toggleTool,
      stores,
      storeName,
      setStoreName,
      storesLoading,
      storesError,
      createStore,
      isCreateStoreOpen,
      setIsCreateStoreOpen,
    }),
    [
      model,
      selectedToolIds,
      stores,
      storeName,
      storesLoading,
      storesError,
      createStore,
      isCreateStoreOpen,
    ]
  );

  return (
    <ChatSettingsContext.Provider value={value}>
      {children}
    </ChatSettingsContext.Provider>
  );
}

export function useChatSettings() {
  const ctx = useContext(ChatSettingsContext);
  if (!ctx) throw new Error("useChatSettings must be used within ChatSettingsProvider");
  return ctx;
}


