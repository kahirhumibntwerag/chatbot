'use client'
import { createContext, useContext, useState } from "react";

type ThreadContextType = {
  threadId: string | null;
  setThreadId: (id: string | null) => void;
};

const ThreadContext = createContext<ThreadContextType | undefined>(undefined);

export const ThreadProvider = ({ children }: { children: React.ReactNode }) => {
  const [threadId, setThreadId] = useState<string | null>(null);
  return (
    <ThreadContext.Provider value={{ threadId, setThreadId }}>
      {children}
    </ThreadContext.Provider>
  );
};

export const useThread = () => {
  const context = useContext(ThreadContext);
  if (!context) throw new Error("useThread must be used inside ThreadProvider");
  return context;
};
