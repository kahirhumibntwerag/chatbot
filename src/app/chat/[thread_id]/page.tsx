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

// Create a custom hook for chat history management
const useChatHistory = (thread_id: string) => {
  const [messages, setMessages] = useState<
    { text: string; sender: "user" | "model" }[]
  >([]);

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

const StoreIndicator = ({
  storeName,
  stores,
  onStoreSelect,
}: {
  storeName: string | null;
  stores: Store[];
  onStoreSelect: (storeName: string | null) => void;
}) => {
  if (!storeName) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <div className="flex items-center justify-center gap-2 rounded-l-full h-full text-sm p-1 cursor-pointer hover:bg-accent">
          <LucideDatabase className="text-primary" />
          <span className="text-primary font-medium">
            {storeName || "Select Store"}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 bg-popover border rounded-xl"
      >
        <DropdownMenuItem
          onClick={() => onStoreSelect(null)}
          className="focus:bg-accent hover:bg-accent rounded-lg m-1 text-popover-foreground"
        >
          {!storeName && <Check className="mr-2 h-4 w-4" />}
          No store
        </DropdownMenuItem>
        {stores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => onStoreSelect(store.store_name)}
            className="focus:bg-accent hover:bg-accent rounded-lg m-1 text-popover-foreground"
          >
            {store.store_name === storeName && (
              <Check className="mr-2 h-4 w-4" />
            )}
            {store.store_name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

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
  const [storeName, setStoreName] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const savedStore = localStorage.getItem("selectedStore");
      return savedStore;
    }
    return null;
  });
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
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
  console.log("messages: ", messages);

  // Auto-scroll
  useEffect(() => {
    // Scroll to bottom with a small delay to ensure content is rendered
    const scrollTimeout = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);

    return () => clearTimeout(scrollTimeout);
  }, [scrollDown, thread_id]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = "auto"; // Reset height to allow shrinking
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 200; // Max height in pixels (approx. 8-10 rows)

      if (scrollHeight > maxHeight) {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = "auto";
      } else {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = "hidden";
      }
    }
  }, [input]);

  // Fetch stores when component mounts
  useEffect(() => {
    const fetchStores = async () => {
      try {
        // Get the JWT token from cookies
        const cookies = document.cookie.split(";");
        const accessToken = cookies
          .find((cookie) => cookie.trim().startsWith("jwt="))
          ?.split("=")[1];

        if (!accessToken) {
          toast.error("No authentication token found. Please login again.");
          return;
        }

        const response = await fetch("http://localhost:8000/stores", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        });

        if (response.ok) {
          const data: StoresResponse = await response.json();
          setStores(data.stores);
        } else if (response.status === 401) {
          toast.error("Session expired. Please login again.");
        } else {
          throw new Error("Failed to fetch stores");
        }
      } catch (error) {
        console.error("Failed to fetch stores:", error);
        toast.error("Failed to load stores");
      }
    };

    fetchStores();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setInput(e.target.value);

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

    // Get the JWT token from cookies
    const cookies = document.cookie.split(";");
    const accessToken = cookies
      .find((cookie) => cookie.trim().startsWith("jwt="))
      ?.split("=")[1];

    if (!accessToken) {
      console.error("No JWT token found in cookies");
      setIsLoading(false);
      return;
    }

    const eventSource = new EventSource(
      `http://localhost:8000/chat/stream?thread_id=${thread_id}&message=${encodeURIComponent(
        userText
      )}&token=${accessToken}&store_name=${storeName}`
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

  // Update the store creation handler
  const handleCreateStore = async () => {
    try {
      // Get the JWT token from cookies
      const cookies = document.cookie.split(";");
      const accessToken = cookies
        .find((cookie) => cookie.trim().startsWith("jwt="))
        ?.split("=")[1];

      if (!accessToken) {
        toast.error("No authentication token found. Please login again.");
        return;
      }

      const response = await fetch("http://localhost:8000/create_store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`, // Add this line
        },
        body: JSON.stringify({ store_name: newStoreName }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setStores((prev) => [
          ...prev,
          {
            id: data.store_id,
            store_name: data.store_name,
            created_at: new Date().toISOString(),
          },
        ]);
        setStoreName(data.store_name);
        setNewStoreName("");
        setIsCreateStoreOpen(false);
        toast.success("Store created successfully");
      } else if (response.status === 401) {
        toast.error("Session expired. Please login again.");
      } else {
        const error = await response.json();
        throw new Error(error.detail);
      }
    } catch (error) {
      console.error("Failed to create store:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create store"
      );
    }
  };

  // Update the file upload handler
  const handleFileUpload = async (file: File) => {
    if (!storeName) {
      toast.error("Please select a store first");
      return;
    }

    // Create a unique toast ID for updating the same toast
    const toastId = toast.loading("Preparing to upload file...");

    // Get the JWT token from cookies
    const cookies = document.cookie.split(";");
    const accessToken = cookies
      .find((cookie) => cookie.trim().startsWith("jwt="))
      ?.split("=")[1];

    if (!accessToken) {
      toast.error("No authentication token found. Please login again.", {
        id: toastId,
      });
      return;
    }

    const formData = new FormData();
    formData.append("fileb", file);
    formData.append("store_name", storeName);

    try {
      toast.loading("Uploading file...", { id: toastId });

      const response = await fetch("http://localhost:8000/add_to_store", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const data = await response.json();
      toast.success(
        `File uploaded successfully! Created ${data.chunks_created} chunks.`,
        {
          id: toastId,
        }
      );
    } catch (error) {
      console.error("Failed to upload file:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload file",
        {
          id: toastId,
        }
      );
    }
  };

  // Add effect to save storeName changes to localStorage
  useEffect(() => {
    if (storeName === null) {
      localStorage.removeItem("selectedStore");
    } else {
      localStorage.setItem("selectedStore", storeName);
    }
  }, [storeName]);

  // Add this effect after your other useEffects
  useEffect(() => {
    const handleStoreChange = () => {
      const selectedStore = localStorage.getItem("selectedStore");
      setStoreName(selectedStore);
    };

    // Listen for the custom event
    window.addEventListener("storeSelected", handleStoreChange);

    return () => {
      window.removeEventListener("storeSelected", handleStoreChange);
    };
  }, []);

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

                    {isLoading && (
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
                className={`flex flex-col w-full border-2 rounded-2xl p-2 
              shadow-xl bg-background/80 backdrop-blur-sm
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
