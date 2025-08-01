"use client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/sidebar-app"
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sidebar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { useParams } from 'next/navigation';
import { v4 as uuidv4 } from "uuid";
import { useRouter } from 'next/navigation';


export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { text: string; sender: "user" | "model" }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // logout.ts (client-side)



  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (input.trim() === "" || isLoading) return;
    const thread_id = uuidv4();
    const userInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userInput, thread_id: thread_id }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Store the initial messages
      const initialMessages = [
        { text: userInput, sender: "user" },
        { text: data.messages[data.messages.length - 1].content, sender: "model" }
      ];
      
      // Save to localStorage
      localStorage.setItem(`chat_${thread_id}`, JSON.stringify(initialMessages));
      
      // Redirect to thread page
      router.push(`/chat/${thread_id}`);
    } catch (err) {
      console.error("Error:", err);
      setMessages((prev) => [
        ...prev,
        { text: "Error fetching response.", sender: "model" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

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
            <ScrollArea
              ref={scrollRef}
              className="h-screen w-full rounded-lg border-none p-4" // Fixed height class
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <Card
                    className={`mb-2 w-fit max-w-[100%] p-4 ${
                      message.sender === "model"
                        ? "bg-black/5 text-black"
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
                  <Card className="mb-2 w-fit max-w-[60%] p-4 bg-black/5 text-black">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                        <span>querying...</span>
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
                placeholder="What is on your mind......"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex items-center justify-center rounded-full w-9 h-9 absolute right-6"
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
