"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/sidebar-app";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { useParams } from "next/navigation";

// Create a custom hook for chat history management
const useChatHistory = (thread_id: string) => {
  const [messages, setMessages] = useState<{ text: string; sender: "user" | "model" }[]>([]);

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

export default function Home() {
  const { thread_id } = useParams();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useChatHistory(thread_id);
  const [isLoading, setIsLoading] = useState(false);
  const [scrollDown, setScrollDown] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
useEffect(() => {
  // Scroll to bottom with a small delay to ensure content is rendered
  const scrollTimeout = setTimeout(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, 100);

  return () => clearTimeout(scrollTimeout);
}, [scrollDown, thread_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    setScrollDown(!scrollDown);
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setMessages((prev) => [...prev, { text: userText, sender: "user" }]);
    setInput("");
    setIsLoading(true);

    const eventSource = new EventSource(
      `http://localhost:8000/chat/stream?thread_id=${thread_id}&message=${encodeURIComponent(userText)}`
    );

    let messageBuffer = "";

    eventSource.onmessage = (event) => {
      // Process the incoming data
      let cleanData = event.data;
      if (event.data) {
        // Replace four newlines with two newlines, then remove all double newlines
        cleanData = event.data;

        messageBuffer += cleanData;
      }

      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];

        if (lastMessage && lastMessage.sender === "model") {
          newMessages[newMessages.length - 1] = {
            ...lastMessage,
            text: messageBuffer,
          };
        } else {
          newMessages.push({ text: messageBuffer, sender: "model" });
        }
        return newMessages;
      });
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
      eventSource.close();
      setIsLoading(false);
    };

    eventSource.addEventListener("done", () => {
      eventSource.close();
      setIsLoading(false);
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarTrigger />

      <div className="flex h-screen items-center justify-center w-full">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex gap-2 items-end h-screen w-full"
          style={{ width: "100%", maxWidth: 800 }}
        >
          <div className="flex flex-col gap-2 w-full">
            <ScrollArea ref={scrollRef} className="h-screen w-full rounded-lg border-none p-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <Card
                    className={`mb-2 w-fit max-w-[100%] p-4 border-none shadow-none ${
                      message.sender === "model"
                        ? "bg-transparent text-black"
                        : "bg-black/85 text-white"
                    }`}
                  >
                    <CardContent className="p-3 break-words whitespace-pre-line">
                      <MarkdownRenderer>{message.text}</MarkdownRenderer>
                    </CardContent>
                  </Card>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <Card className="mb-2 w-fit max-w-[60%] p-4 bg-transparent text-black border-none shadow-none">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                        <span></span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2 items-center w-full relative p-4">
              <Textarea
                className="resize-none p-4 w-full rounded-2xl"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={3}
                placeholder="What is on your mind..."
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-6 w-9 h-9 rounded-full flex items-center justify-center"
              >
                <Send size={24} />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </SidebarProvider>
  );
}
