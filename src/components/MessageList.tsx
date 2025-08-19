'use client'
import React, { memo, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import MarkdownRenderer from "@/components/ui/markdown-renderer";
import { Virtuoso } from "react-virtuoso";

// Preprocess each message once (e.g., could cache markdown parsing result)
function usePreparedMessages(messages: { sender: string; text: string }[]) {
  // Filter out tool messages so they are not rendered
  return useMemo(
    () => messages.filter((m: any) => m?.sender !== "tool"),
    [messages]
  );
}

interface MessageListProps {
  messages: { sender: string; text: string }[];
  loading: boolean;
  animatedFirstBatch: boolean;
  isThreadVisible: boolean;
  // Optional: provide the external scroll container to avoid nested scrolls
  scrollParentRef?: React.RefObject<HTMLElement | null>;
  // If provided, indicates the absolute index of the first item in `messages`
  // used for tail-window rendering (only render the last N messages initially)
  firstItemIndex?: number;
  // Called when the user scrolls to the start (top) to request more items above
  onStartReached?: () => void;
}

const MessageListComponent: React.FC<MessageListProps> = ({
  messages,
  loading,
  animatedFirstBatch,
  isThreadVisible,
  scrollParentRef,
  firstItemIndex,
  onStartReached,
}) => {
  const prepared = usePreparedMessages(messages);

  return (
    <div
      className={`flex flex-col py-4 transition-opacity duration-300 ease-in-out ${
        isThreadVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <Virtuoso
        data={prepared}
        customScrollParent={scrollParentRef?.current || undefined}
        firstItemIndex={typeof firstItemIndex === "number" ? firstItemIndex : undefined}
        startReached={onStartReached}
        itemContent={(index, message) => (
          <div
            className={`flex w-full ${
              (message as any).sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <Card
              className={`mb-2 w-fit max-w-[100%] p-4 border-none shadow-none ${
                (message as any).sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : (message as any).sender === "tool"
                  ? "bg-muted text-muted-foreground"
                  : "bg-transparent text-foreground"
              }`}
            >
              <CardContent className="p-3 break-words whitespace-pre-line">
                {(message as any).sender === "tool" && (message as any).status === "running" ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-block">
                      <MarkdownRenderer>{(message as any).text}</MarkdownRenderer>
                    </span>
                    <span className="inline-flex gap-1 ml-1" aria-label="running">
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.2s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.1s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"></span>
                    </span>
                  </div>
                ) : (
                  <MarkdownRenderer>{(message as any).text}</MarkdownRenderer>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        followOutput={true}
        increaseViewportBy={{ top: 400, bottom: 1200 }}
        components={{
          Footer: () =>
            loading ? (
              <div className="flex justify-start">
                <Card className="mb-2 w-fit max-w-[60%] p-4 bg-transparent text-foreground border-none shadow-none">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
                      <span></span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null,
        }}
        style={{
          // Let the parent scroll container manage height; Virtuoso only renders items
          willChange: "transform",
        }}
      />
    </div>
  );
};

export const MessageList = memo(MessageListComponent);