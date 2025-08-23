import { useRef, useState, useCallback } from "react";
// Removed unused import Message
import { toast } from "sonner";

// Define local message type (align with actual usage)
export type ChatMessage = {
  sender: "user" | "model" | "tool";
  text: string;
  status?: "running" | "done";
  toolName?: string;
};

// Add toolNames to opts and destructure it
export function useChatSubmission(opts: {
  thread_id: string;
  storeName?: string | null;
  model?: string | null;
  toolNames?: string[] | null; // <-- Add this line
  fileNames?: string[] | null;
  onMessageUpdate: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setScrollDown?: (b: boolean) => void;
}) {
  const { thread_id, storeName, model, toolNames, fileNames, onMessageUpdate, setScrollDown } = opts;
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const submittingRef = useRef(false); // ADD

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
      const userText = input.trim();
      if (!userText) return;

      // Prevent rapid double fire
      if (submittingRef.current || isLoading) return;
      submittingRef.current = true;

      // Optimistic append with dedupe
      onMessageUpdate(prev => {
        const last = prev[prev.length - 1];
        if (last && last.sender === "user" && last.text === userText) return prev;
        return [...prev, { text: userText, sender: "user" }];
      });

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);

      try {


        let eventSource: EventSource | null = null;
        try {
          const qs = new URLSearchParams();
          qs.set("thread_id", thread_id);
          qs.set("message", userText);
          if (storeName) qs.set("store_name", storeName);
          if (model) qs.set("model", model);
          if (toolNames && toolNames.length > 0) qs.set("tool_names", toolNames.join(","));
          if (fileNames && fileNames.length > 0) qs.set("file_names", fileNames.join(","));
          // Custom EventSource to detect 401 via initial HEAD/ping
          const streamUrl = `/api/chat/stream?${qs.toString()}`;
          // Proactively detect unauthorized by attempting a fetch first
          try {
            const probe = await fetch(streamUrl, { method: "HEAD", credentials: "include", cache: "no-store" });
            if (probe.status === 401) {
              toast.error("Session expired. Please sign in again.");
              window.location.assign("/login");
              setIsLoading(false);
              submittingRef.current = false;
              return;
            }
          } catch {}
          eventSource = new EventSource(streamUrl);

            let messageBuffer = "";
            let flushTimeout: number | null = null;
            const flushNow = () => {
              if (messageBuffer === "") return;
              const content = messageBuffer;
              onMessageUpdate(prev => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.sender === "model") {
                  copy[copy.length - 1] = { ...last, text: content } as ChatMessage;
                } else {
                  copy.push({ text: content, sender: "model" });
                }
                return copy;
              });
            };
            const scheduleFlush = () => {
              if (flushTimeout != null) return;
              flushTimeout = window.setTimeout(() => {
                flushTimeout = null;
                flushNow();
              }, 33); // ~30fps
            };

          eventSource.addEventListener("model_start", () => {
            setIsLoading(true);
            // reset buffers
            messageBuffer = "";
            if (flushTimeout != null) {
              clearTimeout(flushTimeout);
              flushTimeout = null;
            }
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
              scheduleFlush();
            } catch {
              /* swallow malformed token events */
            }
          });

          eventSource.addEventListener("tool_start", (ev: MessageEvent) => {
            try {
              const parsed = JSON.parse(ev.data || "{}") as { name?: string };
              const name = (parsed.name ?? "unknown").toString();
              toast.message(`Using tool: ${name}`);
              onMessageUpdate(prev => [
                ...prev,
                { sender: "tool", text: `Calling tool: ${name}`, status: "running", toolName: name },
              ]);
            } catch {}
          });

          eventSource.addEventListener("tool_end", (ev: MessageEvent) => {
            try {
              const parsed = JSON.parse(ev.data || "{}") as { name?: string };
              const name = (parsed.name ?? "unknown").toString();
              toast.success(`Finished tool: ${name}`);
              onMessageUpdate(prev => {
                const copy = [...prev];
                // Find last running tool message with same name
                for (let i = copy.length - 1; i >= 0; i--) {
                  const m = copy[i] as ChatMessage;
                  if (m.sender === "tool" && m.status === "running" && m.toolName === name) {
                    copy[i] = { sender: "tool", text: `Finished tool: ${name}`, status: "done", toolName: name };
                    return copy;
                  }
                }
                // Fallback: append if not found
                copy.push({ sender: "tool", text: `Finished tool: ${name}`, status: "done", toolName: name });
                return copy;
              });
            } catch {}
          });

          eventSource.addEventListener("done", () => {
            // Ensure last buffer is flushed once more
            if (flushTimeout != null) {
              clearTimeout(flushTimeout);
              flushTimeout = null;
            }
            flushNow();
            eventSource?.close();
            setIsLoading(false);
          });

          eventSource.onerror = async (ev: any) => {
            // Some browsers expose a .status on underlying request via ev, but it's not standard
            // Fallback: attempt a probe request to determine if auth failed
            try {
              const probe = await fetch(streamUrl, { method: "HEAD", credentials: "include", cache: "no-store" });
              if (probe.status === 401) {
                toast.error("Session expired. Please sign in again.");
                window.location.assign("/login");
                eventSource?.close();
                setIsLoading(false);
                return;
              }
            } catch {}
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
        submittingRef.current = false; // RELEASE
        setIsLoading(false);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [thread_id, storeName, model, toolNames, fileNames, isLoading, onMessageUpdate, setScrollDown]
  );

  return { isLoading, submitMessage, cancel };
}