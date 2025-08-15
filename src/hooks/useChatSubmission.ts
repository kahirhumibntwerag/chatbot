import { useRef, useState, useCallback } from "react";
// Removed unused import Message
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/apiConfig";

// Define local message type (align with actual usage)
export type ChatMessage = { sender: "user" | "model"; text: string };

export function useChatSubmission(opts: {
  thread_id: string;
  storeName?: string | null;
  // Treat like a React setState dispatcher (matches how it's used)
  onMessageUpdate: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setScrollDown?: (b: boolean) => void;
}) {
  const { thread_id, storeName, onMessageUpdate, setScrollDown } = opts;
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const submitMessage = useCallback(
    async (input: string) => {
      setScrollDown?.(true);
      if (!input.trim() || isLoading) return;

      const userText = input.trim();
      onMessageUpdate(prev => [...prev, { text: userText, sender: "user" }]);

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);

      try {
        // (Optional) If /api/chat is a Next.js route proxying backend, leave as-is.
        await fetch("/api/chat", {
          method: "POST",
            headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            thread_id,
            store_name: storeName || undefined,
            message: userText,
          }),
          signal: controller.signal,
        });

        const cookies = document.cookie.split(";").map(c => c.trim());
        const accessToken = cookies.find(c => c.startsWith("jwt="))?.split("=")[1];

        if (!accessToken) {
          console.error("No JWT token found in cookies");
          toast.error("Authentication failed. Please login again.");
          setIsLoading(false);
          return;
        }

        let eventSource: EventSource | null = null;
        try {
          eventSource = new EventSource(
            `${API_BASE_URL}/chat/stream?thread_id=${encodeURIComponent(
              thread_id
            )}&message=${encodeURIComponent(userText)}&token=${encodeURIComponent(accessToken)}${
              storeName ? `&store_name=${encodeURIComponent(storeName)}` : ""
            }`
          );

            let messageBuffer = "";

          eventSource.addEventListener("model_start", () => {
            setIsLoading(true);
            onMessageUpdate(prev => {
              const last = prev[prev.length - 1];
              if (last?.sender === "model") return prev;
              return [...prev, { text: "", sender: "model" }];
            });
          });

          eventSource.addEventListener("model_token", (ev: MessageEvent) => {
            try {
              const parsed = JSON.parse(ev.data || "{}") as { token?: string };
              if (!parsed.token) return;
              messageBuffer += parsed.token;
              onMessageUpdate(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.sender === "model") {
                  copy[copy.length - 1] = { ...last, text: messageBuffer };
                } else {
                  copy.push({ text: messageBuffer, sender: "model" });
                }
                return copy;
              });
            } catch {
              /* swallow malformed token events */
            }
          });

          eventSource.addEventListener("tool_start", (ev: MessageEvent) => {
            try {
              const parsed = JSON.parse(ev.data || "{}") as { name?: string };
              toast.message(`Using tool: ${parsed.name ?? "unknown"}`);
            } catch {}
          });

          eventSource.addEventListener("tool_end", (ev: MessageEvent) => {
            try {
              const parsed = JSON.parse(ev.data || "{}") as { name?: string };
              toast.success(`Finished tool: ${parsed.name ?? "unknown"}`);
            } catch {}
          });

          eventSource.addEventListener("done", () => {
            eventSource?.close();
            setIsLoading(false);
          });

          eventSource.onerror = () => {
            console.error("SSE connection error");
            eventSource?.close();
            setIsLoading(false);
            toast.error("Connection lost");
          };
        } catch (e) {
          console.error("Failed to create EventSource:", e);
          toast.error("Failed to connect to chat service");
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error(err);
          toast.error("Request failed");
        }
      } finally {
        setIsLoading(false);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [thread_id, storeName, isLoading, onMessageUpdate, setScrollDown]
  );

  return { isLoading, submitMessage, cancel };
}