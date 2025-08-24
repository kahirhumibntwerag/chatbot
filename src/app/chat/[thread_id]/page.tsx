"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/sidebar-app";
import { useRef, useState, useEffect, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Plus, Unplug } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";
import { useChatHistory } from "@/hooks/useChatHistory";
import { StoreIndicator } from "@/components/ui/StoreIndicator";
// stores now come from settings context
import { useAutoResize } from "@/hooks/useAutoResizeTextArea";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useChatSubmission } from "@/hooks/useChatSubmission";
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
import { Input } from "@/components/ui/input";
import Image from "next/image"; // ADD
import { Switch } from "@/components/ui/switch";
import { useChatSettings } from "@/providers/ChatSettingsProvider";
import { FileIcon, truncateFileName } from "@/components/ui/fileIcon";
import { useAuth } from "@/providers/AuthProvider";
import { useThread } from "@/context/ThreadContext";

export default function Home() {
  const { threadId } = useThread();
  const { isAuthLoading } = useAuth();
  const [input, setInput] = useState("");
  const {
    stores,
    storeName,
    setStoreName,
    storesLoading: storeLoading,
    storesError: storeError,
    createStore,
    isCreateStoreOpen,
    setIsCreateStoreOpen,
    model,
    setModel,
    selectedToolIds,
    toggleTool,
    files,
    filesLoading,
    selectedFileNames,
    setSelectedFileNames,
    refreshFiles,
  } = useChatSettings();
  const [newStoreName, setNewStoreName] = useState("");
  const normalizedThreadId = threadId ?? "";
  const [messages, setMessages] = useChatHistory(normalizedThreadId);
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
  const [placeholderHeight, setPlaceholderHeight] = useState(0);
  // Tail-window rendering: only render last N initially, load older on scroll up
  const WINDOW_SIZE = 50;
  const LOAD_BATCH = 50;
  const [visibleStart, setVisibleStart] = useState(0);

  // NEW: Visibility state for thread switch
  const [isThreadVisible, setIsThreadVisible] = useState(false);

  // ADD: scroll-to-bottom visibility state
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  // model, tools, and stores are from settings context
  const availableModels = [
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
  ]; // edit as needed
  const tools = [
    { label: "internet search", id: "tavily_search" },
    { label: "knowledge base search", id: "search_documents" },
    { label: "search arxiv", id: "arxiv_search" },
  ];
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
  useAutoScroll(scrollRef, [normalizedThreadId]);

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
      setShowScrollToBottom(false);
    }, 100);

    return () => {
      clearTimeout(scrollTimeout);
    };
  }, [scrollDown]);

  // Initialize or update the visible window when thread or messages change
  useEffect(() => {
    setVisibleStart(Math.max(0, messages.length - WINDOW_SIZE));
  }, [normalizedThreadId, messages.length]);

  // ADD: track scroll position to toggle button with rAF throttle and tolerance
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const evaluate = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const nearBottom = distance <= 24; // tolerance to avoid flicker
      setShowScrollToBottom(!nearBottom);
    };
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(evaluate);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    evaluate();
    const onResize = () => evaluate();
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
    };
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
    model,
    toolNames: selectedToolIds,
    fileNames: selectedFileNames,
    onMessageUpdate: (updater) => {
      setMessages(updater);
    },
    setScrollDown,
  });

  // Re-evaluate when content size changes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distance <= 24;
    setShowScrollToBottom(!nearBottom);
  }, [messages.length, submissionLoading, placeholderHeight]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    // Trigger animation ONLY if this is the very first message in this thread
    if (messages.length === 0) {
      setAnimateFirstBatch(true);
    }
    submitMessage(input);
    setInput("");
  };

  // Compute how much visible space remains below the messages inside the scroll area
  useEffect(() => {
    if (!submissionLoading) return;
    const scrollEl = scrollRef.current;
    const listEl = messagesRef.current;
    if (!scrollEl) return;

    const compute = () => {
      const viewportHeight = scrollEl.clientHeight;
      let lastImageHeight = 0;
      if (listEl) {
        const imgs = listEl.querySelectorAll("img");
        const lastImg = imgs[imgs.length - 1] as HTMLImageElement | undefined;
        if (lastImg) {
          const rect = lastImg.getBoundingClientRect();
          lastImageHeight = rect.height;
        }
      }
      setPlaceholderHeight(viewportHeight + lastImageHeight);
    };

    // Recompute on resize and once images load
    compute();
    window.addEventListener("resize", compute);
    const id = requestAnimationFrame(compute);

    const imgs = listEl?.querySelectorAll("img") ?? [];
    const handlers: Array<() => void> = [];
    imgs.forEach((img) => {
      const handler = () => compute();
      handlers.push(() => img.removeEventListener("load", handler));
      img.addEventListener("load", handler, { once: true });
      // If the image is already loaded, compute immediately
      if ((img as HTMLImageElement).complete) compute();
    });

    return () => {
      window.removeEventListener("resize", compute);
      cancelAnimationFrame(id);
      handlers.forEach((off) => off());
    };
  }, [submissionLoading, messages.length]);

  // Smooth scroll to bottom when loading starts
  useEffect(() => {
    if (!submissionLoading) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setShowScrollToBottom(false);
  }, [submissionLoading]);

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
    const id = requestAnimationFrame(() => setIsThreadVisible(true));
    return () => cancelAnimationFrame(id);
  }, [normalizedThreadId]);

  // Preload last few images on thread change to reduce pop-in when user scrolls near bottom
  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    const imgs = Array.from(container.querySelectorAll("img")) as HTMLImageElement[];
    if (!imgs.length) return;
    const lastFew = imgs.slice(-6); // preload last 6 images
    lastFew.forEach((img) => {
      if (img.complete) return;
      const src = img.getAttribute("src");
      if (!src) return;
      const pre = new window.Image();
      pre.src = src;
    });
  }, [normalizedThreadId]);

  // If auth or thread id is loading, render a minimal placeholder to avoid flicker
  if (isAuthLoading || !normalizedThreadId) {
    return <div className="flex h-svh w-full" />;
  }

  return (
    <div className="flex h-svh w-full">
      <div className="flex flex-col w-full">
        <div ref={scrollRef} className="flex overflow-y-auto  relative scrollbar-sleek">
          {/* REMOVED old scroll-to-bottom button inside scroll area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex flex-col w-full max-w-[800px] mx-auto h-screen"
          >
            {messages.length > 0 && (
              <div ref={messagesRef}>
                <MessageList
                  messages={messages.slice(visibleStart)}
                  loading={submissionLoading}
                  animatedFirstBatch={animateFirstBatch}
                  isThreadVisible={isThreadVisible}
                  scrollParentRef={scrollRef as React.RefObject<HTMLElement>}
                  firstItemIndex={visibleStart}
                  onStartReached={() => {
                    if (visibleStart <= 0) return;
                    setVisibleStart((prev) => Math.max(0, prev - LOAD_BATCH));
                  }}
                />
              </div>
            )}
            <AnimatePresence>
              {submissionLoading && (
                <motion.div
                  key="loading-gap"
                  initial={{ opacity: 0, paddingTop: 0 }}
                  animate={{ opacity: 1, paddingTop: placeholderHeight }}
                  exit={{ opacity: 0, paddingTop: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="w-full"
                  aria-hidden
                />
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Fixed input container at the bottom */}
        <div
          className={`sticky ${
            messages.length > 0 ? "bottom-2 " : "bottom-[65%] h-0"
          } bg-background/50 backdrop-blur-md relative pb-[env(safe-area-inset-bottom)] `}
        >
          {/* NEW: scroll-to-bottom button placed just above the input area */}
          {showScrollToBottom && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-4 sm:right-1/2 -top-3 sm:translate-x-1/2 translate-y-[-100%] rounded-full shadow-lg"
              aria-label="Scroll to bottom"
              onClick={() => {
                const el = scrollRef.current;
                if (el) {
                  el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                  setShowScrollToBottom(false);
                }
              }}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          )}
          <div className="max-w-[800px] mx-auto px-4 py-2 sm:w-full ">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center mb-12">
                <img src="/logo.svg" alt="Logo" className="h-12 w-12 mb-2" />
                <p className="text-sm text-muted-foreground text-center">
                  Start a conversation by asking a question or pasting some text.
                </p>
              </div>
            )}
            <motion.div
              className={`flex flex-col w-full sm:max-w-[800px] max-w-[600px] mx-auto p-2
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
              {selectedFileNames.length > 0 && (
                <div className="flex flex-wrap gap-2 px-2 pt-2 m-2">
                  <AnimatePresence initial={false}>
                    {selectedFileNames.map((name) => (
                      <motion.button
                        key={name}
                        type="button"
                        layout
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="px-2 py-1 rounded-full text-xs bg-accent/50 border border-blue-600/30 text-blue-600 dark:text-blue-400 flex items-center gap-2 min-w-0"
                        onClick={() =>
                          setSelectedFileNames((prev) => prev.filter((n) => n !== name))
                        }
                        title={name}
                      >
                        <FileIcon fileName={name} />
                        <span className="truncate">@{name}</span>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              )}
              <div className="flex items-center gap-2 w-full justify-center sm:justify-between">
                <div className="min-w-0 flex items-center gap-2 flex-wrap ">
                  <Select
                    value={model || undefined}
                    onValueChange={(val) => setModel(val)}
                  >
                    
                    <SelectTrigger className="h-9 rounded-2xl bg-accent/70 backdrop-blur-sm border px-2 data-[placeholder]:opacity-60 w-fit ">
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
                  {/* Tools menu beside model */}
                 
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap mt-2 sm:mt-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        aria-label="Tools"
                        title="Tools"
                      >
                        <Unplug className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                        Tools
                      </div>
                      {tools.map((tool) => (
                        <div
                          key={tool.id}
                          className="flex items-center justify-between px-2 py-2"
                        >
                          <span className="text-sm capitalize">{tool.label}</span>
                          <Switch
                            checked={selectedToolIds.includes(tool.id)}
                            onCheckedChange={() => toggleTool(tool.id)}
                            aria-label={`Toggle ${tool.label}`}
                          />
                        </div>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-9 rounded-full px-3"
                        title="Files"
                      >
                        Files
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                        Select files for context
                      </div>
                      <div className="max-h-64 overflow-auto">
                        {filesLoading && (
                          <div className="px-2 py-2 text-xs text-muted-foreground">Loading...</div>
                        )}
                        {!filesLoading && files.length === 0 && (
                          <div className="px-2 py-2 text-xs text-muted-foreground">No files uploaded</div>
                        )}
                        {!filesLoading && files.map((f) => {
                          const active = selectedFileNames.includes(f.file_name);
                          return (
                            <button
                              key={f.id}
                              className={`w-full text-left px-2 py-1.5 text-sm hover:bg-accent ${active ? 'bg-accent' : ''}`}
                              onClick={() =>
                                setSelectedFileNames((prev) =>
                                  prev.includes(f.file_name)
                                    ? prev.filter((n) => n !== f.file_name)
                                    : [...prev, f.file_name]
                                )
                              }
                              title={f.file_name}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <FileIcon fileName={f.file_name} />
                                <span className="truncate">{f.file_name}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <FileUploader onUploaded={refreshFiles} />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                      <DropdownMenuItem asChild>
                        <FileUploader onUploaded={refreshFiles} />
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
