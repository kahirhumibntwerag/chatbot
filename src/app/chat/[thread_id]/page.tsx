"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/sidebar-app";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Plus, Database, Check, Upload } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import { useParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Store, StoresResponse } from "@/types/store";
import { toast } from "sonner";
import { Database as LucideDatabase } from "lucide-react";
import FileUploader from "@/components/ui/fileUploader";
import { motion, AnimatePresence } from "framer-motion";
import { useChatHistory } from "@/hooks/useChatHistory";
import { StoreIndicator } from "@/components/ui/StoreIndicator";
import { useStoreManagement } from "@/hooks/useStoreManagement";
import { useAutoResize } from "@/hooks/useAutoResizeTextArea";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useChatSubmission } from "@/hooks/useChatSubmission";

// Create a custom hook for chat history management

const messageAnimations = {
  initial: { height: 0, opacity: 0, y: 20 },
  animate: { height: "auto", opacity: 1, y: 0 },
  exit: { height: 0, opacity: 0, y: -20 },
  transition: { duration: 1, ease: "easeInOut" },
};

const containerAnimations = {
  initial: { height: 0 },
  animate: { height: "auto" },
  transition: { duration: 10, ease: "easeInOut" },
};

export default function Home() {
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
  const [isLoading, setIsLoading] = useState(false);
  const [scrollDown, setScrollDown] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update handleCreateStore to use the hook
  const handleCreateStore = async () => {
    const success = await createStore(newStoreName);
    if (success) {
      setNewStoreName("");
      setIsCreateStoreOpen(false);
    }
  };

  useAutoResize(textareaRef, input, { maxHeight: 200 });
  useAutoScroll(scrollRef, [scrollDown, thread_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setInput(e.target.value);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const { isLoading: submissionLoading, submitMessage } = useChatSubmission({
    thread_id: normalizedThreadId,
    storeName,
    onMessageUpdate: setMessages,
    setScrollDown,
  });

  const handleSubmit = () => {
    submitMessage(input);
    setInput("");
  };

  return (
    <div className="flex h-screen w-full ">
      <SidebarProvider>
        <AppSidebar />
        <SidebarTrigger />

        <div className="flex flex-col w-full">
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="flex flex-col w-full max-w-[800px] mx-auto h-full"
            >
              {messages.length > 0 && (
                <motion.div
                  className="flex flex-col py-4"
                  variants={containerAnimations}
                  initial="initial"
                  animate="animate"
                >
                  <AnimatePresence mode="popLayout">
                    {messages.map((message, index) => (
                      <motion.div
                        key={index}
                        className={`flex w-full ${
                          message.sender === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                        variants={messageAnimations}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                      >
                        <Card
                          className={`mb-2 w-fit max-w-[100%] p-4 border-none shadow-none ${
                            message.sender === "model"
                              ? "bg-transparent text-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <CardContent className="p-3 break-words whitespace-pre-line">
                            <MarkdownRenderer>{message.text}</MarkdownRenderer>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}

                    {submissionLoading && (
                      <motion.div
                        className="flex justify-start"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Card className="mb-2 w-fit max-w-[60%] p-4 bg-transparent text-foreground border-none shadow-none">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
                              <span></span>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </form>
          </div>

          {/* Fixed input container at the bottom */}
          <div
            className={`sticky ${
              messages.length === 0 ? "bottom-[50%]" : "bottom-2"
            } bg-background/50 backdrop-blur-md transition-all duration-300`}
          >
            <div className="max-w-[800px] mx-auto px-4 py-2">
              <motion.div
                className={`flex flex-col w-full p-2
    shadow-xl bg-background/80 backdrop-blur-sm neon-border
    hover:shadow-2xl transition-all duration-300`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
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
                  className={`flex items-center ${
                    storeName ? "justify-between" : "justify-end"
                  } gap-2 w-full flex-1/2`}
                >
                  {" "}
                  {storeName && (
                    <div className="bg-accent backdrop-blur-sm rounded-2xl p-1 pe-2 border transition-all duration-300">
                      <StoreIndicator
                        storeName={storeName}
                        stores={stores}
                        onStoreSelect={setStoreName}
                      />
                    </div>
                  )}
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
                                onChange={(e) =>
                                  setNewStoreName(e.target.value)
                                }
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
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                    >
                      <Send size={24} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
