'use client'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type ThreadContextType = {
  threadId: string | null;
  setThreadId: (id: string | null) => void;
  navigateToThread: (id: string, options?: { replace?: boolean }) => void;
};

const ThreadContext = createContext<ThreadContextType | undefined>(undefined);

export const ThreadProvider = ({ children }: { children: React.ReactNode }) => {
  const [threadId, setThreadId] = useState<string | null>(null);

  // Initialize from current path and keep in sync with browser navigation
  useEffect(() => {
    const deriveFromPath = () => {
      const m = window.location.pathname.match(/\/chat\/([^\/?#]+)/);
      return m ? m[1] : null;
    };
    // Initial
    setThreadId(deriveFromPath());
    // Popstate listener for back/forward
    const onPopState = () => setThreadId(deriveFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateToThread = (id: string, options?: { replace?: boolean }) => {
    const nextUrl = `/chat/${id}`;
    try {
      // If we're on the chat landing page, perform a full navigation so Next renders the thread page
      if (window.location.pathname === '/chat') {
        window.location.href = nextUrl;
        return;
      }
      if (options?.replace) {
        window.history.replaceState({}, '', nextUrl);
      } else {
        window.history.pushState({}, '', nextUrl);
      }
    } catch {
      // Fallback: hard navigation if pushState not permitted
      window.location.href = nextUrl;
      return;
    }
    setThreadId(id);
  };

  const value = useMemo<ThreadContextType>(() => ({ threadId, setThreadId, navigateToThread }), [threadId]);

  return (
    <ThreadContext.Provider value={value}>
      {children}
    </ThreadContext.Provider>
  );
};

export const useThread = () => {
  const context = useContext(ThreadContext);
  if (!context) throw new Error("useThread must be used inside ThreadProvider");
  return context;
};
