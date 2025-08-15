import { useRef, useState, useCallback } from "react";
import { Message } from "@/types/message";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/apiConfig"; // added

export function useChatSubmission(opts: {
  thread_id: string;
  storeName?: string | null;
  onMessageUpdate: (msgs: Array<{ sender: "user" | "model"; text: string }>) => void;
  setScrollDown?: (b: boolean) => void;
}) {
  const { thread_id, storeName, onMessageUpdate, setScrollDown } = opts;
  const [isLoading, setIsLoading] = useState(false);
  // ADD: controller ref to allow cancel
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
      setScrollDown?.(prev => !prev);
      if (!input.trim() || isLoading) return;

      const userText = input.trim();
      onMessageUpdate(prev => [...prev, { text: userText, sender: "user" }]);
      // Ensure any previous run is stopped
      if (abortRef.current) abortRef.current.abort();

      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);

      try {
        // Example fetch; ensure you pass the signal to whatever you use (fetch/axios)
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            thread_id: opts.thread_id,
            store_name: opts.storeName || undefined,
            message: userText,
          }),
          signal: controller.signal, // IMPORTANT
        });

        // Get the JWT token from cookies
        const cookies = document.cookie.split(";");
        const accessToken = cookies
          .find((cookie) => cookie.trim().startsWith("jwt="))
          ?.split("=")[1];

        if (!accessToken) {
          console.error("No JWT token found in cookies");
          toast.error("Authentication failed. Please login again.");
          setIsLoading(false);
          return;
        }

        let eventSource: EventSource;
        try {
          eventSource = new EventSource(
            `${API_BASE_URL}/chat/stream?thread_id=${thread_id}&message=${encodeURIComponent(
              userText
            )}&token=${accessToken}${
              storeName ? `&store_name=${encodeURIComponent(storeName)}` : ""
            }`
          );

          let messageBuffer = "";

          // Model started → create/prepare placeholder
          eventSource.addEventListener("model_start", () => {
            setIsLoading(true);
            onMessageUpdate(prev => {
              const last = prev[prev.length - 1];
              if (last?.sender === "model") return prev;
              return [...prev, { text: "", sender: "model" }];
            });
          });

          // Stream tokens → update last model message
          eventSource.addEventListener("model_token", (ev: MessageEvent) => {
            try {
              const { token } = JSON.parse(ev.data || "{}");
              if (!token) return;
              messageBuffer += token;
              onMessageUpdate(prev => {
                const newMessages = [...prev];
                const last = newMessages[newMessages.length - 1];
                if (last?.sender === "model") {
                  newMessages[newMessages.length - 1] = { ...last, text: messageBuffer };
                } else {
                  newMessages.push({ text: messageBuffer, sender: "model" });
                }
                return newMessages;
              });
            } catch { }
          });

          // Tool lifecycle → optional toast or future UI hooks
          eventSource.addEventListener("tool_start", (ev: MessageEvent) => {
            try {
              const { name } = JSON.parse(ev.data || "{}");
              console.log("Tool started:", name);
              toast.message(`Using tool: ${name ?? "unknown"}`);
            } catch { }
          });
          eventSource.addEventListener("tool_end", (ev: MessageEvent) => {
            try {
              const { name } = JSON.parse(ev.data || "{}");
              toast.success(`Finished tool: ${name ?? "unknown"}`);
            } catch { }
          });

          // Complete
          eventSource.addEventListener("done", () => {
            eventSource.close();
            setIsLoading(false);
          });

          // Fallback error
          eventSource.onerror = () => {
            console.error("SSE connection error");
            eventSource.close();
            setIsLoading(false);
            toast.error("Connection lost");
          };
        } catch (error) {
          console.error("Failed to create EventSource:", error);
          toast.error("Failed to connect to chat service");
          setIsLoading(false);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          // ...existing error handling...
          console.error(err);
        }
      } finally {
        setIsLoading(false);
        // Clear controller if this run is done (and not replaced)
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [opts.thread_id, opts.storeName, isLoading, onMessageUpdate, setScrollDown]
  );

  return {
    isLoading,
    submitMessage,
    // ADD: expose cancel to UI
    cancel,
  };
}