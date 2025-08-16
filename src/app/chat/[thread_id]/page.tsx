"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/sidebar-app";
import { useRef, useState, useEffect, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Plus } from "lucide-react";

import { useParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import FileUploader from "@/components/ui/fileUploader";
import { motion } from "framer-motion";
import { useChatHistory } from "@/hooks/useChatHistory";
import { StoreIndicator } from "@/components/ui/StoreIndicator";
import { useStoreManagement } from "@/hooks/useStoreManagement";
import { useAutoResize } from "@/hooks/useAutoResizeTextArea";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useChatSubmission } from "@/hooks/useChatSubmission";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectValue,
} from "@/components/ui/select";
// ADD: Stop icon
import { MessageList } from "@/components/MessageList";
import { ArrowDown } from "lucide-react";
import { API_BASE_URL } from "@/lib/apiConfig"; // add
import { Input } from "@/components/ui/input";
import Image from "next/image"; // ADD

// Create a custom hook for chat history management

export default function Home() {
  const router = useRouter();
  const { thread_id } = useParams();
  const [input, setInput] = useState("");
  const {
    stores,
    storeName,
    setStoreName,
    isLoading: storeLoading,
    error: storeError,
    createStore,
    isCreateStoreOpen,
    setIsCreateStoreOpen,
  } = useStoreManagement();
  const [newStoreName, setNewStoreName] = useState("");
  const normalizedThreadId =
    typeof thread_id === "string"
      ? thread_id
      : Array.isArray(thread_id)
      ? thread_id[0] ?? ""
      : "";
  const [messages, setMessages] = useChatHistory(normalizedThreadId);
  console.log("Chat messages:", messages);
  // New state to control one-time animation
  const [animateFirstBatch, setAnimateFirstBatch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scrollDown, setScrollDown] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(
    null
  ) as React.RefObject<HTMLDivElement>;
  const textareaRef = useRef<HTMLTextAreaElement>(
    null
  ) as React.RefObject<HTMLTextAreaElement>;
  const messagesRef = useRef<HTMLDivElement>(null);

  // NEW: Visibility state for thread switch
  const [isThreadVisible, setIsThreadVisible] = useState(false);

  // ADD: scroll-to-bottom visibility state
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  // ADD: model selection state + list
  const [model, setModel] = useState<string | null>("gpt-5-mini");
  const availableModels = [
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
  ]; // edit as needed
  const isOpenAIModel = (m: string) => m.startsWith("gpt-"); // ADD helper

  const handleStoreSelect = (val: string) => {
    if (val === "__create__") {
      setIsCreateStoreOpen(true);
      return;
    }
    setStoreName(val);
  };

  // Update handleCreateStore to use the hook
  const handleCreateStore = async () => {
    const success = await createStore(newStoreName);
    if (success) {
      setStoreName(newStoreName);
      setNewStoreName("");
      setIsCreateStoreOpen(false);
    }
  };

  useAutoResize(textareaRef, input, { maxHeight: 200 });
  useAutoScroll(scrollRef, [thread_id]);

  useEffect(() => {
    const el = scrollRef.current;
    const messagesEl = messagesRef.current;
    if (!el || !messagesEl) return;

    const scrollTimeout = setTimeout(() => {
      const node = scrollRef.current;
      const messagesNode = messagesRef.current;
      if (!node || !messagesNode) return;

      node.scrollTo({
        top: node.scrollHeight,
      });

      // after scroll completes, make it fully visible
      node.style.opacity = "1";
    }, 100);

    return () => {
      clearTimeout(scrollTimeout);
    };
  }, [scrollDown]);

  // ADD: track scroll position to toggle button
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handle = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollToBottom(distance > 64);
    };
    el.addEventListener("scroll", handle, { passive: true });
    handle();
    return () => el.removeEventListener("scroll", handle);
  }, [normalizedThreadId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setInput(e.target.value);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const {
    isLoading: submissionLoading,
    submitMessage,
    /* ADD: */ cancel: cancelSubmission,
  } = useChatSubmission({
    thread_id: normalizedThreadId,
    storeName,
    model, // PASS model
    onMessageUpdate: (updater) => {
      console.log("Message update:", updater);
      setMessages(updater);
    },
    setScrollDown,
  });

  const handleSubmit = () => {
    if (!input.trim()) return;
    // Trigger animation ONLY if this is the very first message in this thread
    if (messages.length === 0) {
      setAnimateFirstBatch(true);
    }
    submitMessage(input);
    setInput("");
  };

  // After first animation plays once, disable further animations
  useEffect(() => {
    if (animateFirstBatch && messages.length > 0) {
      // Allow one paint frame with animation, then disable
      const t = requestAnimationFrame(() => setAnimateFirstBatch(false));
      return () => cancelAnimationFrame(t);
    }
  }, [animateFirstBatch, messages.length]);

  // NEW: On thread change, render at opacity-0 then set to 100 next frame (no CSS transition)
  useEffect(() => {
    setIsThreadVisible(false);
    const id = requestAnimationFrame(() => setIsThreadVisible(true));
    return () => cancelAnimationFrame(id);
  }, [normalizedThreadId]);

  // REMOVE direct cookie read + accessToken redirect
  // const cookies = document.cookie.split(";");
  // const accessToken = cookies
  //   .find((cookie) => cookie.trim().startsWith("jwt="))
  //   ?.split("=")[1];
  // useEffect(() => {
  //   if (!accessToken) {
  //     router.push("/login");
  //   }
  // }, [accessToken]);

  // Auth check: calls backend; if 401 redirect
  useEffect(() => {
    let cancelled = false;

    const getToken = () => {
      if (typeof document === "undefined") return null;
      // Adjust cookie key if different (e.g. "access_token")
      const raw = document.cookie
        .split(";")
        .find((c) => c.trim().startsWith("jwt="));
      return raw ? raw.split("=")[1] : null;
    };

    (async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/users/me`, {
          credentials: "include", // keep if backend also supports cookie session
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: "application/json",
          },
        });
        if (!res.ok) throw new Error("unauth");
      } catch {
        if (!cancelled) router.replace("/login");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex h-screen w-full ">
      <div className="flex flex-col w-full">
        <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
          {/* REMOVED old scroll-to-bottom button inside scroll area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex flex-col w-full max-w-[800px] mx-auto h-full"
          >
            {messages.length > 0 && (
              <MessageList
                messages={messages}
                loading={submissionLoading}
                animatedFirstBatch={animateFirstBatch}
                isThreadVisible={isThreadVisible}
              />
            )}
          </form>
        </div>

        {/* Fixed input container at the bottom */}
        <div
          className={`sticky ${
            messages.length > 0 ? "bottom-2" : "bottom-[50%]"
          } bg-background/50 backdrop-blur-md relative`}
        >
          {/* NEW: scroll-to-bottom button placed just above the input area */}
          {showScrollToBottom && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-[50%] -top-3 translate-y-[-100%] rounded-full shadow-lg"
              aria-label="Scroll to bottom"
              onClick={() => {
                const el = scrollRef.current;
                if (el)
                  el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
              }}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          )}
          <div className="max-w-[800px] mx-auto px-4 py-2">
            <motion.div
              className={`flex flex-col w-full p-2
    shadow-xl bg-background/80 backdrop-blur-sm neon-border
    hover:shadow-2xl transition-all duration-300`}
            >
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="What is on your mind..."
                disabled={isLoading}
                className="w-full resize-none p-2"
              />
              <div
                className={`flex items-center justify-between gap-2 w-full flex-1/2`}
              >
                <div className="min-w-[180px] flex gap-2">
                  <Select
                    value={storeName || undefined}
                    onValueChange={handleStoreSelect}
                  >
                    <SelectTrigger
                      className={`h-9 rounded-2xl bg-accent/70 backdrop-blur-sm border px-2 data-[placeholder]:opacity-60 ${
                        storeName ? "" : "hidden"
                      }`}
                    >
                      {storeName && <StoreIndicator storeName={storeName} />}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Stores</SelectLabel>
                        {stores.map((s) => (
                          <SelectItem key={s.id} value={s.store_name}>
                            {s.store_name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Select
                    value={model || undefined}
                    onValueChange={(val) => setModel(val)}
                  >
                    <SelectTrigger className="h-9 rounded-2xl bg-accent/70 backdrop-blur-sm border px-2 data-[placeholder]:opacity-60">
                      <SelectValue placeholder="Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Models</SelectLabel>
                        {availableModels.map((m) => (
                          <SelectItem key={m} value={m}>
                            <span className="flex items-center gap-2">
                              {isOpenAIModel(m) && (
                                // Single SVG, recolor via CSS mask so we can theme it
                                <span
                                  aria-hidden="true"
                                  className="w-4 h-4 inline-block bg-emerald-600 dark:bg-emerald-300"
                                  style={{
                                    WebkitMask: "url(/chatgpt-4.svg) center / contain no-repeat",
                                    mask: "url(/chatgpt-4.svg) center / contain no-repeat",
                                  }}
                                />
                              )}
                              <span>{m}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                {/* ADD: Model selector */}

                <div className="flex items-center justify-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <Dialog
                        open={isCreateStoreOpen}
                        onOpenChange={setIsCreateStoreOpen}
                      >
                        <DialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Store
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New Store</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <Input
                              placeholder="Store name"
                              value={newStoreName}
                              onChange={(e: {
                                target: { value: SetStateAction<string> };
                              }) => setNewStoreName(e.target.value)}
                            />
                            <Button onClick={handleCreateStore}>
                              Create Store
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem asChild>
                        <FileUploader storeName={storeName} />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    // CHANGE: type=button, dynamic handler based on mode
                    type="button"
                    // Keep enabled while loading to allow "Stop"
                    disabled={!input.trim() && !submissionLoading}
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      submissionLoading
                        ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 "
                        : ""
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (submissionLoading) {
                        // Stop mode
                        cancelSubmission?.();
                      } else {
                        // Submit mode
                        handleSubmit();
                      }
                    }}
                    aria-label={
                      submissionLoading ? "Stop generating" : "Send message"
                    }
                    title={submissionLoading ? "Stop generating" : "Send"}
                  >
                    {submissionLoading ? (
                      // Stop + subtle wobble/pulse animation
                      <motion.span
                        initial={{ scale: 0.95 }}
                        animate={{ scale: [1, 1.09, 1] }}
                        transition={{
                          duration: 1.0,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="flex"
                      >
                        <span className="w-3 h-3 bg-primary"></span>
                      </motion.span>
                    ) : (
                      // Send with slight hover/tap motion
                      <motion.span
                        initial={{ x: 0 }}
                        whileHover={{ x: 1 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex"
                      >
                        <Send size={20} />
                      </motion.span>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
