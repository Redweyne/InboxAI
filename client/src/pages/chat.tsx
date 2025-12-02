import { useRef, useEffect, useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Sparkles, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ChatMessage } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

const defaultSuggestedPrompts = [
  "Summarize today's emails",
  "Show urgent emails",
  "Find free time this week",
  "What meetings do I have today?",
  "Draft a professional reply",
];

const chatFormSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000, "Message is too long"),
});

type ChatFormValues = z.infer<typeof chatFormSchema>;

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1">
      <span 
        className="h-2 w-2 rounded-full bg-primary/80"
        style={{ 
          animation: "typing-bounce 1.4s ease-in-out infinite",
          animationDelay: "0ms"
        }} 
      />
      <span 
        className="h-2 w-2 rounded-full bg-primary/80"
        style={{ 
          animation: "typing-bounce 1.4s ease-in-out infinite",
          animationDelay: "200ms"
        }} 
      />
      <span 
        className="h-2 w-2 rounded-full bg-primary/80"
        style={{ 
          animation: "typing-bounce 1.4s ease-in-out infinite",
          animationDelay: "400ms"
        }} 
      />
    </div>
  );
}

export default function Chat() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>(defaultSuggestedPrompts);

  const form = useForm<ChatFormValues>({
    resolver: zodResolver(chatFormSchema),
    defaultValues: {
      content: "",
    },
  });

  const watchedContent = form.watch("content");

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/chat/send", { content });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
      form.reset();
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
  });

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (sendMessage.isPending) {
      setTimeout(scrollToBottom, 50);
    }
  }, [sendMessage.isPending, scrollToBottom]);

  const onSubmit = (data: ChatFormValues) => {
    if (!sendMessage.isPending) {
      sendMessage.mutate(data.content.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    form.setValue("content", prompt);
    textareaRef.current?.focus();
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="relative mb-6">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute inset-0 h-20 w-20 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: "2s" }} />
              </div>
              
              <h2 className="text-2xl font-semibold mb-2">How can I help you today?</h2>
              <p className="text-muted-foreground mb-8 max-w-md">
                I can help with your emails, calendar, scheduling, and more
              </p>
              
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {suggestions.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="px-4 py-2.5 text-sm rounded-full border border-border bg-card hover-elevate active-elevate-2 transition-all duration-200"
                    data-testid={`badge-prompt-${prompt.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="space-y-6">
              {messages.map((message, index) => {
                const isUser = message.role === "user";
                const showAvatar = index === 0 || messages[index - 1]?.role !== message.role;
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                    data-testid={`message-${message.role}-${message.id}`}
                  >
                    <div className={`flex-shrink-0 ${showAvatar ? "visible" : "invisible"}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={isUser ? "bg-primary text-primary-foreground" : "bg-muted"}>
                          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          isUser
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground px-1">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {sendMessage.isPending && (
                <div className="flex gap-3" data-testid="message-loading">
                  <div className="flex-shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-muted">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div className="flex flex-col gap-1 items-start">
                    <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                      <TypingIndicator />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      <div className="border-t border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-end gap-2 p-2 rounded-2xl border border-border bg-card shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                        <textarea
                          {...field}
                          ref={(e) => {
                            field.ref(e);
                            (textareaRef as any).current = e;
                          }}
                          onKeyDown={handleKeyDown}
                          onChange={(e) => {
                            field.onChange(e);
                            handleTextareaChange(e);
                          }}
                          placeholder="Message your assistant..."
                          className="flex-1 resize-none bg-transparent border-0 focus:outline-none focus:ring-0 text-sm leading-relaxed max-h-[200px] py-2 px-2"
                          rows={1}
                          data-testid="input-chat-message"
                        />
                        <Button
                          type="submit"
                          size="icon"
                          disabled={!watchedContent?.trim() || sendMessage.isPending}
                          className="flex-shrink-0 h-9 w-9 rounded-xl transition-all duration-200"
                          data-testid="button-send-message"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Press Enter to send
          </p>
        </div>
      </div>
    </div>
  );
}
