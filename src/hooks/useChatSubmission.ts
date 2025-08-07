import { useState, useCallback } from 'react';
import { Message } from '@/types/message';
import { toast } from 'sonner';

interface UseChatSubmissionProps {
  thread_id: string;
  storeName: string | null;
  onMessageUpdate: (updater: (prev: Message[]) => Message[]) => void;
  setScrollDown: (value: boolean) => void;
}

export function useChatSubmission({
  thread_id,
  storeName,
  onMessageUpdate,
  setScrollDown,
}: UseChatSubmissionProps) {
  const [isLoading, setIsLoading] = useState(false);

  const submitMessage = useCallback(
    async (input: string) => {
      setScrollDown(prev => !prev);
      if (!input.trim() || isLoading) return;

      const userText = input.trim();
      onMessageUpdate(prev => [...prev, { text: userText, sender: "user" }]);
      setIsLoading(true);

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
          `http://localhost:8000/chat/stream?thread_id=${thread_id}&message=${encodeURIComponent(
            userText
          )}&token=${accessToken}&store_name=${storeName}`
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
    },
    [thread_id, storeName, isLoading, onMessageUpdate, setScrollDown]
  );

  return {
    isLoading,
    submitMessage
  };
}