import { useState, useEffect } from "react";

interface ChatMessage {
  text: string;
  sender: "user" | "model";
}

export const useChatHistory = (thread_id: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load chat history only once when component mounts
  useEffect(() => {
    const saved = localStorage.getItem(`chat_${thread_id}`);
    if (saved) {
      try {
        const parsedMessages = JSON.parse(saved);
        setMessages(parsedMessages);
      } catch (error) {
        console.error("Error parsing chat history:", error);
        // Handle corrupted data by clearing it
        localStorage.removeItem(`chat_${thread_id}`);
      }
    }
  }, [thread_id]);

  // Save chat history with debounce to prevent excessive writes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (messages.length > 0) {
        localStorage.setItem(`chat_${thread_id}`, JSON.stringify(messages));
      }
    }, 1000); // Debounce for 1 second

    return () => clearTimeout(timeoutId);
  }, [messages, thread_id]);

  return [messages, setMessages] as const;
};