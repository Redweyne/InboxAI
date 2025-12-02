import { useRef, useEffect, useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Sparkles, Bot, User, Zap } from "lucide-react";
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
    <div className="flex items-center gap-1.5">
      <span 
        className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-purple-500"
        style={{ 
          animation: "typing-bounce 1.4s ease-in-out infinite",
          animationDelay: "0ms"
        }} 
      />
      <span 
        className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
        style={{ 
          animation: "typing-bounce 1.4s ease-in-out infinite",
          animationDelay: "200ms"
        }} 
      />
      <span 
        className="h-2 w-2 rounded-full bg-gradient-to-r from-pink-500 to-primary"
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
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

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
      setPendingMessage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      }
    },
    onError: () => {
      setPendingMessage(null);
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
    if (pendingMessage) {
      setTimeout(scrollToBottom, 50);
    }
  }, [pendingMessage, scrollToBottom]);

  const onSubmit = (data: ChatFormValues) => {
    if (!sendMessage.isPending && data.content.trim()) {
      const messageContent = data.content.trim();
      setPendingMessage(messageContent);
      form.reset();
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      sendMessage.mutate(messageContent);
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
    <div className="flex flex-col h-full relative">
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>

      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-30 dark:opacity-20 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 overflow-y-auto relative">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
              {/* Stunning hero section */}
              <div className="relative mb-8">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full opacity-20 blur-2xl animate-pulse-subtle" />
                <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center border border-primary/20">
                  <Sparkles className="h-12 w-12 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center">
                  <Zap className="h-3 w-3 text-white" />
                </div>
              </div>
              
              <h2 className="text-3xl font-bold mb-3">
                <span className="gradient-text">How can I help you?</span>
              </h2>
              <p className="text-muted-foreground mb-10 max-w-md text-lg">
                Your AI-powered assistant for emails, calendar, and productivity
              </p>
              
              {/* Suggestion pills */}
              <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
                {suggestions.map((prompt, index) => (
                  <button
                    key={prompt}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="group relative px-5 py-3 text-sm rounded-2xl glass border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-glow animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                    data-testid={`badge-prompt-${prompt.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <span className="relative z-10">{prompt}</span>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                    className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-fade-in`}
                    style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                    data-testid={`message-${message.role}-${message.id}`}
                  >
                    <div className={`flex-shrink-0 ${showAvatar ? "visible" : "invisible"}`}>
                      <Avatar className={`h-9 w-9 ring-2 ${isUser ? 'ring-primary/30' : 'ring-purple-500/30'}`}>
                        <AvatarFallback className={isUser 
                          ? "bg-gradient-to-br from-primary to-blue-600 text-white" 
                          : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                        }>
                          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className={`flex flex-col gap-1.5 max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 shadow-sm ${
                          isUser
                            ? "bg-gradient-to-br from-primary to-blue-600 text-white rounded-br-md"
                            : "glass border border-border/50 rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground px-2">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {pendingMessage && (
                <div className="flex gap-3 flex-row-reverse animate-fade-in" data-testid="message-pending">
                  <div className="flex-shrink-0">
                    <Avatar className="h-9 w-9 ring-2 ring-primary/30">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col gap-1.5 max-w-[75%] items-end">
                    <div className="rounded-2xl px-4 py-3 bg-gradient-to-br from-primary to-blue-600 text-white rounded-br-md shadow-sm">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{pendingMessage}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground px-2 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      Sending...
                    </span>
                  </div>
                </div>
              )}

              {sendMessage.isPending && (
                <div className="flex gap-3 animate-fade-in" data-testid="message-loading">
                  <div className="flex-shrink-0">
                    <Avatar className="h-9 w-9 ring-2 ring-purple-500/30">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 items-start">
                    <div className="glass rounded-2xl rounded-bl-md px-4 py-3.5 border border-border/50">
                      <TypingIndicator />
                    </div>
                    <span className="text-[11px] text-muted-foreground px-2">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Stunning input area */}
      <div className="relative border-t border-border/50 glass-subtle">
        <div className="absolute inset-x-0 -top-20 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-2xl opacity-0 group-focus-within:opacity-30 blur transition-opacity duration-300" />
                        <div className="relative flex items-end gap-2 p-3 rounded-2xl glass border border-border/50 group-focus-within:border-primary/50 shadow-lg transition-all duration-300">
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
                            placeholder="Message your AI assistant..."
                            className="flex-1 resize-none bg-transparent border-0 focus:outline-none focus:ring-0 text-sm leading-relaxed max-h-[200px] py-1.5 px-2"
                            rows={1}
                            data-testid="input-chat-message"
                          />
                          <Button
                            type="submit"
                            size="icon"
                            disabled={!watchedContent?.trim() || sendMessage.isPending}
                            className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg transition-all duration-300 disabled:opacity-50"
                            data-testid="button-send-message"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <p className="text-[11px] text-muted-foreground text-center mt-3 flex items-center justify-center gap-2">
            <span className="h-1 w-1 rounded-full bg-emerald-500" />
            Press Enter to send
          </p>
        </div>
      </div>
    </div>
  );
}
