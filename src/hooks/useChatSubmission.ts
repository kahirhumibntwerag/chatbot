import { useRef, useState, useCallback } from "react";
// Removed unused import Message
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/apiConfig";

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
  onMessageUpdate: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setScrollDown?: (b: boolean) => void;
}) {
  const { thread_id, storeName, model, toolNames, onMessageUpdate, setScrollDown } = opts; // <-- Add toolNames
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
            }${model ? `&model=${encodeURIComponent(model)}` : ""}${
              toolNames && toolNames.length > 0
                ? `&tool_names=${encodeURIComponent(toolNames.join(","))}`
                : ""
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
        submittingRef.current = false; // RELEASE
        setIsLoading(false);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [thread_id, storeName, model, toolNames, isLoading, onMessageUpdate, setScrollDown]
  );

  return { isLoading, submitMessage, cancel };
}