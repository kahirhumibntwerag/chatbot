import React, { memo, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import MarkdownRenderer from "@/components/ui/markdown-renderer";

// Preprocess each message once (e.g., could cache markdown parsing result)
function usePreparedMessages(messages: { sender: string; text: string }[]) {
  return useMemo(() => messages, [messages]);
}

interface MessageListProps {
  messages: { sender: string; text: string }[];
  loading: boolean;
  animatedFirstBatch: boolean;
  isThreadVisible: boolean;
}

const MessageListComponent: React.FC<MessageListProps> = ({
  messages,
  loading,
  animatedFirstBatch,
  isThreadVisible
}) => {
  const prepared = usePreparedMessages(messages);

  return (
    <div
      className={`flex flex-col py-4 ${
        isThreadVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {prepared.map((message, index) => (
        <div
          key={index}
          className={`flex w-full ${
            message.sender === "user" ? "justify-end" : "justify-start"
          }`}
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
        </div>
      ))}
      {loading && (
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
      )}
    </div>
  );
};

export const MessageList = memo(MessageListComponent);